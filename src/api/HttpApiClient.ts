// SPDX-License-Identifier: Apache-2.0
import {
  Account,
  AccountPatch,
  ApiClient,
  ApiErrorCode,
  ConfirmRequest,
  ConfirmResponse,
  CreateTicketRequest,
  InvoiceLink,
  LoginRequest,
  LoginResponse,
  Me,
  NetworkStatus,
  Order,
  PayoutRequest,
  Referral,
  RefreshResponse,
  Session,
  Subscription,
  Ticket,
  TwoFactorRequest,
  Usage,
} from './contract';
import { ApiClientError } from './ApiError';
import { API_CONFIG } from './config';

type TokenProvider = () => string | null;
type SessionExpiredHandler = () => void;

// Idempotent GETs are retried on transient failures; mutations never are.
const MAX_GET_RETRIES = 2;
const BACKOFF_BASE_MS = 250;
// Transient = worth retrying (the connection/upstream may recover momentarily).
const TRANSIENT_CODES: ReadonlySet<ApiErrorCode> = new Set([
  'NETWORK',
  'RATE_LIMITED',
  'UPSTREAM_UNAVAILABLE',
]);

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Parse a Retry-After header (delta-seconds only) into ms, or null if absent/invalid. */
function retryAfterMs(res: Response): number | null {
  const raw = res.headers?.get?.('Retry-After');
  if (!raw) return null;
  const seconds = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.min(seconds, 60) * 1000 : null;
}

/** Validate a server-returned session before it is trusted / persisted to secure storage. */
function requireSession(payload: unknown): Session {
  const o = (payload ?? {}) as Partial<Session>;
  if (
    typeof o.accessToken !== 'string' ||
    o.accessToken === '' ||
    typeof o.refreshToken !== 'string' ||
    o.refreshToken === ''
  ) {
    throw new ApiClientError('UPSTREAM_UNAVAILABLE', 'Malformed session received from the server.');
  }
  return {
    accessToken: o.accessToken,
    refreshToken: o.refreshToken,
    expiresIn: typeof o.expiresIn === 'number' && Number.isFinite(o.expiresIn) ? o.expiresIn : 0,
  };
}

const MALFORMED = 'Malformed response received from the server.';

/** Assert a response payload is a non-null object before the app dereferences it. */
function expectObject<T>(payload: unknown): T {
  if (typeof payload !== 'object' || payload === null) {
    throw new ApiClientError('UPSTREAM_UNAVAILABLE', MALFORMED);
  }
  return payload as T;
}

/** Unwrap an `{ [key]: T[] }` envelope, asserting the array is actually present. */
function expectArray<T>(payload: unknown, key: string): T[] {
  const value = expectObject<Record<string, unknown>>(payload)[key];
  if (!Array.isArray(value)) {
    throw new ApiClientError('UPSTREAM_UNAVAILABLE', MALFORMED);
  }
  return value as T[];
}

/**
 * BFF client implementing the ApiClient contract (src/api/contract.ts) - the
 * only API client. All user data the app sends off-device (login
 * email/password, account name + delivery address, referral payout IBAN) goes
 * through here to API_CONFIG.baseUrl over HTTPS.
 */
export class HttpApiClient implements ApiClient {
  private readonly base: string;
  // Single-flight refresh: concurrent 401s share one refresh attempt.
  private refreshing: Promise<boolean> | null = null;

  constructor(
    private readonly getAccessToken: TokenProvider = () => null,
    private readonly onSessionExpired: SessionExpiredHandler = () => {},
    private readonly getRefreshToken: TokenProvider = () => null,
    private readonly onAccessTokenRefreshed: (accessToken: string) => void = () => {},
  ) {
    this.base = `${API_CONFIG.baseUrl}/${API_CONFIG.apiVersion}`;
  }

  /**
   * Refresh the access token using the stored refresh token. Returns true on
   * success (and pushes the new token via onAccessTokenRefreshed). Concurrent
   * callers await the same in-flight refresh.
   */
  private async ensureRefreshed(): Promise<boolean> {
    if (!this.refreshing) {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) return false;
      this.refreshing = this.refresh(refreshToken)
        .then(({ accessToken }) => {
          this.onAccessTokenRefreshed(accessToken);
          return true;
        })
        .catch(() => false)
        .finally(() => {
          this.refreshing = null;
        });
    }
    return this.refreshing;
  }

  /** One fetch attempt with a hard timeout; maps any failure to NETWORK. */
  private async fetchOnce(
    method: string,
    path: string,
    headers: Record<string, string>,
    body?: unknown,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);
    try {
      return await fetch(`${this.base}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      // Covers both connection failures and timeout aborts.
      throw new ApiClientError('NETWORK', 'No connection or the request timed out.');
    } finally {
      clearTimeout(timer);
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    auth = true,
    isRetry = false,
  ): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = this.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const idempotent = method === 'GET';

    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await this.fetchOnce(method, path, headers, body);
      } catch (e) {
        // Network/timeout: retry idempotent GETs with backoff, else surface.
        if (idempotent && attempt < MAX_GET_RETRIES) {
          await delay(BACKOFF_BASE_MS * 2 ** attempt);
          continue;
        }
        throw e;
      }

      if (res.status === 204) return undefined as T;

      const payload = (await res.json().catch(() => null)) as
        { error?: { code?: ApiErrorCode; message?: string } } | T | null;

      if (res.ok) return payload as T;

      const err = (payload as { error?: { code?: ApiErrorCode; message?: string } })?.error;
      const code = err?.code ?? 'UPSTREAM_UNAVAILABLE';
      // Any 401 on an authenticated call means the session is no longer accepted
      // (expired OR revoked), not just the specific TOKEN_EXPIRED code - so a
      // server that revokes without that code still triggers refresh-then-wipe.
      const authFailure = auth && (res.status === 401 || code === 'TOKEN_EXPIRED');

      // Session no longer accepted on an authenticated call: refresh once and
      // retry the original request transparently before giving up.
      if (authFailure && !isRetry && (await this.ensureRefreshed())) {
        return this.request<T>(method, path, body, auth, true);
      }
      // Transient upstream/rate-limit errors: retry idempotent GETs with backoff.
      // For an explicit rate limit, honor Retry-After instead of hammering.
      if (idempotent && attempt < MAX_GET_RETRIES && TRANSIENT_CODES.has(code)) {
        const backoff = BACKOFF_BASE_MS * 2 ** attempt;
        const wait =
          code === 'RATE_LIMITED' ? (retryAfterMs(res) ?? Math.max(backoff, 2000)) : backoff;
        await delay(wait);
        continue;
      }
      // Refresh unavailable / also rejected → let the auth layer wipe + re-auth.
      // Skipped for the refresh call itself (auth=false), so it can't recurse.
      if (authFailure) this.onSessionExpired();
      throw new ApiClientError(code, err?.message ?? 'Request failed.');
    }
  }

  login(req: LoginRequest): Promise<LoginResponse> {
    return this.request('POST', '/auth/login', req, false);
  }
  verifyTwoFactor(req: TwoFactorRequest): Promise<Session> {
    // Validate the shape before it becomes the persisted session.
    return this.request<unknown>('POST', '/auth/2fa', req, false).then(requireSession);
  }
  disableTwoFactor(req: { totp: string }): Promise<void> {
    return this.request('POST', '/auth/2fa/disable', req);
  }
  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const r = await this.request<RefreshResponse>('POST', '/auth/refresh', { refreshToken }, false);
    if (!r || typeof r.accessToken !== 'string' || r.accessToken === '') {
      throw new ApiClientError(
        'UPSTREAM_UNAVAILABLE',
        'Malformed refresh response from the server.',
      );
    }
    return r;
  }
  logout(): Promise<void> {
    return this.request('POST', '/auth/logout');
  }
  confirm(req: ConfirmRequest): Promise<ConfirmResponse> {
    return this.request('POST', '/auth/confirm', req);
  }

  getMe(): Promise<Me> {
    return this.request<unknown>('GET', '/me').then(expectObject<Me>);
  }
  getSubscriptions(): Promise<Subscription[]> {
    return this.request<unknown>('GET', '/subscriptions').then((r) =>
      expectArray<Subscription>(r, 'subscriptions'),
    );
  }
  getUsage(subscriptionId: string): Promise<Usage> {
    return this.request<unknown>(
      'GET',
      `/subscriptions/${encodeURIComponent(subscriptionId)}/usage`,
    ).then(expectObject<Usage>);
  }

  // Public (no bearer): our own status endpoint, reachable on api.jouwprivacy.com/v1.
  getNetworkStatus(): Promise<NetworkStatus> {
    return this.request<unknown>('GET', '/network-status', undefined, false).then(
      expectObject<NetworkStatus>,
    );
  }

  getHomeRelevantOrder(): Promise<Order | null> {
    return this.request<unknown>('GET', '/home/order').then(
      (r) => expectObject<{ order?: Order | null }>(r).order ?? null,
    );
  }

  getOrders(): Promise<Order[]> {
    return this.request<unknown>('GET', '/orders').then((r) => expectArray<Order>(r, 'orders'));
  }
  async getInvoiceLink(orderId: string): Promise<InvoiceLink> {
    const link = await this.request<InvoiceLink>(
      'GET',
      `/orders/${encodeURIComponent(orderId)}/invoice`,
    );
    // This URL is opened in a browser; reject anything that isn't plain https at
    // the trust boundary, before it reaches the sink.
    if (!link || typeof link.url !== 'string' || !/^https:\/\/\S+/i.test(link.url)) {
      throw new ApiClientError(
        'UPSTREAM_UNAVAILABLE',
        'Invalid invoice link received from the server.',
      );
    }
    return link;
  }

  getReferral(): Promise<Referral> {
    return this.request<unknown>('GET', '/referral').then(expectObject<Referral>);
  }
  requestPayout(req: PayoutRequest): Promise<{ status: 'pending' }> {
    return this.request('POST', '/referral/payout', req);
  }

  getAccount(): Promise<Account> {
    return this.request<unknown>('GET', '/account').then(expectObject<Account>);
  }
  updateAccount(patch: AccountPatch): Promise<Account> {
    return this.request('PATCH', '/account', patch);
  }

  getTickets(): Promise<Ticket[]> {
    return this.request<unknown>('GET', '/tickets').then((r) => expectArray<Ticket>(r, 'tickets'));
  }
  createTicket(req: CreateTicketRequest): Promise<Ticket> {
    return this.request('POST', '/tickets', req);
  }
}
