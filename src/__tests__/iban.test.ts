// SPDX-License-Identifier: Apache-2.0
import { isValidIban, normalizeIban } from '@/utils/iban';

describe('normalizeIban', () => {
  it('strips whitespace and uppercases', () => {
    expect(normalizeIban(' nl91 abna 0417 1643 00 ')).toBe('NL91ABNA0417164300');
  });
});

describe('isValidIban', () => {
  it('accepts valid IBANs (any spacing/case)', () => {
    expect(isValidIban('NL91ABNA0417164300')).toBe(true);
    expect(isValidIban('nl91 abna 0417 1643 00')).toBe(true);
    expect(isValidIban('BE68539007547034')).toBe(true);
    expect(isValidIban('DE89370400440532013000')).toBe(true);
  });

  it('rejects a checksum failure (transposed digits)', () => {
    expect(isValidIban('NL91ABNA0417164301')).toBe(false);
    expect(isValidIban('BE68539007547035')).toBe(false);
  });

  it('rejects structurally malformed values', () => {
    expect(isValidIban('')).toBe(false);
    expect(isValidIban('NL')).toBe(false);
    expect(isValidIban('1234567890')).toBe(false);
    expect(isValidIban('NL91ABNA!41716430')).toBe(false);
  });
});
