// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { StyleSheet, Text as RNText, TextProps as RNTextProps } from 'react-native';

import { colors, fontFamilyForWeight, typography } from '@/theme';

type Variant = 'title' | 'heading' | 'body' | 'label' | 'caption';
type Tone = 'default' | 'muted' | 'faint' | 'primary' | 'danger' | 'success';

interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
}

const toneColor: Record<Tone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  faint: colors.textFaint,
  primary: colors.primary,
  danger: colors.danger,
  success: colors.success,
};

/** Themed text. Single place for typography + color + brand font (TASA Orbiter). */
export function Text({ variant = 'body', tone = 'default', style, ...rest }: TextProps) {
  // Pick the TASA Orbiter cut from the effective weight (variant + any override),
  // since RN won't synthesise weights from one family reliably.
  const flat = StyleSheet.flatten([typography[variant], style]);
  const fontFamily = fontFamilyForWeight(flat.fontWeight);
  return (
    <RNText
      style={[typography[variant], { color: toneColor[tone] }, style, { fontFamily }]}
      {...rest}
    />
  );
}

export const textStyles = StyleSheet.create({});
