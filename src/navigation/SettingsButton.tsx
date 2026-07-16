// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Icon } from '@/components';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, spacing } from '@/theme';
import type { RootStackParamList } from './types';

/** Top-right gear that opens Settings (a stacked screen, not a tab). */
export function SettingsButton() {
  const { t } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('settings.title')}
      hitSlop={12}
      onPress={() => navigation.navigate('Settings')}
      style={{ paddingHorizontal: spacing.md }}
    >
      <Icon name="settings" size={24} color={colors.text} />
    </Pressable>
  );
}
