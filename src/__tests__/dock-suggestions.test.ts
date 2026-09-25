import { describe, it, expect } from 'vitest';
import { getDockSuggestions } from '@/lib/tool-affinity';

describe('dock suggestions', () => {
  it('an empty dock gets starter tools for the athlete type', () => {
    expect(getDockSuggestions([], [], 4, 'combat')).toEqual(['grappling', 'nutrition', 'competition', 'conditioning']);
    expect(getDockSuggestions([], [], 2, 'general')).toEqual(['nutrition', 'conditioning']);
  });
  it('skips pinned tools', () => {
    expect(getDockSuggestions([], ['grappling'], 4, 'combat')).not.toContain('grappling');
  });
});
