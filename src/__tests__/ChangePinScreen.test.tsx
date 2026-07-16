// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { TextInput } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ChangePinScreen } from '@/screens/settings/ChangePinScreen';
import { I18nProvider } from '@/i18n/I18nProvider';
import { setPin } from '@/storage/pin';
import { SUCCESS_FLASH_MS } from '@/theme';

/**
 * Changing the PIN must require the CURRENT PIN first, so a grabbed but already
 * unlocked phone can't silently have its PIN replaced.
 */

const mockGoBack = jest.fn();
const mockChangePin = jest.fn(async () => {});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));
jest.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ changePin: mockChangePin }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const secureStore = require('expo-secure-store') as { __store: Map<string, string> };

function renderScreen() {
  render(
    <I18nProvider initialLanguage="en">
      <ChangePinScreen />
    </I18nProvider>,
  );
  return screen.UNSAFE_getByType(TextInput);
}

beforeEach(async () => {
  secureStore.__store.clear();
  mockGoBack.mockClear();
  mockChangePin.mockClear();
  await setPin('12345'); // the current PIN
});

describe('ChangePinScreen (current-PIN gate)', () => {
  it('rejects a wrong current PIN and does not advance or change anything', async () => {
    const input = renderScreen();
    expect(screen.getByText('Enter your current PIN')).toBeTruthy();

    fireEvent.changeText(input, '00000');
    await act(async () => {}); // let the async verify resolve

    expect(screen.getByText('That PIN is incorrect. Try again.')).toBeTruthy();
    expect(screen.getByText('Enter your current PIN')).toBeTruthy();
    expect(mockChangePin).not.toHaveBeenCalled();
  });

  it('advances through current -> new -> confirm and persists the new PIN', async () => {
    jest.useFakeTimers();
    try {
      const input = renderScreen();

      // Step 1: correct current PIN advances to the new-PIN step.
      fireEvent.changeText(input, '12345');
      await act(async () => {});
      act(() => jest.advanceTimersByTime(SUCCESS_FLASH_MS));
      expect(screen.getByText('Choose a new PIN')).toBeTruthy();

      // Step 2: new PIN advances to confirm.
      fireEvent.changeText(input, '54321');
      act(() => jest.advanceTimersByTime(SUCCESS_FLASH_MS));
      expect(screen.getByText('Confirm your PIN')).toBeTruthy();

      // Step 3: matching confirmation persists and closes.
      fireEvent.changeText(input, '54321');
      act(() => jest.advanceTimersByTime(SUCCESS_FLASH_MS));
      await act(async () => {});

      expect(mockChangePin).toHaveBeenCalledWith('54321');
      await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
    } finally {
      jest.useRealTimers();
    }
  });
});
