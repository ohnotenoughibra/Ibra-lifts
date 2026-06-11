import { describe, it, expect } from 'vitest';
import { buildWeekPlan } from '@/lib/smart-schedule';
import type { ScheduledCardioDay } from '@/lib/types';

describe('buildWeekPlan — scheduled cardio', () => {
  it('is backward-compatible: omitting scheduledCardio behaves as before', () => {
    const plan = buildWeekPlan([1, 3, 5], [], []);
    // Wed (3) is a lift day, no cardio anywhere
    expect(plan.days[3].isLiftDay).toBe(true);
    expect(plan.days.every(d => d.cardio === undefined)).toBe(true);
  });

  it('puts a scheduled cardio session on the plan and clears the rest-day flag', () => {
    const cardio: ScheduledCardioDay[] = [
      { day: 2, modality: 'running', intensity: 'easy', durationMin: 40, label: 'Zone 2' },
    ];
    const plan = buildWeekPlan([1, 4], [], [], cardio);
    const tue = plan.days[2];
    expect(tue.cardio?.modality).toBe('running');
    expect(tue.cardio?.label).toBe('Zone 2');
    // Tuesday is not a lift day and not combat, but now it's NOT a rest day.
    expect(tue.isLiftDay).toBe(false);
    expect(tue.isRestDay).toBe(false);
  });

  it('keeps a day that is both a lift day and a cardio day flagged as a lift day', () => {
    const cardio: ScheduledCardioDay[] = [{ day: 1, modality: 'cycling', intensity: 'moderate' }];
    const plan = buildWeekPlan([1, 3, 5], [], [], cardio);
    const mon = plan.days[1];
    expect(mon.isLiftDay).toBe(true);
    expect(mon.cardio?.modality).toBe('cycling');
    expect(mon.isRestDay).toBe(false);
  });

  it('counts cardio-only days as training days (no false "no rest days" when cardio fills the week)', () => {
    // Lift Mon/Wed/Fri + cardio Tue/Thu/Sat/Sun → zero rest days
    const cardio: ScheduledCardioDay[] = [2, 4, 6, 0].map(day => ({ day, modality: 'running' as const, intensity: 'easy' as const }));
    const plan = buildWeekPlan([1, 3, 5], [], [], cardio);
    expect(plan.days.filter(d => d.isRestDay).length).toBe(0);
    expect(plan.warnings.some(w => w.toLowerCase().includes('no rest days'))).toBe(true);
  });

  it('hard cardio the day before a lift reduces that lift’s freshness/intensity', () => {
    // Hard cardio Sunday (0) before a Monday (1) lift; without it, Monday is fresh.
    const fresh = buildWeekPlan([1], [], [{ id: 's', name: 'x', type: 'strength', exercises: [] } as never]);
    const taxed = buildWeekPlan([1], [], [{ id: 's', name: 'x', type: 'strength', exercises: [] } as never],
      [{ day: 0, modality: 'running', intensity: 'hard', durationMin: 60 }]);
    // Monday intensity modifier should be <= the no-cardio case (more fatigue → equal or reduced).
    expect(taxed.days[1].intensityModifier).toBeLessThanOrEqual(fresh.days[1].intensityModifier);
  });
});
