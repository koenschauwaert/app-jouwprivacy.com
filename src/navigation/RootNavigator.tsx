// SPDX-License-Identifier: Apache-2.0
import React, { useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { BlurTargetView } from 'expo-blur';

import { useAuth } from '@/auth/AuthContext';
import { BlurTargetContext } from '@/components';
import { LivingBackground } from '@/components/LivingBackground';
import { BiometricOptInScreen } from '@/screens/auth/BiometricOptInScreen';
import { LockScreen } from '@/screens/auth/LockScreen';
import { PinSetupScreen } from '@/screens/auth/PinSetupScreen';
import { colors, navTheme } from '@/theme';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';

/**
 * Top-level switch driven by the auth/lock state machine. Each branch is a
 * distinct subtree so transitions fully reset navigation state.
 */
export function RootNavigator() {
  const { status } = useAuth();
  // The living background is what the glass cards blur. Android needs it wrapped
  // in a BlurTargetView whose ref the cards sample (iOS blurs the real backdrop).
  const blurTargetRef = useRef<View>(null);

  if (status === 'loading') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // The background is mounted ONCE here, behind the navigator, and is outside the
  // status switch so it never unmounts/restarts when tabs (or auth states) change.
  return (
    <View style={styles.root}>
      <BlurTargetView ref={blurTargetRef} style={StyleSheet.absoluteFill} pointerEvents="none">
        <LivingBackground />
      </BlurTargetView>
      <BlurTargetContext.Provider value={blurTargetRef}>
        <NavigationContainer theme={navTheme}>
          {status === 'unauthenticated' && <AuthNavigator />}
          {status === 'setup_pin' && <PinSetupScreen />}
          {status === 'offer_biometric' && <BiometricOptInScreen />}
          {status === 'locked' && <LockScreen />}
          {status === 'unlocked' && <MainNavigator />}
        </NavigationContainer>
      </BlurTargetContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  // Base colour as a fallback behind the (transparent) navigator + Skia canvas.
  root: { flex: 1, backgroundColor: colors.background },
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
