// SPDX-License-Identifier: Apache-2.0
import React from 'react';

import { useI18n } from '@/i18n/I18nProvider';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Text } from './Text';

interface InfoSheetProps {
  visible: boolean;
  title: string;
  body: string;
  onClose: () => void;
}

/** "deze functie komt eraan" sheet shared by the grayed-out V1 actions. */
export function InfoSheet({ visible, title, body, onClose }: InfoSheetProps) {
  const { t } = useI18n();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text variant="heading">{title}</Text>
      <Text tone="muted">{body}</Text>
      <Button label={t('common.ok')} onPress={onClose} />
    </BottomSheet>
  );
}
