// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { SubscriptionStatus } from '@/api/contract';
import { useI18n } from '@/i18n/I18nProvider';
import { Icon, type IconName } from './icons';
import { Text } from './Text';

type T = ReturnType<typeof useI18n>['t'];

const config: Record<SubscriptionStatus, { color: string; icon: IconName; key: Parameters<T>[0] }> =
  {
    active: { color: colors.success, icon: 'check', key: 'home.active' },
    // "Awaiting activation" collapses to the same short "Niet actief" label as
    // lapsed - the card shows the explanatory awaitingBody text separately.
    awaiting_activation: { color: colors.textMuted, icon: 'pending', key: 'home.lapsed' },
    lapsed: { color: colors.textMuted, icon: 'pending', key: 'home.lapsed' },
    expired: { color: colors.expired, icon: 'expired', key: 'home.expired' },
  };

export function StatusPill({ status }: { status: SubscriptionStatus }) {
  const { t } = useI18n();
  const { color, icon, key } = config[status];
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Icon name={icon} size={14} color={color} />
      <Text variant="caption" style={{ color }}>
        {t(key)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
});
