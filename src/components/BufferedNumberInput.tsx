'use client';

/**
 * BufferedNumberInput — a number input that holds local draft state while
 * the user is editing, and commits to the parent only on blur or Enter.
 *
 * Why: when an input is wired directly to the Zustand store (`onChange ->
 * store update -> re-render`), every keystroke can race with parent re-renders
 * triggered by other store slices (rest timer ticks, coach messages, etc.) —
 * the typed-but-uncommitted value can get wiped mid-edit. Local draft state
 * eliminates that whole class of volatility. Parseable values are ALSO
 * committed on every change, so nothing depends on blur firing (iOS).
 * Give each logical field its own `key` so a draft can't follow the user to
 * a different set.
 *
 * Contract:
 *   - `value`     canonical (committed) number from the store
 *   - `onCommit`  fires on blur or Enter; receives the parsed number
 *   - `kind`      'int' or 'float' — controls parse + iOS keyboard hint
 *
 * External changes to `value` (e.g. a "Use suggested weight" button calling
 * a parent setter) are mirrored into the draft when the input is not focused,
 * so the displayed text stays in sync.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  value: number;
  onCommit: (next: number) => void;
  kind?: 'int' | 'float';
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

export function BufferedNumberInput({
  value,
  onCommit,
  kind = 'float',
  placeholder = '0',
  className,
  ariaLabel,
}: Props) {
  const [draft, setDraft] = useState<string>(value > 0 ? String(value) : '');
  const editingRef = useRef(false);

  // Mirror external value changes only when NOT editing.
  useEffect(() => {
    if (!editingRef.current) {
      setDraft(value > 0 ? String(value) : '');
    }
  }, [value]);

  const commit = () => {
    editingRef.current = false;
    const parsed = kind === 'int' ? parseInt(draft, 10) : parseFloat(draft);
    onCommit(Number.isFinite(parsed) ? parsed : 0);
  };

  return (
    <input
      type="number"
      inputMode={kind === 'int' ? 'numeric' : 'decimal'}
      enterKeyHint="done"
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onFocus={(e) => {
        editingRef.current = true;
        e.target.select();
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        // Save as you type. Waiting for blur lost edits on iOS, where tapping
        // a button often doesn't blur the field — the value then landed on
        // whatever set was current when blur finally fired.
        const parsed = kind === 'int' ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
        if (Number.isFinite(parsed)) onCommit(parsed);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      className={cn(className)}
    />
  );
}
