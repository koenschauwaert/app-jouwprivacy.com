// SPDX-License-Identifier: Apache-2.0
import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { spacing } from '@/theme';
import { GLASS, GLASS_RIM, GLASS_SUBTLE, GlassToken } from '@/theme/glass';
import { GlassBackground } from './GlassBackground';
import { BlurTargetContext } from './glassContext';

// Re-exported for backwards-compat: callers (RootNavigator, the barrel) still
// import this from '@/components' / './GlassCard'.
export { BlurTargetContext };

interface GlassCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * `hero` = full glass (default). `subtle` = lighter/cheaper for dense repeated
   * rows in a scroll, so many stacked cards stay smooth on the GPU.
   */
  variant?: 'hero' | 'subtle';
  /** Override the token corner radius (dp). */
  cornerRadius?: number;
  /** Override the dark tint (blur overlay + native glass tint). */
  tint?: string;
  /** Override the expo-blur intensity (blur fallback tier only). */
  intensity?: number;
}

/**
 * Liquid-glass surface. One reusable component so the look stays uniform across
 * every card. It renders an absolutely-positioned glass layer (real native glass
 * on iOS 26+ / Android 13+, else an expo-blur frosted card, else a flat floor)
 * behind sharp content. The backend is chosen per platform inside
 * `GlassBackground.*`; all tiers share the tokens in `@/theme/glass`.
 */
export function GlassCard({
  children,
  style,
  variant = 'hero',
  cornerRadius,
  tint,
  intensity,
}: GlassCardProps) {
  const base = variant === 'subtle' ? GLASS_SUBTLE : GLASS;

  // Fold any per-card overrides into a stable token so the (memoised) native
  // background isn't needlessly remounted on every parent re-render.
  const token = useMemo<GlassToken>(() => {
    if (cornerRadius == null && tint == null && intensity == null) return base;
    return {
      ...base,
      cornerRadius: cornerRadius ?? base.cornerRadius,
      intensity: intensity ?? base.intensity,
      tint: tint ?? base.tint,
      ios: { ...base.ios, tint: tint ?? base.ios.tint },
      android: { ...base.android, tint: tint ?? base.android.tint },
    };
  }, [base, cornerRadius, tint, intensity]);

  return (
    <View style={[styles.base, { borderRadius: token.cornerRadius }, style]}>
      <GlassBackground token={token} />
      {/* Inner edge-light: a thin top+left sheen inset a few px from the rim, so
          it reads as a lit facet of the black glass rather than a hard outline.
          Above the glass, below the (padded) content. */}
      <View
        pointerEvents="none"
        style={[
          styles.rim,
          {
            top: GLASS_RIM.inset,
            left: GLASS_RIM.inset,
            right: GLASS_RIM.inset,
            bottom: GLASS_RIM.inset,
            borderRadius: Math.max(0, token.cornerRadius - GLASS_RIM.inset),
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden', // clip the glass layer to the rounded corners
    padding: spacing.md,
    gap: spacing.sm,
  },
  // Only the top + left edges are lit; right/bottom stay 0-width so the sheen
  // tapers off toward the bottom-right, like a single light source catching the
  // top-left facet.
  rim: {
    position: 'absolute',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderTopColor: GLASS_RIM.color,
    borderLeftColor: GLASS_RIM.color,
  },
});
