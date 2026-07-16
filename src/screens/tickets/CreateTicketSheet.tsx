// SPDX-License-Identifier: Apache-2.0
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, isApiClientError } from '@/api';
import type { Subscription, TicketType } from '@/api/contract';
import { BottomSheet, Button, Text, TextField } from '@/components';
import { useI18n } from '@/i18n/I18nProvider';
import { spacing } from '@/theme';
import { requiresSim, TICKET_TYPES, ticketTypeLabelKey } from './ticketLabels';

interface CreateTicketSheetProps {
  visible: boolean;
  onClose: () => void;
  /** The caller's own SIMs, for the (opaque) subscription picker. */
  subscriptions: Subscription[];
  /** Called after a ticket is created so the list can refresh. */
  onCreated: () => void;
}

interface FieldErrors {
  sim?: string;
  description?: string;
  form?: string;
}

/**
 * Slide-up form to file a support ticket. Mirrors the server contract: a SIM is
 * required for every type except "anders"; the description is always required.
 * Create is auth + CSRF only - no 2FA confirmation (a locked decision).
 */
export function CreateTicketSheet({
  visible,
  onClose,
  subscriptions,
  onCreated,
}: CreateTicketSheetProps) {
  const { t } = useI18n();
  const [type, setType] = useState<TicketType | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setType(null);
    setSubscriptionId(null);
    setDescription('');
    setErrors({});
    setBusy(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const pickType = (next: TicketType) => {
    setType(next);
    setErrors((prev) => ({ ...prev, sim: undefined }));
  };

  const submit = async () => {
    if (!type) return;
    const trimmed = description.trim();
    const nextErrors: FieldErrors = {};
    if (requiresSim(type) && !subscriptionId) nextErrors.sim = t('tickets.simRequired');
    if (trimmed === '') nextErrors.description = t('tickets.descriptionRequired');
    if (nextErrors.sim || nextErrors.description) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setBusy(true);
    try {
      await api.createTicket({
        type,
        description: trimmed,
        subscriptionId: subscriptionId ?? undefined,
      });
      reset();
      onCreated();
    } catch (e) {
      if (!isApiClientError(e)) throw e;
      setErrors({ form: t('errors.generic') });
      setBusy(false);
    }
  };

  // "anders" may be filed without a SIM; offer an explicit "no specific SIM".
  const showSimPicker = type !== null;
  const simOptional = type !== null && !requiresSim(type);

  return (
    <BottomSheet visible={visible} onClose={close}>
      <Text variant="heading">{t('tickets.newTitle')}</Text>

      <View style={styles.group}>
        <Text variant="label" tone="muted">
          {t('tickets.type')}
        </Text>
        {TICKET_TYPES.map((option) => (
          <Button
            key={option}
            label={t(ticketTypeLabelKey(option))}
            variant={type === option ? 'primary' : 'secondary'}
            onPress={() => pickType(option)}
          />
        ))}
      </View>

      {showSimPicker && (
        <View style={styles.group}>
          <Text variant="label" tone="muted">
            {t('tickets.sim')}
          </Text>
          {simOptional && (
            <Button
              label={t('tickets.simNone')}
              variant={subscriptionId === null ? 'primary' : 'secondary'}
              onPress={() => setSubscriptionId(null)}
            />
          )}
          {subscriptions.map((sub) => (
            <Button
              key={sub.id}
              label={`${sub.planName} · ${sub.msisdn}`}
              variant={subscriptionId === sub.id ? 'primary' : 'secondary'}
              onPress={() => setSubscriptionId(sub.id)}
            />
          ))}
          {errors.sim ? (
            <Text variant="caption" tone="danger">
              {errors.sim}
            </Text>
          ) : null}
        </View>
      )}

      <TextField
        label={t('tickets.description')}
        value={description}
        onChangeText={setDescription}
        placeholder={t('tickets.descriptionPlaceholder')}
        multiline
        numberOfLines={4}
        maxLength={2000}
        textAlignVertical="top"
        errorText={errors.description}
      />

      {errors.form ? (
        <Text variant="caption" tone="danger">
          {errors.form}
        </Text>
      ) : null}

      <Button
        label={t('tickets.submit')}
        onPress={submit}
        loading={busy}
        disabled={type === null}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
});
