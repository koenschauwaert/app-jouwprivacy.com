// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/api';
import type { Subscription, Ticket } from '@/api/contract';
import { CreateTicketSheet } from '@/screens/tickets/CreateTicketSheet';
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

const CREATED: Ticket = {
  id: 'tkt_new',
  type: 'anders',
  status: 'open',
  subscriptionId: null,
  description: 'hi',
  adminResponse: null,
  startedAt: null,
  createdAt: '2026-06-24T00:00:00Z',
  updatedAt: '2026-06-24T00:00:00Z',
};

function renderSheet(onCreated = jest.fn()) {
  render(
    <I18nProvider initialLanguage="en">
      <CreateTicketSheet visible onClose={jest.fn()} subscriptions={SUBS} onCreated={onCreated} />
    </I18nProvider>,
  );
  return { onCreated };
}

describe('CreateTicketSheet', () => {
  afterEach(() => jest.restoreAllMocks());

  it('blocks submit for a non-"anders" type without a SIM', async () => {
    const create = jest.spyOn(api, 'createTicket');
    renderSheet();

    fireEvent.press(screen.getByText('No internet/data'));
    fireEvent.changeText(
      screen.getByPlaceholderText('Describe the problem as clearly as possible.'),
      'no data anywhere',
    );
    fireEvent.press(screen.getByText('Send'));

    await waitFor(() => expect(screen.getByText('Choose a SIM for this report.')).toBeTruthy());
    expect(create).not.toHaveBeenCalled();
  });

  it('requires a description', async () => {
    const create = jest.spyOn(api, 'createTicket');
    renderSheet();

    fireEvent.press(screen.getByText('Other')); // SIM-optional type
    fireEvent.press(screen.getByText('Send'));

    await waitFor(() => expect(screen.getByText('A description is required.')).toBeTruthy());
    expect(create).not.toHaveBeenCalled();
  });

  it('files an "anders" ticket without a SIM', async () => {
    const create = jest.spyOn(api, 'createTicket').mockResolvedValue(CREATED);
    const { onCreated } = renderSheet();

    fireEvent.press(screen.getByText('Other'));
    fireEvent.changeText(
      screen.getByPlaceholderText('Describe the problem as clearly as possible.'),
      'billing question',
    );
    fireEvent.press(screen.getByText('Send'));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith({
      type: 'anders',
      description: 'billing question',
      subscriptionId: undefined,
    });
    expect(onCreated).toHaveBeenCalled();
  });

  it('files a SIM-bound ticket with the chosen subscription', async () => {
    const create = jest.spyOn(api, 'createTicket').mockResolvedValue(CREATED);
    const { onCreated } = renderSheet();

    fireEvent.press(screen.getByText('No internet/data'));
    fireEvent.press(screen.getByText('Freedom · +31 6 11111111'));
    fireEvent.changeText(
      screen.getByPlaceholderText('Describe the problem as clearly as possible.'),
      '  no data  ',
    );
    fireEvent.press(screen.getByText('Send'));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith({
      type: 'geen_data',
      description: 'no data', // trimmed
      subscriptionId: 'sub_a',
    });
    expect(onCreated).toHaveBeenCalled();
  });
});
