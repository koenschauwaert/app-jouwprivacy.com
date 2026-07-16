// SPDX-License-Identifier: Apache-2.0
import { Platform } from 'react-native';

/**
 * Which glass backend a device gets. Real native glass needs a recent OS:
 *  - iOS 26+ has Apple's system `glassEffect` (`expo-liquid-glass-view`).
 *  - Android 13+ (API 33) has the AGSL/`RenderEffect` GPU pipeline the QmDeve
 *    view relies on; below that it renders nothing, so we never mount it.
 * Everything else falls to the expo-blur card, and web to a flat card.
 */
export type GlassTier = 'ios-native' | 'android-native' | 'blur' | 'flat';

/** Lowest iOS major with Apple system liquid glass. */
export const IOS_GLASS_MIN_MAJOR = 26;
/** Lowest Android API level with the GPU glass pipeline (Android 13). */
export const ANDROID_GLASS_MIN_SDK = 33;

/**
 * Pure tier selector (no React/native imports) so it is trivially testable.
 * `os`/`version` mirror `Platform.OS` / `Platform.Version`.
 */
export function pickGlassTier(os: string, version: string | number): GlassTier {
  if (os === 'ios') {
    const major = parseInt(String(version), 10);
    return Number.isFinite(major) && major >= IOS_GLASS_MIN_MAJOR ? 'ios-native' : 'blur';
  }
  if (os === 'android') {
    const api = typeof version === 'number' ? version : parseInt(String(version), 10);
    return Number.isFinite(api) && api >= ANDROID_GLASS_MIN_SDK ? 'android-native' : 'blur';
  }
  return 'flat';
}

/** The tier for the current device. */
export function currentGlassTier(): GlassTier {
  return pickGlassTier(Platform.OS, Platform.Version as string | number);
}
