// SPDX-License-Identifier: Apache-2.0
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatTime,
  formatUsageValue,
  usageFraction,
} from '@/utils/format';

describe('format utils', () => {
  describe('usageFraction', () => {
    it('clamps to 0..1 and handles zero limit', () => {
      expect(usageFraction(0, 100)).toBe(0);
      expect(usageFraction(50, 100)).toBe(0.5);
      expect(usageFraction(150, 100)).toBe(1);
      expect(usageFraction(-10, 100)).toBe(0);
      expect(usageFraction(10, 0)).toBe(0);
    });
  });

  describe('formatUsageValue', () => {
    it('converts data MB to GB', () => {
      // 18432 MB / 1024 = 18 GB ; 51200 / 1024 = 50 GB
      expect(formatUsageValue(18432, 51200, 'data', 'en')).toBe('18 / 50');
    });

    it('keeps voice and sms as raw counts', () => {
      expect(formatUsageValue(240, 1000, 'voice', 'en')).toBe('240 / 1,000');
      expect(formatUsageValue(12, 500, 'sms', 'en')).toBe('12 / 500');
    });
  });

  describe('formatTime', () => {
    it('renders HH:MM and falls back on invalid input', () => {
      expect(formatTime('2026-06-10T07:45:00Z', 'en')).toMatch(/\d{2}:\d{2}/);
      expect(formatTime('not-a-date', 'en')).toBe('--:--');
    });
  });

  describe('formatDateTime', () => {
    it('renders "hh:mm:ss dd-MM-yyyy" and falls back on invalid input', () => {
      // Time first, then date, with seconds - the usage "last updated" stamp.
      expect(formatDateTime('2026-06-10T07:45:09Z', 'nl')).toMatch(
        /\d{2}:\d{2}:\d{2} \d{2}-\d{2}-\d{4}/,
      );
      expect(formatDateTime('not-a-date', 'nl')).toBe('--:--:-- --/--/----');
    });
  });

  describe('formatDate', () => {
    it('renders a day/month/year date and echoes invalid input', () => {
      expect(formatDate('2026-06-10', 'nl')).toMatch(/\d{2}-\d{2}-\d{4}/);
      expect(formatDate('garbage', 'nl')).toBe('garbage');
    });

    it('returns empty string for null/undefined/empty instead of the 1970 epoch', () => {
      // Regression: `new Date(null)` is the epoch (not NaN), so an unguarded
      // formatDate(null) rendered "01-01-1970". A null deletionDate (server
      // retention matrix not yet exposed) must never surface a bogus date.
      expect(formatDate(null, 'nl')).toBe('');
      expect(formatDate(undefined, 'nl')).toBe('');
      expect(formatDate('', 'nl')).toBe('');
    });
  });

  describe('formatMoney', () => {
    it('formats integer cents as currency', () => {
      expect(formatMoney(17988, 'EUR', 'en')).toContain('179.88');
      expect(formatMoney(0, 'EUR', 'en')).toContain('0.00');
    });
  });
});
