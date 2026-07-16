// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { StyleSheet } from 'react-native';
import {
  CornerStyle,
  ExpoLiquidGlassView,
  LiquidGlassType,
} from 'expo-liquid-glass-view';

import { BlurBackground } from './BlurBackground';
import { currentGlassTier } from './glassTier';
import type { GlassBackgroundProps } from './glassBackgroundTypes';

// Map our token's plain string kind onto the native enum (kept out of the
// shared token so the native module isn't imported on non-iOS platforms).
const TYPE: Record<string, LiquidGlassType> = {
  clear: LiquidGlassType.Clear,
  tint: LiquidGlassType.Tint,
  regular: LiquidGlassType.Regular,
  interactive: LiquidGlassType.Interactive,
  identity: LiquidGlassType.Identity,
};

/**
 * iOS glass background. On iOS 26+ this is Apple's real system glass
 * (`expo-liquid-glass-view`); below that there is no system glassEffect, so we
 * fall through to the shared expo-blur card.
 */
function GlassBackgroundComponent({ token }: GlassBackgroundProps) {
  if (currentGlassTier() !== 'ios-native') {
    return <BlurBackground token={token} />;
  }
  return (
    <ExpoLiquidGlassView
      type={TYPE[token.ios.type] ?? LiquidGlassType.Regular}
      tint={token.ios.tint}
      cornerRadius={token.cornerRadius}
      cornerStyle={CornerStyle.Continuous}
      style={[StyleSheet.absoluteFill, styles.fill]}
    />
  );
}

export const GlassBackground = React.memo(GlassBackgroundComponent);

const styles = StyleSheet.create({
  // The library's wrapper defaults to alignSelf:'flex-start'; force it to fill.
  fill: { alignSelf: 'stretch' },
});
