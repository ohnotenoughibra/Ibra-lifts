/**
 * Weekly weight change uses calendar windows, not entry counts.
 */
import { describe, it, expect } from 'vitest';
import { analyzeWeightTrend } from '@/lib/diet-coach';

const e = (day: number, weight: number, extra: object = {}) => ({ id: `w${day}`, date: new Date(Date.UTC(2026, 7, day, 7)), weight, unit: 'kg', ...extra } as any);

describe('analyzeWeightTrend windows', () => {
  it('twice-a-week weigh-ins losing 0.5 kg/week read ≈ −0.5 kg/week', () => {
    const entries = [];
    for (let wk = 0; wk < 6; wk++) for (const d of [1, 4]) entries.push(e(1 + wk * 7 + d, 80 - wk * 0.5 - (d === 4 ? 0.2 : 0)));
    const r = analyzeWeightTrend(entries);
    expect(r.weeklyChange).toBeLessThan(-0.3);
    expect(r.weeklyChange).toBeGreaterThan(-0.8);
  });
  it('deleted entries are ignored', () => {
    const base = Array.from({ length: 14 }, (_, i) => e(1 + i, 80));
    const r = analyzeWeightTrend([...base, e(14, 200, { id: 'typo', _deleted: true })]);
    expect(r.current).toBe(80);
    expect(r.weeklyChange).toBe(0);
  });
  it('same-day weigh-ins are averaged into one point', () => {
    const r = analyzeWeightTrend([e(1, 80), { ...e(1, 82), id: 'b' }]);
    expect(r.trendData).toHaveLength(1);
    expect(r.trendData[0].weight).toBe(81);
  });
});
