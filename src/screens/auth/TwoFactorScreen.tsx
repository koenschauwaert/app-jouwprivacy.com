// SPDX-License-Identifier: Apache-2.0
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { api, isApiClientError } from '@/api';
import {
  Button,
  CodeInput,
  LanguageToggle,
  RecoveryCodeInput,
  Screen,
  Text,
} from '@/components';
import { useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { SUCCESS_FLASH_MS, spacing } from '@/theme';
import { TOTP_LENGTH } from '@/navigation/types';
import { isRecoveryCodeComplete, normalizeRecoveryCode } from '@/utils/recoveryCode';

interface TwoFactorScreenProps {
  /** Short-lived token issued by the login step, exchanged for a session. */
  mfaToken: string;
}

type Mode = 'totp' | 'recovery';

export function TwoFactorScreen({ mfaToken }: TwoFactorScreenProps) {
  const { t } = useI18n();
  const { completeLogin } = useAuth();
  const [mode, setMode] = useState<Mode>('totp');
  const [totp, setTotp] = useState('');
  const [recovery, setRecovery] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // Ref guard so auto-accept (6th digit) and the button can't double-submit.
  const submitting = useRef(false);
  const flashRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(flashRef.current), []);

  const recoveryMode = mode === 'recovery';
  const ready = recoveryMode ? isRecoveryCodeComplete(recovery) : totp.length === TOTP_LENGTH;
  // TOTP is a 6-digit code; a recovery code is sent dash-stripped (the server
  // normalises either way, but we send the canonical form).
  const invalidLabel = recoveryMode ? t('auth.invalidRecoveryCode') : t('auth.invalidTotp');

  const submit = async (raw: string) => {
    const code = recoveryMode ? normalizeRecoveryCode(raw) : raw;
    if (submitting.current || !ready) return;
    submitting.current = true;
    setLoading(true);
    setError(undefined);
    try {
      const session = await api.verifyTwoFactor({ mfaToken, totp: code });
      // Flash the boxes green, then transition away from the auth stack.
      setSuccess(true);
      flashRef.current = setTimeout(() => void completeLogin(session), SUCCESS_FLASH_MS);
    } catch (e) {
      setError(
        isApiClientError(e) && e.code === 'MFA_INVALID' ? invalidLabel : t('errors.generic'),
      );
      setLoading(false);
      submitting.current = false;
    }
  };

  const switchMode = (next: Mode) => {
    if (loading || success) return;
    setMode(next);
    setError(undefined);
    setTotp('');
    setRecovery('');
  };

  return (
    <Screen contentStyle={styles.content}>
      <LanguageToggle />
      <View style={styles.header}>
        <Text variant="title">{t('auth.twoFactorTitle')}</Text>
        <Text tone="muted">
          {recoveryMode ? t('auth.recoveryHint') : t('auth.twoFactorHint')}
        </Text>
      </View>

      {recoveryMode ? (
        <RecoveryCodeInput
          value={recovery}
          onChangeText={(v) => {
            setError(undefined);
            setRecovery(v);
          }}
          autoFocus
          hasError={!!error}
        />
      ) : (
        <CodeInput
          value={totp}
          onChangeText={(v) => {
            setError(undefined);
            setTotp(v);
          }}
          onComplete={submit}
          length={TOTP_LENGTH}
          autoFocus
          hasError={!!error}
          success={success}
        />
      )}

      {!!error && (
        <Text tone="danger" variant="caption" style={styles.error}>
          {error}
        </Text>
      )}

      <Button
        label={t('auth.verify')}
        onPress={() => submit(recoveryMode ? recovery : totp)}
        loading={loading}
        disabled={!ready || loading || success}
      />

      <Pressable
        onPress={() => switchMode(recoveryMode ? 'totp' : 'recovery')}
        hitSlop={8}
        accessibilityRole="button"
        disabled={loading || success}
        style={styles.switch}
      >
        <Text variant="label" tone="muted" style={styles.switchText}>
          {recoveryMode ? t('auth.useAuthenticator') : t('auth.useRecoveryCode')}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingTop: spacing.xl },
  header: { gap: spacing.xs, marginBottom: spacing.md },
  error: { textAlign: 'center' },
  switch: { alignSelf: 'center', paddingVertical: spacing.xs },
  switchText: { textDecorationLine: 'underline' },
});
