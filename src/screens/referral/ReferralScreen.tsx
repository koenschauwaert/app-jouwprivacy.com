// SPDX-License-Identifier: Apache-2.0
import React, { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { api, isApiClientError } from '@/api';
import { Me, Referral } from '@/api/contract';
import {
  AsyncBoundary,
  Button,
  GlassCard,
  Screen,
  Text,
  TextField,
  TwoFactorConfirmSheet,
} from '@/components';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/i18n/I18nProvider';
import { spacing } from '@/theme';
import { formatMoney } from '@/utils/format';
import { isValidIban, normalizeIban } from '@/utils/iban';

const ACCOUNT_HOLDER_MAX = 70;

/** Referral tab. Earned amount, share code, and a payout *request* (manual). */
export function ReferralScreen() {
  // Load the referral data and the account's 2FA state in parallel; the payout
  // confirm gate needs `twoFactorEnabled` to pick TOTP vs. password.
  const { data, loading, error, reload } = useAsync<[Referral, Me]>(
    () => Promise.all([api.getReferral(), api.getMe()]),
    [],
  );

  return (
    <Screen edges={['left', 'right']}>
      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {data && (
          <ReferralContent
            referral={data[0]}
            twoFactorEnabled={data[1].twoFactorEnabled}
            onChanged={reload}
          />
        )}
      </AsyncBoundary>
    </Screen>
  );
}

function ReferralContent({
  referral,
  twoFactorEnabled,
  onChanged,
}: {
  referral: Referral;
  twoFactorEnabled: boolean;
  onChanged: () => void;
}) {
  const { t, language } = useI18n();
  const [showPayout, setShowPayout] = useState(false);
  const [show2fa, setShow2fa] = useState(false);
  const [iban, setIban] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const share = async () => {
    await Share.share({ message: `${referral.shareUrl}`, url: referral.shareUrl });
  };

  const submitWithToken = async (confirmationToken: string) => {
    setShow2fa(false);
    setBusy(true);
    setError(null);
    try {
      await api.requestPayout({
        confirmationToken,
        iban: normalizeIban(iban),
        accountHolder: accountHolder.trim(),
      });
      // Clear the entered payout details as soon as they've crossed the boundary.
      setIban('');
      setAccountHolder('');
      setSubmitted(true);
      setShowPayout(false);
      onChanged();
    } catch (e) {
      // Keep the form open with values intact so the user can retry; surface a
      // visible error instead of silently swallowing a failed money request.
      if (!isApiClientError(e)) throw e;
      setError(t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const ibanValid = isValidIban(iban);
  const ibanError = iban.trim().length > 0 && !ibanValid ? t('referral.ibanInvalid') : undefined;

  // Fall back to the total when an older server omits the split, so the screen
  // keeps working against either version.
  const availableCents = referral.availableCents ?? referral.earnedCents;
  const pendingCents = referral.pendingCents ?? 0;
  // The server is the authority on the threshold; treat an omitted flag as
  // allowed so an older server behaves as before.
  const payoutAllowed = referral.payoutAllowed !== false;

  const canRequest = payoutAllowed && ibanValid && accountHolder.trim().length > 0;

  return (
    <View style={styles.wrap}>
      <GlassCard style={styles.earnedCard}>
        <Text variant="caption" tone="faint">
          {t('referral.earned')}
        </Text>
        {/* Show what is actually payable. Credit becomes payable 7 days after
            the referred order is paid, so a bare total would promise money the
            payout button cannot yet release. */}
        <Text variant="title">
          {formatMoney(availableCents, referral.currency, language)}
        </Text>
        {pendingCents > 0 ? (
          <Text variant="caption" tone="muted">
            {t('referral.pending').replace(
              '{amount}',
              formatMoney(pendingCents, referral.currency, language),
            )}
          </Text>
        ) : null}
      </GlassCard>

      <GlassCard>
        <Text variant="caption" tone="faint">
          {t('referral.yourCode')}
        </Text>
        <Text variant="heading">{referral.code}</Text>
        <Button label={t('referral.share')} variant="secondary" onPress={share} />
      </GlassCard>

      {referral.payoutPending || submitted ? (
        <GlassCard>
          <Text tone="success">
            {submitted ? t('referral.payoutDone') : t('referral.payoutPending')}
          </Text>
        </GlassCard>
      ) : !payoutAllowed ? (
        <GlassCard>
          <Text variant="caption" tone="muted">
            {t('referral.payoutThreshold').replace(
              '{threshold}',
              formatMoney(
                referral.payoutThresholdCents ?? 2500,
                referral.currency,
                language,
              ),
            )}
          </Text>
        </GlassCard>
      ) : !showPayout ? (
        <Button label={t('referral.payout')} onPress={() => setShowPayout(true)} />
      ) : (
        <GlassCard>
          <Text variant="caption" tone="muted">
            {t('referral.payoutNote')}
          </Text>
          <TextField
            label={t('referral.iban')}
            value={iban}
            onChangeText={(v) => {
              setError(null);
              setIban(v);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={42}
            errorText={ibanError}
          />
          <TextField
            label={t('referral.accountHolder')}
            value={accountHolder}
            onChangeText={setAccountHolder}
            maxLength={ACCOUNT_HOLDER_MAX}
          />
          {error ? (
            <Text variant="caption" tone="danger">
              {error}
            </Text>
          ) : null}
          <Button
            label={t('referral.submit')}
            onPress={() => setShow2fa(true)}
            disabled={!canRequest}
            loading={busy}
          />
        </GlassCard>
      )}

      <TwoFactorConfirmSheet
        visible={show2fa}
        onClose={() => setShow2fa(false)}
        action="payout"
        twoFactorEnabled={twoFactorEnabled}
        onConfirmed={submitWithToken}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  earnedCard: { alignItems: 'flex-start' },
});
