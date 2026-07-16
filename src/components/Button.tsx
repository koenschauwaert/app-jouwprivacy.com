// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  /**
   * Looks disabled (grayed-out) but remains tappable - used for the V1
   * "coming soon" actions whose tap opens an info sheet.
   */
  grayed?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  grayed = false,
  loading = false,
  style,
  accessibilityHint,
}: ButtonProps) {
  const isInert = disabled || loading;
  const looksDisabled = disabled || grayed;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInert }}
      accessibilityHint={accessibilityHint}
      disabled={isInert}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        looksDisabled && styles.disabled,
        pressed && !isInert && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            variant === 'ghost' && { color: colors.primary },
            looksDisabled && { color: colors.disabledText },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  ghost: { backgroundColor: 'transparent', minHeight: 44 },
  disabled: { backgroundColor: colors.disabled },
  pressed: { opacity: 0.7 },
  label: { ...typography.label, color: colors.text, fontSize: 16 },
});
