// SPDX-License-Identifier: Apache-2.0
/**
 * Refresh-token ROTATION.
 *
 * The BFF rotates on every /auth/refresh: the response carries a NEW
 * refreshToken and retires the presented one. Presenting a retired token past
 * the server's short grace window is read as theft and revokes the whole token
 * family, which logs the user out. So a client that keeps the token it logged
 * in with survives exactly one refresh and is then signed out for good.
 *
 * These tests pin the client's half of that contract: surface the new token,
 * and present it on the next refresh.
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

describe('HttpApiClient refresh-token rotation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('surfaces the rotated refresh token, not just the access token', async () => {
    const onRefreshed = jest.fn();
    const client = new HttpApiClient(() => 'old-access', jest.fn(), () => 'refresh-1', onRefreshed);

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, EXPIRED))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          accessToken: 'access-2',
          refreshToken: 'refresh-2',
          expiresIn: 3600,
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { id: 'u1', email: 'a@b.c' })) as unknown as typeof fetch;

    await client.getMe();

    expect(onRefreshed).toHaveBeenCalledWith({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
    });
  });

  it('presents the NEW refresh token on the second refresh, never the retired one', async () => {
    // The regression itself. Two independent refresh cycles, with the client
    // storing whatever it was handed - exactly what the app does.
    let access = 'access-1';
    let refresh = 'refresh-1';
    const client = new HttpApiClient(
      () => access,
      jest.fn(),
      () => refresh,
      (tokens) => {
        access = tokens.accessToken;
        refresh = tokens.refreshToken;
      },
    );

    const fetchMock = jest
      .fn()
      // cycle 1
      .mockResolvedValueOnce(jsonResponse(401, EXPIRED))
      .mockResolvedValueOnce(
        jsonResponse(200, { accessToken: 'access-2', refreshToken: 'refresh-2', expiresIn: 3600 }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { id: 'u1', email: 'a@b.c' }))
      // cycle 2
      .mockResolvedValueOnce(jsonResponse(401, EXPIRED))
      .mockResolvedValueOnce(
        jsonResponse(200, { accessToken: 'access-3', refreshToken: 'refresh-3', expiresIn: 3600 }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { id: 'u1', email: 'a@b.c' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await client.getMe();
    await client.getMe();

    const refreshBodies = fetchMock.mock.calls
      .filter(([url]) => String(url).endsWith('/auth/refresh'))
      .map(([, init]) => JSON.parse((init as { body: string }).body));

    expect(refreshBodies).toEqual([{ refreshToken: 'refresh-1' }, { refreshToken: 'refresh-2' }]);
    expect(refresh).toBe('refresh-3');
  });

  it('treats a refresh response without a refreshToken as malformed', async () => {
    // The server always rotates, so a response missing it means something is
    // wrong upstream. Failing here is better than carrying on with a token we
    // already know the server has retired.
    const client = new HttpApiClient(() => 'a', jest.fn(), () => 'refresh-1', jest.fn());
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse(200, { accessToken: 'access-2', expiresIn: 3600 })) as unknown as typeof fetch;

    await expect(client.refresh('refresh-1')).rejects.toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
    });
  });

  it('does not wipe the session on a successful rotation', async () => {
    const onSessionExpired = jest.fn();
    const client = new HttpApiClient(() => 'a', onSessionExpired, () => 'refresh-1', jest.fn());

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, EXPIRED))
      .mockResolvedValueOnce(
        jsonResponse(200, { accessToken: 'access-2', refreshToken: 'refresh-2', expiresIn: 3600 }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { id: 'u1', email: 'a@b.c' })) as unknown as typeof fetch;

    await client.getMe();
    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});
