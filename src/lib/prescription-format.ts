import type { Exercise, ExerciseMeasurement } from './types';

/** How a prescription's `targetReps` should be read for this exercise. */
export function measurementOf(ex: Pick<Exercise, 'measurementType'> | undefined): ExerciseMeasurement {
  return ex?.measurementType ?? 'reps';
}

/** "10 reps" · "40 s" · "30 m" — never "40 reps" for a farmer's walk. */
export function formatTarget(value: number, ex: Pick<Exercise, 'measurementType'> | undefined): string {
  switch (measurementOf(ex)) {
    case 'time': return `${value} s`;
    case 'distance': return `${value} m`;
    default: return `${value} reps`;
  }
}

/** Compact "3×10", "3×40s", "3×30m". */
export function formatSetsTarget(sets: number, value: number, ex: Pick<Exercise, 'measurementType'> | undefined): string {
  const m = measurementOf(ex);
  return `${sets}×${value}${m === 'time' ? 's' : m === 'distance' ? 'm' : ''}`;
}
