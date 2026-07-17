// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { TextInput } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { LoginScreen } from '@/screens/auth/LoginScreen';
import { I18nProvider } from '@/i18n/I18nProvider';
import { api } from '@/api';

/**
 * Login branches on the discriminated LoginResponse: an account WITH 2FA is
 * routed to the second step with its mfaToken; an account WITHOUT 2FA is logged
 * in directly with the returned session and never sees the 2FA screen.
 */

const mockCompleteLogin = jest.fn();
jest.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ completeLogin: mockCompleteLogin }),
}));

function renderScreen(onTwoFactorRequired: jest.Mock) {
  render(
    <I18nProvider initialLanguage="en">
      <LoginScreen onTwoFactorRequired={onTwoFactorRequired} />
    </I18nProvider>,
  );
}

function fillCredentials() {
  const [emailInput, passwordInput] = screen.UNSAFE_getAllByType(TextInput);
  fireEvent.changeText(emailInput, 'user@example.com');
  fireEvent.changeText(passwordInput, 'correct horse');
}

describe('LoginScreen (2FA branching)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockCompleteLogin.mockReset();
  });

  it('routes to the 2FA step when the account requires MFA', async () => {
    jest.spyOn(api, 'login').mockResolvedValue({ mfaRequired: true, mfaToken: 'mfa_123' });
    const onTwoFactorRequired = jest.fn();
    renderScreen(onTwoFactorRequired);

    fillCredentials();
    await act(async () => {
      fireEvent.press(screen.getByText('Log in'));
    });

    await waitFor(() => expect(onTwoFactorRequired).toHaveBeenCalledWith('mfa_123'));
    expect(mockCompleteLogin).not.toHaveBeenCalled();
  });

  it('completes login directly (skipping 2FA) when no MFA is required', async () => {
    const session = { accessToken: 'a', refreshToken: 'r', expiresIn: 3600 };
    jest.spyOn(api, 'login').mockResolvedValue({ mfaRequired: false, session });
    const onTwoFactorRequired = jest.fn();
    renderScreen(onTwoFactorRequired);

    fillCredentials();
    await act(async () => {
      fireEvent.press(screen.getByText('Log in'));
    });

    await waitFor(() => expect(mockCompleteLogin).toHaveBeenCalledWith(session));
    expect(onTwoFactorRequired).not.toHaveBeenCalled();
  });
});
