// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/api';
import { Subscription, Usage } from '@/api/contract';
import { I18nProvider } from '@/i18n/I18nProvider';
import { SubscriptionCard } from '@/screens/home/SubscriptionCard';

/**
 * The PUK is fetched only on a tap, shown in a sheet, and dropped again when
 * the sheet closes. A line that is not active has no PUK button.
 */

const active: Subscription = {
  id: 'sub_active',
  planName: 'Stealth',
  status: 'active',
  msisdn: '+31 6 12345678',
  startDate: '2026-11-01',
  endDate: '2026-12-01',
  unlimited: false,
};

const usage: Usage = {
  lastUpdatedAt: '2026-11-10T07:45:00Z',
  data: { used: 100, limit: 10240, unlimited: false, fairUse: false },
  voice: { used: 10, limit: 1000, unlimited: true, fairUse: true },
  sms: { used: 1, limit: 500, unlimited: true, fairUse: true },
};

function renderCard(subscription: Subscription) {
  render(
    <I18nProvider initialLanguage="en">
      <SubscriptionCard subscription={subscription} width={360} />
    </I18nProvider>,
  );
}

beforeEach(() => {
  jest.spyOn(api, 'getUsage').mockResolvedValue(usage);
});
afterEach(() => jest.restoreAllMocks());

describe('PUK on the SIM card', () => {
  it('is not fetched until the customer taps, then shown, then dropped on close', async () => {
    const getPuk = jest.spyOn(api, 'getPuk').mockResolvedValue({ puk: '55501234' });
    renderCard(active);
    await waitFor(() => expect(screen.getByText('Show PUK code')).toBeTruthy());
    expect(getPuk).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Show PUK code'));
    await waitFor(() => expect(screen.getByText(/Your PUK code is 55501234\./)).toBeTruthy());
    expect(getPuk).toHaveBeenCalledWith('sub_active');

    fireEvent.press(screen.getByText('OK'));
    await waitFor(() => expect(screen.queryByText(/55501234/)).toBeNull());
  });

  it('says it could not be fetched when the call fails', async () => {
    jest.spyOn(api, 'getPuk').mockRejectedValue(new Error('upstream'));
    renderCard(active);
    await waitFor(() => expect(screen.getByText('Show PUK code')).toBeTruthy());
    fireEvent.press(screen.getByText('Show PUK code'));
    await waitFor(() =>
      expect(screen.getByText(/could not be fetched right now/)).toBeTruthy(),
    );
  });

  it('is not offered on a line that is not active', async () => {
    renderCard({ ...active, status: 'awaiting_activation' });
    await waitFor(() => expect(screen.getByText('Stealth')).toBeTruthy());
    expect(screen.queryByText('Show PUK code')).toBeNull();
  });
});
