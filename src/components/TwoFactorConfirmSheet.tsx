// SPDX-License-Identifier: Apache-2.0
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { api, isApiClientError } from '@/api';
import { ConfirmAction } from '@/api/contract';
import { useI18n } from '@/i18n/I18nProvider';
import { SUCCESS_FLASH_MS } from '@/theme';
import { TOTP_LENGTH } from '@/navigation/types';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { CodeInput } from './CodeInput';
import { Text } from './Text';
import { TextField } from './TextField';

interface TwoFactorConfirmSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Sensitive action being confirmed; forwarded to /auth/confirm (required). */
  action: ConfirmAction;
  /** Whether the account has 2FA: drives TOTP vs. password confirmation. */
  twoFactorEnabled: boolean;
  /** Called with a fresh confirmation token after a valid TOTP / password. */
  onConfirmed: (confirmationToken: string) => void;
}

/**
 * Reusable re-confirmation gate. Required before any sensitive change (account
 * edits, payout request). Mints a confirmationToken via /auth/confirm: an
 * account WITH 2FA confirms with a TOTP code, one WITHOUT 2FA with its password.
 */
export function TwoFactorConfirmSheet({
  visible,
  onClose,
  action,
  twoFactorEnabled,
  onConfirmed,
}: TwoFactorConfirmSheetProps) {
  const { t } = useI18n();
  const [totp, setTotp] = useState('');
  const [password, setPassword] = useState('');
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
    setPassword('');
    setError(undefined);
    setLoading(false);
    setSuccess(false);
    submitting.current = false;
  };

  const close = () => {
    reset();
    onClose();
  };

  const invalidLabel = twoFactorEnabled
    ? t('auth.invalidTotp')
    : t('account.confirmPasswordInvalid');

  const confirmWith = async (payload: { totp: string } | { password: string }) => {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError(undefined);
    try {
      const { confirmationToken } = await api.confirm({ action, ...payload });
      // Flash success, then hand the token back and reset.
      setSuccess(true);
      flashRef.current = setTimeout(() => {
        onConfirmed(confirmationToken);
        reset();
      }, SUCCESS_FLASH_MS);
    } catch (e) {
      setError(
        isApiClientError(e) && e.code === 'MFA_INVALID' ? invalidLabel : t('errors.generic'),
      );
      setLoading(false);
      submitting.current = false;
    }
  };

  const submitTotp = (code: string) => {
    if (code.length < TOTP_LENGTH) return;
    void confirmWith({ totp: code });
  };

  const submitPassword = () => {
    if (password.length === 0) return;
    void confirmWith({ password });
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      <Text variant="heading">{t('account.confirmTitle')}</Text>
      <Text tone="muted">
        {twoFactorEnabled ? t('account.confirmHint') : t('account.confirmPasswordHint')}
      </Text>

      {twoFactorEnabled ? (
        <CodeInput
          value={totp}
          onChangeText={(v) => {
            setError(undefined);
            setTotp(v);
          }}
          onComplete={submitTotp}
          length={TOTP_LENGTH}
          autoFocus
          hasError={!!error}
          success={success}
        />
      ) : (
        <TextField
          label={t('account.confirmPasswordLabel')}
          value={password}
          onChangeText={(v) => {
            setError(undefined);
            setPassword(v);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          autoFocus
        />
      )}

      {!!error && (
        <Text tone="danger" variant="caption" style={styles.error}>
          {error}
        </Text>
      )}
      <Button
        label={t('auth.verify')}
        onPress={twoFactorEnabled ? () => submitTotp(totp) : submitPassword}
        loading={loading}
        disabled={
          success ||
          loading ||
          (twoFactorEnabled ? totp.length < TOTP_LENGTH : password.length === 0)
        }
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  error: { textAlign: 'center' },
});
