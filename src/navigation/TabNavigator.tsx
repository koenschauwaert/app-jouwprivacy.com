// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { AccountScreen } from '@/screens/account/AccountScreen';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { OrdersScreen } from '@/screens/orders/OrdersScreen';
import { ReferralScreen } from '@/screens/referral/ReferralScreen';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, FONTS } from '@/theme';
import { LockButton } from './LockButton';
import { SettingsButton } from './SettingsButton';
import { TabIcon } from './TabIcon';
import type { TabsParamList } from './types';

const Tab = createBottomTabNavigator<TabsParamList>();

export function TabNavigator() {
  const { t } = useI18n();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Transparent scenes so the app-wide LivingBackground shows through.
        sceneStyle: { backgroundColor: 'transparent' },
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text, fontFamily: FONTS.bold, fontWeight: '700' },
        headerTintColor: colors.text,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <LockButton />
            <SettingsButton />
          </View>
        ),
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tabs.home') }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: t('tabs.orders') }} />
      <Tab.Screen
        name="Referral"
        component={ReferralScreen}
        options={{ title: t('tabs.referral') }}
      />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: t('tabs.account') }} />
    </Tab.Navigator>
  );
}
