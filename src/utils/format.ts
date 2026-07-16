// SPDX-License-Identifier: Apache-2.0
import { Language } from '@/i18n/translations';

const LOCALES: Record<Language, string> = { nl: 'nl-NL', en: 'en-GB' };

/** "07:45" from an ISO timestamp, in the device's local time. */
export function formatTime(iso: string, language: Language): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat(LOCALES[language], {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * "10-06-2026" from a YYYY-MM-DD or ISO string. Returns '' for a null/empty
 * value (e.g. an order whose retention date the server has not exposed yet) -
 * guarding against `new Date(null)` silently formatting as the 1970 epoch.
 */
export function formatDate(value: string | null | undefined, language: Language): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(LOCALES[language], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * "07:45:09 10-06-2026" from an ISO timestamp, in the device's local time.
 * Time first, then date, with seconds - the granularity the usage "last
 * updated" line needs so a pull-to-refresh visibly changes the stamp.
 */
export function formatDateTime(iso: string, language: Language): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--:-- --/--/----';
  const time = new Intl.DateTimeFormat(LOCALES[language], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
  return `${time} ${formatDate(iso, language)}`;
}

/** "€ 179,88" from integer cents. */
export function formatMoney(cents: number, currency: string, language: Language): string {
  return new Intl.NumberFormat(LOCALES[language], {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

/**
 * Format a usage metric for display under a ring, e.g. "18 / 50 GB".
 * `kind` controls unit conversion: data is MB->GB, voice/sms are raw.
 */
export function formatUsageValue(
  used: number,
  limit: number,
  kind: 'data' | 'voice' | 'sms',
  language: Language,
): string {
  const nf = new Intl.NumberFormat(LOCALES[language], { maximumFractionDigits: 1 });
  if (kind === 'data') {
    return `${nf.format(used / 1024)} / ${nf.format(limit / 1024)}`;
  }
  return `${nf.format(used)} / ${nf.format(limit)}`;
}

/** Clamp a 0..1 progress fraction. */
export function usageFraction(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.max(0, Math.min(1, used / limit));
}
