import { useEffect, useState } from 'react';

/** True on touch-first devices (iPad): show the on-screen NumPad instead of the keyboard. */
export function useCoarsePointer(): boolean {
  const q = '(pointer: coarse)';
  const [coarse, setCoarse] = useState(() => window.matchMedia?.(q).matches ?? false);
  useEffect(() => {
    const m = window.matchMedia?.(q);
    if (!m) return;
    const on = () => setCoarse(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return coarse;
}
