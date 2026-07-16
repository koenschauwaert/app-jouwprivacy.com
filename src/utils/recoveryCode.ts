// SPDX-License-Identifier: Apache-2.0
import { RECOVERY_CODE_LENGTH } from '@/navigation/types';

/**
 * Recovery-code input masking. Mirrors the server's recovery-code format: 10
 * chars from an unambiguous base32-ish alphabet (no 0/O/1/I), shown grouped as
 * XXXXX-XXXXX. The server normalises by uppercasing and stripping dashes, so we
 * send the dash-stripped value.
 */

// Same alphabet the server generates from - anything outside it is rejected as
// the user types, which also drops 0/O/1/I and every symbol (%, $, #, …).
const ALPHABET = /[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g;
const GROUP_AT = 5;

/** Strip to the alphabet, uppercase, cap at the code length. No dash. */
export function normalizeRecoveryCode(raw: string): string {
  const matched = String(raw ?? '')
    .toUpperCase()
    .match(ALPHABET);
  return (matched ? matched.join('') : '').slice(0, RECOVERY_CODE_LENGTH);
}

/**
 * Display form for the input field: normalised, with a dash inserted after the
 * 5th char once the user is past it (e.g. "ABCDE-FG2H9"). The dash never appears
 * before there is anything to group, so backspacing stays natural.
 */
export function formatRecoveryInput(raw: string): string {
  const clean = normalizeRecoveryCode(raw);
  if (clean.length <= GROUP_AT) return clean;
  return `${clean.slice(0, GROUP_AT)}-${clean.slice(GROUP_AT)}`;
}

/** A recovery code is complete once all significant chars are present. */
export function isRecoveryCodeComplete(raw: string): boolean {
  return normalizeRecoveryCode(raw).length === RECOVERY_CODE_LENGTH;
}
