// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { TextInput } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { CodeInput } from '@/components/CodeInput';
import { I18nProvider } from '@/i18n/I18nProvider';

/**
 * CodeInput backs the 6-digit 2FA entry. The visible boxes mirror a single
 * hidden input; auto-accept (onComplete on the last digit) is what lets the 2FA
 * screens submit without a button press, so it is covered explicitly.
 */

function renderInput(onComplete = jest.fn(), onChangeText = jest.fn()) {
  render(
    <I18nProvider initialLanguage="en">
      <CodeInput value="" onChangeText={onChangeText} onComplete={onComplete} length={6} />
    </I18nProvider>,
  );
  return { onComplete, onChangeText, input: screen.UNSAFE_getByType(TextInput) };
}

describe('CodeInput (auto-accept)', () => {
  it('fires onComplete with the value once all 6 digits are entered', () => {
    const { onComplete, input } = renderInput();
    fireEvent.changeText(input, '123456');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('does not fire onComplete before the code is full', () => {
    const { onComplete, input } = renderInput();
    fireEvent.changeText(input, '1234');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('strips non-digits and caps the length', () => {
    const { onComplete, onChangeText, input } = renderInput();
    fireEvent.changeText(input, '12ab34cd567'); // -> "1234567" -> capped "123456"
    expect(onChangeText).toHaveBeenLastCalledWith('123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });
});
