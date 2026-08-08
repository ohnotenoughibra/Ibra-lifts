'use client';

import { useAppStore } from '@/lib/store';
import { resolveWeightUnit, type WeightUnit } from '@/lib/units';

/**
 * The user's weight unit from settings, with a consistent fallback.
 *
 * Use this in components instead of `user?.weightUnit || 'lbs'` so every
 * surface labels weights the same way.
 */
export function useWeightUnit(): WeightUnit {
  return useAppStore((s) => resolveWeightUnit(s.user?.weightUnit));
}
