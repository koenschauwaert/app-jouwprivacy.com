// SPDX-License-Identifier: Apache-2.0
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { api } from '@/api';
import { Subscription } from '@/api/contract';
import { Button, GlassCard, InfoSheet, ProgressRing, StatusPill, Text } from '@/components';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, spacing } from '@/theme';
import { formatDate, formatDateTime, formatUsageValue, usageFraction } from '@/utils/format';
import { FreedomTopUp } from './FreedomTopUp';

/** Only the Freedom plan supports the 1 GB/day SMS top-up ("extra" -> 1282). */
const FREEDOM_PLAN_NAME = 'Freedom';

interface SubscriptionCardProps {
  subscription: Subscription;
  width: number;
  /**
   * Bumped by the Home pull-to-refresh. Included in the usage loader's deps so
   * a pull re-fetches the cached usage (and its "last updated" stamp), which
   * each card owns independently of the subscriptions list.
   */
  refreshSignal?: number;
}

type SheetKind = 'renew' | 'extras' | null;

/** One Home card per MSISDN. Fetches its own cached usage. */
export function SubscriptionCard({ subscription, width, refreshSignal }: SubscriptionCardProps) {
  const { t, language } = useI18n();
  const [sheet, setSheet] = useState<SheetKind>(null);

  const isActive = subscription.status === 'active';
  const usageState = useAsync(
    () => api.getUsage(subscription.id),
    [subscription.id, isActive, refreshSignal],
  );

  const period =
    subscription.endDate != null
      ? t('home.fromTo', {
          start: formatDate(subscription.startDate, language),
          end: formatDate(subscription.endDate, language),
        })
      : t('home.fromOpen', { start: formatDate(subscription.startDate, language) });

  return (
    <View style={{ width }}>
      <GlassCard style={styles.card}>
        <Text variant="caption" tone="faint">
          {t('home.plan')}
        </Text>
        <View style={styles.titleRow}>
          <Text variant="heading">{subscription.planName}</Text>
          <StatusPill status={subscription.status} />
        </View>

        <Field label={t('home.number')} value={subscription.msisdn} />
        <Field label={t('home.period')} value={period} />

        {subscription.status === 'awaiting_activation' ? (
          <Text tone="muted" style={styles.awaiting}>
            {t('home.awaitingBody')}
          </Text>
        ) : isActive ? (
          <UsageRings loading={usageState.loading} usage={usageState.data} />
        ) : null}

        {isActive && subscription.planName === FREEDOM_PLAN_NAME ? <FreedomTopUp /> : null}

        {/* Grayed-out in V1; tapping opens a "coming soon" info sheet. */}
        <View style={styles.actions}>
          <Button
            label={t('home.renew')}
            variant="secondary"
            grayed
            style={styles.action}
            onPress={() => setSheet('renew')}
          />
          <Button
            label={t('home.orderExtras')}
            variant="secondary"
            grayed
            style={styles.action}
            onPress={() => setSheet('extras')}
          />
        </View>
      </GlassCard>

      <InfoSheet
        visible={sheet === 'renew'}
        title={t('home.renew')}
        body={t('home.renewSoon')}
        onClose={() => setSheet(null)}
      />
      <InfoSheet
        visible={sheet === 'extras'}
        title={t('home.orderExtras')}
        body={t('home.extrasSoon')}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text variant="caption" tone="faint">
        {label}
      </Text>
      <Text>{value}</Text>
    </View>
  );
}

function UsageRings({
  loading,
  usage,
}: {
  loading: boolean;
  usage: ReturnType<typeof useAsync<import('@/api/contract').Usage>>['data'];
}) {
  const { t, language } = useI18n();

  if (loading) {
    return (
      <View style={styles.ringsLoading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!usage) return null;

  const fairUseSuffix = (on: boolean) => (on ? ` (${t('home.fairUse')})` : '');

  return (
    <View style={styles.usage}>
      <View style={styles.rings}>
        <ProgressRing
          title={t('home.usageData')}
          color={colors.ringData}
          fraction={usageFraction(usage.data.used, usage.data.limit)}
          value={`${formatUsageValue(usage.data.used, usage.data.limit, 'data', language)} ${t('home.unitData')}${fairUseSuffix(usage.data.fairUse)}`}
        />
        <ProgressRing
          title={t('home.usageVoice')}
          color={colors.ringVoice}
          fraction={usageFraction(usage.voice.used, usage.voice.limit)}
          value={`${formatUsageValue(usage.voice.used, usage.voice.limit, 'voice', language)} ${t('home.unitVoice')}${fairUseSuffix(usage.voice.fairUse)}`}
        />
        <ProgressRing
          title={t('home.usageSms')}
          color={colors.ringSms}
          fraction={usageFraction(usage.sms.used, usage.sms.limit)}
          value={`${formatUsageValue(usage.sms.used, usage.sms.limit, 'sms', language)}${fairUseSuffix(usage.sms.fairUse)}`}
        />
      </View>
      <Text variant="caption" tone="faint" style={styles.lastUpdated}>
        {t('home.lastUpdated', { dateTime: formatDateTime(usage.lastUpdatedAt, language) })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  field: { gap: 2, marginTop: spacing.xs },
  awaiting: { marginVertical: spacing.md },
  usage: { marginTop: spacing.md, gap: spacing.sm },
  rings: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  ringsLoading: { height: 140, alignItems: 'center', justifyContent: 'center' },
  lastUpdated: { textAlign: 'center', marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  action: { flex: 1 },
});
