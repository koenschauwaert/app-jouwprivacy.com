// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { Pressable } from 'react-native';

import { Icon } from '@/components';
import { useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, spacing } from '@/theme';

/** Top-right padlock that locks the app (PIN/biometrics to re-enter). */
export function LockButton() {
  const { t } = useI18n();
  const { lock } = useAuth();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('settings.lock')}
      hitSlop={12}
      onPress={lock}
      style={{ paddingHorizontal: spacing.xs }}
    >
      <Icon name="lock" size={24} color={colors.text} />
    </Pressable>
  );
}
