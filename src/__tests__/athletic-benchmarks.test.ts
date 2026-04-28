import { describe, it, expect } from 'vitest';
import {
  classifyTier,
  summarize,
  findWeakestAttribute,
  buildResult,
  BENCHMARK_SPECS,
  type BenchmarkSummary,
} from '@/lib/athletic-benchmarks';

describe('classifyTier', () => {
  const vert = BENCHMARK_SPECS.find(s => s.id === 'vertical_jump')!;
  const sprint = BENCHMARK_SPECS.find(s => s.id === 'sprint_10m')!;

  it('higher-is-better: 80cm vertical = elite', () => {
    expect(classifyTier(vert, 80)).toBe('elite');
  });

  it('higher-is-better: 50cm vertical = intermediate', () => {
    expect(classifyTier(vert, 50)).toBe('intermediate');
  });

  it('higher-is-better: 25cm vertical = beginner', () => {
    expect(classifyTier(vert, 25)).toBe('beginner');
  });

  it('lower-is-better: 1.65s 10m sprint = elite', () => {
    expect(classifyTier(sprint, 1.65)).toBe('elite');
  });

  it('lower-is-better: 2.50s 10m sprint = beginner', () => {
    expect(classifyTier(sprint, 2.50)).toBe('beginner');
  });
});

describe('summarize', () => {
  it('returns untested for empty results', () => {
    const s = summarize('vertical_jump', []);
    expect(s.tier).toBe('untested');
    expect(s.best).toBe(0);
  });

  it('changeAllTime is positive when athlete improves on higher-is-better', () => {
    const results = [
      buildResult({ benchmarkId: 'vertical_jump', date: new Date(Date.now() - 200 * 86400000).toISOString(), value: 40 }),
      buildResult({ benchmarkId: 'vertical_jump', date: new Date().toISOString(), value: 55 }),
    ];
    const s = summarize('vertical_jump', results);
    expect(s.changeAllTime).toBe(15);
    expect(s.best).toBe(55);
  });

  it('changeAllTime is positive when sprinter gets faster (lower=better)', () => {
    const results = [
      buildResult({ benchmarkId: 'sprint_10m', date: new Date(Date.now() - 200 * 86400000).toISOString(), value: 2.10 }),
      buildResult({ benchmarkId: 'sprint_10m', date: new Date().toISOString(), value: 1.85 }),
    ];
    const s = summarize('sprint_10m', results);
    expect(s.changeAllTime).toBeCloseTo(0.25);
    expect(s.best).toBe(1.85);
  });

  it('changeLast90Days uses the most recent before/after window', () => {
    const results = [
      buildResult({ benchmarkId: 'vertical_jump', date: new Date(Date.now() - 150 * 86400000).toISOString(), value: 50 }),
      buildResult({ benchmarkId: 'vertical_jump', date: new Date(Date.now() - 30 * 86400000).toISOString(), value: 60 }),
    ];
    const s = summarize('vertical_jump', results);
    expect(s.changeLast90Days).toBe(10);
  });
});

describe('findWeakestAttribute', () => {
  it('returns null when no benchmarks tested', () => {
    const summary: BenchmarkSummary = { benchmarkId: 'vertical_jump', best: 0, latest: 0, tier: 'untested', changeAllTime: 0, changeLast90Days: 0, results: [] };
    expect(findWeakestAttribute([summary])).toBeNull();
  });

  it('routes weak vertical_jump to plyometrics tool', () => {
    const summaries: BenchmarkSummary[] = [
      { benchmarkId: 'vertical_jump', best: 32, latest: 32, tier: 'beginner', changeAllTime: 0, changeLast90Days: 0, results: [] },
      { benchmarkId: 'sprint_10m', best: 1.7, latest: 1.7, tier: 'elite', changeAllTime: 0, changeLast90Days: 0, results: [] },
    ];
    const result = findWeakestAttribute(summaries);
    expect(result?.benchmarkId).toBe('vertical_jump');
    expect(result?.suggestedToolId).toBe('plyometrics');
  });

  it('normalizes correctly across mixed-direction benchmarks', () => {
    const nearEliteVert: BenchmarkSummary = { benchmarkId: 'vertical_jump', best: 73, latest: 73, tier: 'advanced', changeAllTime: 0, changeLast90Days: 0, results: [] };
    const slowSprint: BenchmarkSummary = { benchmarkId: 'sprint_10m', best: 2.25, latest: 2.25, tier: 'beginner', changeAllTime: 0, changeLast90Days: 0, results: [] };
    const result = findWeakestAttribute([nearEliteVert, slowSprint]);
    expect(result?.benchmarkId).toBe('sprint_10m');
  });

  it('weak dead_hang routes to grip_strength', () => {
    const summaries: BenchmarkSummary[] = [
      { benchmarkId: 'dead_hang', best: 25, latest: 25, tier: 'beginner', changeAllTime: 0, changeLast90Days: 0, results: [] },
      { benchmarkId: 'vertical_jump', best: 70, latest: 70, tier: 'advanced', changeAllTime: 0, changeLast90Days: 0, results: [] },
    ];
    const result = findWeakestAttribute(summaries);
    expect(result?.benchmarkId).toBe('dead_hang');
    expect(result?.suggestedToolId).toBe('grip_strength');
  });
});
