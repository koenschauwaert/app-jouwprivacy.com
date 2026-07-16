// SPDX-License-Identifier: Apache-2.0
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { api, isApiClientError } from '@/api';
import { Account, AccountPatch } from '@/api/contract';
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
import type { RootStackParamList } from '@/navigation/types';
import { spacing } from '@/theme';

/** Account tab. View + edit own/delivery info. Any change requires 2FA. */
export function AccountScreen() {
  const { t } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data, loading, error, reload } = useAsync(() => api.getAccount(), []);

  return (
    <Screen edges={['left', 'right']}>
      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {data && <AccountForm initial={data} onSaved={reload} />}
      </AsyncBoundary>

      {/* Support entry - kept outside the AsyncBoundary so it stays reachable
          even if the account payload fails to load. */}
      <GlassCard variant="subtle">
        <Text variant="heading">{t('tickets.title')}</Text>
        <Text variant="caption" tone="muted">
          {t('tickets.intro')}
        </Text>
        <Button
          label={t('tickets.cta')}
          variant="secondary"
          onPress={() => navigation.navigate('Tickets')}
        />
      </GlassCard>
    </Screen>
  );
}

function AccountForm({ initial, onSaved }: { initial: Account; onSaved: () => void }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Account>(initial);
  const [show2fa, setShow2fa] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // keep draft in sync if the source data reloads (intentional prop→state sync)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(initial);
  }, [initial]);

  const setPersonal = (field: keyof Account['personal'], value: string) =>
    setDraft((prev) => ({ ...prev, personal: { ...prev.personal, [field]: value } }));
  const setDelivery = (field: keyof Account['delivery'], value: string) =>
    setDraft((prev) => ({ ...prev, delivery: { ...prev.delivery, [field]: value } }));

  const saveWithToken = async (confirmationToken: string) => {
    setShow2fa(false);
    setBusy(true);
    setError(null);
    try {
      const patch: AccountPatch = {
        confirmationToken,
        personal: draft.personal,
        delivery: draft.delivery,
      };
      await api.updateAccount(patch);
      setEditing(false);
      setSaved(true);
      onSaved();
    } catch (e) {
      // Surface a visible error and stay in edit mode with the draft intact,
      // rather than silently swallowing a failed save.
      if (!isApiClientError(e)) throw e;
      setError(t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <GlassCard>
        <Text variant="heading">{t('account.personal')}</Text>
        <ReadOrEdit
          editing={editing}
          label={t('account.firstName')}
          value={draft.personal.firstName}
          onChangeText={(v) => setPersonal('firstName', v)}
        />
        <ReadOrEdit
          editing={editing}
          label={t('account.lastName')}
          value={draft.personal.lastName}
          onChangeText={(v) => setPersonal('lastName', v)}
        />
        <ReadOrEdit
          editing={editing}
          label={t('account.email')}
          value={draft.personal.email}
          onChangeText={(v) => setPersonal('email', v)}
          keyboardType="email-address"
          maxLength={254}
        />
      </GlassCard>

      <GlassCard>
        <Text variant="heading">{t('account.delivery')}</Text>
        <ReadOrEdit
          editing={editing}
          label={t('account.street')}
          value={draft.delivery.street}
          onChangeText={(v) => setDelivery('street', v)}
        />
        <ReadOrEdit
          editing={editing}
          label={t('account.postalCode')}
          value={draft.delivery.postalCode}
          onChangeText={(v) => setDelivery('postalCode', v)}
          maxLength={12}
        />
        <ReadOrEdit
          editing={editing}
          label={t('account.city')}
          value={draft.delivery.city}
          onChangeText={(v) => setDelivery('city', v)}
        />
        <ReadOrEdit
          editing={editing}
          label={t('account.country')}
          value={draft.delivery.country}
          onChangeText={(v) => setDelivery('country', v)}
        />
      </GlassCard>

      {error && (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      )}
      {saved && !editing && <Text tone="success">{t('account.saved')}</Text>}

      {editing ? (
        <View style={styles.row}>
          <Button
            label={t('common.cancel')}
            variant="secondary"
            style={styles.flex}
            onPress={() => {
              setDraft(initial);
              setEditing(false);
            }}
          />
          <Button
            label={t('common.save')}
            style={styles.flex}
            loading={busy}
            onPress={() => setShow2fa(true)}
          />
        </View>
      ) : (
        <Button
          label={t('account.edit')}
          variant="secondary"
          onPress={() => {
            setSaved(false);
            setEditing(true);
          }}
        />
      )}

      <TwoFactorConfirmSheet
        visible={show2fa}
        onClose={() => setShow2fa(false)}
        onConfirmed={saveWithToken}
      />
    </View>
  );
}

function ReadOrEdit({
  editing,
  label,
  value,
  onChangeText,
  keyboardType,
  maxLength = 100,
}: {
  editing: boolean;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'email-address';
  maxLength?: number;
}) {
  if (editing) {
    return (
      <TextField
        label={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        maxLength={maxLength}
      />
    );
  }
  return (
    <View style={styles.field}>
      <Text variant="caption" tone="faint">
        {label}
      </Text>
      <Text>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  field: { gap: 2, marginTop: spacing.xs },
});
