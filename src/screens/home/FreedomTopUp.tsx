// SPDX-License-Identifier: Apache-2.0
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet, Button, Icon, InfoSheet, Text } from '@/components';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, spacing } from '@/theme';
import { openSms } from '@/utils/links';

/**
 * Freedom-only data top-up. The customer adds 1 GB for the day (max 3x/day) by
 * texting "extra" to 1282. We never send the SMS ourselves: the button opens
 * the OS messaging app pre-filled so the customer confirms and sends it. A
 * confirm sheet explains this before opening; the (?) icon explains the why.
 */
const TOPUP_RECIPIENT = '1282';
const TOPUP_KEYWORD = 'extra';

type Sheet = 'confirm' | 'help' | null;

export function FreedomTopUp() {
  const { t } = useI18n();
  const [sheet, setSheet] = useState<Sheet>(null);
  const vars = { keyword: TOPUP_KEYWORD, number: TOPUP_RECIPIENT };

  const send = () => {
    setSheet(null);
    void openSms(TOPUP_RECIPIENT, TOPUP_KEYWORD);
  };

  return (
    <View style={styles.row}>
      <Button
        label={t('home.topUp.button')}
        style={styles.button}
        onPress={() => setSheet('confirm')}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.topUp.helpA11y')}
        onPress={() => setSheet('help')}
        hitSlop={8}
        style={styles.help}
      >
        <Icon name="help" color={colors.textMuted} size={22} />
      </Pressable>

      <BottomSheet visible={sheet === 'confirm'} onClose={() => setSheet(null)}>
        <Text variant="heading">{t('home.topUp.confirmTitle')}</Text>
        <Text tone="muted">{t('home.topUp.confirmBody', vars)}</Text>
        <Button label={t('home.topUp.confirmCta')} onPress={send} />
        <Button label={t('common.cancel')} variant="secondary" onPress={() => setSheet(null)} />
      </BottomSheet>

      <InfoSheet
        visible={sheet === 'help'}
        title={t('home.topUp.helpTitle')}
        body={t('home.topUp.helpBody', vars)}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  button: { flex: 1 },
  help: { padding: spacing.xs },
});
