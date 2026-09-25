/**
 * HRV readiness — ln(rMSSD), 7-day mean vs 30-day baseline, CV on the log scale.
 */
import { describe, it, expect } from 'vitest';
import { assessHRV } from '@/lib/performance-engine';

const day = (i: number, hrv: number) => ({ id: `d${i}`, date: new Date(Date.UTC(2026, 8, 1 + i)), provider: 'whoop', hrv } as any);
const steady = (n: number, v = 60) => Array.from({ length: n }, (_, i) => day(i, v + (i % 3) - 1));

describe('HRV (ln rMSSD)', () => {
  it('one low morning after a steady month does not tank readiness (7-day mean)', () => {
    const hist = [...steady(29), day(29, 40)];
    const r = assessHRV(hist[29], hist);
    expect(r.score).toBeGreaterThanOrEqual(60);
  });
  it('a week well below baseline reads as below', () => {
    const hist = [...steady(23, 70), ...Array.from({ length: 7 }, (_, i) => day(23 + i, 45))];
    const r = assessHRV(hist[29], hist);
    expect(r.detail).toContain('below your baseline');
    expect(r.score).toBeLessThan(65);
  });
  it('big day-to-day swings are flagged', () => {
    const hist = [...steady(23), ...[30, 95, 28, 100, 32, 90, 30].map((v, i) => day(23 + i, v))];
    expect(assessHRV(hist[29], hist).detail).toContain('swinging');
  });
  it('under 7 days of data uses the no-baseline path', () => {
    expect(assessHRV(day(0, 70), steady(3)).detail).toContain('no baseline');
  });
});
