/**
 * Block organising — names that stick, queue edits and order that match the UI.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/lib/store';

const q = (id: string, position: number, name = id) => ({ id, name, focus: 'strength' as const, weeks: 4, createdAt: new Date(), position });

describe('block organising', () => {
  beforeEach(() => {
    useAppStore.setState({ currentMesocycle: { id: 'm', name: 'Old', weeks: [] } as any, mesocycleQueue: [] });
  });

  it('renames the current block, trimmed and capped at 40 chars; blank is ignored', () => {
    useAppStore.getState().renameMesocycle('  Fight   camp  ');
    expect(useAppStore.getState().currentMesocycle!.name).toBe('Fight camp');
    useAppStore.getState().renameMesocycle('   ');
    expect(useAppStore.getState().currentMesocycle!.name).toBe('Fight camp');
    useAppStore.getState().renameMesocycle('x'.repeat(60));
    expect(useAppStore.getState().currentMesocycle!.name).toHaveLength(40);
  });

  it('reorder uses the position order the UI shows, not raw array order', () => {
    // raw order B, A — but by position A(0) is first
    useAppStore.setState({ mesocycleQueue: [q('B', 1), q('A', 0), q('C', 2)] as any });
    useAppStore.getState().reorderMesocycleQueue(0, 1); // move A down
    const live = [...useAppStore.getState().mesocycleQueue].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    expect(live.map(b => b.id)).toEqual(['B', 'A', 'C']);
  });

  it('queue edits stamp updatedAt so sync keeps them', () => {
    useAppStore.setState({ mesocycleQueue: [q('A', 0)] as any });
    useAppStore.getState().updateMesocycleInQueue('A', { weeks: 6, name: 'Peak' });
    const a = useAppStore.getState().mesocycleQueue[0] as any;
    expect(a.weeks).toBe(6);
    expect(a.name).toBe('Peak');
    expect(typeof a.updatedAt).toBe('string');
  });
});
