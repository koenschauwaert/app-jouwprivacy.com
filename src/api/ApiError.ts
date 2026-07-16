// SPDX-License-Identifier: Apache-2.0
import { ApiError, ApiErrorCode } from './contract';

/** Error thrown by every API client (mock and real) on a non-2xx outcome. */
export class ApiClientError extends Error implements ApiError {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
  }
}

export function isApiClientError(e: unknown): e is ApiClientError {
  return e instanceof ApiClientError;
}
