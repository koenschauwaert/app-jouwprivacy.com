// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { TextInput } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TwoFactorScreen } from '@/screens/auth/TwoFactorScreen';
import { I18nProvider } from '@/i18n/I18nProvider';
import { api } from '@/api';
import { ApiClientError } from '@/api/ApiError';

/**
 * The 2FA screen's recovery-code fallback. Recovery codes are scarce and
 * single-use, so - unlike the auto-submitting TOTP boxes - the user must tap
 * Verify. The masked input is sent dash-stripped to the same endpoint.
 */

// 'abcde-fg2h9' after normalization: uppercased, dash stripped.
const NORMALIZED_RECOVERY = 'ABCDEFG2H9';

jest.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ completeLogin: jest.fn() }),
}));

function renderScreen() {
  render(
    <I18nProvider initialLanguage="en">
      <TwoFactorScreen mfaToken="test-mfa-token" />
    </I18nProvider>,
  );
}

describe('TwoFactorScreen (recovery-code fallback)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('switches to recovery mode and submits the dash-stripped code on Verify', async () => {
    const spy = jest
      .spyOn(api, 'verifyTwoFactor')
      .mockResolvedValue({ accessToken: 'a', refreshToken: 'r', expiresIn: 3600 });
    renderScreen();

    fireEvent.press(screen.getByText('Use a recovery code'));

    // Typing a full code does NOT auto-submit (scarce, single-use).
    fireEvent.changeText(screen.UNSAFE_getByType(TextInput), 'abcde-fg2h9');
    expect(spy).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByText('Verify'));
    });

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith({ mfaToken: 'test-mfa-token', totp: NORMALIZED_RECOVERY });
  });

  it('shows a recovery-specific error for an invalid code', async () => {
    jest.spyOn(api, 'verifyTwoFactor').mockRejectedValue(new ApiClientError('MFA_INVALID', 'nope'));
    renderScreen();
    fireEvent.press(screen.getByText('Use a recovery code'));
    fireEvent.changeText(screen.UNSAFE_getByType(TextInput), 'ZZZZZ-ZZZZZ');

    await act(async () => {
      fireEvent.press(screen.getByText('Verify'));
    });

    await waitFor(() =>
      expect(screen.getByText('That recovery code is invalid or already used.')).toBeTruthy(),
    );
  });

  it('keeps Verify disabled until the recovery code is complete', () => {
    const spy = jest.spyOn(api, 'verifyTwoFactor');
    renderScreen();
    fireEvent.press(screen.getByText('Use a recovery code'));
    fireEvent.changeText(screen.UNSAFE_getByType(TextInput), 'abc');
    // Button is present but disabled; pressing it must not call the API.
    fireEvent.press(screen.getByText('Verify'));
    expect(spy).not.toHaveBeenCalled();
  });
});
