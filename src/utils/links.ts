// SPDX-License-Identifier: Apache-2.0
import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

/** Only plain https URLs may be opened - blocks tel:, sms:, intent:, javascript:, http:, … */
function isHttpsUrl(url: string): boolean {
  return typeof url === 'string' && /^https:\/\/\S+/i.test(url.trim());
}

/**
 * Open an external URL in the in-app browser, falling back to the system
 * browser if that fails. Used for the web shop and invoice/tracking links.
 *
 * Refuses anything that isn't a plain https URL: a tampered or unexpected value
 * (e.g. an invoice link from an API response) must never reach the OS URL
 * handler, where a non-web scheme (intent://, tel:, sms:) could fire an
 * unintended action from a trusted tap. Returns false if the URL was rejected.
 */
export async function openExternal(url: string): Promise<boolean> {
  if (!isHttpsUrl(url)) return false;
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    // In-app browser unavailable: fall back to the system browser. Safe because
    // the URL is already validated https.
    await Linking.openURL(url).catch(() => undefined);
  }
  return true;
}

// A phone shortcode / MSISDN: optional leading +, then 1-15 digits. Nothing else,
// so the value can't inject extra sms: parameters or additional recipients.
const SMS_RECIPIENT = /^\+?[0-9]{1,15}$/;

/**
 * Open the OS messaging app pre-filled with a recipient + body, letting the
 * user pick their SMS app and confirm/send the text themselves. Used for the
 * Freedom 1 GB/day top-up ("extra" -> 1282) - we never send the SMS ourselves.
 *
 * The recipient is validated (digits/+ only) so it can't alter the recipient or
 * inject parameters; the body is percent-encoded. The body delimiter differs by
 * platform: iOS expects `&body=`, Android `?body=`. Returns false if rejected.
 */
export async function openSms(recipient: string, body: string): Promise<boolean> {
  if (!SMS_RECIPIENT.test(recipient)) return false;
  const separator = Platform.OS === 'ios' ? '&' : '?';
  const url = `sms:${recipient}${separator}body=${encodeURIComponent(body)}`;
  await Linking.openURL(url).catch(() => undefined);
  return true;
}
