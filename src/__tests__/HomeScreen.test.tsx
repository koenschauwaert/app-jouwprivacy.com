// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/api';
import { Order, Subscription, Usage } from '@/api/contract';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { I18nProvider } from '@/i18n/I18nProvider';

/**
 * The adaptive Home must make sense in every customer state: SIM-only,
 * order-but-no-SIM (order is the hero + soft SIM prompt), brand-new (welcome,
 * not an error), and SIM + hardware order (both blocks).
 */

// OrderBlock uses useNavigation; stub it so the screen can render standalone.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const activeSim: Subscription = {
  id: 'sub_active',
  planName: 'Freedom',
  status: 'active',
  msisdn: '+31 6 12345678',
  startDate: '2025-09-01',
  endDate: '2026-09-01',
  unlimited: true,
};

const usage: Usage = {
  lastUpdatedAt: '2026-06-10T07:45:00Z',
  data: { used: 18432, limit: 51200, unlimited: true, fairUse: true },
  voice: { used: 240, limit: 1000, unlimited: true, fairUse: true },
  sms: { used: 12, limit: 500, unlimited: true, fairUse: true },
};

const phoneOrder: Order = {
  id: 'ord_ph',
  type: 'hardware',
  description: 'Fairphone 5 (zwart)',
  priceCents: 59900,
  currency: 'EUR',
  orderedAt: '2026-06-09T16:20:00Z',
  status: 'processing',
  invoiceId: null,
  deletionDate: null,
  retentionCategory: 'pending_confirmation',
  trackingUrl: null,
  carrier: null,
  estimatedDelivery: null,
  deliveredAt: null,
};

function mockHome(subscriptions: Subscription[], order: Order | null) {
  jest.spyOn(api, 'getSubscriptions').mockResolvedValue(subscriptions);
  jest.spyOn(api, 'getHomeRelevantOrder').mockResolvedValue(order);
  jest.spyOn(api, 'getUsage').mockResolvedValue(usage);
}

function renderHome() {
  render(
    <I18nProvider initialLanguage="en">
      <HomeScreen />
    </I18nProvider>,
  );
}

afterEach(() => jest.restoreAllMocks());

describe('HomeScreen adaptive blocks', () => {
  it('one active SIM, no order -> SIM block only', async () => {
    mockHome([activeSim], null);
    renderHome();

    await waitFor(() => expect(screen.getByText('Freedom')).toBeTruthy());
    expect(screen.queryByText('Welcome to JouwPrivacy')).toBeNull();
    expect(screen.queryByText('Your order is on its way')).toBeNull();
  });

  it('phone ordered, no SIM -> order is the hero with a soft SIM prompt', async () => {
    mockHome([], phoneOrder);
    renderHome();

    await waitFor(() => expect(screen.getByText('Your order is on its way')).toBeTruthy());
    expect(screen.getByText('Fairphone 5 (zwart)')).toBeTruthy();
    expect(screen.getByText(/No SIM yet\?/)).toBeTruthy();
    // Degraded view: no shipment data -> "being processed", never a 1970 date.
    expect(screen.getByText(/being processed/)).toBeTruthy();
    expect(screen.queryByText('Welcome to JouwPrivacy')).toBeNull();
  });

  it('brand-new, nothing -> welcome block (not an error state)', async () => {
    mockHome([], null);
    renderHome();

    await waitFor(() => expect(screen.getByText('Welcome to JouwPrivacy')).toBeTruthy());
    expect(screen.getByText('Order a SIM')).toBeTruthy();
    expect(screen.getByText('Order a phone')).toBeTruthy();
  });

  it('active SIM + hardware order -> both blocks, order is secondary', async () => {
    mockHome([activeSim], phoneOrder);
    renderHome();

    await waitFor(() => expect(screen.getByText('Freedom')).toBeTruthy());
    expect(screen.getByText('Fairphone 5 (zwart)')).toBeTruthy();
    // Secondary (not hero): neutral "Your order" heading, no SIM prompt.
    expect(screen.getByText('Your order')).toBeTruthy();
    expect(screen.queryByText(/No SIM yet\?/)).toBeNull();
    expect(screen.queryByText('Welcome to JouwPrivacy')).toBeNull();
  });
});
