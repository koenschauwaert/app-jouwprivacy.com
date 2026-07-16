// SPDX-License-Identifier: Apache-2.0
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, LanguageToggle, Screen, Text } from '@/components';
import { PinInput, type PinInputHandle } from '@/components/PinInput';
import { useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { SUCCESS_FLASH_MS, spacing } from '@/theme';
import { PIN_LENGTH } from '@/navigation/types';

type Phase = 'enter' | 'confirm';

/**
 * Reserved header height: fits the title + a up-to-two-line hint. The header
 * fills this fixed slot so the PIN dots below it stay at the exact same vertical
 * position on the enter and confirm phases - independent of how many lines the
 * hint takes (different copy, locale, or font scaling).
 */
const HEADER_MIN_HEIGHT = 96;

/** First-run PIN setup: enter once, then confirm. PIN is mandatory. */
export function PinSetupScreen() {
  const { t } = useI18n();
  const { setupPin } = useAuth();
  const [phase, setPhase] = useState<Phase>('enter');
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const flashRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pinRef = useRef<PinInputHandle>(null);

  useEffect(() => () => clearTimeout(flashRef.current), []);

  // Keyboard choreography. It auto-opens on mount; we dismiss it during the
  // green flash so no stray digits land between phases, and re-open it when a
  // fresh entry phase begins. autoFocus only fires on first mount, so the
  // confirm step (the same PinInput instance) needs this explicit re-focus.
  useEffect(() => {
    if (accepted || success) return;
    const id = setTimeout(() => pinRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, [phase, accepted, success]);

  const isConfirm = phase === 'confirm';
  const current = isConfirm ? second : first;
  const setCurrent = isConfirm ? setSecond : setFirst;
  const complete = current.length === PIN_LENGTH;

  // Driven by the value so it works whether it fires from auto-complete (the
  // 5th digit) or the button. Takes the PIN explicitly to avoid reading
  // not-yet-committed state.
  const submit = (pin: string) => {
    if (saving || accepted) return;
    setError(undefined);
    if (!isConfirm) {
      setFirst(pin);
      // Briefly outline the dots green to acknowledge the 5th digit registered,
      // then advance to the confirm step (mirrors the green flash on save).
      // Close the keyboard for the flash so the user can't keep typing into the
      // next phase; the phase-change effect re-opens it for the confirm entry.
      setAccepted(true);
      pinRef.current?.blur();
      flashRef.current = setTimeout(() => {
        setAccepted(false);
        setPhase('confirm');
      }, SUCCESS_FLASH_MS);
      return;
    }
    if (pin !== first) {
      setError(t('auth.pinMismatch'));
      setFirst('');
      setSecond('');
      setPhase('enter');
      return;
    }
    // Match: flash the dots green, then persist (which transitions onward).
    // Dismiss the keyboard for the flash so it isn't left hanging over the
    // success state before the screen transitions away.
    setSaving(true);
    setSuccess(true);
    pinRef.current?.blur();
    flashRef.current = setTimeout(() => void setupPin(pin), SUCCESS_FLASH_MS);
  };

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <LanguageToggle />
      {/* Fixed-height slot so the PIN dots below never shift with the header. */}
      <View style={styles.header}>
        <Text variant="title" style={styles.center}>
          {isConfirm ? t('auth.pinConfirmTitle') : t('auth.pinSetupTitle')}
        </Text>
        <Text tone="muted" style={styles.center} numberOfLines={2}>
          {isConfirm ? t('auth.pinConfirmHint') : t('auth.pinSetupHint')}
        </Text>
      </View>

      <PinInput
        ref={pinRef}
        value={current}
        onChangeText={setCurrent}
        onComplete={submit}
        length={PIN_LENGTH}
        autoFocus
        hasError={!!error}
        success={success}
        accepted={accepted}
      />
      {!!error && (
        <Text tone="danger" variant="caption" style={styles.center}>
          {error}
        </Text>
      )}

      <View style={styles.spacer} />
      <Button
        label={isConfirm ? t('common.save') : t('common.next')}
        onPress={() => submit(current)}
        disabled={!complete || saving || accepted}
        loading={saving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingTop: spacing.xl, justifyContent: 'flex-start' },
  header: {
    minHeight: HEADER_MIN_HEIGHT,
    gap: spacing.xs,
    alignItems: 'center',
    // Anchor the text to the bottom of the reserved slot so the hint stays right
    // above the dots; any unused height sits above the title, not below the hint.
    justifyContent: 'flex-end',
    marginBottom: spacing.lg,
  },
  center: { textAlign: 'center' },
  spacer: { flex: 1 },
});
