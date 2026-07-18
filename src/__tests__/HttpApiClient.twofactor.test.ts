// SPDX-License-Identifier: Apache-2.0
/**
 * 2FA-related transport behaviour of the real client: `confirm` forwards the
 * full ConfirmRequest (including the required `action`), `disableTwoFactor` hits
 * /auth/2fa/disable and resolves on a 204, and `login` passes the discriminated
 * LoginResponse union straight through.
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

function lastCall(fetchMock: jest.Mock): { url: string; init: { method: string; body?: string } } {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url: url as string, init: init as { method: string; body?: string } };
}

describe('HttpApiClient 2FA methods', () => {
  afterEach(() => jest.restoreAllMocks());

  it('confirm forwards action + totp to /auth/confirm', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { confirmationToken: 'ct_1' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(client().confirm({ action: 'account_patch', totp: '123456' })).resolves.toEqual({
      confirmationToken: 'ct_1',
    });

    const { url, init } = lastCall(fetchMock);
    expect(url).toMatch(/\/auth\/confirm$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body ?? '{}')).toEqual({ action: 'account_patch', totp: '123456' });
  });

  it('confirm forwards action + password when the account has no 2FA', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { confirmationToken: 'ct_2' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await client().confirm({ action: 'payout', password: 's3cret' });

    const { init } = lastCall(fetchMock);
    expect(JSON.parse(init.body ?? '{}')).toEqual({ action: 'payout', password: 's3cret' });
  });

  it('disableTwoFactor posts to /auth/2fa/disable and resolves on 204', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(204, null));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(client().disableTwoFactor({ totp: '123456' })).resolves.toBeUndefined();

    const { url, init } = lastCall(fetchMock);
    expect(url).toMatch(/\/auth\/2fa\/disable$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body ?? '{}')).toEqual({ totp: '123456' });
  });

  it('login passes through the no-2FA session union', async () => {
    const session = { accessToken: 'a', refreshToken: 'r', expiresIn: 3600 };
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { mfaRequired: false, session }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(client().login({ email: 'a@b.c', password: 'pw' })).resolves.toEqual({
      mfaRequired: false,
      session,
    });
  });

  it('login passes through the 2FA-required union', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { mfaRequired: true, mfaToken: 'mfa_1' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(client().login({ email: 'a@b.c', password: 'pw' })).resolves.toEqual({
      mfaRequired: true,
      mfaToken: 'mfa_1',
    });
  });
});
