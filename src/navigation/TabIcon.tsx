// SPDX-License-Identifier: Apache-2.0
import React from 'react';

import { Icon, type IconName } from '@/components';
import { colors } from '@/theme';
import type { TabsParamList } from './types';

const ICONS: Record<keyof TabsParamList, IconName> = {
  Home: 'home',
  Orders: 'orders',
  Referral: 'referral',
  Account: 'account',
};

export function TabIcon({ name, focused }: { name: keyof TabsParamList; focused: boolean }) {
  return <Icon name={ICONS[name]} size={24} color={focused ? colors.primary : colors.textMuted} />;
}
