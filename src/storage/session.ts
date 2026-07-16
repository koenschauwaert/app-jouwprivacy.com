// SPDX-License-Identifier: Apache-2.0
import { Session } from '@/api/contract';

import { getItem, removeItem, setItem, StorageKeys } from './secureStore';

/**
 * Narrow untrusted parsed JSON to a valid Session, dropping any unknown fields.
 * Both tokens must be non-empty strings; a missing/invalid expiresIn defaults to
 * 0 rather than poisoning the app with a non-number.
 */
function parseSession(raw: string): Session | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const { accessToken, refreshToken, expiresIn } = data as Record<string, unknown>;
  if (typeof accessToken !== 'string' || accessToken === '') return null;
  if (typeof refreshToken !== 'string' || refreshToken === '') return null;
  return {
    accessToken,
    refreshToken,
    expiresIn: typeof expiresIn === 'number' && Number.isFinite(expiresIn) ? expiresIn : 0,
  };
}

export async function storeSession(session: Session): Promise<void> {
  // Persist only the known fields so a spread of a prior blob can't launder
  // unknown junk back into secure storage.
  const clean: Session = {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresIn: session.expiresIn,
  };
  await setItem(StorageKeys.session, JSON.stringify(clean));
}

export async function getStoredSession(): Promise<Session | null> {
  const raw = await getItem(StorageKeys.session);
  if (!raw) return null;
  return parseSession(raw);
}

export async function clearSession(): Promise<void> {
  await removeItem(StorageKeys.session);
}
