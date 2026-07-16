// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components';
import { colors, radius, spacing } from '@/theme';

/**
 * Per-block placeholder shown on first load (not a whole-screen blocker). Plain
 * muted bars - dark-only, no animation library, deliberately minimal.
 */
export function HomeBlockSkeleton() {
  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <View style={[styles.bar, styles.short]} />
        <View style={[styles.bar, styles.wide]} />
        <View style={styles.rings} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md },
  card: { gap: spacing.sm },
  bar: { height: 14, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  short: { width: '40%' },
  wide: { width: '70%' },
  rings: { height: 120, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, marginTop: spacing.sm },
});
