// SPDX-License-Identifier: Apache-2.0
import * as SecureStore from 'expo-secure-store';

/**
 * Thin wrapper over expo-secure-store (Keychain / Keystore).
 * Secrets, tokens and the app PIN live here - never AsyncStorage.
 *
 * Everything is written device-bound (WHEN_UNLOCKED_THIS_DEVICE_ONLY): items are
 * NOT copied into encrypted iCloud/iTunes backups and cannot be restored onto a
 * different device, so a leaked backup never yields the session or the PIN.
 */

const DEVICE_ONLY: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function setItem(
  key: string,
  value: string,
  options: SecureStore.SecureStoreOptions = DEVICE_ONLY,
): Promise<void> {
  await SecureStore.setItemAsync(key, value, options);
}

export async function getItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function removeItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export const StorageKeys = {
  session: 'jp.session',
  pin: 'jp.pin',
  pinAttempts: 'jp.pinAttempts',
  biometricEnabled: 'jp.biometricEnabled',
  language: 'jp.language',
} as const;
