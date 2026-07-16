// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api';
import { Text } from '@/components';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, radius, spacing } from '@/theme';
import type { NetworkStatusIndicator } from '@/api/contract';

/**
 * Operational status of our technical network partner (§19 SHOW), fed ONLY by
 * our own /v1/network-status endpoint. The partner name and upstream source
 * never reach the app: the label is the endpoint's localized `description` and
 * the colour is chosen from the opaque `indicator`. On loading/error or an
 * explicit "onbeschikbaar" it shows a neutral pill - never an error state.
 *
 * The app palette is deliberately blue + neutrals + one green/amber and has no
 * red token, so these status dots are a small self-contained set that matches
 * the web pill (green/amber/red/blue/grey) - the one place a red is used.
 */
const DOT: Record<NetworkStatusIndicator, string> = {
  operationeel: '#29BF12',
  verstoring: '#FF9914',
  storing: '#E5484D',
  onderhoud: '#165DF5',
  onbeschikbaar: '#9A9AAE',
};

export function NetworkStatusPill() {
  const { t, language } = useI18n();
  const status = useAsync(() => api.getNetworkStatus(), []);

  const data = status.data;
  const fresh = !!data && !status.error && data.indicator !== 'onbeschikbaar';
  const indicator: NetworkStatusIndicator = fresh ? data!.indicator : 'onbeschikbaar';
  const label = fresh ? data!.description[language] : t('network.unavailable');

  return (
    <View style={styles.row}>
      <Text tone="muted" style={styles.caption}>
        {t('network.caption')}
      </Text>
      <View style={styles.pill}>
        <View style={[styles.dot, { backgroundColor: DOT[indicator] }]} />
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  caption: { fontSize: 13 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dot: { width: 9, height: 9, borderRadius: radius.pill },
  label: { fontSize: 14, fontWeight: '600' },
});
