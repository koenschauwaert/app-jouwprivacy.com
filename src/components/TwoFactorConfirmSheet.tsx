// SPDX-License-Identifier: Apache-2.0
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { api, isApiClientError } from '@/api';
import { useI18n } from '@/i18n/I18nProvider';
import { SUCCESS_FLASH_MS } from '@/theme';
import { TOTP_LENGTH } from '@/navigation/types';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { CodeInput } from './CodeInput';
import { Text } from './Text';

interface TwoFactorConfirmSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called with a fresh confirmation token after a valid TOTP. */
  onConfirmed: (confirmationToken: string) => void;
}

/**
 * Reusable 2FA re-confirmation gate. Required before any sensitive change
 * (account edits, payout request). Mints a confirmationToken via /auth/confirm.
 */
export function TwoFactorConfirmSheet({
  visible,
  onClose,
  onConfirmed,
}: TwoFactorConfirmSheetProps) {
  const { t } = useI18n();
  const [totp, setTotp] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // Ref guard so auto-accept (6th digit) and the button can't double-submit.
  const submitting = useRef(false);
  const flashRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(flashRef.current), []);

  const reset = () => {
    clearTimeout(flashRef.current);
    setTotp('');
    setError(undefined);
    setLoading(false);
    setSuccess(false);
    submitting.current = false;
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async (code: string) => {
    if (submitting.current || code.length < TOTP_LENGTH) return;
    submitting.current = true;
    setLoading(true);
    setError(undefined);
    try {
      const { confirmationToken } = await api.confirm(code);
      // Flash the boxes green, then hand the token back and reset.
      setSuccess(true);
      flashRef.current = setTimeout(() => {
        onConfirmed(confirmationToken);
        reset();
      }, SUCCESS_FLASH_MS);
    } catch (e) {
      setError(
        isApiClientError(e) && e.code === 'MFA_INVALID'
          ? t('auth.invalidTotp')
          : t('errors.generic'),
      );
      setLoading(false);
      submitting.current = false;
    }
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      <Text variant="heading">{t('account.confirmTitle')}</Text>
      <Text tone="muted">{t('account.confirmHint')}</Text>
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
      {!!error && (
        <Text tone="danger" variant="caption" style={styles.error}>
          {error}
        </Text>
      )}
      <Button
        label={t('auth.verify')}
        onPress={() => submit(totp)}
        loading={loading}
        disabled={totp.length < TOTP_LENGTH || loading || success}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  error: { textAlign: 'center' },
});
