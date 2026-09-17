// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { TextInput } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { EnableTwoFactorSheet } from '@/components/EnableTwoFactorSheet';
import { I18nProvider } from '@/i18n/I18nProvider';
import { api } from '@/api';
import { ApiClientError } from '@/api/ApiError';
import * as links from '@/utils/links';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(async () => true),
  getStringAsync: jest.fn(async () => ''),
}));

/**
 * Turning 2FA on from the app: the current password gates the secret (so a
 * hijacked session can't plant its own authenticator), the first code must
 * verify before 2FA is on, and the recovery codes are shown exactly once and
 * must be acknowledged before the sheet reports success.
 */

const PASSWORD = 'hunter2';
const SECRET = 'JBSWY3DPEHPK3PXP';
const OTPAUTH = `otpauth://totp/JouwPrivacy:a%40b.c?secret=${SECRET}&issuer=JouwPrivacy`;
const CODES: [string, string] = ['AAAAA-BBBBB', 'CCCCC-DDDDD'];

function renderSheet(onEnabled = jest.fn()) {
  render(
    <I18nProvider initialLanguage="en">
      <EnableTwoFactorSheet visible onClose={jest.fn()} onEnabled={onEnabled} />
    </I18nProvider>,
  );
  return onEnabled;
}

const input = () => screen.UNSAFE_getByType(TextInput);

async function passPasswordStep() {
  fireEvent.changeText(input(), PASSWORD);
  await act(async () => {
    fireEvent.press(screen.getByText('Continue'));
  });
  await waitFor(() => expect(screen.getByText('JBSW Y3DP EHPK 3PXP')).toBeTruthy());
}

describe('EnableTwoFactorSheet', () => {
  afterEach(() => jest.restoreAllMocks());

  it('rejects a wrong password and never reveals a secret', async () => {
    jest
      .spyOn(api, 'beginTwoFactorEnable')
      .mockRejectedValue(new ApiClientError('MFA_INVALID', 'invalid'));
    renderSheet();

    fireEvent.changeText(input(), 'wrong');
    await act(async () => {
      fireEvent.press(screen.getByText('Continue'));
    });

    await waitFor(() => expect(screen.getByText('That password is incorrect.')).toBeTruthy());
    expect(screen.queryByText('Copy key')).toBeNull();
  });

  it('password → key → code → recovery codes → onEnabled', async () => {
    const begin = jest
      .spyOn(api, 'beginTwoFactorEnable')
      .mockResolvedValue({ secret: SECRET, otpauthUrl: OTPAUTH });
    const confirm = jest
      .spyOn(api, 'confirmTwoFactorEnable')
      .mockResolvedValue({ recoveryCodes: CODES });
    const onEnabled = renderSheet();

    await passPasswordStep();
    expect(begin).toHaveBeenCalledWith({ password: PASSWORD });

    await act(async () => {
      fireEvent.changeText(input(), '123456');
    });
    await waitFor(() => expect(screen.getByText(CODES[0])).toBeTruthy(), { timeout: 3000 });
    expect(confirm).toHaveBeenCalledWith({ totp: '123456' });
    expect(screen.getByText(CODES[1])).toBeTruthy();
    // 2FA is on, but the codes must be acknowledged before the sheet reports it.
    expect(onEnabled).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('I have saved my recovery codes'));
    expect(onEnabled).toHaveBeenCalledTimes(1);
  }, 15000);

  it('a wrong code keeps 2FA off and shows an error', async () => {
    jest
      .spyOn(api, 'beginTwoFactorEnable')
      .mockResolvedValue({ secret: SECRET, otpauthUrl: OTPAUTH });
    jest
      .spyOn(api, 'confirmTwoFactorEnable')
      .mockRejectedValue(new ApiClientError('MFA_INVALID', 'invalid'));
    const onEnabled = renderSheet();

    await passPasswordStep();
    await act(async () => {
      fireEvent.changeText(input(), '000000');
    });

    await waitFor(() =>
      expect(screen.getByText('The verification code is incorrect or expired.')).toBeTruthy(),
    );
    expect(screen.queryByText('I have saved my recovery codes')).toBeNull();
    expect(onEnabled).not.toHaveBeenCalled();
  });

  it('opens the authenticator, and falls back to the key when none is installed', async () => {
    jest
      .spyOn(api, 'beginTwoFactorEnable')
      .mockResolvedValue({ secret: SECRET, otpauthUrl: OTPAUTH });
    const open = jest.spyOn(links, 'openAuthenticator').mockResolvedValue(false);
    renderSheet();

    await passPasswordStep();
    await act(async () => {
      fireEvent.press(screen.getByText('Open in authenticator app'));
    });

    expect(open).toHaveBeenCalledWith(OTPAUTH);
    expect(
      screen.getByText('No authenticator app found. Copy the key and add it manually.'),
    ).toBeTruthy();
  });
});
