// SPDX-License-Identifier: Apache-2.0
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen, Text } from '@/components';
import { PinInput } from '@/components/PinInput';
import { useAuth } from '@/auth/AuthContext';
import { verifyPin } from '@/storage/pin';
import { useI18n } from '@/i18n/I18nProvider';
import { SUCCESS_FLASH_MS, spacing } from '@/theme';
import { PIN_LENGTH } from '@/navigation/types';
import type { RootStackParamList } from '@/navigation/types';

type Stage = 'current' | 'new' | 'confirm';

/**
 * Change the unlock PIN. A full screen (not a bottom sheet) so the keyboard
 * never overlaps the dots: the step title and 5-dot input sit at the top while
 * the keyboard fills the bottom. Three steps - verify the CURRENT PIN (so a
 * grabbed, already-unlocked phone can't silently have its PIN changed), then
 * enter the new PIN, then confirm it.
 */
export function ChangePinScreen() {
  const { t } = useI18n();
  const { changePin } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [stage, setStage] = useState<Stage>('current');
  const [entry, setEntry] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [success, setSuccess] = useState(false);
  const flashRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Guards the async current-PIN check so a fast re-entry can't double-fire it.
  const verifying = useRef(false);

  useEffect(() => () => clearTimeout(flashRef.current), []);

  const busy = accepted || success;

  const advance = (next: Stage) => {
    setAccepted(true);
    flashRef.current = setTimeout(() => {
      setAccepted(false);
      setEntry('');
      setStage(next);
    }, SUCCESS_FLASH_MS);
  };

  const onChange = (next: string) => {
    if (busy) return; // frozen during a flash
    setError(false);
    setEntry(next);
    if (next.length !== PIN_LENGTH) return;

    if (stage === 'current') {
      // Gate the change on the current PIN (hashed compare, so async).
      if (verifying.current) return;
      verifying.current = true;
      void (async () => {
        try {
          if (await verifyPin(next)) {
            advance('new');
          } else {
            setError(true);
            setEntry('');
          }
        } finally {
          verifying.current = false;
        }
      })();
      return;
    }

    if (stage === 'new') {
      setNewPin(next);
      advance('confirm');
      return;
    }

    // stage === 'confirm'
    if (next !== newPin) {
      // Mismatch: surface the error and restart from the new-PIN step (the
      // current PIN stays verified).
      setError(true);
      setNewPin('');
      setEntry('');
      setStage('new');
      return;
    }
    // Match: flash the dots solid green, then persist and close.
    setSuccess(true);
    flashRef.current = setTimeout(() => {
      void changePin(next).then(() => navigation.goBack());
    }, SUCCESS_FLASH_MS);
  };

  const title =
    stage === 'current'
      ? t('auth.pinCurrentTitle')
      : stage === 'confirm'
        ? t('auth.pinConfirmTitle')
        : t('auth.pinChangeTitle');
  const hint =
    stage === 'current'
      ? t('auth.pinCurrentHint')
      : stage === 'confirm'
        ? t('auth.pinConfirmHint')
        : t('auth.pinChangeHint');
  const errorText = stage === 'current' ? t('auth.pinWrongCurrent') : t('auth.pinMismatch');

  return (
    <Screen scroll={false} edges={['bottom', 'left', 'right']} contentStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="heading">{title}</Text>
        <Text tone="muted" style={styles.center}>
          {hint}
        </Text>
      </View>

      <PinInput
        value={entry}
        onChangeText={onChange}
        length={PIN_LENGTH}
        autoFocus
        hasError={error}
        success={success}
        accepted={accepted}
      />

      {error && (
        <Text tone="danger" variant="caption" style={styles.center}>
          {errorText}
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingTop: spacing.xl },
  header: { alignItems: 'center', gap: spacing.sm },
  center: { textAlign: 'center' },
});
