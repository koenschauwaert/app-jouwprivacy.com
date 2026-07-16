// SPDX-License-Identifier: Apache-2.0
import React, { useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';

import { BlurTargetContext } from './glassContext';
import type { GlassBackgroundProps } from './glassBackgroundTypes';

/**
 * Fallback glass for native devices below the real-glass OS floor (iOS < 26,
 * Android < 33): the expo-blur frosted card that genuinely blurs the living
 * background. A low-opacity dark tint keeps it near-black, hue still showing.
 * Shared by both native `GlassBackground.*` files.
 */
function BlurBackgroundComponent({ token }: GlassBackgroundProps) {
  const blurTarget = useContext(BlurTargetContext) ?? undefined;
  return (
    <BlurView
      pointerEvents="none"
      intensity={token.intensity}
      tint="dark"
      blurMethod="dimezisBlurView"
      blurTarget={blurTarget}
      style={StyleSheet.absoluteFill}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: token.tint }]} />
    </BlurView>
  );
}

export const BlurBackground = React.memo(BlurBackgroundComponent);
