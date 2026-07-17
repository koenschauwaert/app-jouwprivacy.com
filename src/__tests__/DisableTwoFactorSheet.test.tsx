// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { TextInput } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { DisableTwoFactorSheet } from '@/components/DisableTwoFactorSheet';
import { I18nProvider } from '@/i18n/I18nProvider';
import { api } from '@/api';
import { ApiClientError } from '@/api/ApiError';

/**
 * Turning 2FA off is a sensitive action: it must send a valid 6-digit TOTP to
 * /auth/2fa/disable and only report success (onDisabled) when the server accepts
 * it. A wrong code surfaces an error and never fires the callback.
 */

const TOTP = '123456';

function renderSheet(onDisabled: jest.Mock) {
  render(
    <I18nProvider initialLanguage="en">
      <DisableTwoFactorSheet visible onClose={jest.fn()} onDisabled={onDisabled} />
    </I18nProvider>,
  );
}

function enterCode(code: string) {
  fireEvent.changeText(screen.UNSAFE_getByType(TextInput), code);
}

describe('DisableTwoFactorSheet', () => {
  afterEach(() => jest.restoreAllMocks());

  it('disables 2FA and calls onDisabled once a valid code is entered', async () => {
    const spy = jest.spyOn(api, 'disableTwoFactor').mockResolvedValue(undefined);
    const onDisabled = jest.fn();
    renderSheet(onDisabled);

    await act(async () => {
      enterCode(TOTP);
    });

    await waitFor(() => expect(onDisabled).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(spy).toHaveBeenCalledWith({ totp: TOTP });
  });

  it('rejects a wrong code and never calls onDisabled', async () => {
    jest
      .spyOn(api, 'disableTwoFactor')
      .mockRejectedValue(new ApiClientError('MFA_INVALID', 'invalid'));
    const onDisabled = jest.fn();
    renderSheet(onDisabled);

    await act(async () => {
      enterCode('000000');
    });

    await waitFor(() =>
      expect(screen.getByText('The verification code is incorrect or expired.')).toBeTruthy(),
    );
    expect(onDisabled).not.toHaveBeenCalled();
  });
});
