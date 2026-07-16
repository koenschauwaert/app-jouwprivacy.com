// SPDX-License-Identifier: Apache-2.0
/**
 * External JouwPrivacy web destinations opened from the app (system browser).
 *
 * NOTE: confirm these paths with the marketing site before release - they are
 * best-guess entry points for the web shop. All under jouwprivacy.com (the app
 * never links to a .app domain).
 */
export const SHOP_LINKS = {
  /** Order a privacy-first SIM / subscription. */
  sim: 'https://jouwprivacy.com/abonnementen',
  /** Order a phone / hardware. */
  phone: 'https://jouwprivacy.com/telefoons',
} as const;

export const SUPPORT_LINKS = {
  /** Contact form, opened from Settings to report a bug. */
  contact: 'https://jouwprivacy.com/contact',
} as const;
