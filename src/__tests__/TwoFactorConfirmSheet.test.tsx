// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { TextInput } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TwoFactorConfirmSheet } from '@/components/TwoFactorConfirmSheet';
import { I18nProvider } from '@/i18n/I18nProvider';
import { api } from '@/api';
import { ApiClientError } from '@/api/ApiError';

/**
 * The 2FA re-confirmation gate guards every sensitive change (account edits,
 * payout requests). It must only emit a confirmation token for a valid TOTP, and
 * the 6-digit CodeInput auto-submits once full (no button press needed).
 */

const TOTP = '123456';

function renderSheet(onConfirmed = jest.fn()) {
  render(
    <I18nProvider initialLanguage="en">
      <TwoFactorConfirmSheet visible onClose={jest.fn()} onConfirmed={onConfirmed} />
    </I18nProvider>,
  );
  return onConfirmed;
}

function enterCode(code: string) {
  fireEvent.changeText(screen.UNSAFE_getByType(TextInput), code);
}

describe('TwoFactorConfirmSheet (2FA gate)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('auto-submits and emits a confirmation token once 6 valid digits are entered', async () => {
    jest.spyOn(api, 'confirm').mockResolvedValue({ confirmationToken: 'ct_test' });
    const onConfirmed = renderSheet();
    await act(async () => {
      enterCode(TOTP);
    });

    // onConfirmed fires after the success "green flash" delay, so allow for it.
    await waitFor(() => expect(onConfirmed).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(onConfirmed).toHaveBeenCalledWith('ct_test');
  });

  it('rejects a wrong TOTP and never emits a token', async () => {
    jest.spyOn(api, 'confirm').mockRejectedValue(new ApiClientError('MFA_INVALID', 'invalid'));
    const onConfirmed = renderSheet();
    await act(async () => {
      enterCode('000000');
    });

    await waitFor(() =>
      expect(screen.getByText('The verification code is incorrect or expired.')).toBeTruthy(),
    );
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it('does not submit until all 6 digits are entered', async () => {
    const spy = jest.spyOn(api, 'confirm');
    const onConfirmed = renderSheet();
    await act(async () => {
      enterCode('123'); // too short - no auto-submit
    });
    expect(spy).not.toHaveBeenCalled();
    expect(onConfirmed).not.toHaveBeenCalled();
  });
});
