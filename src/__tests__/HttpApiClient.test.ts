// SPDX-License-Identifier: Apache-2.0
/**
 * Transport-level behaviour of the real client: transparent token
 * refresh-and-retry on TOKEN_EXPIRED, and wipe when refresh is not possible.
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

const EXPIRED = { error: { code: 'TOKEN_EXPIRED', message: 'expired' } };

describe('HttpApiClient token refresh-and-retry', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('refreshes once and retries the original request transparently', async () => {
    let access = 'old-token';
    const onSessionExpired = jest.fn();
    const onRefreshed = jest.fn((t: string) => {
      access = t;
    });
    const client = new HttpApiClient(
      () => access,
      onSessionExpired,
      () => 'refresh-token',
      onRefreshed,
    );

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, EXPIRED)) // GET /me -> expired
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'new-token', expiresIn: 3600 })) // refresh
      .mockResolvedValueOnce(jsonResponse(200, { id: 'u1', email: 'a@b.c' })); // retry GET /me
    global.fetch = fetchMock as unknown as typeof fetch;

    const me = await client.getMe();

    expect(me).toEqual({ id: 'u1', email: 'a@b.c' });
    expect(onRefreshed).toHaveBeenCalledWith('new-token');
    expect(onSessionExpired).not.toHaveBeenCalled();

    // Retry (3rd call) must carry the refreshed bearer token.
    const retryInit = fetchMock.mock.calls[2][1] as { headers: Record<string, string> };
    expect(retryInit.headers.Authorization).toBe('Bearer new-token');
  });

  it('wipes the session when the refresh token is also expired', async () => {
    const onSessionExpired = jest.fn();
    const client = new HttpApiClient(
      () => 'old-token',
      onSessionExpired,
      () => 'refresh-token',
      jest.fn(),
    );

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, EXPIRED)) // GET /me -> expired
      .mockResolvedValueOnce(jsonResponse(401, EXPIRED)); // refresh -> also expired
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(client.getMe()).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('does not retry when there is no refresh token', async () => {
    const onSessionExpired = jest.fn();
    const client = new HttpApiClient(
      () => 'old-token',
      onSessionExpired,
      () => null,
      jest.fn(),
    );

    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(401, EXPIRED));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(client.getMe()).rejects.toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1); // no refresh attempt
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });
});

describe('HttpApiClient transient retry', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const newClient = () =>
    new HttpApiClient(
      () => 'tok',
      jest.fn(),
      () => 'r',
      jest.fn(),
    );

  it('retries an idempotent GET on a transient upstream error', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: { code: 'UPSTREAM_UNAVAILABLE' } }))
      .mockResolvedValueOnce(jsonResponse(200, { id: 'u1', email: 'a@b.c' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(newClient().getMe()).resolves.toEqual({ id: 'u1', email: 'a@b.c' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries an idempotent GET on a network/timeout error', async () => {
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(jsonResponse(200, { id: 'u1' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(newClient().getMe()).resolves.toEqual({ id: 'u1' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a mutation (POST) on a transient error', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: { code: 'UPSTREAM_UNAVAILABLE' } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(newClient().logout()).rejects.toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
