"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Client state hydrated from localStorage after mount (avoids SSR/client
 * hydration mismatches) and persisted on every update. `reconcile` lets the
 * caller merge a stored value against current defaults (e.g. new KPI cards
 * added since the preference was saved).
 */
export function useStoredState<T>(
  key: string,
  initial: T,
  reconcile?: (stored: T) => T,
): [T, (next: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed = JSON.parse(raw) as T;
        setValue(reconcile ? reconcile(parsed) : parsed);
      }
    } catch {
      // Corrupted or unavailable storage — keep defaults.
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Storage unavailable (private mode) — state simply won't persist.
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, set, loaded];
}
