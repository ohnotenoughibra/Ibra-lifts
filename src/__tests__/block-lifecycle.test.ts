import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/lib/store';
import type { UserProfile } from '@/lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────

const testUser = {
  id: 'test-user',
  name: 'Test',
  age: 28,
  weight: 80,
  height: 180,
  sex: 'male',
  weightUnit: 'kg',
  experienceLevel: 'intermediate',
  goalFocus: 'strength',
  equipment: 'full_gym',
  sessionsPerWeek: 3,
  trainingIdentity: 'lifter',
} as unknown as UserProfile;

/** Reset every slice that block actions touch, then seed a user. */
function resetStore() {
  const s = useAppStore.getState();
  useAppStore.setState({
    user: { ...testUser },
    currentMesocycle: null,
    mesocycleHistory: [],
    mesocycleQueue: [],
    workoutLogs: [],
    blockUndoStack: [],
    gamificationStats: { ...s.gamificationStats, totalPoints: 0, badges: [] },
  });
}

/** Generate a real block through the real generator — no brittle fixtures. */
function seedActiveBlock(weeks = 4) {
  useAppStore.getState().generateNewMesocycle(weeks);
  // generateNewMesocycle pushes its own undo entry; clear it so each test
  // starts with a clean stack and asserts only its own action.
  useAppStore.setState({ blockUndoStack: [] });
  const meso = useAppStore.getState().currentMesocycle;
  expect(meso).not.toBeNull();
  return meso!;
}

describe('stopMesocycle', () => {
  beforeEach(resetStore);

  it('archives the current block as stopped with no XP bonus (no-op without a block)', () => {
    // Guard: no current block → state untouched
    useAppStore.getState().stopMesocycle();
    expect(useAppStore.getState().mesocycleHistory).toHaveLength(0);

    const meso = seedActiveBlock();
    useAppStore.getState().stopMesocycle();

    const s = useAppStore.getState();
    expect(s.currentMesocycle).toBeNull();
    expect(s.mesocycleHistory).toHaveLength(1);
    expect(s.mesocycleHistory[0].id).toBe(meso.id);
    expect(s.mesocycleHistory[0].status).toBe('stopped');
    expect(s.mesocycleHistory[0].endDate).toBeInstanceOf(Date);
    // Unlike completeMesocycle: no +200 points, no auto-generated successor
    expect(s.gamificationStats.totalPoints).toBe(0);
  });

});

describe('undoBlockAction', () => {
  beforeEach(resetStore);

  it('restores the block after stopMesocycle and returns the action label (null on empty stack)', () => {
    // Guard: empty stack → nothing to undo
    expect(useAppStore.getState().undoBlockAction()).toBeNull();

    const meso = seedActiveBlock();
    useAppStore.getState().stopMesocycle();
    expect(useAppStore.getState().currentMesocycle).toBeNull();

    const label = useAppStore.getState().undoBlockAction();

    expect(label).toBe('Block stopped');
    const s = useAppStore.getState();
    expect(s.currentMesocycle?.id).toBe(meso.id);
    expect(s.currentMesocycle?.status).toBe('active');
    expect(s.mesocycleHistory).toHaveLength(0);
    expect(s.blockUndoStack).toHaveLength(0);
  });

  it('caps the undo stack at 10 entries', () => {
    seedActiveBlock();
    for (let i = 0; i < 13; i++) {
      useAppStore.getState().addWeekToMesocycle();
    }
    expect(useAppStore.getState().blockUndoStack.length).toBeLessThanOrEqual(10);
  });
});

describe('completeMesocycle (single undo entry via depth guard)', () => {
  beforeEach(resetStore);

  it('awards +200 XP, archives as completed, auto-generates a successor', () => {
    const meso = seedActiveBlock();
    useAppStore.getState().completeMesocycle();

    const s = useAppStore.getState();
    expect(s.mesocycleHistory.some(m => m.id === meso.id && m.status === 'completed')).toBe(true);
    expect(s.gamificationStats.totalPoints).toBeGreaterThanOrEqual(200);
    // No queue → a fresh block is generated so the user is never stranded
    expect(s.currentMesocycle).not.toBeNull();
    expect(s.currentMesocycle!.id).not.toBe(meso.id);
  });

  it('one undo reverts the archive, the XP, and the generated successor', () => {
    const meso = seedActiveBlock();
    useAppStore.getState().completeMesocycle();
    // Nested generateNewMesocycle must NOT have pushed its own entry
    expect(useAppStore.getState().blockUndoStack).toHaveLength(1);

    const label = useAppStore.getState().undoBlockAction();

    expect(label).toBe('Block completed');
    const s = useAppStore.getState();
    expect(s.currentMesocycle?.id).toBe(meso.id);
    expect(s.mesocycleHistory).toHaveLength(0);
    expect(s.gamificationStats.totalPoints).toBe(0);
  });
});

describe('switchToQueuedBlock', () => {
  beforeEach(resetStore);

  it('is a no-op when the queue is empty', () => {
    const meso = seedActiveBlock();
    useAppStore.getState().switchToQueuedBlock();
    expect(useAppStore.getState().currentMesocycle?.id).toBe(meso.id);
    expect(useAppStore.getState().mesocycleHistory).toHaveLength(0);
  });

  it('stops the current block (status stopped, not completed) and starts the queued one as ONE undo entry', () => {
    const meso = seedActiveBlock();
    useAppStore.getState().addToMesocycleQueue({
      name: 'Hypertrophy Block', focus: 'hypertrophy', weeks: 4, sessionsPerWeek: 3,
    });

    useAppStore.getState().switchToQueuedBlock();

    const s = useAppStore.getState();
    // Truthful status — an abandoned block must not be mislabeled 'completed'
    expect(s.mesocycleHistory.some(m => m.id === meso.id && m.status === 'stopped')).toBe(true);
    expect(s.currentMesocycle).not.toBeNull();
    expect(s.currentMesocycle!.goalFocus).toBe('hypertrophy');
    expect(s.mesocycleQueue).toHaveLength(0);
    // User's own goal focus is restored after the queued generation
    expect(s.user?.goalFocus).toBe('strength');
    // Depth guard: nested stop + advance collapse into a single entry
    expect(s.blockUndoStack).toHaveLength(1);

    const label = useAppStore.getState().undoBlockAction();
    expect(label).toBe('Switched block');
    const after = useAppStore.getState();
    expect(after.currentMesocycle?.id).toBe(meso.id);
    expect(after.mesocycleHistory).toHaveLength(0);
    expect(after.mesocycleQueue).toHaveLength(1);
  });
});

describe('deleteMesocycle undo', () => {
  beforeEach(resetStore);

  it('tombstones a history block and undo brings it back', () => {
    const meso = seedActiveBlock();
    useAppStore.getState().stopMesocycle();
    useAppStore.setState({ blockUndoStack: [] });

    useAppStore.getState().deleteMesocycle(meso.id);
    let s = useAppStore.getState();
    expect(s.mesocycleHistory.find(m => m.id === meso.id)?._deleted).toBe(true);

    const label = useAppStore.getState().undoBlockAction();
    expect(label).toBe('Block deleted');
    s = useAppStore.getState();
    expect(s.mesocycleHistory.find(m => m.id === meso.id)?._deleted).toBeFalsy();
  });
});

describe('week add/remove undo', () => {
  beforeEach(resetStore);

  it('addWeekToMesocycle is undoable and respects the 12-week cap', () => {
    seedActiveBlock(4);
    const before = useAppStore.getState().currentMesocycle!.weeks.length;

    useAppStore.getState().addWeekToMesocycle();
    expect(useAppStore.getState().currentMesocycle!.weeks.length).toBe(before + 1);

    const label = useAppStore.getState().undoBlockAction();
    expect(label).toBe('Week added');
    expect(useAppStore.getState().currentMesocycle!.weeks.length).toBe(before);

    // Cap: never exceeds 12 weeks no matter how many adds
    for (let i = 0; i < 20; i++) useAppStore.getState().addWeekToMesocycle();
    expect(useAppStore.getState().currentMesocycle!.weeks.length).toBeLessThanOrEqual(12);
  });

  it('removeWeekFromMesocycle never drops below 2 weeks', () => {
    seedActiveBlock(4);
    for (let i = 0; i < 10; i++) useAppStore.getState().removeWeekFromMesocycle(0);
    expect(useAppStore.getState().currentMesocycle!.weeks.length).toBeGreaterThanOrEqual(2);
  });
});

describe('completeMesocycle with a queued block', () => {
  beforeEach(resetStore);

  it('starts the queued block instead of generating a fresh one', () => {
    const meso = seedActiveBlock();
    useAppStore.getState().addToMesocycleQueue({
      name: 'Queued Hypertrophy',
      focus: 'hypertrophy',
      weeks: 5,
      sessionsPerWeek: 4,
    });

    useAppStore.getState().completeMesocycle();

    const s = useAppStore.getState();
    expect(s.mesocycleHistory.some(m => m.id === meso.id && m.status === 'completed')).toBe(true);
    // Queue was consumed and drove the successor's focus
    expect(s.mesocycleQueue).toHaveLength(0);
    expect(s.currentMesocycle).not.toBeNull();
    expect(s.currentMesocycle!.goalFocus).toBe('hypertrophy');
    // User's own preference survives the queued generation
    expect(s.user?.goalFocus).toBe('strength');
  });
});

describe('deleteMesocycle of the current block', () => {
  beforeEach(resetStore);

  it('clears currentMesocycle and undo restores it', () => {
    const meso = seedActiveBlock();

    useAppStore.getState().deleteMesocycle(meso.id);
    expect(useAppStore.getState().currentMesocycle).toBeNull();

    const label = useAppStore.getState().undoBlockAction();
    expect(label).toBe('Block deleted');
    expect(useAppStore.getState().currentMesocycle?.id).toBe(meso.id);
  });
});

describe('generateNewMesocycle undo', () => {
  beforeEach(resetStore);

  it('pushes its own entry and undo brings the previous block back', () => {
    const first = seedActiveBlock();

    useAppStore.getState().generateNewMesocycle(5);
    const s = useAppStore.getState();
    expect(s.currentMesocycle!.id).not.toBe(first.id);
    // Replaced block is archived by the generator
    expect(s.mesocycleHistory.some(m => m.id === first.id)).toBe(true);
    expect(s.blockUndoStack).toHaveLength(1);

    const label = useAppStore.getState().undoBlockAction();
    expect(label).toBe('New block created');
    const after = useAppStore.getState();
    expect(after.currentMesocycle?.id).toBe(first.id);
    expect(after.mesocycleHistory.some(m => m.id === first.id)).toBe(false);
  });
});
