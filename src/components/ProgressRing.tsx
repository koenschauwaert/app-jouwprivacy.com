// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/theme';
import { Text } from './Text';

interface ProgressRingProps {
  /** 0..1 fraction consumed. */
  fraction: number;
  color: string;
  /** Title shown above the value, e.g. "Data". */
  title: string;
  /** Value shown below the ring, e.g. "18 / 50 GB". */
  value: string;
  /** Optional unit appended in the center, e.g. "GB". */
  centerUnit?: string;
  size?: number;
}

/**
 * Static SVG circular progress ring (no animation/history - keep it clean).
 * Used side-by-side for Data / Bellen / SMS on Home.
 */
export function ProgressRing({
  fraction,
  color,
  title,
  value,
  centerUnit,
  size = 96,
}: ProgressRingProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, fraction));
  const dashOffset = circumference * (1 - clamped);
  const percent = Math.round(clamped * 100);

  return (
    <View style={styles.wrap}>
      <Text variant="label" tone="muted">
        {title}
      </Text>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.ringTrack}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            fill="none"
            // start at 12 o'clock
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text variant="heading">{percent}%</Text>
          {!!centerUnit && (
            <Text variant="caption" tone="faint">
              {centerUnit}
            </Text>
          )}
        </View>
      </View>
      <Text variant="caption" tone="muted" style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6, flex: 1 },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { textAlign: 'center' },
});
