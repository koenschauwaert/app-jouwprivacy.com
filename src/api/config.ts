// SPDX-License-Identifier: Apache-2.0
/**
 * API configuration. The app always talks to the real backend (HttpApiClient)
 * over HTTPS - there is no mock, demo, or offline mode. Point a dev build at a
 * staging or local BFF with EXPO_PUBLIC_API_URL (see .env.example).
 */

// `__DEV__` is a React Native global: true in dev, false in release builds.
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__ === true;

// Production default; override per environment with EXPO_PUBLIC_API_URL (see
// .env.example). EXPO_PUBLIC_* vars are inlined at build time by the Expo CLI.
const DEFAULT_BASE_URL = 'https://api.jouwprivacy.com';

/**
 * Normalize: trim whitespace and any trailing slashes so path joins are clean.
 * Enforce https so a misconfigured build can't ship credentials/tokens over
 * plaintext or to an unexpected scheme. Plain http is permitted ONLY for local
 * dev hosts in a dev build (Metro / Android emulator loopback).
 */
function resolveBaseUrl(): string {
  const raw = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL).trim();
  const normalized = raw.replace(/\/+$/, '') || DEFAULT_BASE_URL;
  const isHttps = /^https:\/\/\S+/i.test(normalized);
  const isLocalDevHttp =
    IS_DEV && /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?(\/|$)/i.test(normalized);
  if (!isHttps && !isLocalDevHttp) {
    throw new Error(
      `FATAL: EXPO_PUBLIC_API_URL must be https (got "${normalized}"). ` +
        'Refusing to start rather than send user data over an unsafe scheme.',
    );
  }
  return normalized;
}

export const API_CONFIG = {
  baseUrl: resolveBaseUrl(),
  apiVersion: 'v1',
  /** Per-request timeout (ms) before the request is aborted as a NETWORK error. */
  timeoutMs: 15000,
} as const;
