import * as Crypto from 'expo-crypto';

import { getItem, removeItem, setItem, StorageKeys } from './secureStore';

/**
 * PIN storage + failed-attempt counter. The PIN is a local convenience gate on
 * top of real server auth - never a substitute for it. Stored only in secure
 * storage (hardware-backed, app-scoped, device-only).
 *
 * The PIN is stored as a SALTED SHA-256 digest (`v1$saltHex$hashHex`), never the
 * literal: a forensic keystore/backup dump then yields no reusable PIN (users
 * reuse short PINs across their device passcode and bank cards). The 5-digit
 * keyspace is tiny, so key-stretching adds no brute-force resistance that the
 * device-only enclave + the 3-strikes wipe don't already provide - the point is
 * removing the plaintext, so a single salted digest is sufficient. A PIN written
 * by an older build (plaintext) is transparently upgraded on the next verify.
 *
 * The failed-attempt counter is PERSISTED, not just held in memory: otherwise
 * the 3-strikes wipe could be sidestepped by force-killing and relaunching the
 * app between guesses, brute-forcing the PIN a couple of tries per launch.
 */

const HASH_VERSION = 'v1';
const SALT_BYTES = 16;

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

async function hashPin(pin: string, saltHex: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${saltHex}:${pin}`);
}

/** Constant-time compare of two equal-length hex digests. */
function digestsEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function setPin(pin: string): Promise<void> {
  const saltHex = toHex(Crypto.getRandomBytes(SALT_BYTES));
  const hash = await hashPin(pin, saltHex);
  await setItem(StorageKeys.pin, `${HASH_VERSION}$${saltHex}$${hash}`);
}

export async function hasPin(): Promise<boolean> {
  return (await getItem(StorageKeys.pin)) !== null;
}

export async function verifyPin(candidate: string): Promise<boolean> {
  const stored = await getItem(StorageKeys.pin);
  if (stored === null) return false;

  if (stored.startsWith(`${HASH_VERSION}$`)) {
    const [, saltHex, hash] = stored.split('$');
    if (!saltHex || !hash) return false;
    return digestsEqual(await hashPin(candidate, saltHex), hash);
  }

  // Legacy plaintext PIN from a build before hashing: compare directly, and on a
  // match upgrade it in place so the literal is replaced with a salted digest.
  if (stored === candidate) {
    await setPin(candidate);
    return true;
  }
  return false;
}

export async function clearPin(): Promise<void> {
  await removeItem(StorageKeys.pin);
}

/** Number of consecutive failed PIN attempts, persisted across app launches. */
export async function getPinAttempts(): Promise<number> {
  const raw = await getItem(StorageKeys.pinAttempts);
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function setPinAttempts(count: number): Promise<void> {
  await setItem(StorageKeys.pinAttempts, String(count));
}

export async function clearPinAttempts(): Promise<void> {
  await removeItem(StorageKeys.pinAttempts);
}
