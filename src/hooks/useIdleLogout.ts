import { useEffect, useRef } from 'react';

// FR-1-5: 30 min in production; 1 min in dev so it can be verified by hand.
export const IDLE_TIMEOUT_MS =
  Number(import.meta.env.VITE_IDLE_TIMEOUT_MS) || (import.meta.env.DEV ? 60_000 : 30 * 60_000);

const EVENTS = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'] as const;

/** Calls onIdle once after `timeoutMs` without pointer/keyboard/touch activity. */
export function useIdleLogout(onIdle: () => void, timeoutMs = IDLE_TIMEOUT_MS) {
  const cb = useRef(onIdle);
  cb.current = onIdle;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => cb.current(), timeoutMs);
    };
    reset();
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [timeoutMs]);
}
