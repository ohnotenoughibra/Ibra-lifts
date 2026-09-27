/**
 * WhoopLiftStats — the Whoop panel on a lift in Workout History.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WhoopLiftStats from '@/components/WhoopLiftStats';
import type { WorkoutLog } from '@/lib/types';

const DAY = 864e5;
const T0 = Date.parse('2026-09-20T18:00:00Z');
const hr = (strain: number) => ({ avgHR: 131, maxHR: 172, strain, calories: 420, whoopWorkoutId: 'w' });
const lift = (id: string, t: number, f: Partial<WorkoutLog> = {}) => ({
  id, date: new Date(t), exercises: [], totalVolume: 10000, weightUnit: 'kg', duration: 60, overallRPE: 8, ...f,
}) as unknown as WorkoutLog;

describe('WhoopLiftStats', () => {
  it('renders nothing for a lift without Whoop data', () => {
    const { container } = render(<WhoopLiftStats log={lift('L', T0)} allLogs={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows strain, HR, calories and strain per tonne vs usual', () => {
    const prior = [1, 2, 3].map(i => lift(`P${i}`, T0 - i * DAY, { whoopHR: hr(10) }));
    const today = lift('L', T0, { whoopHR: hr(13) });
    render(<WhoopLiftStats log={today} allLogs={[...prior, today]} />);
    expect(screen.getByText('13.0')).toBeTruthy();
    expect(screen.getByText('131')).toBeTruthy();
    expect(screen.getByText('172')).toBeTruthy();
    expect(screen.getByText('420')).toBeTruthy();
    expect(screen.getByText(/1\.3 strain per 1,000 kg lifted/)).toBeTruthy();
    expect(screen.getByText(/30% above your usual/)).toBeTruthy();
  });

  it('explains a big gap between logged RPE and heart-rate RPE', () => {
    render(<WhoopLiftStats log={lift('L', T0, { overallRPE: 10, whoopHR: { ...hr(4), avgHR: 100 } })} allLogs={[]} />);
    expect(screen.getByText(/You logged RPE 10, your heart rate says ~\d+/)).toBeTruthy();
  });
});
