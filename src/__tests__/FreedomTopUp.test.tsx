// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { FreedomTopUp } from '@/screens/home/FreedomTopUp';
import { I18nProvider } from '@/i18n/I18nProvider';
import * as links from '@/utils/links';

/**
 * The Freedom top-up never sends an SMS itself: the button opens a confirm
 * sheet, and only the confirm CTA hands the OS a pre-filled "extra" -> 1282
 * message for the customer to send. Cancelling must send nothing.
 */
function renderTopUp() {
  render(
    <I18nProvider initialLanguage="en">
      <FreedomTopUp />
    </I18nProvider>,
  );
}

afterEach(() => jest.restoreAllMocks());

describe('FreedomTopUp', () => {
  it('confirming opens the messaging app with "extra" -> 1282', () => {
    const openSms = jest.spyOn(links, 'openSms').mockResolvedValue(true);
    renderTopUp();

    // Nothing is sent just by tapping the button - it opens the confirm sheet.
    fireEvent.press(screen.getByText('Restore full speed'));
    expect(openSms).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Open text message'));
    expect(openSms).toHaveBeenCalledWith('1282', 'extra');
  });

  it('cancelling the confirm sheet sends nothing', () => {
    const openSms = jest.spyOn(links, 'openSms').mockResolvedValue(true);
    renderTopUp();

    fireEvent.press(screen.getByText('Restore full speed'));
    fireEvent.press(screen.getByText('Cancel'));
    expect(openSms).not.toHaveBeenCalled();
  });
});
