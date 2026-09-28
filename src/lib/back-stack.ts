'use client';

/**
 * back-stack — one owner for the browser history, so the system back button
 * (Android back, desktop back, iOS Safari edge-swipe) always closes the TOP
 * thing on screen: a sheet inside a tool, then the tool, then a paused
 * workout, then a non-Today tab — and only then leaves the app.
 *
 * Each open layer owns exactly one history entry.
 *   - Back pressed      → popstate → the top layer's onBack() runs.
 *   - Closed in the UI  → removeLayer() → one history.go(-n) for all the
 *                         layers closed in that tick, and that popstate is
 *                         swallowed so it doesn't close anything else.
 *   - Opened while a go(-n) is in flight → the pushState waits for the
 *     popstate; otherwise the go() would pop the NEW entry instead.
 *
 * Next's app router patches pushState and keeps its own tree in the state
 * object, so entries we push stay valid router entries.
 */
import { useEffect, useRef } from 'react';

interface Layer { id: number; rank: number; onBack: () => void }

/**
 * Layer ranks: back always closes the highest rank first, whatever order the
 * layers registered in (a reload restores a tab and a tool in the same
 * commit; React's dev double-mount re-registers the lower one last).
 */
export const LAYER_RANK = { tab: 0, tool: 10, workout: 20, sheet: 30 } as const;

const stack: Layer[] = [];
let nextId = 1;
let listening = false;
/** Entries removed from the UI whose history.go() hasn't resolved yet. */
let pendingPops = 0;
/** A go(-n) we started; its popstate must not close a layer. */
let swallowPops = 0;
let flushScheduled = false;
/** Layers opened while a go() was in flight — pushed once it lands. */
const deferredPushes: number[] = [];

const MARK = '__layer';

function pushEntry(id: number) {
  const prev = (window.history.state ?? {}) as Record<string, unknown>;
  window.history.pushState({ ...prev, [MARK]: id }, '');
}

function onPopState() {
  if (swallowPops > 0) {
    swallowPops -= 1;
    if (swallowPops === 0) {
      for (const id of deferredPushes.splice(0)) {
        if (stack.some(l => l.id === id)) pushEntry(id);
      }
    }
    return;
  }
  const top = stack.pop();
  top?.onBack();
}

function ensureListener() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('popstate', onPopState);
}

function flush() {
  flushScheduled = false;
  const n = pendingPops;
  pendingPops = 0;
  if (n <= 0) return;
  swallowPops += 1;
  window.history.go(-n);
}

/** Open a layer. Returns its id, for removeLayer when the UI closes it. */
export function pushLayer(onBack: () => void, rank: number = LAYER_RANK.sheet): number {
  ensureListener();
  const id = nextId++;
  // A reload restores open overlays from sessionStorage while the history
  // entry from before the reload is still there — reuse it instead of
  // stacking a second one (which would make back need two presses).
  const reuse = stack.length === 0 && swallowPops === 0 && pendingPops === 0
    && (window.history.state as Record<string, unknown> | null)?.[MARK] != null;
  let at = stack.length;
  while (at > 0 && stack[at - 1].rank > rank) at -= 1;
  stack.splice(at, 0, { id, rank, onBack });
  if (reuse) {
    window.history.replaceState({ ...(window.history.state ?? {}), [MARK]: id }, '');
  } else if (swallowPops > 0 || pendingPops > 0) {
    deferredPushes.push(id);
  } else {
    pushEntry(id);
  }
  return id;
}

/** The UI closed a layer (X, backdrop, swipe) — drop its history entry. */
export function removeLayer(id: number) {
  const idx = stack.findIndex(l => l.id === id);
  if (idx < 0) return; // already popped by the back button
  stack.splice(idx, 1);
  const deferred = deferredPushes.indexOf(id);
  if (deferred >= 0) { deferredPushes.splice(deferred, 1); return; } // never pushed
  pendingPops += 1;
  if (!flushScheduled) {
    flushScheduled = true;
    queueMicrotask(flush);
  }
}

/**
 * While `open`, the system back button calls `onBack` instead of leaving.
 * Closing through the UI (open → false) removes the history entry again.
 */
export function useBackLayer(open: boolean, onBack: () => void, rank: number = LAYER_RANK.sheet) {
  const cb = useRef(onBack);
  cb.current = onBack;
  useEffect(() => {
    if (!open) return;
    const id = pushLayer(() => cb.current(), rank);
    return () => removeLayer(id);
  }, [open, rank]);
}

/** Test hook: layers currently open (top last). */
export function _layerCount() { return stack.length; }
/** Test hook: reset module state between tests. */
export function _resetBackStack() {
  stack.length = 0; pendingPops = 0; swallowPops = 0; flushScheduled = false; deferredPushes.length = 0;
}

/** Is this layer the top-most open one (no sheet above it)? */
export function isTopLayer(id: number | undefined) {
  return id != null && stack.length > 0 && stack[stack.length - 1].id === id;
}
