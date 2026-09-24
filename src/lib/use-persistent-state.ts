'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useState that survives leaving and coming back.
 *
 * - storage 'session': survives reloads and iOS PWA resume within the same
 *   app session (where you were: tab, open tool).
 * - storage 'local' + ttlMs: drafts you typed (a half-built workout, a mat
 *   session you were logging) survive closing the sheet or the app, and
 *   expire so stale drafts don't haunt you.
 *
 * Every read/write is try/catch'd — private mode / quota never breaks the UI.
 */
export function usePersistentState<T>(
  /** null → behaves like plain useState (e.g. edit mode that loads its own data). */
  key: string | null,
  initial: T | (() => T),
  opts: { storage?: 'local' | 'session'; ttlMs?: number } = {},
): [T, (v: T | ((prev: T) => T)) => void, () => void] {
  const { storage = 'local', ttlMs } = opts;
  const store = () => (typeof window === 'undefined' || !key ? null : storage === 'local' ? window.localStorage : window.sessionStorage);
  const resolveInitial = () => (typeof initial === 'function' ? (initial as () => T)() : initial);

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = key ? store()?.getItem(key) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as { v: T; at: number };
        if (!ttlMs || Date.now() - parsed.at < ttlMs) return parsed.v;
        if (key) store()?.removeItem(key);
      }
    } catch { /* ignore */ }
    return resolveInitial();
  });

  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!key) return;
    try { store()?.setItem(key, JSON.stringify({ v: value, at: Date.now() })); } catch { /* ignore */ }
  }, [key, value]); // eslint-disable-line react-hooks/exhaustive-deps

  const clear = useCallback(() => {
    if (!key) return;
    try { store()?.removeItem(key); } catch { /* ignore */ }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return [value, setValue, clear];
}
