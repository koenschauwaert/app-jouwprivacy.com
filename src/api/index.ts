// SPDX-License-Identifier: Apache-2.0
import { ApiClient } from './contract';
import { HttpApiClient } from './HttpApiClient';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let sessionExpiredHandler: (() => void) | null = null;
let tokensRefreshedHandler: ((tokens: RotatedTokens) => void) | null = null;

/** Both tokens produced by a rotation; the server retires the presented one. */
export type RotatedTokens = { accessToken: string; refreshToken: string };

/** Set by the auth layer so the HTTP client can attach the bearer token. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Set by the auth layer so the HTTP client can refresh an expired session. */
export function setRefreshToken(token: string | null): void {
  refreshToken = token;
}

/**
 * Registered by the auth layer. Invoked when the server reports the session is
 * no longer valid (401 / TOKEN_EXPIRED) so the app can wipe and re-authenticate.
 */
export function setSessionExpiredHandler(fn: (() => void) | null): void {
  sessionExpiredHandler = fn;
}

/**
 * Registered by the auth layer to persist the tokens the client refreshed
 * transparently (so a cold start picks up the fresh pair).
 */
export function setTokensRefreshedHandler(fn: ((tokens: RotatedTokens) => void) | null): void {
  tokensRefreshedHandler = fn;
}

function createClient(): ApiClient {
  return new HttpApiClient(
    () => accessToken,
    () => sessionExpiredHandler?.(),
    () => refreshToken,
    (rotated) => {
      // In-memory first and synchronously: the next refresh reads these, and
      // presenting the retired token would revoke the whole family. Persisting
      // is the auth layer's job and is allowed to lag behind by a tick.
      accessToken = rotated.accessToken;
      refreshToken = rotated.refreshToken;
      tokensRefreshedHandler?.(rotated);
    },
  );
}

export const api: ApiClient = createClient();

export * from './contract';
export { ApiClientError, isApiClientError } from './ApiError';
