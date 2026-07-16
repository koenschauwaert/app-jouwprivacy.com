// SPDX-License-Identifier: Apache-2.0
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, LanguageToggle, Screen, Text } from '@/components';
import { useAuth } from '@/auth/AuthContext';
import { isBiometricAvailable } from '@/auth/biometrics';
import { useI18n } from '@/i18n/I18nProvider';
import { spacing } from '@/theme';

/**
 * Opt-in offer for biometric unlock (first run). If the device has no
 * biometric hardware/enrollment, skip straight into the app.
 */
export function BiometricOptInScreen() {
  const { t } = useI18n();
  const { chooseBiometric } = useAuth();
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    isBiometricAvailable()
      .then((ok) => {
        if (!active) return;
        setAvailable(ok);
        if (!ok) void chooseBiometric(false);
      })
      .catch(() => {
        // Availability check errored: treat as unavailable and skip into the app
        // rather than dead-ending on the blank placeholder.
        if (!active) return;
        setAvailable(false);
        void chooseBiometric(false);
      });
    return () => {
      active = false;
    };
  }, [chooseBiometric]);

  if (available !== true) {
    return <Screen scroll={false} />;
  }

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <LanguageToggle />
      <View style={styles.header}>
        <Text variant="title">{t('auth.biometricTitle')}</Text>
        <Text tone="muted">{t('auth.biometricHint')}</Text>
      </View>
      <View style={styles.spacer} />
      <Button label={t('auth.biometricEnable')} onPress={() => chooseBiometric(true)} />
      <Button
        label={t('auth.biometricSkip')}
        variant="secondary"
        onPress={() => chooseBiometric(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.xl },
  header: { gap: spacing.xs, marginBottom: spacing.md },
  spacer: { flex: 1 },
});
