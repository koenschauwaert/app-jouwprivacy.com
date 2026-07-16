// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { api, isApiClientError } from '@/api';
import { Order } from '@/api/contract';
import { AsyncBoundary, Button, GlassCard, Icon, Screen, Text } from '@/components';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, spacing } from '@/theme';
import { formatDate, formatMoney } from '@/utils/format';
import { openExternal } from '@/utils/links';

/** Bestellingen tab. Customer-wide order list + per-item retention timer. */
export function OrdersScreen() {
  const { t, language } = useI18n();
  const { data, loading, error, reload } = useAsync(() => api.getOrders(), []);

  return (
    <Screen edges={['left', 'right']}>
      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {(data?.length ?? 0) === 0 ? (
          <Text tone="muted">{t('orders.empty')}</Text>
        ) : (
          (data ?? []).map((order) => (
            <OrderRow key={order.id} order={order} language={language} t={t} />
          ))
        )}
      </AsyncBoundary>
    </Screen>
  );
}

function OrderRow({
  order,
  language,
  t,
}: {
  order: Order;
  language: ReturnType<typeof useI18n>['language'];
  t: ReturnType<typeof useI18n>['t'];
}) {
  const [downloading, setDownloading] = React.useState(false);

  const openInvoice = async () => {
    setDownloading(true);
    try {
      const { url } = await api.getInvoiceLink(order.id);
      // openExternal enforces https; the API client also validated it at the boundary.
      await openExternal(url);
    } catch (e) {
      // No invoice / transient error - silently ignore here; button hidden when none.
      if (!isApiClientError(e)) throw e;
    } finally {
      setDownloading(false);
    }
  };

  return (
    <GlassCard variant="subtle">
      <View style={styles.headerRow}>
        <Text style={styles.desc}>{order.description}</Text>
        <Text variant="label">{formatMoney(order.priceCents, order.currency, language)}</Text>
      </View>
      <Text variant="caption" tone="faint">
        {formatDate(order.orderedAt, language)}
      </Text>

      {/* Retention date is only exposed once the server's retention matrix is live;
          until then deletionDate is null and we omit the notice rather than show a date. */}
      {order.deletionDate ? (
        <View style={styles.deletion}>
          <Icon name="trash" size={16} color={colors.textMuted} />
          <Text variant="caption" tone="muted" style={styles.deletionText}>
            {t('orders.deletionNotice', { date: formatDate(order.deletionDate, language) })}
          </Text>
        </View>
      ) : null}

      {order.invoiceId ? (
        <Button
          label={t('orders.invoice')}
          variant="secondary"
          onPress={openInvoice}
          loading={downloading}
          style={styles.invoiceBtn}
        />
      ) : (
        <Text variant="caption" tone="faint">
          {t('orders.noInvoice')}
        </Text>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  desc: { flex: 1 },
  deletion: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  deletionText: { flex: 1 },
  invoiceBtn: { marginTop: spacing.sm },
});
