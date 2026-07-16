// SPDX-License-Identifier: Apache-2.0
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, Card, Screen, Text } from '@/components';
import { useAuth } from '@/auth/AuthContext';
import { isBiometricAvailable } from '@/auth/biometrics';
import { useI18n } from '@/i18n/I18nProvider';
import { Language } from '@/i18n/translations';
import { colors, spacing } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import { SUPPORT_LINKS } from '@/config/links';
import { openExternal } from '@/utils/links';

/** Settings (top-right button, not a tab). App-level config only. */
export function SettingsScreen() {
  const { t, language, setLanguage } = useI18n();
  const { biometricEnabled, toggleBiometric, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
  }, []);

  const onToggleBiometric = async (value: boolean) => {
    if (value && !bioAvailable) return;
    await toggleBiometric(value);
  };

  const languages: { key: Language; label: string }[] = [
    { key: 'nl', label: t('settings.dutch') },
    { key: 'en', label: t('settings.english') },
  ];

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <Card>
        <Button
          label={t('settings.changePin')}
          variant="secondary"
          onPress={() => navigation.navigate('ChangePin')}
        />
      </Card>

      <Card>
        <View style={[styles.row, !bioAvailable && styles.rowDisabled]}>
          <Text tone={bioAvailable ? 'default' : 'faint'}>{t('settings.biometric')}</Text>
          <Switch
            value={biometricEnabled}
            onValueChange={onToggleBiometric}
            disabled={!bioAvailable}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.text}
          />
        </View>
      </Card>

      <Card>
        <Text variant="label" tone="muted">
          {t('settings.language')}
        </Text>
        <View style={styles.langRow}>
          {languages.map((l) => (
            <Button
              key={l.key}
              label={l.label}
              variant={language === l.key ? 'primary' : 'secondary'}
              style={styles.langButton}
              onPress={() => setLanguage(l.key)}
            />
          ))}
        </View>
      </Card>

      <Button label={t('settings.logout')} variant="secondary" onPress={logout} />

      <Pressable
        accessibilityRole="link"
        onPress={() => openExternal(SUPPORT_LINKS.contact)}
        style={styles.reportBugRow}
      >
        <Text variant="caption" tone="muted" style={styles.reportBug}>
          {t('settings.reportBug')}
        </Text>
      </Pressable>

      <Text variant="caption" tone="faint" style={styles.version}>
        {t('settings.version')} {Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowDisabled: { opacity: 0.5 },
  langRow: { flexDirection: 'row', gap: spacing.sm },
  // Tighter side padding so "Nederlands" fits on one line even at large system
  // font sizes (e.g. older Samsung devices with increased font scale).
  langButton: { flex: 1, paddingHorizontal: spacing.sm },
  reportBugRow: { marginTop: spacing.md, alignSelf: 'center' },
  reportBug: { textAlign: 'center', textDecorationLine: 'underline' },
  version: { textAlign: 'center', marginTop: spacing.md },
});
