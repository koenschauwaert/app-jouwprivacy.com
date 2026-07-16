// SPDX-License-Identifier: Apache-2.0
/**
 * Dark-only theme. Mirrors the JouwPrivacy site's look and feel.
 * No theme switcher (V1) - these tokens are the single source of truth.
 */

import { FONTS } from './fonts';

export { FONTS, fontAssets, fontFamilyForWeight } from './fonts';

export const colors = {
  background: '#0B0B0F',
  surface: '#15151D',
  surfaceAlt: '#1E1E29',
  border: '#2A2A38',
  text: '#F5F5FA',
  textMuted: '#9A9AAE',
  textFaint: '#6A6A7E',

  // The entire brand palette is white, black and blue. #165DF5 is the only
  // accent (matches the JouwPrivacy.com logo) and marks every active/selected
  // state. No other hues - semantic states are expressed with blue + neutrals.
  primary: '#165DF5',
  primaryMuted: '#15336E',

  // Usage rings - kept within the palette: blue / white / muted-grey so the
  // three are still distinguishable without introducing extra hues.
  ringData: '#165DF5',
  ringVoice: '#F5F5FA',
  ringSms: '#9A9AAE',
  ringTrack: '#2A2A38',

  success: '#29BF12', // positive / active (the one green accent we allow)
  warning: '#9A9AAE', // pending → neutral grey
  danger: '#165DF5', // error emphasis → blue (paired with the error copy)
  expired: '#FF9914', // expired status accent (amber)

  disabled: '#2A2A38',
  disabledText: '#5A5A6E',

  overlay: 'rgba(0,0,0,0.6)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

/** How long the 2FA boxes flash green on an accepted code before moving on. */
export const SUCCESS_FLASH_MS = 1000;

export const typography = {
  title: { fontSize: 26, fontWeight: '700' as const },
  heading: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  label: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
} as const;

export const navTheme = {
  dark: true,
  colors: {
    primary: colors.primary,
    // Transparent so the app-wide LivingBackground (behind the navigator) shows
    // through every screen. The dark base is painted by the background itself.
    background: 'transparent',
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
  fonts: {
    regular: { fontFamily: FONTS.regular, fontWeight: '400' as const },
    medium: { fontFamily: FONTS.medium, fontWeight: '500' as const },
    bold: { fontFamily: FONTS.bold, fontWeight: '700' as const },
    heavy: { fontFamily: FONTS.extrabold, fontWeight: '900' as const },
  },
};
