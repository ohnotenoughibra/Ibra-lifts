import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit } from '@/lib/rate-limit';

// The in-memory limiter (cheap routes). The Postgres-backed rateLimitDaily is
// integration-tested against a real DB, not here — but its semantics mirror
// these boundaries: count > limit ⇒ limited.

describe('rateLimit (in-memory sliding window)', () => {
  beforeEach(() => {
    // unique key per test avoids cross-test state in the module-level store
  });

  it('allows up to the limit, blocks beyond it', () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 3, 60_000).limited).toBe(false); // 1
    expect(rateLimit(key, 3, 60_000).limited).toBe(false); // 2
    expect(rateLimit(key, 3, 60_000).limited).toBe(false); // 3
    expect(rateLimit(key, 3, 60_000).limited).toBe(true);  // 4 > 3
  });

  it('reports remaining accurately', () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 5, 60_000).remaining).toBe(4);
    expect(rateLimit(key, 5, 60_000).remaining).toBe(3);
  });

  it('separate keys have independent counters', () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).limited).toBe(true);
    expect(rateLimit(b, 1, 60_000).limited).toBe(false);
  });
});
