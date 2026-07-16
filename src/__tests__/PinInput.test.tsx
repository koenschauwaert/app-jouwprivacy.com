// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { TextInput } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { PinInput } from '@/components/PinInput';
import { PIN_LENGTH } from '@/navigation/types';

/**
 * PinInput backs every PIN entry (setup, lock, change-PIN). The auto-accept
 * behaviour - firing onComplete exactly when the field is full - is what lets
 * the screens advance without tapping a button, so it is covered explicitly.
 */

function renderInput(onComplete = jest.fn(), onChangeText = jest.fn()) {
  render(
    <PinInput value="" onChangeText={onChangeText} onComplete={onComplete} length={PIN_LENGTH} />,
  );
  return { onComplete, onChangeText, input: screen.UNSAFE_getByType(TextInput) };
}

describe('PinInput (auto-accept)', () => {
  it('fires onComplete with the value once all digits are entered', () => {
    const { onComplete, input } = renderInput();
    fireEvent.changeText(input, '12345');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('12345');
  });

  it('does not fire onComplete before the field is full', () => {
    const { onComplete, input } = renderInput();
    fireEvent.changeText(input, '123');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('strips non-digits and only completes on a full numeric PIN', () => {
    const { onComplete, onChangeText, input } = renderInput();
    fireEvent.changeText(input, '1a2b3'); // -> "123"
    expect(onChangeText).toHaveBeenLastCalledWith('123');
    expect(onComplete).not.toHaveBeenCalled();
  });
});
