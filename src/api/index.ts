// SPDX-License-Identifier: Apache-2.0
import { ApiClient } from './contract';
import { HttpApiClient } from './HttpApiClient';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let sessionExpiredHandler: (() => void) | null = null;
let tokensRefreshedHandler: ((accessToken: string) => void) | null = null;

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
 * Registered by the auth layer to persist an access token that the client
 * refreshed transparently (so a cold start picks up the fresh token).
 */
export function setTokensRefreshedHandler(fn: ((accessToken: string) => void) | null): void {
  tokensRefreshedHandler = fn;
}

function createClient(): ApiClient {
  return new HttpApiClient(
    () => accessToken,
    () => sessionExpiredHandler?.(),
    () => refreshToken,
    (newAccessToken) => {
      accessToken = newAccessToken;
      tokensRefreshedHandler?.(newAccessToken);
    },
  );
}

export const api: ApiClient = createClient();

export * from './contract';
export { ApiClientError, isApiClientError } from './ApiError';
