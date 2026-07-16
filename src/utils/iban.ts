// SPDX-License-Identifier: Apache-2.0
/**
 * IBAN normalization + validation. Client-side only: the server remains the
 * authority on payout details. This catches typos (transposed/omitted digits)
 * before a payout request is sent, using the IBAN's own mod-97 checksum.
 */

/** Strip all whitespace and uppercase, the canonical wire form. */
export function normalizeIban(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

/** Structural + ISO 7064 mod-97-10 checksum validation. */
export function isValidIban(raw: string): boolean {
  const iban = normalizeIban(raw);
  // 2 letters (country) + 2 check digits + 10-30 alphanumerics.
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  // Move the first four chars to the end, map A-Z -> 10-35, take mod 97 digit by
  // digit (avoids big-integer math) - a valid IBAN leaves a remainder of 1.
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (let i = 0; i < rearranged.length; i++) {
    const code = rearranged.charCodeAt(i);
    const value = code >= 65 ? code - 55 : code - 48; // 'A'->10 … 'Z'->35 ; '0'->0
    remainder = value > 9 ? (remainder * 100 + value) % 97 : (remainder * 10 + value) % 97;
  }
  return remainder === 1;
}
