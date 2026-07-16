// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { spacing } from '@/theme';

interface ScreenProps {
  children?: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
  /**
   * Safe-area edges to inset. Defaults to all four for standalone screens
   * (no header/tab bar). Screens under a navigator header or tab bar should
   * drop the edges that chrome already consumes, e.g. `['left', 'right']`,
   * to avoid double insets.
   */
  edges?: readonly Edge[];
}

/** Standard dark screen wrapper with safe-area + consistent padding. */
export function Screen({
  children,
  scroll = true,
  contentStyle,
  refreshControl,
  edges = ['top', 'bottom', 'left', 'right'],
}: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.flex, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Transparent so the app-wide LivingBackground shows through; the dark base
  // is painted by that background.
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.md, gap: spacing.md },
  flex: { flex: 1 },
});
