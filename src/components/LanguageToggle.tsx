// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { useI18n } from '@/i18n/I18nProvider';
import type { Language } from '@/i18n/translations';
import { Text } from './Text';

const LANGS: Language[] = ['nl', 'en'];

/** Compact "NL | EN" language switch. Active language uses the accent color. */
export function LanguageToggle() {
  const { language, setLanguage } = useI18n();
  return (
    <View style={styles.row}>
      {LANGS.map((lang, i) => (
        <React.Fragment key={lang}>
          {i > 0 && (
            <Text variant="label" tone="faint">
              |
            </Text>
          )}
          <Pressable
            onPress={() => setLanguage(lang)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: language === lang }}
          >
            <Text
              variant="label"
              style={{ color: language === lang ? colors.primary : colors.textMuted }}
            >
              {lang.toUpperCase()}
            </Text>
          </Pressable>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-end' },
});
