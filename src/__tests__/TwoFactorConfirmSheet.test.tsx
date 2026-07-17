// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { TextInput } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TwoFactorConfirmSheet } from '@/components/TwoFactorConfirmSheet';
import { I18nProvider } from '@/i18n/I18nProvider';
import { api } from '@/api';
import { ApiClientError } from '@/api/ApiError';

/**
 * The re-confirmation gate guards every sensitive change (account edits, payout
 * requests). It must only emit a confirmation token for a valid credential, and
 * it always forwards the `action`. An account WITH 2FA confirms with a TOTP (the
 * 6-digit CodeInput auto-submits once full); WITHOUT 2FA it confirms with the
 * account password.
 */

const TOTP = '123456';
const PASSWORD = 'hunter2';

function renderSheet(
  onConfirmed: jest.Mock,
  opts: { twoFactorEnabled: boolean } = { twoFactorEnabled: true },
) {
  render(
    <I18nProvider initialLanguage="en">
      <TwoFactorConfirmSheet
        visible
        onClose={jest.fn()}
        action="account_patch"
        twoFactorEnabled={opts.twoFactorEnabled}
        onConfirmed={onConfirmed}
      />
    </I18nProvider>,
  );
}

function enterText(text: string) {
  fireEvent.changeText(screen.UNSAFE_getByType(TextInput), text);
}

describe('TwoFactorConfirmSheet (confirm gate)', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('with 2FA (TOTP)', () => {
    it('auto-submits and emits a token, forwarding action + totp', async () => {
      const spy = jest.spyOn(api, 'confirm').mockResolvedValue({ confirmationToken: 'ct_test' });
      const onConfirmed = jest.fn();
      renderSheet(onConfirmed);

      await act(async () => {
        enterText(TOTP);
      });

      // onConfirmed fires after the success "green flash" delay, so allow for it.
      await waitFor(() => expect(onConfirmed).toHaveBeenCalledTimes(1), { timeout: 3000 });
      expect(spy).toHaveBeenCalledWith({ action: 'account_patch', totp: TOTP });
      expect(onConfirmed).toHaveBeenCalledWith('ct_test');
    });

    it('rejects a wrong TOTP and never emits a token', async () => {
      jest.spyOn(api, 'confirm').mockRejectedValue(new ApiClientError('MFA_INVALID', 'invalid'));
      const onConfirmed = jest.fn();
      renderSheet(onConfirmed);

      await act(async () => {
        enterText('000000');
      });

      await waitFor(() =>
        expect(screen.getByText('The verification code is incorrect or expired.')).toBeTruthy(),
      );
      expect(onConfirmed).not.toHaveBeenCalled();
    });

    it('does not submit until all 6 digits are entered', async () => {
      const spy = jest.spyOn(api, 'confirm');
      const onConfirmed = jest.fn();
      renderSheet(onConfirmed);

      await act(async () => {
        enterText('123'); // too short - no auto-submit
      });

      expect(spy).not.toHaveBeenCalled();
      expect(onConfirmed).not.toHaveBeenCalled();
    });
  });

  describe('without 2FA (password)', () => {
    it('confirms with the account password, forwarding action + password', async () => {
      const spy = jest.spyOn(api, 'confirm').mockResolvedValue({ confirmationToken: 'ct_pw' });
      const onConfirmed = jest.fn();
      renderSheet(onConfirmed, { twoFactorEnabled: false });

      enterText(PASSWORD);
      // No auto-submit for a password; the user taps Verify.
      expect(spy).not.toHaveBeenCalled();

      await act(async () => {
        fireEvent.press(screen.getByText('Verify'));
      });

      await waitFor(() => expect(onConfirmed).toHaveBeenCalledTimes(1), { timeout: 3000 });
      expect(spy).toHaveBeenCalledWith({ action: 'account_patch', password: PASSWORD });
      expect(onConfirmed).toHaveBeenCalledWith('ct_pw');
    });

    it('rejects a wrong password and never emits a token', async () => {
      jest.spyOn(api, 'confirm').mockRejectedValue(new ApiClientError('MFA_INVALID', 'invalid'));
      const onConfirmed = jest.fn();
      renderSheet(onConfirmed, { twoFactorEnabled: false });

      enterText('wrong-pass');
      await act(async () => {
        fireEvent.press(screen.getByText('Verify'));
      });

      await waitFor(() =>
        expect(screen.getByText('That password is incorrect.')).toBeTruthy(),
      );
      expect(onConfirmed).not.toHaveBeenCalled();
    });
  });
});
