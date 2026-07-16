// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { AppState, Text } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';

import { AuthProvider, PIN_MAX_ATTEMPTS, useAuth } from '@/auth/AuthContext';
import { Session } from '@/api/contract';
import { StorageKeys } from '@/storage/secureStore';

/**
 * Security-critical tests for the auth/lock state machine. A bug here is a
 * security bug, so these are exhaustive about the wipe + gating behaviour.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const secureStore = require('expo-secure-store') as { __store: Map<string, string> };

const SESSION: Session = { accessToken: 'acc', refreshToken: 'ref', expiresIn: 3600 };
const PIN = '12345';

// Captured live context so tests can drive actions imperatively.
let auth: ReturnType<typeof useAuth>;
function Capture() {
  // eslint-disable-next-line react-hooks/globals
  auth = useAuth();
  return <Text testID="status">{auth.status}</Text>;
}

let appStateHandler: (state: string) => void = () => {};

beforeEach(() => {
  secureStore.__store.clear();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type: any, handler: any) => {
    appStateHandler = handler;
    return { remove: jest.fn() } as never;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function statusText(): string {
  return screen.getByTestId('status').props.children as string;
}

async function waitForStatus(expected: string) {
  await waitFor(() => expect(statusText()).toBe(expected));
}

function renderProvider() {
  render(
    <AuthProvider>
      <Capture />
    </AuthProvider>,
  );
}

/** Drive a fresh install through to the unlocked state. */
async function reachUnlocked(biometric = false) {
  renderProvider();
  await waitForStatus('unauthenticated');
  await act(async () => {
    await auth.completeLogin(SESSION);
  });
  await waitForStatus('setup_pin');
  await act(async () => {
    await auth.setupPin(PIN);
  });
  await waitForStatus('offer_biometric');
  await act(async () => {
    await auth.chooseBiometric(biometric);
  });
  await waitForStatus('unlocked');
}

describe('bootstrap', () => {
  it('starts unauthenticated with an empty secure store', async () => {
    renderProvider();
    await waitForStatus('unauthenticated');
  });

  it('starts locked when a session AND a PIN already exist', async () => {
    secureStore.__store.set(StorageKeys.session, JSON.stringify(SESSION));
    secureStore.__store.set(StorageKeys.pin, PIN);
    renderProvider();
    await waitForStatus('locked');
  });
});

describe('first-run flow', () => {
  it('login → setup_pin → offer_biometric → unlocked', async () => {
    await reachUnlocked();
    expect(secureStore.__store.get(StorageKeys.session)).toBeTruthy();
    // The PIN is stored as a salted hash, never the literal.
    const storedPin = secureStore.__store.get(StorageKeys.pin);
    expect(storedPin).toBeTruthy();
    expect(storedPin).not.toBe(PIN);
    expect(storedPin?.startsWith('v1$')).toBe(true);
  });
});

describe('lock on foreground transition', () => {
  it('locks immediately when the app goes to background', async () => {
    await reachUnlocked();
    act(() => appStateHandler('background'));
    await waitForStatus('locked');
  });

  it('locks on inactive as well', async () => {
    await reachUnlocked();
    act(() => appStateHandler('inactive'));
    await waitForStatus('locked');
  });
});

describe('manual lock (header padlock)', () => {
  it('locks the app from the unlocked state', async () => {
    await reachUnlocked();
    act(() => auth.lock());
    await waitForStatus('locked');
    // Session + PIN survive a lock - it is not a logout.
    expect(secureStore.__store.get(StorageKeys.session)).toBeTruthy();
    expect(secureStore.__store.get(StorageKeys.pin)).toBeTruthy();
  });

  it('is a no-op outside the unlocked state', async () => {
    renderProvider();
    await waitForStatus('unauthenticated');
    act(() => auth.lock());
    await waitForStatus('unauthenticated');
  });
});

describe('PIN unlock', () => {
  it('unlocks with the correct PIN', async () => {
    await reachUnlocked();
    act(() => appStateHandler('background'));
    await waitForStatus('locked');
    // Returning to the foreground fires 'active' before the user can type.
    act(() => appStateHandler('active'));

    let ok = false;
    await act(async () => {
      ok = await auth.unlockWithPin(PIN);
    });
    expect(ok).toBe(true);
    await waitForStatus('unlocked');
  });

  it('rejects a wrong PIN without unlocking', async () => {
    await reachUnlocked();
    act(() => appStateHandler('background'));
    await waitForStatus('locked');

    let ok = true;
    await act(async () => {
      ok = await auth.unlockWithPin('00000');
    });
    expect(ok).toBe(false);
    expect(statusText()).toBe('locked');
    expect(auth.failedPinAttempts).toBe(1);
  });
});

describe('3 failed PIN attempts wipe the session + PIN', () => {
  it('wipes secure store and returns to login after the limit', async () => {
    await reachUnlocked();
    act(() => appStateHandler('background'));
    await waitForStatus('locked');

    for (let i = 0; i < PIN_MAX_ATTEMPTS; i++) {
      await act(async () => {
        await auth.unlockWithPin('00000');
      });
    }

    await waitForStatus('unauthenticated');
    // Session + PIN must be gone from secure storage.
    expect(secureStore.__store.get(StorageKeys.session)).toBeUndefined();
    expect(secureStore.__store.get(StorageKeys.pin)).toBeUndefined();
  });
});

describe('token / session expiry wipe', () => {
  it('wipes the local session and returns to login on expiry', async () => {
    await reachUnlocked();
    expect(secureStore.__store.get(StorageKeys.session)).toBeTruthy();

    await act(async () => {
      await auth.expireSession();
    });

    await waitForStatus('unauthenticated');
    expect(secureStore.__store.get(StorageKeys.session)).toBeUndefined();
    expect(secureStore.__store.get(StorageKeys.pin)).toBeUndefined();
  });
});

describe('biometric unlock', () => {
  it('unlocks via biometrics when enabled', async () => {
    await reachUnlocked(true);
    act(() => appStateHandler('background'));
    await waitForStatus('locked');
    // Returning to the foreground fires 'active' before the biometric prompt.
    act(() => appStateHandler('active'));

    let ok = false;
    await act(async () => {
      ok = await auth.unlockWithBiometric();
    });
    expect(ok).toBe(true);
    await waitForStatus('unlocked');
  });
});

describe('logout', () => {
  it('wipes session + PIN and returns to login', async () => {
    await reachUnlocked();
    await act(async () => {
      await auth.logout();
    });
    await waitForStatus('unauthenticated');
    expect(secureStore.__store.get(StorageKeys.session)).toBeUndefined();
    expect(secureStore.__store.get(StorageKeys.pin)).toBeUndefined();
  });
});
