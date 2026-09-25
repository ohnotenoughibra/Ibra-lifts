/**
 * Full-app audit 2026-09-25 — sync merge. Each case reproduces a measured
 * data-loss / resurrection path in resolveConflicts.
 */
import { describe, it, expect } from 'vitest';
import { resolveConflicts, mergeTombstones } from '@/lib/db-sync';
import { useAppStore } from '@/lib/store';

describe('hard-deleted items stay deleted after sync', () => {
  it('a deleted template does not come back from the server copy', () => {
    const t = Date.now();
    const local = { sessionTemplates: [], _tombstones: { 'sessionTemplates:t1': { at: t, dead: true } }, lastSyncAt: t };
    const remote = { sessionTemplates: [{ id: 't1', name: 'Old' }, { id: 't2', name: 'Keep' }], lastSyncAt: t - 1000 };
    const m = resolveConflicts(local, remote);
    expect((m.sessionTemplates as any[]).map(x => x.id)).toEqual(['t2']);
    // …and the registry travels with the document so the next pull agrees
    expect((m._tombstones as any)['sessionTemplates:t1'].dead).toBe(true);
  });
  it('an un-bookmark sticks; re-bookmarking later wins over the old deletion', () => {
    const t = Date.now();
    const unbook = resolveConflicts(
      { bookmarkedArticles: [], _tombstones: { 'bookmarkedArticles:a1': { at: t, dead: true } } },
      { bookmarkedArticles: ['a1', 'a2'] },
    );
    expect(unbook.bookmarkedArticles).toEqual(['a2']);
    const rebook = resolveConflicts(
      { bookmarkedArticles: ['a1'], _tombstones: { 'bookmarkedArticles:a1': { at: t + 10, dead: false } } },
      { bookmarkedArticles: ['a2'], _tombstones: { 'bookmarkedArticles:a1': { at: t, dead: true } } },
    );
    expect(rebook.bookmarkedArticles).toContain('a1');
  });
  it('registry merges newest-wins and forgets entries after 90 days', () => {
    const now = Date.now();
    const m = mergeTombstones({ k: { at: now - 5, dead: true }, old: { at: now - 100 * 864e5, dead: true } }, { k: { at: now, dead: false } }, now);
    expect(m).toEqual({ k: { at: now, dead: false } });
  });
});

describe('edits survive the merge', () => {
  it('an edited meal (stamped by the store) beats the stale server copy', () => {
    useAppStore.setState({ meals: [{ id: 'm1', name: 'Rice', calories: 500, date: new Date('2026-09-20') } as any] });
    useAppStore.getState().updateMeal('m1', { calories: 700 } as any);
    const local = { meals: useAppStore.getState().meals };
    const remote = { meals: [{ id: 'm1', name: 'Rice', calories: 500, date: new Date('2026-09-20').toISOString() }] };
    const m = resolveConflicts(local as any, remote);
    expect((m.meals as any[])[0].calories).toBe(700);
  });
  it('unstamped tie: the local (changing) side wins', () => {
    const m = resolveConflicts({ sessionTemplates: [{ id: 't', name: 'NEW' }] }, { sessionTemplates: [{ id: 't', name: 'OLD' }] });
    expect((m.sessionTemplates as any[])[0].name).toBe('NEW');
  });
});

describe('server stamp + token hygiene', () => {
  it('merged lastSyncAt is the max, so a stale queued push cannot win scalars later', () => {
    const first = resolveConflicts({ themeMode: 'dark', lastSyncAt: 5000 }, { themeMode: 'light', lastSyncAt: 100 });
    expect(first.lastSyncAt).toBe(5000);
    const stale = resolveConflicts({ themeMode: 'light', lastSyncAt: 2000 }, first);
    expect(stale.themeMode).toBe('dark');
  });
  it('legacy plaintext Whoop tokens are purged from the document', () => {
    const m = resolveConflicts({ lastSyncAt: 2 }, { _whoopTokens: { accessToken: 'x' }, lastSyncAt: 1 });
    expect(m._whoopTokens).toBeUndefined();
  });
  it('technique log / sparring rounds are merged, not dropped', () => {
    const m = resolveConflicts({ techniqueLog: [{ id: 'a' }] }, { techniqueLog: [{ id: 'b' }] });
    expect((m.techniqueLog as any[]).map(x => x.id).sort()).toEqual(['a', 'b']);
  });
});
