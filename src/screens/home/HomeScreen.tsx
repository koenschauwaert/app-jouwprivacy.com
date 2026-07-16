// SPDX-License-Identifier: Apache-2.0
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Button, Text } from '@/components';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, spacing } from '@/theme';
import { HomeBlockSkeleton } from './HomeBlockSkeleton';
import { NetworkStatusPill } from './NetworkStatusPill';
import { OrderBlock } from './OrderBlock';
import { SimBlock } from './SimBlock';
import { WelcomeBlock } from './WelcomeBlock';

/**
 * Thuis tab - an adaptive dashboard that always makes sense regardless of the
 * customer's state. Three blocks render in a fixed order, each only when it
 * applies:
 *   1. SIM block        - if the customer has >= 1 subscription
 *   2. Order block      - if the BFF returns a home-relevant (hardware) order
 *   3. Welcome / CTA    - if there is no SIM AND no home-relevant order
 *
 * No dynamic reordering: SIMs stay on top when present; otherwise the order
 * block (or the welcome block) naturally becomes the hero.
 */
export function HomeScreen() {
  const { t } = useI18n();
  const subs = useAsync(() => api.getSubscriptions(), []);
  const homeOrder = useAsync(() => api.getHomeRelevantOrder(), []);
  // Per-card usage is owned by each SubscriptionCard, not by this screen. Bump
  // a nonce on refresh and thread it down so a pull re-fetches usage too.
  const [usageRefresh, setUsageRefresh] = useState(0);

  const onRefresh = useCallback(() => {
    subs.reload();
    homeOrder.reload();
    setUsageRefresh((n) => n + 1);
  }, [subs, homeOrder]);

  const subsList = subs.data ?? [];
  const hasSim = subsList.length > 0;
  // Order-block errors degrade silently to "no order block" - it is glanceable,
  // not core. Only a subscriptions failure blocks the screen with a retry.
  const order = homeOrder.data;

  // `subs.data === null` only before the first subscriptions response, so it
  // marks the initial load; afterwards it is an array (even when empty) and any
  // further loading is a pull-to-refresh. The welcome block waits for the order
  // load to settle (no `homeOrder.loading`) so it can't flash before an order.
  const initialLoad = subs.data === null && !subs.error;
  const isRefreshing = subs.data !== null && (subs.loading || homeOrder.loading);
  const errorMessage = subs.error?.code === 'NETWORK' ? t('errors.network') : t('errors.generic');

  // No 'top' edge on the SafeAreaView below: this screen sits under the tab
  // navigator header, which already consumes the top inset. Re-applying it here
  // double-insets and leaves a large gap below the header.
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <NetworkStatusPill />
        {initialLoad ? (
          <HomeBlockSkeleton />
        ) : subs.error ? (
          <View style={styles.center}>
            <Text tone="muted" style={styles.errorText}>
              {errorMessage}
            </Text>
            <Button label={t('common.retry')} variant="secondary" onPress={onRefresh} />
          </View>
        ) : (
          <>
            {hasSim ? <SimBlock subscriptions={subsList} refreshSignal={usageRefresh} /> : null}
            {order ? (
              <View style={styles.padded}>
                <OrderBlock order={order} hero={!hasSim} />
              </View>
            ) : null}
            {!hasSim && !order && homeOrder.loading ? <HomeBlockSkeleton /> : null}
            {!hasSim && !order && !homeOrder.loading ? (
              <View style={styles.padded}>
                <WelcomeBlock />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingVertical: spacing.md, gap: spacing.lg, flexGrow: 1 },
  padded: { paddingHorizontal: spacing.md },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorText: { textAlign: 'center' },
});
