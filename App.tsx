import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/auth/AuthContext';
import { I18nProvider, loadInitialLanguage } from '@/i18n/I18nProvider';
import { Language } from '@/i18n/translations';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useScreenCaptureProtection } from '@/security/screenCapture';
import { colors, fontAssets } from '@/theme';

export default function App() {
  const [language, setLanguage] = useState<Language | null>(null);
  // Block screenshots / recording (Android) and recording (iOS) app-wide.
  useScreenCaptureProtection();
  // Load the brand typeface (TASA Orbiter) before first paint so nothing renders
  // in the fallback system font. A font error still lets the app boot (degraded
  // to the system font) rather than hang on a missing asset.
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    loadInitialLanguage().then(setLanguage);
  }, []);

  const ready = language !== null && (fontsLoaded || !!fontError);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {language === null || !ready ? (
        <View style={styles.splash}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <I18nProvider initialLanguage={language}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </I18nProvider>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
