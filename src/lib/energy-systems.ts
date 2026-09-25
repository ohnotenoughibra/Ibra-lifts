/**
 * Energy Systems Engine — structured cardio for combat athletes
 *
 * Three protocols, each targeting a different energy system:
 *
 *   1. Zone 2 Base       — aerobic capacity (mitochondrial density, fat ox)
 *      45-90 min @ HR Zone 2 (~60-70% max HR / 45-60% HR reserve), conversational pace
 *      San Millán & Brooks 2017 — lactate dynamics
 *
 *   2. Threshold (Norwegian 4×4)  — VO2max
 *      4 × 4 min @ ~90-95% max HR (Zone 5) with 3 min active recovery
 *      Helgerud et al. 2007 — superior VO2max gains vs steady-state
 *
 *   3. Repeated Sprint Ability (RSA) — repeated-burst capacity / combat-specific
 *      2 × 6 × 6 s all-out with 24 s easy (sprints ≤ 10 s, recovery < 60 s)
 *      Bishop et al. 2011 — 30 s all-out efforts are SIT, not RSA
 *
 * Periodization: Base → Threshold → Peak (RSA), 4-6 weeks per phase.
 *
 * The combat athlete's missing piece: most train conditioning circuits but
 * skip Zone 2 — and Zone 2 is the engine that lets you push the threshold
 * sessions harder without crashing.
 */

import { v4 as uuidv4 } from 'uuid';
import type { WorkoutSession, ExercisePrescription, Exercise } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EnergySystemId = 'zone2_base' | 'threshold_4x4' | 'rsa' | 'tempo' | 'aerobic_intervals';

export type CardioModality = 'run' | 'bike' | 'row' | 'jump_rope' | 'shadow' | 'swim' | 'sled';

export interface EnergySystemProtocol {
  id: EnergySystemId;
  name: string;
  shortName: string;
  energySystem: 'aerobic' | 'aerobic_anaerobic' | 'anaerobic_alactic' | 'anaerobic_lactic';
  durationMinutes: number;
  intervals: {
    description: string;
    workSeconds: number;
    restSeconds: number;
    rounds: number;
    targetHRZone: 1 | 2 | 3 | 4 | 5;
    rpe: number;
  }[];
  warmUp: string[];
  coolDown: string[];
  modalityRecommendations: CardioModality[];
  combatRelevance: string;
  whenToUse: string;
  cautions: string[];
}

export interface HRZoneCalculation {
  maxHR: number;
  restingHR: number;
  zones: {
    zone1: { min: number; max: number; label: string };
    zone2: { min: number; max: number; label: string };
    zone3: { min: number; max: number; label: string };
    zone4: { min: number; max: number; label: string };
    zone5: { min: number; max: number; label: string };
  };
}

// ---------------------------------------------------------------------------
// HR Zone Math (Karvonen heart rate reserve method)
// ---------------------------------------------------------------------------

export function estimateMaxHR(age: number): number {
  return Math.round(208 - 0.7 * age);  // Tanaka formula — more accurate than 220-age
}

/**
 * Zone boundaries as a fraction of heart-rate RESERVE (Karvonen), not of max HR.
 *
 * These used to carry the %HRmax boundaries (50/60/70/80/90) while being fed
 * through the Karvonen formula, which is a different scale — so "Aerobic Base"
 * came out at 60-70% HRR, or roughly 73-80% of max HR. That is tempo work. A
 * Zone 2 session exists to sit below the aerobic threshold, and running it ~24
 * bpm hot turns easy aerobic volume into accumulated fatigue.
 *
 * Re-anchored to the %HRR equivalents of the standard physiological zones:
 *   Recovery      ≈ 50-60% HRmax
 *   Aerobic Base  ≈ 60-70% HRmax   (conversational, below LT1)
 *   Tempo         ≈ 70-80% HRmax
 *   Threshold     ≈ 80-90% HRmax
 *   VO2max        ≈ 90-100% HRmax
 *
 * Karvonen is kept because it accounts for resting HR, so a well-trained athlete
 * with a low resting rate gets correctly lower targets than the %HRmax shortcut.
 */
const HRR_ZONE_BOUNDS = {
  zone1: [0.30, 0.45],
  zone2: [0.45, 0.60],
  zone3: [0.60, 0.75],
  zone4: [0.75, 0.88],
  zone5: [0.88, 1.00],
} as const;

export function calculateHRZones(maxHR: number, restingHR: number = 60): HRZoneCalculation {
  const reserve = maxHR - restingHR;
  const z = ([lo, hi]: readonly [number, number]) => ({
    min: Math.round(restingHR + reserve * lo),
    max: Math.round(restingHR + reserve * hi),
  });

  return {
    maxHR,
    restingHR,
    zones: {
      zone1: { ...z(HRR_ZONE_BOUNDS.zone1), label: 'Recovery' },
      zone2: { ...z(HRR_ZONE_BOUNDS.zone2), label: 'Aerobic Base' },
      zone3: { ...z(HRR_ZONE_BOUNDS.zone3), label: 'Tempo' },
      zone4: { ...z(HRR_ZONE_BOUNDS.zone4), label: 'Threshold' },
      zone5: { ...z(HRR_ZONE_BOUNDS.zone5), label: 'VO2max' },
    },
  };
}

// ---------------------------------------------------------------------------
// Protocols
// ---------------------------------------------------------------------------

export const ENERGY_SYSTEM_PROTOCOLS: EnergySystemProtocol[] = [
  {
    id: 'zone2_base',
    name: 'Zone 2 Aerobic Base',
    shortName: 'Z2 Base',
    energySystem: 'aerobic',
    durationMinutes: 60,
    intervals: [
      {
        description: 'Continuous Zone 2 effort — conversational pace, can speak in full sentences',
        workSeconds: 60 * 60,
        restSeconds: 0,
        rounds: 1,
        targetHRZone: 2,
        rpe: 4,
      },
    ],
    warmUp: [
      '5 min Zone 1 ramp-up (very easy)',
      'No high-intensity efforts before — keep it pure aerobic',
    ],
    coolDown: [
      '5 min Zone 1 walk-down',
      'Stretch hips, calves',
    ],
    modalityRecommendations: ['bike', 'row', 'run', 'shadow'],
    combatRelevance: 'Builds the aerobic engine that supports recovery between rounds and explosive efforts. Most fighters skip this and wonder why round 4 hits so hard.',
    whenToUse: '2-3× per week during base/off-season blocks. Replaces some long-duration cardio confusion. Also doubles as active recovery the day after hard sessions.',
    cautions: [
      'Truly stay in Zone 2 — drift up to Zone 3 ruins the aerobic adaptation',
      'Use HR if you have it; otherwise nose-breathing or "talk test"',
      'Don\'t pile this on top of hard sport practice — it loses purpose',
    ],
  },
  {
    id: 'threshold_4x4',
    name: 'Norwegian 4×4',
    shortName: '4×4',
    energySystem: 'aerobic',
    durationMinutes: 35,
    intervals: [
      {
        description: '4 min @ HR Zone 5 (hard but sustainable — last 30s should burn)',
        workSeconds: 4 * 60,
        restSeconds: 3 * 60,
        rounds: 4,
        targetHRZone: 5,
        rpe: 9,
      },
    ],
    warmUp: [
      '10 min progressive ramp — Z1 → Z3',
      '3 × 30s pickups in Z4 with 1 min easy',
    ],
    coolDown: [
      '5 min Zone 1 walk-down',
      'Hydrate hard',
    ],
    modalityRecommendations: ['bike', 'row', 'run', 'shadow'],
    combatRelevance: 'Pushes VO2max — the ceiling on how much oxygen you can use per minute. Bigger ceiling = more pace you can hold under load.',
    whenToUse: '1-2× per week during peak/threshold blocks. Not in the 48h before competition.',
    cautions: [
      'Brutal session — don\'t schedule before sparring',
      'HR matters more than pace; if you can\'t hit Z5, you\'re too cooked to do this',
      'Skip if recovery score < 50 or HRV is suppressed',
    ],
  },
  {
    id: 'rsa',
    name: 'Repeated Sprint Ability',
    shortName: 'RSA',
    energySystem: 'anaerobic_lactic',
    durationMinutes: 25,
    intervals: [
      {
        description: '6 s all-out sprint, 24 s easy — 2 sets of 6, 4 min easy between sets',
        workSeconds: 6,
        restSeconds: 24,
        rounds: 12,
        targetHRZone: 5,
        rpe: 9,
      },
    ],
    warmUp: [
      '10 min warm-up: 5 min easy + dynamic stretches',
      '3 × 10s build-up sprints at 70% effort',
    ],
    coolDown: [
      '5 min easy walk',
      'Static stretches: hip flexors, hamstrings, calves',
    ],
    modalityRecommendations: ['run', 'bike', 'row', 'sled'],
    combatRelevance: 'The most fight-specific cardio. Mirrors the round structure: max effort burst → brief recovery → repeat. Trains lactate clearance under repeated load.',
    whenToUse: '1× per week during peak blocks. The closer to competition, the more this matters.',
    cautions: [
      'Maximum effort — if you\'re still talking in round 8, it\'s not max',
      'High joint/connective tissue load — don\'t stack on heavy lower-body day',
      'Skip if any leg/ankle pain — high impact',
    ],
  },
  {
    id: 'tempo',
    name: 'Tempo Run',
    shortName: 'Tempo',
    energySystem: 'aerobic',
    durationMinutes: 30,
    intervals: [
      {
        description: '20 min steady tempo @ Zone 3 — comfortably hard, can speak phrases not sentences',
        workSeconds: 20 * 60,
        restSeconds: 0,
        rounds: 1,
        targetHRZone: 3,
        rpe: 6,
      },
    ],
    warmUp: ['5 min easy ramp Z1-Z2', '3 × 30s pickups'],
    coolDown: ['5 min Zone 1 cool-down', 'Stretch'],
    modalityRecommendations: ['run', 'bike', 'row'],
    combatRelevance: 'Sub-threshold sustained effort. Builds the lactate-clearance ceiling without the hammer of 4×4.',
    whenToUse: 'Bridge between Z2 base and threshold work. Once a week throughout most blocks.',
    cautions: [
      'Stay in Zone 3 — Zone 4 turns this into a different session',
      'Doubles up well with mobility but not heavy lifting',
    ],
  },
  {
    id: 'aerobic_intervals',
    name: 'Long Aerobic Intervals',
    shortName: 'Long Aerobic',
    energySystem: 'aerobic',
    durationMinutes: 40,
    intervals: [
      {
        description: '6 × 3 min @ Z3-Z4 / 90s rest — builds aerobic ceiling without the brutality of 4×4',
        workSeconds: 3 * 60,
        restSeconds: 90,
        rounds: 6,
        targetHRZone: 4,
        rpe: 8,
      },
    ],
    warmUp: ['10 min progressive ramp', '2 × 1 min pickups'],
    coolDown: ['5 min easy', 'Hydrate'],
    modalityRecommendations: ['run', 'bike', 'row', 'shadow'],
    combatRelevance: 'The sweet spot between threshold and intervals. Sustainable aerobic load with anaerobic flavor. Mimics round-pace work.',
    whenToUse: 'Twice a week during build phases. Pairs well with technique-only mat days.',
    cautions: [
      'Pace conservatively — last interval should be the same effort as first',
      'Skip if total weekly volume is already high',
    ],
  },
];

// ---------------------------------------------------------------------------
// Periodization plan
// ---------------------------------------------------------------------------

export interface EnergySystemBlock {
  id: string;
  name: string;
  weeks: number;
  weeklySchedule: { day: number; protocolId: EnergySystemId; modality?: CardioModality }[];
  startedAt: string;
}

/**
 * Generate a 6-week energy systems block with sensible default scheduling.
 * Phases:
 *   Weeks 1-2: Base (3× Z2)
 *   Weeks 3-4: Build (2× Z2 + 1× tempo + 1× long aerobic)
 *   Weeks 5-6: Peak (1× Z2 + 1× 4×4 + 1× RSA)
 */
export function generateEnergySystemsBlock(weeks: number = 6): EnergySystemBlock {
  const schedule: EnergySystemBlock['weeklySchedule'] = [];
  // Schedule patterns rotate by week; we'll express schedule as a flat list per week
  // Day numbers refer to weekdays 1-7 (Mon=1, Sun=7)

  // Base phase: 3× Zone 2
  if (weeks >= 1) {
    schedule.push({ day: 1, protocolId: 'zone2_base', modality: 'bike' });
    schedule.push({ day: 4, protocolId: 'zone2_base', modality: 'run' });
    schedule.push({ day: 6, protocolId: 'zone2_base', modality: 'row' });
  }

  // Build phase: 2× Z2 + tempo + long aerobic
  if (weeks >= 3) {
    schedule.push({ day: 1, protocolId: 'zone2_base', modality: 'bike' });
    schedule.push({ day: 3, protocolId: 'tempo', modality: 'run' });
    schedule.push({ day: 5, protocolId: 'aerobic_intervals', modality: 'row' });
    schedule.push({ day: 7, protocolId: 'zone2_base', modality: 'shadow' });
  }

  // Peak phase: Z2 + 4×4 + RSA
  if (weeks >= 5) {
    schedule.push({ day: 2, protocolId: 'threshold_4x4', modality: 'bike' });
    schedule.push({ day: 4, protocolId: 'zone2_base', modality: 'bike' });
    schedule.push({ day: 6, protocolId: 'rsa', modality: 'run' });
  }

  return {
    id: uuidv4(),
    name: `${weeks}-Week Energy Systems Block`,
    weeks,
    weeklySchedule: schedule,
    startedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Convert a protocol to a runnable workout session
// ---------------------------------------------------------------------------

export function protocolToWorkoutSession(
  protocol: EnergySystemProtocol,
  modality: CardioModality
): WorkoutSession {
  const exercises: ExercisePrescription[] = protocol.intervals.map((interval, i) => {
    const synthetic = {
      id: `cardio-${protocol.id}-${i}`,
      name: `${interval.description} (${prettyModality(modality)})`,
      category: 'compound',
      primaryMuscles: ['quadriceps', 'glutes'],
      secondaryMuscles: ['core'],
      movementPattern: 'cardio',
      equipmentRequired: ['cardio'],
      grapplerFriendly: true,
      description: interval.description,
      cues: [`Target: HR Zone ${interval.targetHRZone}`, `RPE ${interval.rpe}/10`],
    } as unknown as Exercise;

    return {
      exerciseId: synthetic.id,
      exercise: synthetic,
      sets: interval.rounds,
      prescription: {
        targetReps: 1,
        minReps: 1,
        maxReps: 1,
        rpe: interval.rpe,
        restSeconds: interval.restSeconds,
      },
      notes: `${interval.workSeconds}s work · ${interval.restSeconds}s rest · ${interval.rounds} rounds · Zone ${interval.targetHRZone}`,
    };
  });

  return {
    id: uuidv4(),
    name: `${protocol.name} (${prettyModality(modality)})`,
    type: 'strength_endurance',
    dayNumber: 1,
    exercises,
    estimatedDuration: protocol.durationMinutes,
    warmUp: protocol.warmUp,
    coolDown: protocol.coolDown,
  };
}

export function prettyModality(m: CardioModality): string {
  const map: Record<CardioModality, string> = {
    run: 'Run',
    bike: 'Bike',
    row: 'Row',
    jump_rope: 'Jump Rope',
    shadow: 'Shadow Box',
    swim: 'Swim',
    sled: 'Sled',
  };
  return map[m];
}
