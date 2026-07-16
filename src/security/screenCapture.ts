// SPDX-License-Identifier: Apache-2.0
import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';

/**
 * Block screen capture of the app's content, as far as each platform natively
 * supports (no private/undocumented tricks):
 *
 * - Android: sets FLAG_SECURE - screenshots and screen recording are blocked and
 *   the app is blanked in the recents / task-switcher.
 * - iOS: blanks the screen while a screen recording or AirPlay mirror is active.
 *   iOS provides no supported API to block a still screenshot, so that is not
 *   attempted (it would require an undocumented hack we deliberately avoid).
 *
 * Applied app-wide: every screen shows sensitive data - login credentials, home
 * address, orders, and the referral payout IBAN.
 */
export function useScreenCaptureProtection(): void {
  useEffect(() => {
    // Errors (unsupported environment / web) are non-fatal.
    ScreenCapture.preventScreenCaptureAsync().catch(() => undefined);
    return () => {
      ScreenCapture.allowScreenCaptureAsync().catch(() => undefined);
    };
  }, []);
}
