// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/api';
import type { Subscription, Ticket } from '@/api/contract';
import { TicketsScreen } from '@/screens/tickets/TicketsScreen';
import { I18nProvider } from '@/i18n/I18nProvider';

const SUBS: Subscription[] = [
  {
    id: 'sub_a',
    planName: 'Freedom',
    status: 'active',
    msisdn: '+31 6 11111111',
    startDate: '2025-09-01',
    endDate: '2026-09-01',
    unlimited: true,
  },
];

const TICKET: Ticket = {
  id: 'tkt_1',
  type: 'kan_niet_bellen',
  status: 'in_behandeling',
  subscriptionId: 'sub_a',
  description: 'Outgoing calls drop immediately.',
  adminResponse: 'We are looking into it with our network partner.',
  startedAt: null,
  createdAt: '2026-06-18T13:40:00Z',
  updatedAt: '2026-06-19T09:05:00Z',
};

function renderScreen() {
  render(
    <I18nProvider initialLanguage="en">
      <TicketsScreen />
    </I18nProvider>,
  );
}

describe('TicketsScreen', () => {
  afterEach(() => jest.restoreAllMocks());

  it('shows the empty state when there are no tickets', async () => {
    jest.spyOn(api, 'getTickets').mockResolvedValue([]);
    jest.spyOn(api, 'getSubscriptions').mockResolvedValue([]);

    renderScreen();

    await waitFor(() => expect(screen.getByText('You have no reports yet.')).toBeTruthy());
  });

  it('renders a ticket with its status, description, resolved SIM and admin response', async () => {
    jest.spyOn(api, 'getTickets').mockResolvedValue([TICKET]);
    jest.spyOn(api, 'getSubscriptions').mockResolvedValue(SUBS);

    renderScreen();

    await waitFor(() => expect(screen.getByText('Cannot call')).toBeTruthy());
    expect(screen.getByText('In progress')).toBeTruthy(); // status pill
    expect(screen.getByText('Outgoing calls drop immediately.')).toBeTruthy();
    expect(screen.getByText('Support response')).toBeTruthy();
    expect(screen.getByText('We are looking into it with our network partner.')).toBeTruthy();
    // The opaque sub_ id is resolved to the human number, never shown raw.
    expect(screen.getByText(/\+31 6 11111111/)).toBeTruthy();
    expect(screen.queryByText(/sub_a/)).toBeNull();
  });
});
