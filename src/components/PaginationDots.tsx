// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

interface PaginationDotsProps {
  count: number;
  activeIndex: number;
  onSelect?: (index: number) => void;
}

/** • • • indicator for multi-number Home cards (swipe is the bonus gesture). */
export function PaginationDots({ count, activeIndex, onSelect }: PaginationDotsProps) {
  if (count <= 1) return null;
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {Array.from({ length: count }).map((_, i) => {
        const active = i === activeIndex;
        return (
          <Pressable
            key={i}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            hitSlop={8}
            onPress={() => onSelect?.(i)}
          >
            <View style={[styles.dot, active ? styles.active : styles.inactive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  active: { backgroundColor: colors.primary, width: 20 },
  inactive: { backgroundColor: colors.border },
});
