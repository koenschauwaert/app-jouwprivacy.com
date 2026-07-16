// SPDX-License-Identifier: Apache-2.0
import {
  formatRecoveryInput,
  isRecoveryCodeComplete,
  normalizeRecoveryCode,
} from '@/utils/recoveryCode';

/**
 * Recovery-code masking for the 2FA fallback. The field must accept only the
 * server's alphabet (no 0/O/1/I, no symbols), cap at 10 chars, and group as
 * XXXXX-XXXXX. The value sent to the server is dash-stripped.
 */

describe('normalizeRecoveryCode', () => {
  it('uppercases and keeps only alphabet chars', () => {
    expect(normalizeRecoveryCode('abcde fg2h9')).toBe('ABCDEFG2H9');
  });

  it('drops the ambiguous 0/O/1/I and any symbols', () => {
    // O,0,I,1 are not in the alphabet; %,$,#,- are stripped too.
    expect(normalizeRecoveryCode('A%B$C#D-E2')).toBe('ABCDE2');
    expect(normalizeRecoveryCode('O0I1ABCDE')).toBe('ABCDE');
  });

  it('caps at the code length', () => {
    expect(normalizeRecoveryCode('ABCDEFGHJKLMNP')).toBe('ABCDEFGHJK');
  });
});

describe('formatRecoveryInput', () => {
  it('inserts a single grouping dash after the 5th char', () => {
    expect(formatRecoveryInput('ABCDEFG2H9')).toBe('ABCDE-FG2H9');
  });

  it('shows no dash until past the 5th char', () => {
    expect(formatRecoveryInput('ABCDE')).toBe('ABCDE');
    expect(formatRecoveryInput('ABC')).toBe('ABC');
  });

  it('reformats a pasted value with its own dashes/spaces', () => {
    expect(formatRecoveryInput('abcde-fg2h9')).toBe('ABCDE-FG2H9');
  });
});

describe('isRecoveryCodeComplete', () => {
  it('is true only at the full code length', () => {
    expect(isRecoveryCodeComplete('ABCDE-FG2H9')).toBe(true);
    expect(isRecoveryCodeComplete('ABCDE-FG2')).toBe(false);
  });
});
