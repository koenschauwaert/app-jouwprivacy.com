// SPDX-License-Identifier: Apache-2.0
import { Linking } from 'react-native';

import { openAuthenticator } from '@/utils/links';

/**
 * The "open in authenticator app" button hands a server-supplied otpauth URI to
 * the OS. Only a plain otpauth://totp/ URI may get there; anything else (a
 * tampered https/intent/tel value) is refused. When no app handles the scheme,
 * the helper reports false so the UI can point at the copyable key instead.
 */
describe('openAuthenticator', () => {
  // Linking.openURL is already a jest.fn under the RN preset, so calls would
  // leak between tests without clearing.
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  const VALID = 'otpauth://totp/JouwPrivacy:a%40b.c?secret=JBSWY3DPEHPK3PXP&issuer=JouwPrivacy';

  it('opens a valid otpauth://totp URI', async () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await expect(openAuthenticator(VALID)).resolves.toBe(true);
    expect(spy).toHaveBeenCalledWith(VALID);
  });

  it.each([
    'https://evil.example/otpauth://totp/x',
    'intent://totp/x#Intent;end',
    'otpauth://hotp/JP:x?secret=AAAA',
    'otpauth://totp/JP:x?secret=AAAA with space',
    '',
  ])('refuses %p without touching the OS', async (url) => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await expect(openAuthenticator(url)).resolves.toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('reports false when no authenticator app is installed', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('No app'));
    await expect(openAuthenticator(VALID)).resolves.toBe(false);
  });
});
