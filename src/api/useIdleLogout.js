import { useEffect, useRef } from 'react';

const IDLE_MS = 10 * 60 * 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'];
const activityKey = userId => `nova_last_activity:${userId}`;

export function startSessionActivity(userId) {
  try { localStorage.setItem(activityKey(userId), String(Date.now())); } catch { /* stockage indisponible */ }
}

export function useIdleLogout(userId, onIdle) {
  const callback = useRef(onIdle);
  useEffect(() => { callback.current = onIdle; }, [onIdle]);

  useEffect(() => {
    if (!userId) return undefined;
    const key = activityKey(userId);
    let lastActivity = 0;
    let timer;
    let expired = false;
    const readActivity = () => {
      try { lastActivity = Math.max(lastActivity, Number(localStorage.getItem(key)) || 0); } catch { /* stockage indisponible */ }
    };
    const check = () => {
      clearTimeout(timer);
      if (expired) return;
      readActivity();
      const remaining = IDLE_MS - (Date.now() - lastActivity);
      if (remaining <= 0) {
        expired = true;
        callback.current();
        return;
      }
      timer = setTimeout(check, remaining);
    };
    const record = () => {
      if (expired || document.hidden) return;
      readActivity();
      const elapsed = Date.now() - lastActivity;
      if (elapsed >= IDLE_MS) return check();
      if (elapsed < 1000) return;
      lastActivity = Date.now();
      startSessionActivity(userId);
    };
    const sync = event => { if (event.key === key) check(); };

    readActivity();
    if (!lastActivity) {
      lastActivity = Date.now();
      startSessionActivity(userId);
    }
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, record, { passive: true });
    window.addEventListener('storage', sync);
    window.addEventListener('pageshow', check);
    document.addEventListener('visibilitychange', check);
    check();
    return () => {
      clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, record);
      window.removeEventListener('storage', sync);
      window.removeEventListener('pageshow', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [userId]);
}
