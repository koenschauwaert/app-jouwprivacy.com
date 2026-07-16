// SPDX-License-Identifier: Apache-2.0
import type { TextStyle } from 'react-native';

/**
 * TASA Orbiter - the JouwPrivacy brand typeface (same as the website). React
 * Native does not synthesise weights from a single family reliably (especially
 * on Android), so each static cut is registered as its own family and selected
 * by weight via `fontFamilyForWeight`.
 */
export const FONTS = {
  regular: 'TASAOrbiter-Regular',
  medium: 'TASAOrbiter-Medium',
  semibold: 'TASAOrbiter-SemiBold',
  bold: 'TASAOrbiter-Bold',
  extrabold: 'TASAOrbiter-ExtraBold',
} as const;

/** Map for expo-font `useFonts` - keys are the family names referenced above. */
export const fontAssets = {
  [FONTS.regular]: require('../../assets/fonts/TASAOrbiter-Regular.ttf'),
  [FONTS.medium]: require('../../assets/fonts/TASAOrbiter-Medium.ttf'),
  [FONTS.semibold]: require('../../assets/fonts/TASAOrbiter-SemiBold.ttf'),
  [FONTS.bold]: require('../../assets/fonts/TASAOrbiter-Bold.ttf'),
  [FONTS.extrabold]: require('../../assets/fonts/TASAOrbiter-ExtraBold.ttf'),
};

/** Resolve the right TASA Orbiter cut for a CSS-style fontWeight. */
export function fontFamilyForWeight(weight?: TextStyle['fontWeight']): string {
  switch (String(weight ?? '400')) {
    case '500':
      return FONTS.medium;
    case '600':
      return FONTS.semibold;
    case '700':
    case 'bold':
      return FONTS.bold;
    case '800':
    case '900':
      return FONTS.extrabold;
    default:
      // 100-400 / 'normal'
      return FONTS.regular;
  }
}
