// SPDX-License-Identifier: Apache-2.0
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api';
import type { Subscription, Ticket } from '@/api/contract';
import { AsyncBoundary, Button, GlassCard, Screen, Text } from '@/components';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/i18n/I18nProvider';
import { spacing } from '@/theme';
import { formatDate } from '@/utils/format';
import { CreateTicketSheet } from './CreateTicketSheet';
import { TicketStatusPill } from './TicketStatusPill';
import { ticketTypeLabelKey } from './ticketLabels';

/** Storingen - list of the customer's support tickets + a form to file one. */
export function TicketsScreen() {
  const { t, language } = useI18n();
  const { data, loading, error, reload } = useAsync(() => api.getTickets(), []);
  const subs = useAsync(() => api.getSubscriptions(), []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [created, setCreated] = useState(false);

  const onCreated = () => {
    setSheetOpen(false);
    setCreated(true);
    reload();
  };

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <Button
        label={t('tickets.new')}
        onPress={() => {
          setCreated(false);
          setSheetOpen(true);
        }}
      />

      {created && <Text tone="success">{t('tickets.created')}</Text>}

      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {(data?.length ?? 0) === 0 ? (
          <Text tone="muted">{t('tickets.empty')}</Text>
        ) : (
          (data ?? []).map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              subscriptions={subs.data ?? []}
              language={language}
              t={t}
            />
          ))
        )}
      </AsyncBoundary>

      <CreateTicketSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        subscriptions={subs.data ?? []}
        onCreated={onCreated}
      />
    </Screen>
  );
}

function TicketCard({
  ticket,
  subscriptions,
  language,
  t,
}: {
  ticket: Ticket;
  subscriptions: Subscription[];
  language: ReturnType<typeof useI18n>['language'];
  t: ReturnType<typeof useI18n>['t'];
}) {
  // Resolve the opaque sub_ id to a human number; omit the line if unknown.
  const sim = subscriptions.find((s) => s.id === ticket.subscriptionId);

  return (
    <GlassCard variant="subtle">
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t(ticketTypeLabelKey(ticket.type))}</Text>
        <TicketStatusPill status={ticket.status} />
      </View>

      <Text variant="caption" tone="faint">
        {t('tickets.reportedOn', { date: formatDate(ticket.createdAt, language) })}
        {sim ? ` · ${sim.msisdn}` : ''}
      </Text>

      <Text>{ticket.description}</Text>

      {ticket.adminResponse ? (
        <View style={styles.response}>
          <Text variant="label" tone="muted">
            {t('tickets.response')}
          </Text>
          <Text>{ticket.adminResponse}</Text>
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  title: { flex: 1 },
  response: { gap: 2, marginTop: spacing.xs },
});
