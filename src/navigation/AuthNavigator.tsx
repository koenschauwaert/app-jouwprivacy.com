// SPDX-License-Identifier: Apache-2.0
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { LoginScreen } from '@/screens/auth/LoginScreen';
import { TwoFactorScreen } from '@/screens/auth/TwoFactorScreen';

type Step = 'login' | 'twoFactor';

const SLIDE_MS = 320;

/**
 * Login -> two-factor flow. Deliberately NOT a navigation stack: both auth
 * screens are transparent so the shared LivingBackground shows through, and a
 * native stack keeps the covered screen mounted and visible underneath the
 * transparent top one (login text bleeds through 2FA). Instead we render the two
 * screens side by side on a single track and slide it: only one is ever on
 * screen, they never stack, and the background animates on uninterrupted behind.
 */
export function AuthNavigator() {
  const { width } = useWindowDimensions();
  const [step, setStep] = useState<Step>('login');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const offset = useSharedValue(0);

  const goToTwoFactor = (token: string) => {
    setMfaToken(token);
    setStep('twoFactor');
    offset.value = withTiming(-width, { duration: SLIDE_MS });
  };

  const backToLogin = useCallback(() => {
    setStep('login');
    // Mutating a Reanimated SharedValue's `.value` is its intended API (drives the
    // animation off the JS thread), not a React state mutation - the immutability
    // rule flags it only because `offset` is in this hook's dep array.
    // eslint-disable-next-line react-hooks/immutability
    offset.value = withTiming(0, { duration: SLIDE_MS });
    return true; // we handled the back press; don't leave the app
  }, [offset]);

  // Android hardware back on the 2FA step slides back to login instead of
  // exiting the app. Inactive on the login step so back still exits normally.
  useEffect(() => {
    if (step !== 'twoFactor') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', backToLogin);
    return () => sub.remove();
  }, [step, backToLogin]);

  const trackStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.track, { width: width * 2 }, trackStyle]}>
        <View style={{ width }}>
          <LoginScreen onTwoFactorRequired={goToTwoFactor} />
        </View>
        <View style={{ width }}>{mfaToken != null && <TwoFactorScreen mfaToken={mfaToken} />}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Clip the off-screen panel so the slid-away screen can't peek at the edges.
  root: { flex: 1, overflow: 'hidden' },
  track: { flex: 1, flexDirection: 'row' },
});
