// SPDX-License-Identifier: Apache-2.0
import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { api, isApiClientError } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { Button, GlassCard, LanguageToggle, Screen, Text, TextField } from '@/components';
import { useI18n } from '@/i18n/I18nProvider';
import { spacing } from '@/theme';

interface LoginScreenProps {
  /** Called with the MFA token when the account has 2FA and a second step is needed. */
  onTwoFactorRequired: (mfaToken: string) => void;
}

export function LoginScreen({ onTwoFactorRequired }: LoginScreenProps) {
  const { t } = useI18n();
  const { completeLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  const submit = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await api.login({ email: email.trim(), password });
      if (response.mfaRequired) {
        // Account has 2FA: hand off to the second step to exchange the mfaToken.
        onTwoFactorRequired(response.mfaToken);
      } else {
        // No 2FA: the server already issued a session; complete login directly
        // (same path the 2FA step uses after verifyTwoFactor) and skip the screen.
        await completeLogin(response.session);
      }
    } catch (e) {
      setError(
        isApiClientError(e) && e.code === 'INVALID_CREDENTIALS'
          ? t('auth.invalidCredentials')
          : t('errors.generic'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <LanguageToggle />
      <View style={styles.header}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel={t('common.appName')}
        />
      </View>

      <TextField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="username"
      />
      <TextField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        textContentType="password"
        errorText={error}
      />
      <Button label={t('auth.login')} onPress={submit} loading={loading} disabled={!canSubmit} />

      {/* Privacy promise. Pinned to the bottom (marginTop:auto) so it fills the
          empty space below the form and tucks away under the keyboard while
          someone is typing their credentials. */}
      <GlassCard style={styles.footer}>
        <Text variant="label" tone="primary" style={styles.tagline}>
          {t('privacy.tagline')}
        </Text>
        <Text variant="caption" tone="muted" style={styles.center}>
          {t('privacy.body')}
        </Text>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // flexGrow lets the ScrollView content fill the screen so the footer's
  // marginTop:auto can push it to the bottom on tall screens.
  content: { flexGrow: 1, gap: spacing.lg, paddingTop: spacing.xl },
  header: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  // Logo source is 1212×466 (~2.6:1). Both dimensions are explicit so the New
  // Architecture (Fabric) can't fall back to the image's full intrinsic size;
  // resizeMode="contain" preserves the ratio within the box.
  logo: { width: 200, height: 77 },
  // GlassCard supplies its own padding + gap; we only need to pin it to the
  // bottom of the scroll content.
  footer: { marginTop: 'auto' },
  tagline: { textAlign: 'center', fontWeight: '700' },
  center: { textAlign: 'center' },
});
