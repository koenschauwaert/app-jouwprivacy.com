// SPDX-License-Identifier: Apache-2.0
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';

import {
  api,
  setAccessToken,
  setRefreshToken,
  setSessionExpiredHandler,
  setTokensRefreshedHandler,
} from '@/api';
import { Session } from '@/api/contract';
import { clearSession, getStoredSession, storeSession } from '@/storage/session';
import {
  clearPin,
  clearPinAttempts,
  getPinAttempts,
  hasPin,
  setPin as persistPin,
  setPinAttempts,
  verifyPin,
} from '@/storage/pin';
import {
  clearBiometricPreference,
  isBiometricEnabled,
  setBiometricEnabled,
} from '@/storage/preferences';
import { authenticateBiometric, cancelBiometric } from './biometrics';

const MAX_PIN_ATTEMPTS = 3;

/**
 * Auth + lock state machine.
 *
 *  loading ─▶ unauthenticated ─(login+2FA)▶ setup_pin ─▶ offer_biometric ─▶ unlocked
 *                 ▲                                                              │
 *                 │ (token expiry / 3 failed PIN)              (background) ◀────┘
 *                 └──────────────── wipe ◀── locked ◀──────────── (foreground)
 */
export type AuthStatus =
  'loading' | 'unauthenticated' | 'setup_pin' | 'offer_biometric' | 'locked' | 'unlocked';

interface AuthContextValue {
  status: AuthStatus;
  biometricEnabled: boolean;
  failedPinAttempts: number;
  /** Persist a freshly minted session after email+password+2FA. */
  completeLogin: (session: Session) => Promise<void>;
  /** Store the chosen app PIN (first run). */
  setupPin: (pin: string) => Promise<void>;
  /** Record the biometric opt-in choice and enter the app. */
  chooseBiometric: (enabled: boolean) => Promise<void>;
  /** Verify a PIN on the lock screen. Wipes the session after 3 failures. */
  unlockWithPin: (pin: string) => Promise<boolean>;
  /** Attempt biometric unlock on the lock screen. */
  unlockWithBiometric: () => Promise<boolean>;
  /** Toggle the biometric preference from Settings. */
  toggleBiometric: (enabled: boolean) => Promise<void>;
  /** Change the PIN from Settings. */
  changePin: (pin: string) => Promise<void>;
  /** Manually lock the app; re-entry needs the PIN or biometrics. */
  lock: () => void;
  /** Full logout from Settings: wipes session + PIN. */
  logout: () => Promise<void>;
  /**
   * Server reported the session is no longer valid (token/session expired).
   * Wipes the local session + PIN and returns to login. Registered as the
   * API layer's session-expired handler; also callable directly.
   */
  expireSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [failedPinAttempts, setFailedPinAttempts] = useState(0);
  const statusRef = useRef<AuthStatus>('loading');
  // Source of truth for the attempt count (survives re-renders and, via
  // secure storage, app relaunches). React state mirrors it for the UI.
  const attemptsRef = useRef(0);
  // Bumped on every wipe so a slow async task (e.g. a token-refresh persist)
  // that started before the wipe can detect it and abort instead of resurrecting
  // a session that was just cleared.
  const wipeGeneration = useRef(0);
  // Tracks foreground state from the same AppState events the lock listener uses.
  // Guards unlocks so a prompt/verify (or the deferred success-flash timer)
  // resolving while backgrounded can't transition to 'unlocked' off-screen.
  const isForeground = useRef(true);

  const setStatusBoth = useCallback((next: AuthStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  // Bootstrap: decide the initial screen from secure storage.
  useEffect(() => {
    let active = true;
    (async () => {
      const [session, pinExists, bio, attempts] = await Promise.all([
        getStoredSession(),
        hasPin(),
        isBiometricEnabled(),
        getPinAttempts(),
      ]);
      if (!active) return;
      setBiometricEnabledState(bio);
      attemptsRef.current = attempts;
      setFailedPinAttempts(attempts);
      if (session && pinExists) {
        setAccessToken(session.accessToken);
        setRefreshToken(session.refreshToken);
        setStatusBoth('locked');
      } else if (session && !pinExists) {
        setAccessToken(session.accessToken);
        setRefreshToken(session.refreshToken);
        setStatusBoth('setup_pin');
      } else {
        // No session: make sure a stale PIN / attempt counter / biometric flag
        // from a previous account can't carry into the next login on a shared
        // device. "unauthenticated" must always mean a clean slate.
        await Promise.allSettled([clearPin(), clearPinAttempts(), clearBiometricPreference()]);
        attemptsRef.current = 0;
        setFailedPinAttempts(0);
        setBiometricEnabledState(false);
        setStatusBoth('unauthenticated');
      }
    })();
    return () => {
      active = false;
    };
  }, [setStatusBoth]);

  // Lock immediately whenever the app leaves the foreground.
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        isForeground.current = false;
        if (statusRef.current === 'unlocked') setStatusBoth('locked');
        // Drop any in-flight biometric prompt so a prompt the OS just dismissed
        // can't wedge the native module; the lock screen re-prompts on return.
        void cancelBiometric();
      } else if (next === 'active') {
        isForeground.current = true;
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [setStatusBoth]);

  const wipe = useCallback(
    async (revokeRemote = false) => {
      // Invalidate any in-flight session-persist (token refresh) that raced us.
      wipeGeneration.current += 1;
      // Best-effort server-side revoke while the bearer is still attached. Fire
      // and forget so a slow/failed call never blocks the local wipe. Must run
      // before we null the in-memory token below (the request captures it
      // synchronously). Used on the hostile-hands path (3 failed PINs).
      if (revokeRemote) void api.logout().catch(() => undefined);
      // Drop tokens and leave the authed area FIRST, so a storage-clear failure
      // below can never leave the app unlocked with live tokens in memory.
      setAccessToken(null);
      setRefreshToken(null);
      attemptsRef.current = 0;
      setBiometricEnabledState(false);
      setFailedPinAttempts(0);
      setStatusBoth('unauthenticated');
      // allSettled: one failed clear must not abort the others.
      await Promise.allSettled([
        clearSession(),
        clearPin(),
        clearPinAttempts(),
        clearBiometricPreference(),
      ]);
    },
    [setStatusBoth],
  );

  const completeLogin = useCallback(
    async (session: Session) => {
      await storeSession(session);
      setAccessToken(session.accessToken);
      setRefreshToken(session.refreshToken);
      attemptsRef.current = 0;
      await clearPinAttempts();
      setFailedPinAttempts(0);
      // If a PIN survived a partial flow, go straight to lock; else set one up.
      setStatusBoth((await hasPin()) ? 'locked' : 'setup_pin');
    },
    [setStatusBoth],
  );

  const setupPin = useCallback(
    async (pin: string) => {
      await persistPin(pin);
      setStatusBoth('offer_biometric');
    },
    [setStatusBoth],
  );

  const chooseBiometric = useCallback(
    async (enabled: boolean) => {
      await setBiometricEnabled(enabled);
      setBiometricEnabledState(enabled);
      setStatusBoth('unlocked');
    },
    [setStatusBoth],
  );

  const unlockWithPin = useCallback(
    async (pin: string) => {
      const ok = await verifyPin(pin);
      if (ok) {
        attemptsRef.current = 0;
        await clearPinAttempts();
        setFailedPinAttempts(0);
        // Don't complete an unlock that a background/lock event invalidated
        // while verifyPin was resolving (e.g. the deferred success-flash timer
        // firing after the app was backgrounded).
        if (statusRef.current !== 'locked' || !isForeground.current) return false;
        setStatusBoth('unlocked');
        return true;
      }
      // Count from the ref (not render-time state) so rapid double-submits can't
      // under-count, and persist it so a relaunch can't reset the counter.
      const attempts = attemptsRef.current + 1;
      attemptsRef.current = attempts;
      setFailedPinAttempts(attempts);
      await setPinAttempts(attempts);
      if (attempts >= MAX_PIN_ATTEMPTS) {
        // Hostile-hands path: revoke the session server-side too, not just local.
        await wipe(true);
      }
      return false;
    },
    [setStatusBoth, wipe],
  );

  const unlockWithBiometric = useCallback(async () => {
    if (!biometricEnabled) return false;
    const ok = await authenticateBiometric('Ontgrendel JouwPrivacy');
    if (ok) {
      attemptsRef.current = 0;
      await clearPinAttempts();
      setFailedPinAttempts(0);
      // Same guard as the PIN path: don't unlock if we left the foreground or
      // are no longer in the locked state by the time the prompt resolves.
      if (statusRef.current !== 'locked' || !isForeground.current) return false;
      setStatusBoth('unlocked');
      return true;
    }
    return false;
  }, [biometricEnabled, setStatusBoth]);

  const toggleBiometric = useCallback(async (enabled: boolean) => {
    await setBiometricEnabled(enabled);
    setBiometricEnabledState(enabled);
  }, []);

  const changePin = useCallback(async (pin: string) => {
    await persistPin(pin);
  }, []);

  // Manual lock from the header. No-op unless currently unlocked, so it can't
  // disturb the login / setup / lock flows.
  const lock = useCallback(() => {
    if (statusRef.current === 'unlocked') setStatusBoth('locked');
  }, [setStatusBoth]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // best-effort; we wipe locally regardless
    }
    await wipe();
  }, [wipe]);

  const expireSession = useCallback(async () => {
    await wipe();
  }, [wipe]);

  // Let the API layer trigger a wipe when the server reports an expired session.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      void expireSession();
    });
    return () => setSessionExpiredHandler(null);
  }, [expireSession]);

  // Persist an access token that the client refreshed transparently, so a cold
  // start reads the fresh token from secure storage.
  useEffect(() => {
    setTokensRefreshedHandler((accessToken) => {
      const generation = wipeGeneration.current;
      void (async () => {
        const stored = await getStoredSession();
        // A wipe that landed while we were reading storage must win: never
        // resurrect a session that was cleared out from under us.
        if (wipeGeneration.current !== generation) return;
        if (stored) await storeSession({ ...stored, accessToken });
      })();
    });
    return () => setTokensRefreshedHandler(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      biometricEnabled,
      failedPinAttempts,
      completeLogin,
      setupPin,
      chooseBiometric,
      unlockWithPin,
      unlockWithBiometric,
      toggleBiometric,
      changePin,
      lock,
      logout,
      expireSession,
    }),
    [
      status,
      biometricEnabled,
      failedPinAttempts,
      completeLogin,
      setupPin,
      chooseBiometric,
      unlockWithPin,
      unlockWithBiometric,
      toggleBiometric,
      changePin,
      lock,
      logout,
      expireSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export const PIN_MAX_ATTEMPTS = MAX_PIN_ATTEMPTS;
