// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { ChangePinScreen } from '@/screens/settings/ChangePinScreen';
import { TicketsScreen } from '@/screens/tickets/TicketsScreen';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, FONTS } from '@/theme';
import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function MainNavigator() {
  const { t } = useI18n();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text, fontFamily: FONTS.bold, fontWeight: '700' },
        headerTintColor: colors.text,
        // Transparent so the app-wide LivingBackground shows through.
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('settings.title'), presentation: 'modal' }}
      />
      <Stack.Screen
        name="ChangePin"
        component={ChangePinScreen}
        options={{ title: t('settings.changePin') }}
      />
      <Stack.Screen
        name="Tickets"
        component={TicketsScreen}
        options={{ title: t('tickets.title') }}
      />
    </Stack.Navigator>
  );
}
