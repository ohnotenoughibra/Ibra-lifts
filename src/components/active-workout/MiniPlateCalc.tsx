'use client';
/* Mini plate calculator — shown during the rest overlay. Moved out of ActiveWorkout.tsx unchanged. */
import { Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { barWeight as getBarWeight } from '@/lib/units';
import type { WeightUnit } from '@/lib/types';

const PLATES_LBS = [45, 35, 25, 10, 5, 2.5];
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATE_COLORS: Record<number, string> = {
  45: 'bg-red-500', 35: 'bg-blue-500', 25: 'bg-yellow-500', 20: 'bg-blue-500',
  15: 'bg-yellow-500', 10: 'bg-green-500', 5: 'bg-white', 2.5: 'bg-gray-400', 1.25: 'bg-gray-400',
};

export default function MiniPlateCalc({ weight, unit, singleSided = false }: { weight: number; unit: WeightUnit; singleSided?: boolean }) {
  const barWeight = getBarWeight(unit);
  const plates = unit === 'kg' ? PLATES_KG : PLATES_LBS;

  if (weight <= barWeight) return null;

  // Landmine / single-end exercises load all plates onto ONE sleeve, so the
  // working end carries the full plate weight (not half). Standard barbells
  // split it across two sides.
  const sides = singleSided ? 1 : 2;
  const sideLoad = (weight - barWeight) / sides;
  const loaded: number[] = [];
  let remaining = sideLoad;
  for (const plate of plates) {
    while (remaining >= plate - 0.001) {
      loaded.push(plate);
      remaining -= plate;
    }
  }
  const achievable = remaining > 0.01;

  if (loaded.length === 0) return null;

  return (
    <div className="mt-3">
      {/* Visual barbell with plates */}
      <div className="flex items-center justify-center gap-0.5 mb-1.5">
        {singleSided ? (
          // Anchored pivot on the left, all plates on the working (right) end
          <span className="w-3 h-3 rounded-full bg-grappler-600 mr-0.5" title="Floor anchor / pivot" />
        ) : (
          <div className="flex items-center gap-0.5">
            {[...loaded].reverse().map((p, i) => (
              <div
                key={i}
                className={cn('rounded-sm', PLATE_COLORS[p] || 'bg-gray-500')}
                style={{ width: 8, height: Math.max(18, Math.min(40, p * (unit === 'kg' ? 1.5 : 0.8))) }}
                title={`${p} ${unit}`}
              />
            ))}
          </div>
        )}
        <div className={cn('h-2.5 bg-grappler-500 rounded-full', singleSided ? 'w-10' : 'w-14')} />
        <div className="flex items-center gap-0.5">
          {loaded.map((p, i) => (
            <div
              key={i}
              className={cn('rounded-sm', PLATE_COLORS[p] || 'bg-gray-500')}
              style={{ width: 8, height: Math.max(18, Math.min(40, p * (unit === 'kg' ? 1.5 : 0.8))) }}
              title={`${p} ${unit}`}
            />
          ))}
        </div>
      </div>
      {/* Text breakdown */}
      <p className="text-center text-xs text-grappler-300 font-medium">
        <Dumbbell className="w-3 h-3 inline mr-1 text-grappler-400" />
        {loaded.map(p => String(p)).join(' + ')} {unit} {singleSided ? 'on working end' : 'each side'}
      </p>
      {singleSided && (
        <p className="text-center text-[11px] text-grappler-500 mt-0.5">
          Landmine — load one end only
        </p>
      )}
      {achievable && (
        <p className="text-center text-[11px] text-yellow-400 mt-0.5">
          ~{(remaining * sides).toFixed(1)} {unit} off with standard plates
        </p>
      )}
    </div>
  );
}
