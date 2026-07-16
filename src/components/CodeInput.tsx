// SPDX-License-Identifier: Apache-2.0
import React, { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { useI18n } from '@/i18n/I18nProvider';
import { colors, radius, spacing } from '@/theme';
import { Icon } from './icons';
import { Text } from './Text';

interface CodeInputProps {
  value: string;
  onChangeText: (next: string) => void;
  length?: number;
  autoFocus?: boolean;
  hasError?: boolean;
  /** Briefly turn every box green to confirm an accepted code. */
  success?: boolean;
  /** Fires once all `length` digits are entered - use it to auto-submit. */
  onComplete?: (value: string) => void;
  /** Show the "Paste" affordance below the boxes (default true). */
  showPaste?: boolean;
}

/**
 * Segmented numeric code entry (e.g. a 6-digit 2FA code): one box per digit with
 * the next box highlighted. A real full-size TextInput is laid transparently
 * OVER the boxes so a tap is a native tap on the input - that reliably opens the
 * soft keyboard (programmatic `.focus()` does not on Android). The boxes just
 * mirror the input's value; OS one-time-code autofill still works.
 *
 * A "Paste" button sits below the boxes. The clipboard is read ONLY on that tap
 * (never proactively) - a silent read would trip the OS "pasted from…" banner
 * and clashes with the privacy-first promise.
 */
export function CodeInput({
  value,
  onChangeText,
  length = 6,
  autoFocus,
  hasError,
  success,
  onComplete,
  showPaste = true,
}: CodeInputProps) {
  const { t } = useI18n();
  const inputRef = useRef<TextInput>(null);
  const focus = () => inputRef.current?.focus();

  const commit = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, length);
    onChangeText(digits);
    if (digits.length === length) onComplete?.(digits);
    return digits;
  };

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (commit(text).length < length) focus(); // let them finish typing
    } catch {
      // clipboard unavailable / denied - silently ignore, typing still works
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.rowWrap}>
        <View style={styles.row} pointerEvents="none">
          {Array.from({ length }).map((_, i) => {
            const char = value[i] ?? '';
            const active = i === value.length; // the next box to fill
            return (
              <View
                key={i}
                style={[
                  styles.cell,
                  active && styles.cellActive,
                  hasError && styles.cellError,
                  success && styles.cellSuccess,
                ]}
              >
                <Text variant="heading" style={styles.digit}>
                  {char}
                </Text>
              </View>
            );
          })}
        </View>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={commit}
          keyboardType="number-pad"
          autoFocus={autoFocus}
          maxLength={length}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          caretHidden
          accessibilityLabel={t('auth.totp')}
          style={styles.input}
        />
      </View>

      {showPaste && (
        <Pressable
          style={styles.paste}
          onPress={handlePaste}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.paste')}
        >
          <Icon name="paste" size={18} color={colors.textMuted} />
          <Text variant="label" tone="muted">
            {t('common.paste')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  // Relative wrapper so the transparent input can absolutely fill the box row.
  rowWrap: { justifyContent: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  cell: {
    flex: 1,
    maxWidth: 52,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: { borderColor: colors.primary, backgroundColor: colors.surface },
  cellError: { borderColor: colors.danger },
  cellSuccess: { borderColor: colors.success, backgroundColor: 'rgba(41, 191, 18, 0.15)' },
  digit: { fontSize: 24 },
  // Invisible overlay: fully transparent (opacity 0) but still focusable and
  // tappable, so it opens the keyboard and receives OS one-time-code autofill
  // while the boxes do all the rendering. `opacity: 0` (not just transparent
  // text) because Android can paint "transparent" input text as black.
  input: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    textAlign: 'center',
  },
  paste: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
});
