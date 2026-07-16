// SPDX-License-Identifier: Apache-2.0
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { colors, FONTS, radius, spacing, typography } from '@/theme';
import { useI18n } from '@/i18n/I18nProvider';
import { Icon } from './icons';
import { Text } from './Text';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  errorText?: string;
}

export function TextField({ label, errorText, ...rest }: TextFieldProps) {
  const { t } = useI18n();
  const isPassword = rest.secureTextEntry === true;
  // Press-and-hold the eye to reveal - no on/off toggle. Released = hidden again.
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <View>
        <TextInput
          placeholderTextColor={colors.textFaint}
          {...rest}
          secureTextEntry={isPassword && !revealed}
          style={[
            styles.input,
            isPassword && styles.inputWithIcon,
            !!errorText && styles.inputError,
          ]}
        />
        {isPassword && (
          <Pressable
            style={styles.eye}
            onPressIn={() => setRevealed(true)}
            onPressOut={() => setRevealed(false)}
            accessibilityRole="button"
            accessibilityLabel={t('auth.showPassword')}
            hitSlop={spacing.sm}
          >
            <Icon
              name={revealed ? 'passwordShow' : 'passwordHide'}
              size={22}
              color={revealed ? colors.primary : colors.textMuted}
            />
          </Pressable>
        )}
      </View>
      {!!errorText && (
        <Text variant="caption" tone="danger">
          {errorText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  input: {
    ...typography.body,
    fontFamily: FONTS.regular,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  // Leave room for the eye button so long passwords don't slide under it.
  inputWithIcon: { paddingRight: spacing.xl + spacing.md },
  inputError: { borderColor: colors.danger },
  eye: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
});
