// SPDX-License-Identifier: Apache-2.0
/**
 * The client validates response shapes at the boundary: a malformed or empty
 * body on a 200 becomes a clean ApiClientError, never a raw TypeError surfacing
 * deep inside a screen. Covers the sensitive sinks (session, invoice URL) and
 * the envelope-unwrap / entity GETs.
 */
import { HttpApiClient } from '@/api/HttpApiClient';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Response;
}

function client() {
  return new HttpApiClient(
    () => 'access-token',
    () => {},
    () => 'refresh-token',
    () => {},
  );
}

function mockOnce(body: unknown, status = 200) {
  const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(status, body));
  global.fetch = fetchMock as unknown as typeof fetch;
}

async function expectUpstreamError(p: Promise<unknown>) {
  await expect(p).rejects.toMatchObject({ code: 'UPSTREAM_UNAVAILABLE' });
}

describe('HttpApiClient response validation', () => {
  afterEach(() => jest.restoreAllMocks());

  it('rejects a null body where an entity is expected', async () => {
    mockOnce(null);
    await expectUpstreamError(client().getMe());
  });

  it('rejects an envelope missing its array', async () => {
    mockOnce({ notOrders: [] });
    await expectUpstreamError(client().getOrders());
  });

  it('rejects a non-array where the array is expected', async () => {
    mockOnce({ tickets: 'nope' });
    await expectUpstreamError(client().getTickets());
  });

  it('rejects a session without valid tokens', async () => {
    mockOnce({ accessToken: '', refreshToken: 'r' });
    await expectUpstreamError(client().verifyTwoFactor({ mfaToken: 'm', totp: '123456' }));
  });

  it('rejects a non-https invoice url', async () => {
    mockOnce({ url: 'http://evil.example/x.pdf', expiresIn: 60 });
    await expectUpstreamError(client().getInvoiceLink('ord_1'));
  });

  it('accepts a well-formed envelope', async () => {
    mockOnce({ orders: [] });
    await expect(client().getOrders()).resolves.toEqual([]);
  });

  it('accepts a null home order (valid "no relevant order")', async () => {
    mockOnce({ order: null });
    await expect(client().getHomeRelevantOrder()).resolves.toBeNull();
  });
});
