// SPDX-License-Identifier: Apache-2.0
/**
 * §19 SHOW - the network-status client surface hits /v1/network-status as a
 * PUBLIC call (no bearer), even when a token is available.
 */
import { HttpApiClient } from '@/api/HttpApiClient';

type Body = Record<string, unknown>;

function jsonResponse(status: number, body: Body): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('HttpApiClient.getNetworkStatus', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches /v1/network-status without a bearer token', async () => {
    // A token IS available, but the public call must not send it.
    const client = new HttpApiClient(() => 'must-not-be-sent');
    const body = {
      indicator: 'operationeel',
      description: { nl: 'Netwerk operationeel', en: 'Network operational' },
      updatedAt: null,
    };
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(200, body));
    global.fetch = fetchMock as unknown as typeof fetch;

    const status = await client.getNetworkStatus();

    expect(status).toEqual(body);
    const [url, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(String(url).endsWith('/v1/network-status')).toBe(true);
    expect(init.headers.Authorization).toBeUndefined();
  });
});
