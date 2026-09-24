import { describe, it, expect, beforeEach } from 'vitest';
import { searchExercises, getRecommendedAlternatives, registerCustomExercises } from '@/lib/exercises';
import { useAppStore } from '@/lib/store';

describe('searchExercises — full-library swap search', () => {
  it('finds by name prefix first', () => {
    expect(searchExercises('farmer')[0].id).toBe('farmers-walk');
  });
  it('understands gym shorthand (db, rdl, hams)', () => {
    expect(searchExercises('db row').map(e => e.id)).toContain('dumbbell-row');
    expect(searchExercises('rdl').map(e => e.id)).toContain('romanian-deadlift');
    const hams = searchExercises('hams');
    expect(hams.length).toBeGreaterThan(3);
    expect(hams.every(e => [...e.primaryMuscles, ...e.secondaryMuscles].includes('hamstrings'))).toBe(true);
  });
  it('every word must match (AND)', () => {
    const r = searchExercises('kettlebell swing');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every(e => /swing/i.test(e.name))).toBe(true);
  });
  it('returns nothing for gibberish and empty queries', () => {
    expect(searchExercises('zzqx')).toEqual([]);
    expect(searchExercises('   ')).toEqual([]);
  });
  it('includes custom exercises, and custom exercises get alternatives', () => {
    registerCustomExercises([{
      id: 'custom-sled-shove', name: 'Sled Shove', category: 'compound', primaryMuscles: ['quadriceps'],
      secondaryMuscles: ['glutes'], movementPattern: 'squat', equipmentRequired: ['full_gym'],
      equipmentTypes: ['bodyweight'], grapplerFriendly: true, aestheticValue: 3, strengthValue: 6,
      description: '', cues: [], isCustom: true,
    } as any]);
    expect(searchExercises('sled').map(e => e.id)).toContain('custom-sled-shove');
    expect(getRecommendedAlternatives('custom-sled-shove', 'full_gym', 8).length).toBeGreaterThan(0);
    registerCustomExercises([]);
  });
});

describe('hidden exercises', () => {
  beforeEach(() => useAppStore.setState({ hiddenExercises: { ids: [], updatedAt: new Date(0).toISOString() } }));
  it('hide / unhide update the list with a fresh updatedAt (for sync merge)', () => {
    const t0 = useAppStore.getState().hiddenExercises.updatedAt;
    useAppStore.getState().hideExercise('shrimp-squat');
    useAppStore.getState().hideExercise('shrimp-squat'); // idempotent
    expect(useAppStore.getState().hiddenExercises.ids).toEqual(['shrimp-squat']);
    expect(useAppStore.getState().hiddenExercises.updatedAt > t0).toBe(true);
    useAppStore.getState().unhideExercise('shrimp-squat');
    expect(useAppStore.getState().hiddenExercises.ids).toEqual([]);
  });
});
