// SPDX-License-Identifier: Apache-2.0
import { Language } from '@/i18n/translations';

import { getItem, removeItem, setItem, StorageKeys } from './secureStore';

export async function getStoredLanguage(): Promise<Language | null> {
  const value = await getItem(StorageKeys.language);
  return value === 'nl' || value === 'en' ? value : null;
}

export async function storeLanguage(language: Language): Promise<void> {
  await setItem(StorageKeys.language, language);
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await getItem(StorageKeys.biometricEnabled)) === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await setItem(StorageKeys.biometricEnabled, enabled ? 'true' : 'false');
}

export async function clearBiometricPreference(): Promise<void> {
  await removeItem(StorageKeys.biometricEnabled);
}
