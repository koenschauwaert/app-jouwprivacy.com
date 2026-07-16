// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ApiClientError } from '@/api';
import { colors, spacing } from '@/theme';
import { useI18n } from '@/i18n/I18nProvider';
import { Button } from './Button';
import { Text } from './Text';

interface AsyncBoundaryProps {
  loading: boolean;
  error: ApiClientError | null;
  onRetry: () => void;
  children: React.ReactNode;
}

function messageForError(error: ApiClientError, t: ReturnType<typeof useI18n>['t']): string {
  switch (error.code) {
    case 'NETWORK':
      return t('errors.network');
    case 'RATE_LIMITED':
      return t('errors.rateLimited');
    case 'UPSTREAM_UNAVAILABLE':
      return t('errors.upstream');
    default:
      return t('errors.generic');
  }
}

/** Renders loading / error (with retry) / content for a useAsync result. */
export function AsyncBoundary({ loading, error, onRetry, children }: AsyncBoundaryProps) {
  const { t } = useI18n();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text tone="muted" style={styles.errorText}>
          {messageForError(error, t)}
        </Text>
        <Button label={t('common.retry')} variant="secondary" onPress={onRetry} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  errorText: { textAlign: 'center' },
});
