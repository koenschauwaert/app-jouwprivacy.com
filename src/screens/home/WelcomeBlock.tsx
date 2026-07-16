// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, GlassCard, Text } from '@/components';
import { useI18n } from '@/i18n/I18nProvider';
import { SHOP_LINKS } from '@/config/links';
import { spacing } from '@/theme';
import { openExternal } from '@/utils/links';

/**
 * Shown to a brand-new customer with no SIM and no home-relevant order. This is
 * a welcome, NOT an empty/error state: it offers the two ways to get started,
 * both opening the web shop.
 */
export function WelcomeBlock() {
  const { t } = useI18n();

  return (
    <GlassCard style={styles.card}>
      <Text variant="heading">{t('home.welcome.title')}</Text>
      <Text tone="muted">{t('home.welcome.body')}</Text>
      <View style={styles.actions}>
        <Button label={t('home.welcome.orderSim')} onPress={() => openExternal(SHOP_LINKS.sim)} />
        <Button
          label={t('home.welcome.orderPhone')}
          variant="secondary"
          onPress={() => openExternal(SHOP_LINKS.phone)}
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
});
