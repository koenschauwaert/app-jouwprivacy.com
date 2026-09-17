// SPDX-License-Identifier: Apache-2.0
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { api, isApiClientError } from '@/api';
import { useI18n } from '@/i18n/I18nProvider';
import { TOTP_LENGTH } from '@/navigation/types';
import { colors, radius, spacing, SUCCESS_FLASH_MS } from '@/theme';
import { openAuthenticator } from '@/utils/links';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { CodeInput } from './CodeInput';
import { Text } from './Text';
import { TextField } from './TextField';

interface EnableTwoFactorSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called once 2FA is on AND the user acknowledged the recovery codes. */
  onEnabled: () => void;
}

type Step =
  | { kind: 'password' }
  | { kind: 'setup'; secret: string; otpauthUrl: string }
  | { kind: 'recovery'; codes: string[] };

/** Group a base32 key in fours so it can be read and typed without mistakes. */
const groupKey = (key: string) => key.match(/.{1,4}/g)?.join(' ') ?? key;

/**
 * Turn 2FA on (for an account that skipped it at signup). Three steps:
 *  1. confirm the CURRENT password (a hijacked session must not be able to
 *     plant its own authenticator);
 *  2. add the key to an authenticator app (deep link or copy) and enter the
 *     first code — 2FA only turns on once that verifies;
 *  3. show the recovery codes ONCE. The sheet can't be dismissed here; only the
 *     "saved" acknowledgement closes it.
 */
export function EnableTwoFactorSheet({ visible, onClose, onEnabled }: EnableTwoFactorSheetProps) {
  const [step, setStep] = useState<Step>({ kind: 'password' });

  const reset = () => setStep({ kind: 'password' });

  const close = () => {
    if (step.kind === 'recovery') return; // codes are shown once: require the ack
    reset();
    onClose();
  };

  const finish = () => {
    reset();
    onEnabled();
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      {step.kind === 'password' && (
        <PasswordStep
          onBegun={(secret, otpauthUrl) => setStep({ kind: 'setup', secret, otpauthUrl })}
        />
      )}
      {step.kind === 'setup' && (
        <SetupStep
          secret={step.secret}
          otpauthUrl={step.otpauthUrl}
          onConfirmed={(codes) => setStep({ kind: 'recovery', codes })}
        />
      )}
      {step.kind === 'recovery' && <RecoveryStep codes={step.codes} onDone={finish} />}
    </BottomSheet>
  );
}

function PasswordStep({ onBegun }: { onBegun: (secret: string, otpauthUrl: string) => void }) {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (loading || password.length === 0) return;
    setLoading(true);
    setError(undefined);
    try {
      const { secret, otpauthUrl } = await api.beginTwoFactorEnable({ password });
      onBegun(secret, otpauthUrl);
    } catch (e) {
      setError(
        isApiClientError(e) && e.code === 'MFA_INVALID'
          ? t('account.confirmPasswordInvalid')
          : t('errors.generic'),
      );
      setLoading(false);
    }
  };

  return (
    <>
      <Text variant="heading">{t('account.enableTwoFactorTitle')}</Text>
      <Text tone="muted">{t('account.enablePasswordHint')}</Text>
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
      <ErrorLine error={error} />
      <Button
        label={t('account.continue')}
        onPress={submit}
        loading={loading}
        disabled={loading || password.length === 0}
      />
    </>
  );
}

function SetupStep({
  secret,
  otpauthUrl,
  onConfirmed,
}: {
  secret: string;
  otpauthUrl: string;
  onConfirmed: (codes: string[]) => void;
}) {
  const { t } = useI18n();
  const [totp, setTotp] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // Ref guard so auto-accept (6th digit) and the button can't double-submit.
  const submitting = useRef(false);
  const flashRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(flashRef.current), []);

  const openApp = async () => {
    const opened = await openAuthenticator(otpauthUrl);
    setNotice(opened ? undefined : t('account.noAuthenticator'));
  };

  const copyKey = async () => {
    try {
      await Clipboard.setStringAsync(secret);
      setNotice(t('account.copied'));
    } catch {
      setNotice(t('errors.generic'));
    }
  };

  const submit = async (code: string) => {
    if (submitting.current || code.length < TOTP_LENGTH) return;
    submitting.current = true;
    setLoading(true);
    setError(undefined);
    try {
      const { recoveryCodes } = await api.confirmTwoFactorEnable({ totp: code });
      setSuccess(true);
      flashRef.current = setTimeout(() => onConfirmed(recoveryCodes), SUCCESS_FLASH_MS);
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
    <>
      <Text variant="heading">{t('account.enableTwoFactorTitle')}</Text>
      <Text tone="muted">{t('account.enableSetupHint')}</Text>
      <Button label={t('account.openAuthenticator')} onPress={openApp} />
      <View style={styles.keyBox}>
        <Text variant="caption" tone="faint">
          {t('account.secretKeyLabel')}
        </Text>
        <Text variant="label" selectable style={styles.mono}>
          {groupKey(secret)}
        </Text>
      </View>
      <Button label={t('account.copyKey')} variant="secondary" onPress={copyKey} />
      {!!notice && (
        <Text variant="caption" tone="muted" style={styles.center}>
          {notice}
        </Text>
      )}
      <Text tone="muted">{t('account.enableCodeHint')}</Text>
      <CodeInput
        value={totp}
        onChangeText={(v) => {
          setError(undefined);
          setTotp(v);
        }}
        onComplete={submit}
        length={TOTP_LENGTH}
        hasError={!!error}
        success={success}
      />
      <ErrorLine error={error} />
      <Button
        label={t('auth.verify')}
        onPress={() => submit(totp)}
        loading={loading}
        disabled={totp.length < TOTP_LENGTH || loading || success}
      />
    </>
  );
}

function RecoveryStep({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const { t } = useI18n();
  const [notice, setNotice] = useState<string | undefined>();

  const copyCodes = async () => {
    try {
      await Clipboard.setStringAsync(codes.join('\n'));
      setNotice(t('account.copied'));
    } catch {
      setNotice(t('errors.generic'));
    }
  };

  return (
    <>
      <Text variant="heading">{t('account.recoveryTitle')}</Text>
      <Text tone="success">{t('account.twoFactorEnabledNow')}</Text>
      <Text tone="muted">{t('account.recoveryIntro')}</Text>
      <View style={styles.codes}>
        {codes.map((code) => (
          <Text key={code} variant="label" selectable style={[styles.mono, styles.code]}>
            {code}
          </Text>
        ))}
      </View>
      <Button label={t('account.copyRecoveryCodes')} variant="secondary" onPress={copyCodes} />
      {!!notice && (
        <Text variant="caption" tone="muted" style={styles.center}>
          {notice}
        </Text>
      )}
      <Button label={t('account.recoverySaved')} onPress={onDone} />
    </>
  );
}

function ErrorLine({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <Text tone="danger" variant="caption" style={styles.center}>
      {error}
    </Text>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  keyBox: {
    gap: 2,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  mono: { letterSpacing: 1 },
  codes: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  code: { width: '48%', paddingVertical: spacing.xs, textAlign: 'center' },
});
