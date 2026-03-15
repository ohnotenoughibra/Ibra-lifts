'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Dumbbell,
  RotateCcw,
  Minus,
  Plus,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlateCalculatorProps {
  onClose: () => void;
}

type WeightUnit = 'lbs' | 'kg';

interface BarOption {
  label: string;
  lbs: number;
  kg: number;
}

interface PlateBreakdown {
  perSide: PlateCount[];
  achievedWeight: number;
  remainder: number;
}

type PlateCount = { plate: number; count: number };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BAR_OPTIONS: BarOption[] = [
  { label: 'Olympic', lbs: 45, kg: 20 },
  { label: "Women's", lbs: 35, kg: 15 },
  { label: 'EZ Curl', lbs: 25, kg: 10 },
];

const PLATES_LBS = [45, 35, 25, 10, 5, 2.5] as const;
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

const QUICK_ADD_LBS = [5, 10, 25, 45];
const QUICK_ADD_KG = [2.5, 5, 10, 20];

const PLATE_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  // LBS plates
  45:   { bg: 'bg-red-600',    text: 'text-white',       border: 'border-red-500' },
  35:   { bg: 'bg-blue-600',   text: 'text-white',       border: 'border-blue-500' },
  25:   { bg: 'bg-yellow-500', text: 'text-gray-900',    border: 'border-yellow-400' },
  10:   { bg: 'bg-green-600',  text: 'text-white',       border: 'border-green-500' },
  5:    { bg: 'bg-white',      text: 'text-gray-900',    border: 'border-gray-300' },
  2.5:  { bg: 'bg-gray-400',   text: 'text-gray-900',    border: 'border-gray-300' },
  // KG plates (shared where overlap exists; unique below)
  20:   { bg: 'bg-blue-600',   text: 'text-white',       border: 'border-blue-500' },
  15:   { bg: 'bg-yellow-500', text: 'text-gray-900',    border: 'border-yellow-400' },
  1.25: { bg: 'bg-gray-500',   text: 'text-white',       border: 'border-gray-400' },
};

const WARMUP_RAMP = [
  { pct: 0,    reps: 10, label: 'Bar Only' },
  { pct: 0.4,  reps: 5,  label: '40%' },
  { pct: 0.6,  reps: 3,  label: '60%' },
  { pct: 0.8,  reps: 2,  label: '80%' },
  { pct: 0.9,  reps: 1,  label: '90%' },
  { pct: 1.0,  reps: 0,  label: '100%' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAvailablePlates(unit: WeightUnit): number[] {
  return unit === 'lbs' ? [...PLATES_LBS] : [...PLATES_KG];
}

function computePlateBreakdown(
  targetWeight: number,
  barWeight: number,
  plates: number[],
): PlateBreakdown {
  const weightToLoad = targetWeight - barWeight;
  if (weightToLoad <= 0) {
    return { perSide: [], achievedWeight: barWeight, remainder: 0 };
  }

  let perSideWeight = weightToLoad / 2;
  const perSide: PlateCount[] = [];

  for (const plate of plates) {
    if (perSideWeight >= plate) {
      const count = Math.floor(perSideWeight / plate);
      perSide.push({ plate, count });
      perSideWeight -= count * plate;
    }
  }

  // Round remainder to avoid floating point issues
  const remainder = Math.round(perSideWeight * 100) / 100;
  const loadedPerSide = perSide.reduce((s, p) => s + p.plate * p.count, 0);
  const achievedWeight = barWeight + loadedPerSide * 2;

  return { perSide, achievedWeight, remainder };
}

/** Round a weight to the nearest achievable increment (smallest plate × 2). */
function roundToPlateIncrement(weight: number, barWeight: number, unit: WeightUnit): number {
  const smallest = unit === 'lbs' ? 2.5 : 1.25;
  const increment = smallest * 2;
  const aboveBar = weight - barWeight;
  if (aboveBar <= 0) return barWeight;
  return barWeight + Math.round(aboveBar / increment) * increment;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PlateRect({ weight, unit }: { weight: number; unit: WeightUnit }) {
  const colors = PLATE_COLORS[weight] ?? { bg: 'bg-gray-600', text: 'text-white', border: 'border-gray-500' };
  // Wider plates for heavier weights
  const heightClass =
    weight >= 25 ? 'h-14' :
    weight >= 10 ? 'h-11' :
    weight >= 5  ? 'h-9' :
                   'h-7';

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-sm border font-bold text-xs min-w-[28px] px-1',
        heightClass,
        colors.bg,
        colors.text,
        colors.border,
      )}
    >
      {weight}
    </div>
  );
}

function BarbellDiagram({
  breakdown,
  unit,
}: {
  breakdown: PlateBreakdown;
  unit: WeightUnit;
}) {
  // Flatten plates for visual rendering (largest inside, smallest outside)
  const flatPlates: number[] = [];
  for (const { plate, count } of breakdown.perSide) {
    for (let i = 0; i < count; i++) {
      flatPlates.push(plate);
    }
  }

  if (flatPlates.length === 0) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="h-3 w-48 rounded-full bg-grappler-600" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-0 py-4 overflow-x-auto">
      {/* Left side plates (mirror — smallest on outer edge) */}
      <div className="flex items-center gap-0.5 flex-row-reverse">
        {flatPlates.map((p, i) => (
          <PlateRect key={`l-${i}`} weight={p} unit={unit} />
        ))}
      </div>

      {/* Bar (center) */}
      <div className="h-3 w-16 sm:w-24 bg-grappler-500 rounded-full mx-1 flex-shrink-0" />

      {/* Right side plates */}
      <div className="flex items-center gap-0.5">
        {flatPlates.map((p, i) => (
          <PlateRect key={`r-${i}`} weight={p} unit={unit} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PlateCalculator({ onClose }: PlateCalculatorProps) {
  const getWeightUnit = useAppStore((s) => s.getWeightUnit);
  const unit: WeightUnit = getWeightUnit();

  const [barIndex, setBarIndex] = useState(0);
  const barWeight = unit === 'lbs' ? BAR_OPTIONS[barIndex].lbs : BAR_OPTIONS[barIndex].kg;

  const [targetWeight, setTargetWeight] = useState<number>(barWeight);
  const [inputValue, setInputValue] = useState<string>(String(barWeight));
  const [showWarmup, setShowWarmup] = useState(false);

  const plates = useMemo(() => getAvailablePlates(unit), [unit]);
  const quickAdds = unit === 'lbs' ? QUICK_ADD_LBS : QUICK_ADD_KG;

  // Recalculate when bar changes
  const handleBarChange = useCallback(
    (idx: number) => {
      const newBar = unit === 'lbs' ? BAR_OPTIONS[idx].lbs : BAR_OPTIONS[idx].kg;
      setBarIndex(idx);
      setTargetWeight((prev) => (prev < newBar ? newBar : prev));
    },
    [unit],
  );

  const adjustTarget = useCallback(
    (delta: number) => {
      setTargetWeight((prev) => {
        const next = Math.max(0, Math.round((prev + delta) * 100) / 100);
        setInputValue(String(next));
        return next;
      });
    },
    [],
  );

  const resetTarget = useCallback(() => {
    setTargetWeight(barWeight);
    setInputValue(String(barWeight));
  }, [barWeight]);

  // Core calculation
  const breakdown = useMemo(
    () => computePlateBreakdown(targetWeight, barWeight, plates),
    [targetWeight, barWeight, plates],
  );

  const isBelowBar = targetWeight < barWeight;
  const hasRemainder = breakdown.remainder > 0;

  // Warm-up ramp
  const warmupSteps = useMemo(() => {
    if (!showWarmup || isBelowBar) return [];
    return WARMUP_RAMP.map((step) => {
      const rawWeight = step.pct === 0 ? barWeight : targetWeight * step.pct;
      const rounded = roundToPlateIncrement(rawWeight, barWeight, unit);
      const stepBreakdown = computePlateBreakdown(rounded, barWeight, plates);
      return {
        ...step,
        weight: stepBreakdown.achievedWeight,
        breakdown: stepBreakdown,
      };
    });
  }, [showWarmup, targetWeight, barWeight, plates, unit, isBelowBar]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="min-h-screen bg-grappler-950 pb-20 safe-area-top safe-area-bottom"
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-grappler-950/95 backdrop-blur-sm border-b border-grappler-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            aria-label="Go back"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-grappler-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-grappler-200" />
          </button>
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-orange-400" />
            <h1 className="text-lg font-bold text-grappler-50">Plate Calculator</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">
        {/* ── Bar Weight Selector ─────────────────────────────────── */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-grappler-400 uppercase tracking-wider">
            Bar Type
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {BAR_OPTIONS.map((bar, idx) => {
              const w = unit === 'lbs' ? bar.lbs : bar.kg;
              return (
                <button
                  key={bar.label}
                  onClick={() => handleBarChange(idx)}
                  className={cn(
                    'rounded-xl py-3 px-2 text-center transition-all border',
                    idx === barIndex
                      ? 'bg-orange-500/20 border-orange-500/60 text-orange-300'
                      : 'bg-grappler-900 border-grappler-800 text-grappler-300 hover:bg-grappler-800',
                  )}
                >
                  <div className="text-lg font-bold">
                    {w} {unit}
                  </div>
                  <div className="text-xs text-grappler-400">{bar.label}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Target Weight Input ─────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-grappler-400 uppercase tracking-wider">
            Target Weight
          </h2>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => adjustTarget(-(unit === 'lbs' ? 5 : 2.5))}
              className="p-3 rounded-xl bg-grappler-900 border border-grappler-800 hover:bg-grappler-800 transition-colors"
              aria-label="Decrease weight"
            >
              <Minus className="w-5 h-5 text-grappler-300" />
            </button>

            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={unit === 'lbs' ? 5 : 2.5}
                value={inputValue}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const raw = e.target.value;
                  setInputValue(raw);
                  const v = parseFloat(raw);
                  if (!isNaN(v)) setTargetWeight(Math.max(0, v));
                  else if (raw === '') setTargetWeight(0);
                }}
                className={cn(
                  'w-36 text-center text-3xl font-bold py-3 rounded-xl border',
                  'bg-grappler-900 border-grappler-700 text-grappler-50',
                  'focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500',
                  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-grappler-500 font-medium">
                {unit}
              </span>
            </div>

            <button
              onClick={() => adjustTarget(unit === 'lbs' ? 5 : 2.5)}
              className="p-3 rounded-xl bg-grappler-900 border border-grappler-800 hover:bg-grappler-800 transition-colors"
              aria-label="Increase weight"
            >
              <Plus className="w-5 h-5 text-grappler-300" />
            </button>
          </div>

          {/* Quick-add / subtract buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {quickAdds.map((amt) => (
              <button
                key={`sub-${amt}`}
                onClick={() => adjustTarget(-amt)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-grappler-900 border border-grappler-800 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                &minus;{amt}
              </button>
            ))}
            <button
              onClick={resetTarget}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-grappler-900 border border-grappler-800 text-grappler-400 hover:bg-grappler-800 transition-colors"
              aria-label="Reset to bar weight"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            {quickAdds.map((amt) => (
              <button
                key={`add-${amt}`}
                onClick={() => adjustTarget(amt)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-grappler-900 border border-grappler-800 text-green-400 hover:bg-green-500/10 transition-colors"
              >
                +{amt}
              </button>
            ))}
          </div>
        </section>

        {/* ── Plate Visualization ─────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-grappler-400 uppercase tracking-wider">
            Plates
          </h2>

          <div className="rounded-2xl bg-grappler-900 border border-grappler-800 p-4 space-y-4">
            {isBelowBar ? (
              <div className="flex items-center gap-2 text-yellow-400 py-4 justify-center">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">
                  Target weight is less than bar weight ({barWeight} {unit})
                </span>
              </div>
            ) : (
              <>
                {/* Barbell diagram */}
                <BarbellDiagram breakdown={breakdown} unit={unit} />

                {/* Achieved weight notice */}
                {hasRemainder && (
                  <div className="flex items-center gap-2 text-yellow-400 text-sm bg-yellow-500/10 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      Can&apos;t hit {targetWeight} {unit} exactly. Closest:{' '}
                      <span className="font-bold">{breakdown.achievedWeight} {unit}</span>{' '}
                      (off by {Math.round(breakdown.remainder * 2 * 100) / 100} {unit})
                    </span>
                  </div>
                )}

                {/* Per Side breakdown */}
                {breakdown.perSide.length > 0 ? (
                  <div>
                    <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-2">
                      Per Side
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {breakdown.perSide.map(({ plate, count }) => {
                        const colors = PLATE_COLORS[plate] ?? {
                          bg: 'bg-gray-600',
                          text: 'text-white',
                          border: 'border-gray-500',
                        };
                        return (
                          <div
                            key={plate}
                            className={cn(
                              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5',
                              colors.bg,
                              colors.text,
                              colors.border,
                            )}
                          >
                            <span className="font-bold text-sm">{plate} {unit}</span>
                            <span className="font-medium text-xs opacity-80">&times;{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-sm text-grappler-400">
                    Bar only &mdash; no plates needed
                  </p>
                )}

                {/* Total summary */}
                <div className="pt-2 border-t border-grappler-800 text-center">
                  <span className="text-grappler-400 text-sm">Total loaded: </span>
                  <span className="text-grappler-50 font-bold text-sm">
                    {breakdown.achievedWeight} {unit}
                  </span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Warm-Up Ramp ────────────────────────────────────────── */}
        <section className="space-y-3">
          <button
            onClick={() => setShowWarmup((v) => !v)}
            disabled={isBelowBar}
            className={cn(
              'flex items-center gap-2 w-full rounded-xl py-3 px-4 font-semibold text-sm transition-all border',
              showWarmup
                ? 'bg-orange-500/20 border-orange-500/60 text-orange-300'
                : 'bg-grappler-900 border-grappler-800 text-grappler-300 hover:bg-grappler-800',
              isBelowBar && 'opacity-40 cursor-not-allowed',
            )}
          >
            <Flame className="w-4 h-4" />
            {showWarmup ? 'Hide Warm-Up Ramp' : 'Show Warm-Up Ramp'}
          </button>

          {showWarmup && !isBelowBar && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              {warmupSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'rounded-xl border p-3 space-y-1',
                    step.pct === 1
                      ? 'bg-orange-500/10 border-orange-500/40'
                      : 'bg-grappler-900 border-grappler-800',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-xs font-bold px-2 py-0.5 rounded-full',
                          step.pct === 1
                            ? 'bg-orange-500/30 text-orange-300'
                            : 'bg-grappler-800 text-grappler-300',
                        )}
                      >
                        {step.label}
                      </span>
                      {step.reps > 0 && (
                        <span className="text-xs text-grappler-400">
                          &times; {step.reps} reps
                        </span>
                      )}
                      {step.pct === 1 && (
                        <span className="text-xs text-orange-400 font-semibold">Working Set</span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-grappler-50">
                      {step.weight} {unit}
                    </span>
                  </div>

                  {/* Mini plate breakdown */}
                  {step.breakdown.perSide.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {step.breakdown.perSide.map(({ plate, count }) => {
                        const colors = PLATE_COLORS[plate] ?? {
                          bg: 'bg-gray-600',
                          text: 'text-white',
                          border: 'border-gray-500',
                        };
                        return (
                          <span
                            key={plate}
                            className={cn(
                              'text-xs font-semibold px-2 py-0.5 rounded border',
                              colors.bg,
                              colors.text,
                              colors.border,
                            )}
                          >
                            {plate}&times;{count}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-grappler-500">Bar only</p>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </section>
      </div>
    </motion.div>
  );
}
