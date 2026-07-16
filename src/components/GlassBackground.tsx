// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { GlassBackgroundProps } from './glassBackgroundTypes';

/**
 * Default (web / unsupported) glass background: a clean flat translucent dark
 * card. Real native glass lives in `GlassBackground.ios.tsx` /
 * `GlassBackground.android.tsx`; metro picks those on device. This is the floor
 * - intentional, never broken - but never the target.
 */
function GlassBackgroundComponent(_props: GlassBackgroundProps) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flat]} />;
}

export const GlassBackground = React.memo(GlassBackgroundComponent);

const styles = StyleSheet.create({
  // Semi-transparent near-black; the faint light rim is drawn by GlassCard.
  flat: { backgroundColor: 'rgba(21, 21, 29, 0.85)' },
});
