// SPDX-License-Identifier: Apache-2.0
import {
  clearPin,
  clearPinAttempts,
  getPinAttempts,
  hasPin,
  setPin,
  setPinAttempts,
  verifyPin,
} from '@/storage/pin';
import { StorageKeys } from '@/storage/secureStore';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const secureStore = require('expo-secure-store') as { __store: Map<string, string> };

beforeEach(() => secureStore.__store.clear());

describe('PIN storage (salted hash)', () => {
  it('stores a salted hash, never the literal PIN', async () => {
    await setPin('12345');
    const stored = secureStore.__store.get(StorageKeys.pin);
    expect(stored).toBeTruthy();
    expect(stored).not.toBe('12345');
    expect(stored).not.toContain('12345');
    expect(stored?.startsWith('v1$')).toBe(true);
  });

  it('uses a fresh salt each time (same PIN -> different stored value)', async () => {
    await setPin('12345');
    const a = secureStore.__store.get(StorageKeys.pin);
    await setPin('12345');
    const b = secureStore.__store.get(StorageKeys.pin);
    expect(a).not.toBe(b);
  });

  it('verifies the correct PIN and rejects a wrong one', async () => {
    await setPin('12345');
    expect(await verifyPin('12345')).toBe(true);
    expect(await verifyPin('54321')).toBe(false);
    expect(await verifyPin('')).toBe(false);
  });

  it('transparently upgrades a legacy plaintext PIN on first verify', async () => {
    // Simulate a PIN written by an older build (raw plaintext).
    secureStore.__store.set(StorageKeys.pin, '12345');
    expect(await verifyPin('12345')).toBe(true);
    // Now migrated to the salted-hash format.
    const migrated = secureStore.__store.get(StorageKeys.pin);
    expect(migrated?.startsWith('v1$')).toBe(true);
    expect(migrated).not.toBe('12345');
    // And still verifies against the upgraded value.
    expect(await verifyPin('12345')).toBe(true);
  });

  it('does not upgrade (or accept) a wrong PIN against a legacy value', async () => {
    secureStore.__store.set(StorageKeys.pin, '12345');
    expect(await verifyPin('00000')).toBe(false);
    expect(secureStore.__store.get(StorageKeys.pin)).toBe('12345');
  });

  it('hasPin/clearPin reflect presence', async () => {
    expect(await hasPin()).toBe(false);
    await setPin('12345');
    expect(await hasPin()).toBe(true);
    await clearPin();
    expect(await hasPin()).toBe(false);
  });
});

describe('PIN attempt counter (persisted)', () => {
  it('round-trips and clears', async () => {
    expect(await getPinAttempts()).toBe(0);
    await setPinAttempts(2);
    expect(await getPinAttempts()).toBe(2);
    await clearPinAttempts();
    expect(await getPinAttempts()).toBe(0);
  });
});
