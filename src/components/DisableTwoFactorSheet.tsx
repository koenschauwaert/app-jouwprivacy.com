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

interface DisableTwoFactorSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called after 2FA has been successfully disabled on the account. */
  onDisabled: () => void;
}

/**
 * Turn 2FA off. Confirms with a fresh 6-digit TOTP before calling
 * /auth/2fa/disable, mirroring the confirm gate's flow (auto-submit on the 6th
 * digit, green flash, then hand control back).
 */
export function DisableTwoFactorSheet({
  visible,
  onClose,
  onDisabled,
}: DisableTwoFactorSheetProps) {
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
      await api.disableTwoFactor({ totp: code });
      // Flash success, then notify the caller and reset.
      setSuccess(true);
      flashRef.current = setTimeout(() => {
        onDisabled();
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
      <Text variant="heading">{t('account.disableTwoFactorTitle')}</Text>
      <Text tone="muted">{t('account.disableTwoFactorHint')}</Text>
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
        label={t('account.disableTwoFactor')}
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
