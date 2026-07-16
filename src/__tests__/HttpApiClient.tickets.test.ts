// SPDX-License-Identifier: Apache-2.0
/**
 * Transport-level behaviour of the support-ticket endpoints: GET unwraps the
 * { tickets } envelope and carries the bearer; POST sends the create body and
 * returns the server's ticket view verbatim.
 */
import { HttpApiClient } from '@/api/HttpApiClient';
import type { Ticket } from '@/api/contract';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const TICKET: Ticket = {
  id: 'tkt_1',
  type: 'geen_data',
  status: 'open',
  subscriptionId: 'sub_active',
  description: 'no data',
  adminResponse: null,
  startedAt: null,
  createdAt: '2026-06-22T08:15:00Z',
  updatedAt: '2026-06-22T08:15:00Z',
};

function client() {
  return new HttpApiClient(() => 'access-token');
}

describe('HttpApiClient tickets', () => {
  afterEach(() => jest.restoreAllMocks());

  it('getTickets unwraps the envelope and sends the bearer token', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(200, { tickets: [TICKET] }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const tickets = await client().getTickets();

    expect(tickets).toEqual([TICKET]);
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { method: string; headers: Record<string, string> },
    ];
    expect(url).toContain('/tickets');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer access-token');
  });

  it('createTicket POSTs the body and returns the created ticket view', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(201, TICKET));
    global.fetch = fetchMock as unknown as typeof fetch;

    const created = await client().createTicket({
      type: 'geen_data',
      description: 'no data',
      subscriptionId: 'sub_active',
    });

    expect(created).toEqual(TICKET);
    const [url, init] = fetchMock.mock.calls[0] as [string, { method: string; body: string }];
    expect(url).toContain('/tickets');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      type: 'geen_data',
      description: 'no data',
      subscriptionId: 'sub_active',
    });
  });
});
