// SPDX-License-Identifier: Apache-2.0
import { pickGlassTier } from '@/components/glassTier';

/**
 * The tier selector decides which glass backend a device gets. Real native
 * glass needs a recent OS (iOS 26 / Android 13); everything else must degrade to
 * the expo-blur card, and non-native targets to a flat card.
 */
describe('pickGlassTier', () => {
  it('uses Apple system glass on iOS 26+', () => {
    expect(pickGlassTier('ios', '26.0')).toBe('ios-native');
    expect(pickGlassTier('ios', 26)).toBe('ios-native');
    expect(pickGlassTier('ios', '27.1')).toBe('ios-native');
  });

  it('falls back to blur on iOS below 26', () => {
    expect(pickGlassTier('ios', '18.4')).toBe('blur');
    expect(pickGlassTier('ios', 15)).toBe('blur');
  });

  it('uses native AGSL glass on Android API 33+', () => {
    expect(pickGlassTier('android', 33)).toBe('android-native');
    expect(pickGlassTier('android', 35)).toBe('android-native');
  });

  it('falls back to blur on Android below 33', () => {
    expect(pickGlassTier('android', 31)).toBe('blur');
    expect(pickGlassTier('android', 24)).toBe('blur');
  });

  it('uses a flat card on web and other platforms', () => {
    expect(pickGlassTier('web', '')).toBe('flat');
    expect(pickGlassTier('macos', 1)).toBe('flat');
  });
});
