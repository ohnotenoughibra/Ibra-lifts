import { describe, it, expect } from 'vitest';
import { generatePlyoBlock } from '@/lib/plyometric-engine';

describe('generatePlyoBlock', () => {
  it('creates weeks * sessionsPerWeek sessions', () => {
    const block = generatePlyoBlock({ bodyFocus: 'lower', experience: 'intermediate', weeks: 6, sessionsPerWeek: 2 });
    expect(block.sessions.length).toBe(12);
  });

  it('phases progress: extensive (1-2) → intensive (3-4) → reactive (5) → contrast (6)', () => {
    const block = generatePlyoBlock({ bodyFocus: 'lower', experience: 'intermediate' });
    expect(block.sessions.find(s => s.weekNumber === 1)?.phase).toBe('extensive');
    expect(block.sessions.find(s => s.weekNumber === 3)?.phase).toBe('intensive');
    expect(block.sessions.find(s => s.weekNumber === 5)?.phase).toBe('reactive');
    expect(block.sessions.find(s => s.weekNumber === 6)?.phase).toBe('contrast');
  });

  it('beginners excluded from intensityScore>7 in week 5', () => {
    const block = generatePlyoBlock({ bodyFocus: 'lower', experience: 'beginner' });
    const reactiveSession = block.sessions.find(s => s.weekNumber === 5);
    if (reactiveSession) {
      expect(reactiveSession.exercises.every(e => e.intensityScore <= 7)).toBe(true);
    }
  });

  it('emits depth-jump prerequisite when weeks>=5', () => {
    const block = generatePlyoBlock({ bodyFocus: 'lower', experience: 'intermediate', weeks: 6 });
    expect(block.prerequisites.some(p => /1\.5/.test(p))).toBe(true);
  });

  it('volume floor: every session has >=1 exercise with sets>=2', () => {
    const block = generatePlyoBlock({ bodyFocus: 'upper', experience: 'intermediate' });
    for (const session of block.sessions) {
      expect(session.exercises.length).toBeGreaterThan(0);
      expect(session.exercises.every(e => e.sets >= 2)).toBe(true);
    }
  });

  it('advanced experience gets >= intermediate contacts', () => {
    const inter = generatePlyoBlock({ bodyFocus: 'lower', experience: 'intermediate', weeks: 2, sessionsPerWeek: 1 });
    const adv = generatePlyoBlock({ bodyFocus: 'lower', experience: 'advanced', weeks: 2, sessionsPerWeek: 1 });
    expect(adv.sessions[0].totalContacts).toBeGreaterThanOrEqual(inter.sessions[0].totalContacts);
  });

  it('upper-body focus generates upper-body exercises', () => {
    const block = generatePlyoBlock({ bodyFocus: 'upper', experience: 'intermediate', weeks: 2, sessionsPerWeek: 1 });
    const allExercises = block.sessions.flatMap(s => s.exercises);
    expect(allExercises.length).toBeGreaterThan(0);
    expect(allExercises.every(e => e.bodyFocus === 'upper' || e.bodyFocus === 'full')).toBe(true);
  });
});
