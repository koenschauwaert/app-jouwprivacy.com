// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useI18n } from '@/i18n/I18nProvider';
import { colors, radius, spacing, typography } from '@/theme';
import { formatRecoveryInput } from '@/utils/recoveryCode';

interface RecoveryCodeInputProps {
  /** Display value (masked, e.g. "ABCDE-FG2H9"). */
  value: string;
  /** Receives the next masked value; never auto-submits (codes are scarce). */
  onChangeText: (next: string) => void;
  autoFocus?: boolean;
  hasError?: boolean;
}

/**
 * Single masked field for a recovery (scratch) code - the fallback when the
 * authenticator is unavailable. Unlike the segmented numeric CodeInput this
 * accepts letters, so it can't reuse it. Masking ([formatRecoveryInput]) keeps
 * the input to the server's alphabet and groups it as XXXXX-XXXXX; the screen
 * strips the dash before sending. Deliberately no auto-submit - the user taps
 * Verify, so a mistyped scratch code isn't burned on a stray keystroke.
 */
export function RecoveryCodeInput({
  value,
  onChangeText,
  autoFocus,
  hasError,
}: RecoveryCodeInputProps) {
  const { t } = useI18n();
  return (
    <View style={styles.wrap}>
      <TextInput
        value={value}
        onChangeText={(raw) => onChangeText(formatRecoveryInput(raw))}
        autoFocus={autoFocus}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        textContentType="oneTimeCode"
        placeholder="XXXXX-XXXXX"
        placeholderTextColor={colors.textFaint}
        accessibilityLabel={t('auth.recoveryCode')}
        style={[styles.input, hasError && styles.inputError]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  input: {
    ...typography.heading,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 4,
    minWidth: 220,
    height: 58,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  inputError: { borderColor: colors.danger },
});
