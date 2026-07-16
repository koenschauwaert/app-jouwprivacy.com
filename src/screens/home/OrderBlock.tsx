// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { Order, OrderStatus } from '@/api/contract';
import { GlassCard, Icon, Text } from '@/components';
import { useI18n } from '@/i18n/I18nProvider';
import { SHOP_LINKS } from '@/config/links';
import { colors, radius, spacing } from '@/theme';
import { formatDate } from '@/utils/format';
import { openExternal } from '@/utils/links';
import type { TabsParamList } from '@/navigation/types';

/**
 * The single home-relevant order the BFF designates. Hardware/shippable only.
 *
 * Until Sendcloud is wired, every shipment field is null and we degrade to a
 * plain "ordered / being processed" line - no fake tracking stepper, no
 * invented statuses. When the BFF later returns real shipment fields, the
 * status line lights up. PII stays off this glanceable card (no address); the
 * full detail is one tap away on the Orders tab.
 */
export function OrderBlock({ order, hero }: { order: Order; hero: boolean }) {
  const { t, language } = useI18n();
  const navigation = useNavigation<BottomTabNavigationProp<TabsParamList>>();

  // "Shipment data" = anything Sendcloud populates. `status` alone is not enough
  // to draw a stepper (it would be inventing progress we cannot evidence yet).
  const hasShipmentData =
    order.trackingUrl !== null ||
    order.carrier !== null ||
    order.estimatedDelivery !== null ||
    order.deliveredAt !== null;

  const orderedOn = formatDate(order.orderedAt, language);
  const degradedLine =
    order.status === 'pending' || order.status === 'processing'
      ? t('home.order.processing', { date: orderedOn })
      : t('home.order.placed', { date: orderedOn });

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.order.a11yCard')}
        onPress={() => navigation.navigate('Orders')}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <GlassCard>
          <View style={styles.headerRow}>
            <Icon name="orders" size={20} color={colors.primary} />
            <Text variant="label" tone="muted">
              {hero ? t('home.order.onWay') : t('home.order.title')}
            </Text>
          </View>

          <Text variant="heading">{order.description}</Text>

          {hasShipmentData ? (
            <ShipmentStatus status={order.status} estimatedDelivery={order.estimatedDelivery} />
          ) : (
            <Text variant="caption" tone="faint">
              {degradedLine}
            </Text>
          )}
        </GlassCard>
      </Pressable>

      {hero ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => openExternal(SHOP_LINKS.sim)}
          style={({ pressed }) => [styles.prompt, pressed && styles.pressed]}
          hitSlop={8}
        >
          <Text variant="caption" tone="primary">
            {t('home.order.noSimPrompt')}
          </Text>
        </Pressable>
      ) : null}
    </>
  );
}

const STEPS: {
  status: OrderStatus;
  key: 'statusPending' | 'statusProcessing' | 'statusShipped' | 'statusDelivered';
}[] = [
  { status: 'pending', key: 'statusPending' },
  { status: 'processing', key: 'statusProcessing' },
  { status: 'shipped', key: 'statusShipped' },
  { status: 'delivered', key: 'statusDelivered' },
];

/** Simple Besteld → Verwerkt → Verzonden → Bezorgd line, lit up to current step. */
function ShipmentStatus({
  status,
  estimatedDelivery,
}: {
  status: OrderStatus;
  estimatedDelivery: string | null;
}) {
  const { t, language } = useI18n();
  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <View style={styles.shipment}>
      <View style={styles.steps}>
        {STEPS.map((step, i) => {
          const reached = currentIndex >= 0 && i <= currentIndex;
          return (
            <View key={step.status} style={styles.step}>
              <View style={[styles.dot, reached ? styles.dotReached : styles.dotPending]} />
              <Text variant="caption" tone={reached ? 'default' : 'faint'}>
                {t(`home.order.${step.key}`)}
              </Text>
            </View>
          );
        })}
      </View>
      {estimatedDelivery ? (
        <Text variant="caption" tone="muted">
          {t('home.order.eta', { date: formatDate(estimatedDelivery, language) })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pressed: { opacity: 0.7 },
  prompt: { paddingHorizontal: spacing.xs, paddingTop: spacing.sm },
  shipment: { gap: spacing.sm, marginTop: spacing.xs },
  steps: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  step: { flex: 1, alignItems: 'center', gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
  dotReached: { backgroundColor: colors.primary },
  dotPending: { backgroundColor: colors.border },
});
