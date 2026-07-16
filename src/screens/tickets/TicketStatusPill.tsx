// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components';
import { useI18n } from '@/i18n/I18nProvider';
import { radius, spacing } from '@/theme';
import type { TicketStatus } from '@/api/contract';
import { STATUS_CONFIG } from './ticketLabels';

/** Status chip for a support ticket (open / in behandeling / opgelost). */
export function TicketStatusPill({ status }: { status: TicketStatus }) {
  const { t } = useI18n();
  const { color, icon, key } = STATUS_CONFIG[status];
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
