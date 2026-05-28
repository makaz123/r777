import { useEffect, useRef } from 'react';

/** Default interval for list/dashboard pages (exposure, P/L, balances). */
export const DEFAULT_LIST_REFRESH_MS = 3000;

/**
 * Runs a callback on an interval. Keeps the latest callback via ref so
 * callers can pass inline functions without resetting the timer every render.
 *
 * @param {() => void} callback
 * @param {number} intervalMs
 * @param {{ enabled?: boolean, immediate?: boolean }} [options]
 *   - enabled: pause polling (e.g. while a modal is open)
 *   - immediate: run once when the effect starts (default true)
 */
export function useAutoRefresh(
  callback,
  intervalMs,
  { enabled = true, immediate = true } = {}
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || !intervalMs || intervalMs <= 0) return undefined;

    const tick = () => callbackRef.current();

    if (immediate) tick();

    const intervalId = setInterval(tick, intervalMs);
    return () => clearInterval(intervalId);
  }, [intervalMs, enabled, immediate]);
}
