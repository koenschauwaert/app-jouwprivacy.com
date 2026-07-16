// SPDX-License-Identifier: Apache-2.0
import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Image, StyleSheet, View } from 'react-native';

import { Button, GlassCard, LanguageToggle, Screen, Text } from '@/components';
import { PinInput } from '@/components/PinInput';
import { PIN_MAX_ATTEMPTS, useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { verifyPin } from '@/storage/pin';
import { SUCCESS_FLASH_MS, spacing } from '@/theme';
import { PIN_LENGTH } from '@/navigation/types';

/**
 * Shown on every foreground return. PIN or biometric to unlock.
 * 3 failed PIN attempts wipe the session (handled in AuthContext) → login.
 */
export function LockScreen() {
  const { t } = useI18n();
  const { unlockWithPin, unlockWithBiometric, biometricEnabled, failedPinAttempts, logout } =
    useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const flashRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(flashRef.current), []);

  // Escape hatch for a forgotten PIN: wipe the local session + PIN and return to
  // the full login. Confirmed because it forces a fresh email+password+2FA login.
  const confirmSignOut = () => {
    Alert.alert(t('auth.signOut'), t('auth.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.signOut'), style: 'destructive', onPress: () => void logout() },
    ]);
  };

  // Auto-prompt biometrics when enabled - but ONLY while the app is actually in
  // the foreground. Prompting during the background→lock transition (lock phone
  // or leave the app) wedges Android's biometric prompt, after which even a
  // manual tap does nothing. If we're not active yet, wait until we are.
  useEffect(() => {
    if (!biometricEnabled) return;
    let prompted = false;
    const maybePrompt = () => {
      if (prompted || AppState.currentState !== 'active') return;
      prompted = true;
      void unlockWithBiometric();
    };
    maybePrompt();
    const sub = AppState.addEventListener('change', maybePrompt);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (candidate: string) => {
    // Verify read-only first so we can flash the dots green BEFORE the unlock
    // transition unmounts this screen. unlockWithPin (called after the flash)
    // re-verifies and switches to 'unlocked'.
    if (await verifyPin(candidate)) {
      setSuccess(true);
      flashRef.current = setTimeout(() => void unlockWithPin(candidate), SUCCESS_FLASH_MS);
      return;
    }
    // Wrong PIN: let AuthContext count the attempt (and wipe after the limit).
    await unlockWithPin(candidate);
    setError(true);
    setPin('');
  };

  const onChange = (next: string) => {
    if (success) return; // frozen during the green flash
    setError(false);
    setPin(next);
    if (next.length === PIN_LENGTH) void submit(next);
  };

  const attemptsLeft = PIN_MAX_ATTEMPTS - failedPinAttempts;

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <LanguageToggle />
      <View style={styles.header}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel={t('common.appName')}
        />
        <Text tone="muted">{t('auth.lockTitle')}</Text>
      </View>

      <PinInput
        value={pin}
        onChangeText={onChange}
        length={PIN_LENGTH}
        autoFocus
        hasError={error}
        success={success}
      />

      {error && (
        <Text tone="danger" variant="caption" style={styles.center}>
          {t('auth.wrongPin')} {t('auth.attemptsLeft', { n: Math.max(0, attemptsLeft) })}
        </Text>
      )}

      {/* Privacy promise, centered in the empty space between the PIN and the
          bottom actions (equal flex spacers above + below). */}
      <View style={styles.spacer} />
      <GlassCard>
        <Text variant="label" tone="primary" style={styles.tagline}>
          {t('privacy.tagline')}
        </Text>
        <Text variant="caption" tone="muted" style={styles.center}>
          {t('privacy.body')}
        </Text>
      </GlassCard>
      <View style={styles.spacer} />

      {biometricEnabled && (
        <Button
          label={t('auth.lockUseBiometric')}
          variant="secondary"
          onPress={() => unlockWithBiometric()}
        />
      )}

      <View style={styles.signOut}>
        <Text variant="caption" tone="faint" style={styles.center}>
          {t('auth.forgotPin')}
        </Text>
        <Button label={t('auth.signOut')} variant="secondary" onPress={confirmSignOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Matches LoginScreen so the logo lands in the exact same spot on both.
  content: { gap: spacing.lg, paddingTop: spacing.xl },
  header: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  // Same explicit dimensions as the login logo (source 1212×466, ~2.6:1).
  logo: { width: 200, height: 77 },
  center: { textAlign: 'center' },
  tagline: { textAlign: 'center', fontWeight: '700' },
  spacer: { flex: 1 },
  signOut: { gap: spacing.xs },
});
