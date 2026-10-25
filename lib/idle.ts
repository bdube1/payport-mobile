// Inactivity time-out (owner, 2026-10-25): a signed-in customer is signed out after the minutes set in ops
// (Platform Setup → Session Timeouts → Mobile app) without touching the app, including time spent in the
// background, and is taken to the login screen.
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { BASE_URL } from './api';

let minutesPromise: Promise<number> | null = null;

export function mobileTimeoutMinutes(fallback = 5): Promise<number> {
  if (!minutesPromise) {
    minutesPromise = fetch(`${BASE_URL}/api/v1/session-timeouts`)
      .then((r) => r.json())
      .then((j) => Number(j?.data?.mobile) || fallback)
      .catch(() => { minutesPromise = null; return fallback; });
  }
  return minutesPromise;
}

/** Returns a function to call on every touch; calls onTimeout once the time-out passes while signed in. */
export function useIdleLogout(signedIn: boolean, onTimeout: () => void) {
  const last = useRef(Date.now());
  const minutes = useRef(5);
  const fired = useRef(false);
  const cb = useRef(onTimeout);
  cb.current = onTimeout;

  const check = useCallback(() => {
    if (!signedIn || fired.current) return;
    if (Date.now() - last.current >= minutes.current * 60000) {
      fired.current = true;
      cb.current();
    }
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) { fired.current = false; return undefined; }
    last.current = Date.now();
    fired.current = false;
    minutesPromise = null;   // pick up a change made in ops since the last sign-in
    mobileTimeoutMinutes().then((m) => { minutes.current = m; });
    const timer = setInterval(check, 15000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [signedIn, check]);

  return useCallback(() => { last.current = Date.now(); }, []);
}
