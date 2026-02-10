/**
 * Female Athlete Intelligence Engine — Sprint 6
 *
 * Provides cycle-phase-aware training adjustments, nutrition guidance,
 * performance prediction, and coaching insights for female athletes.
 *
 * All exports are pure functions with no React or store dependencies.
 * Cycle data is sensitive health information — it stays 100% local on device
 * and is never transmitted to any server.
 *
 * Science references:
 * - Wikstrom-Frisen et al. 2017: Strength training periodized to menstrual
 *   cycle phase → greater lean mass gains
 * - McNulty et al. 2020 (Sports Med): Exercise performance is trivially
 *   reduced in early follicular phase for some, but individual variation is huge
 * - Sung et al. 2014: Ligament laxity peaks at ovulation (estrogen surge)
 * - Hackney et al. 2019: Luteal-phase BMR increases ~5-10% (~100-300 kcal/day)
 * - Bruinvels et al. 2017: Iron deficiency in female athletes from menstrual
 *   blood loss is common and underdiagnosed
 * - Constantini et al. 2005: Estrogen is protective for tendons/muscles during
 *   follicular phase → higher pain tolerance, faster recovery
 *
 * IMPORTANT: All adjustments are SUGGESTIONS, not mandates. The user always
 * has final say over their training. Individual variation is enormous — some
 * women experience minimal cycle-related performance changes, others experience
 * significant ones. We present evidence-based defaults and let the user adapt.
 */

import type { UserProfile, WorkoutLog } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export type CycleSymptom =
  | 'cramps'
  | 'bloating'
  | 'fatigue'
  | 'headache'
  | 'mood_changes'
  | 'breast_tenderness'
  | 'back_pain'
  | 'insomnia'
  | 'cravings'
  | 'nausea';

export interface CycleLog {
  id: string;
  startDate: string;       // ISO date (YYYY-MM-DD)
  endDate?: string;        // ISO date — when this period ended
  phase: CyclePhase;
  symptoms: CycleSymptom[];
  energyLevel: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

export interface CycleProfile {
  averageCycleLength: number;
  currentPhase: CyclePhase;
  dayInCycle: number;
  nextPeriodEstimate: string;      // ISO date
  phaseHistory: { phase: CyclePhase; startDate: string }[];
  symptomPatterns: { symptom: CycleSymptom; typicalPhases: CyclePhase[] }[];
}

export interface PhaseAdjustment {
  phase: CyclePhase;
  volumeMultiplier: number;
  intensityMultiplier: number;
  focusAreas: string[];
  avoidAreas: string[];
  recommendations: string[];
  nutritionTips: string[];
}

export interface CycleInsights {
  headline: string;
  phaseDescription: string;
  trainingTip: string;
  nutritionTip: string;
  performanceContext: string;
  dayInCycle: number;
}

export interface PerformanceWindow {
  peakWindow: { start: string; end: string; description: string };
  cautionWindow: { start: string; end: string; description: string };
}

export interface CycleNutritionGuidance {
  adjustedCalories: number;
  adjustedProtein: number;
  keyNutrients: string[];
  mealSuggestions: string[];
  hydrationNote: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Default phase durations for a 28-day cycle (adjustable based on history). */
const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_MENSTRUAL_END = 5;      // days 1-5
const DEFAULT_FOLLICULAR_END = 13;    // days 6-13
const DEFAULT_OVULATORY_END = 16;     // days 14-16
// Luteal fills the remainder: days 17-28 (or end of cycle)

const ALL_SYMPTOMS: CycleSymptom[] = [
  'cramps', 'bloating', 'fatigue', 'headache', 'mood_changes',
  'breast_tenderness', 'back_pain', 'insomnia', 'cravings', 'nausea',
];

// ═══════════════════════════════════════════════════════════════════════════
// Internal Helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Parse an ISO date string (YYYY-MM-DD or full ISO) into a Date at midnight UTC. */
function parseDate(iso: string): Date {
  // Handle both YYYY-MM-DD and full ISO strings
  const d = new Date(iso);
  if (isNaN(d.getTime())) return new Date();
  return d;
}

/** Format a Date as YYYY-MM-DD. */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Number of days between two dates (absolute). */
function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round(Math.abs(a.getTime() - b.getTime()) / MS_PER_DAY);
}

/** Add days to a date, returning a new Date. */
function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/** Determine which phase a given day-in-cycle falls into. */
function phaseForDay(day: number, cycleLength: number): CyclePhase {
  if (day <= DEFAULT_MENSTRUAL_END) return 'menstrual';

  // Scale follicular and ovulatory phases proportionally for non-28-day cycles
  const ratio = cycleLength / DEFAULT_CYCLE_LENGTH;
  const follicularEnd = Math.round(DEFAULT_FOLLICULAR_END * ratio);
  const ovulatoryEnd = Math.round(DEFAULT_OVULATORY_END * ratio);

  if (day <= follicularEnd) return 'follicular';
  if (day <= ovulatoryEnd) return 'ovulatory';
  return 'luteal';
}

/**
 * Clamp a number to a range.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. buildCycleProfile
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyse cycle history to build a profile including average cycle length,
 * current phase, symptom patterns, and next period estimate.
 *
 * Handles edge cases:
 * - No logs at all: returns sensible defaults
 * - Single log: uses default cycle length
 * - Irregular cycles: uses median instead of mean to resist outliers
 */
export function buildCycleProfile(cycleLogs: CycleLog[]): CycleProfile {
  // ── Edge case: no data ──
  if (cycleLogs.length === 0) {
    return {
      averageCycleLength: DEFAULT_CYCLE_LENGTH,
      currentPhase: 'follicular',
      dayInCycle: 1,
      nextPeriodEstimate: toDateStr(addDays(new Date(), DEFAULT_CYCLE_LENGTH)),
      phaseHistory: [],
      symptomPatterns: [],
    };
  }

  // Sort logs by startDate (oldest first)
  const sorted = [...cycleLogs].sort(
    (a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime(),
  );

  // ── Calculate average cycle length from period-start logs ──
  // Only consider logs that mark the start of a menstrual phase (period start)
  const periodStarts = sorted.filter(l => l.phase === 'menstrual');

  let averageCycleLength = DEFAULT_CYCLE_LENGTH;

  if (periodStarts.length >= 2) {
    // Calculate cycle lengths between consecutive period starts
    const cycleLengths: number[] = [];
    for (let i = 1; i < periodStarts.length; i++) {
      const prev = parseDate(periodStarts[i - 1].startDate);
      const curr = parseDate(periodStarts[i].startDate);
      const length = daysBetween(curr, prev);
      // Only count plausible cycle lengths (21-45 days)
      if (length >= 21 && length <= 45) {
        cycleLengths.push(length);
      }
    }

    if (cycleLengths.length > 0) {
      // Use median for robustness against outliers (irregular cycles)
      const sortedLengths = [...cycleLengths].sort((a, b) => a - b);
      const mid = Math.floor(sortedLengths.length / 2);
      averageCycleLength = sortedLengths.length % 2 === 0
        ? Math.round((sortedLengths[mid - 1] + sortedLengths[mid]) / 2)
        : sortedLengths[mid];
    }
  }

  // ── Determine current phase ──
  const lastPeriodStart = periodStarts.length > 0
    ? periodStarts[periodStarts.length - 1]
    : sorted[sorted.length - 1];

  const lastStartDate = parseDate(lastPeriodStart.startDate);
  const today = new Date();
  let dayInCycle = daysBetween(today, lastStartDate) + 1; // day 1 = first day of period

  // If we're past the expected cycle length, the user may have missed logging
  // a new period. Wrap around or estimate.
  if (dayInCycle > averageCycleLength + 7) {
    // Likely a missed period log — estimate based on modular arithmetic
    dayInCycle = ((dayInCycle - 1) % averageCycleLength) + 1;
  }

  dayInCycle = clamp(dayInCycle, 1, averageCycleLength);
  const currentPhase = phaseForDay(dayInCycle, averageCycleLength);

  // ── Next period estimate ──
  const daysUntilNextPeriod = Math.max(1, averageCycleLength - dayInCycle + 1);
  const nextPeriodEstimate = toDateStr(addDays(today, daysUntilNextPeriod));

  // ── Phase history ──
  const phaseHistory: { phase: CyclePhase; startDate: string }[] = [];
  sorted.forEach(log => {
    phaseHistory.push({ phase: log.phase, startDate: log.startDate });
  });

  // ── Symptom patterns ──
  // For each symptom, identify which phases it consistently appears in
  const symptomPhaseMap = new Map<CycleSymptom, Map<CyclePhase, number>>();

  sorted.forEach(log => {
    log.symptoms.forEach(symptom => {
      if (!symptomPhaseMap.has(symptom)) {
        symptomPhaseMap.set(symptom, new Map<CyclePhase, number>());
      }
      const phaseMap = symptomPhaseMap.get(symptom)!;
      phaseMap.set(log.phase, (phaseMap.get(log.phase) || 0) + 1);
    });
  });

  const symptomPatterns: { symptom: CycleSymptom; typicalPhases: CyclePhase[] }[] = [];
  symptomPhaseMap.forEach((phaseMap, symptom) => {
    // A phase is "typical" if the symptom appeared in it at least twice,
    // or at least 50% of the time it appeared at all
    const totalOccurrences = Array.from(phaseMap.values()).reduce((s, v) => s + v, 0);
    const threshold = Math.max(2, Math.ceil(totalOccurrences * 0.3));

    const typicalPhases: CyclePhase[] = [];
    phaseMap.forEach((count, phase) => {
      if (count >= threshold || (totalOccurrences <= 3 && count >= 1)) {
        typicalPhases.push(phase);
      }
    });

    if (typicalPhases.length > 0) {
      symptomPatterns.push({ symptom, typicalPhases });
    }
  });

  return {
    averageCycleLength,
    currentPhase,
    dayInCycle,
    nextPeriodEstimate,
    phaseHistory,
    symptomPatterns,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. getPhaseTrainingAdjustments
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns science-based training modifications for the given cycle phase,
 * optionally adjusted for current symptoms.
 *
 * These are suggestions — the athlete always has the final say.
 */
export function getPhaseTrainingAdjustments(
  phase: CyclePhase,
  symptoms?: CycleSymptom[],
): PhaseAdjustment {
  const activeSymptoms = symptoms || [];
  const hasSymptom = (s: CycleSymptom) => activeSymptoms.includes(s);

  switch (phase) {
    // ── MENSTRUAL (days 1-5) ──
    // Estrogen and progesterone are at their lowest.
    // Many women feel fine; some experience significant cramps/fatigue.
    // Key: be responsive to how you feel, not prescriptive.
    case 'menstrual': {
      const hasPainSymptoms = hasSymptom('cramps') || hasSymptom('fatigue') || hasSymptom('back_pain');

      return {
        phase: 'menstrual',
        volumeMultiplier: hasPainSymptoms ? 0.80 : 0.95,
        intensityMultiplier: hasPainSymptoms ? 0.85 : 0.95,
        focusAreas: hasPainSymptoms
          ? ['Light movement', 'Mobility work', 'Walking', 'Gentle full-body sessions']
          : ['Normal training', 'Compound lifts if comfortable', 'Light to moderate cardio'],
        avoidAreas: hasPainSymptoms
          ? ['Heavy deadlifts (if cramping)', 'Intense core work', 'Max-effort lifts']
          : [],
        recommendations: [
          hasPainSymptoms
            ? 'Your body is signaling to take it easier today — that is completely normal and not a setback.'
            : 'Many women train well during their period. If you feel good, go for it.',
          'Listen to your body — there is no obligation to push through discomfort.',
          'Gentle movement like walking or yoga can actually help reduce cramp severity.',
          hasSymptom('fatigue')
            ? 'Fatigue is common in the first 1-2 days. Shorter sessions at moderate effort work well.'
            : 'Warm up a little longer than usual and see how the first working set feels.',
        ],
        nutritionTips: [
          'Prioritize iron-rich foods (red meat, spinach, lentils, fortified cereals) to offset menstrual blood loss.',
          'Anti-inflammatory foods (salmon, berries, turmeric, ginger tea) may help with cramps.',
          'Stay well hydrated — dehydration can worsen cramps and fatigue.',
          hasSymptom('cravings')
            ? 'Cravings are normal. Choose nutrient-dense options when possible, but do not stress about occasional comfort food.'
            : 'Maintain normal caloric intake — no need to restrict.',
        ],
      };
    }

    // ── FOLLICULAR (days 6-13) ──
    // Estrogen is rising steadily. This is the performance sweet spot.
    // Better pain tolerance, improved neuromuscular coordination,
    // higher insulin sensitivity, better recovery.
    case 'follicular':
      return {
        phase: 'follicular',
        volumeMultiplier: 1.05,
        intensityMultiplier: 1.05,
        focusAreas: [
          'This is your peak performance window — use it',
          'Heavy compound lifts (squats, deadlifts, bench)',
          'Pursue PRs if programmed',
          'High-intensity intervals',
          'Skill work and technique refinement',
        ],
        avoidAreas: [],
        recommendations: [
          'Estrogen is rising, which improves pain tolerance, muscle recovery, and strength potential.',
          'Your body is primed for high-effort work — this is the best time in your cycle to push hard.',
          'If you have been waiting to test a heavy single or go for a PR, this window is ideal.',
          'Recovery between sessions tends to be fastest during this phase.',
        ],
        nutritionTips: [
          'Standard nutrition — focus on hitting your protein target (1.6-2.2g/kg).',
          'Higher insulin sensitivity means carbs are well-utilized. Good time for carb-rich pre-workout meals.',
          'Support the training intensity with adequate fueling — do not undereat during your strongest phase.',
        ],
      };

    // ── OVULATORY (days 14-16) ──
    // Estrogen peaks then drops sharply. Testosterone also briefly spikes.
    // Highest absolute strength, but also highest ACL/ligament injury risk
    // due to ligament laxity from estrogen peak (Sung et al. 2014).
    case 'ovulatory': {
      return {
        phase: 'ovulatory',
        volumeMultiplier: 1.0,
        intensityMultiplier: 1.0,
        focusAreas: [
          'Controlled strength work in moderate rep ranges (3-8 reps)',
          'Focus on technique and mind-muscle connection',
          'Extra thorough warm-up (10-15 min)',
          'Strength-focused training with good form',
        ],
        avoidAreas: [
          'Heavy plyometrics and jump training (elevated ACL risk)',
          'True 1RM attempts or grinding singles',
          'Rapid direction changes or explosive cutting drills',
        ],
        recommendations: [
          'You may feel strong right now — and you are. But ligament laxity is at its highest around ovulation.',
          'Focus on controlled, deliberate reps rather than explosive or maximal efforts.',
          'Warm up thoroughly, especially knees and ankles. Extra mobility work pays dividends here.',
          'This is a great time for moderate-heavy training (RPE 7-8) with impeccable form.',
        ],
        nutritionTips: [
          'Support connective tissue health with vitamin C-rich foods (citrus, bell peppers, strawberries).',
          'Collagen-supportive nutrition: bone broth, gelatin, vitamin C.',
          'Normal caloric intake — maintain fueling for training quality.',
        ],
      };
    }

    // ── LUTEAL (days 17-28) ──
    // Progesterone dominant. Body temperature rises, BMR increases.
    // Increased reliance on fat oxidation, reduced carbohydrate efficiency.
    // Mood and motivation may dip in late luteal (PMS window).
    case 'luteal': {
      const hasInsomnia = hasSymptom('insomnia');
      const hasMoodChanges = hasSymptom('mood_changes');
      const hasBloating = hasSymptom('bloating');

      return {
        phase: 'luteal',
        volumeMultiplier: hasInsomnia ? 0.80 : 0.88,
        intensityMultiplier: 0.95,
        focusAreas: [
          'Maintain intensity on key lifts but reduce total volume',
          'Steady-state cardio (your body is better at fat oxidation now)',
          'Technique work and moderate-effort sessions',
          hasMoodChanges
            ? 'Training can genuinely help stabilize mood — even a short session counts'
            : 'Consistent moderate training',
        ],
        avoidAreas: hasBloating
          ? ['Belt-heavy work if uncomfortable', 'Very high-volume sessions']
          : ['Very high-volume sessions that extend beyond your normal duration'],
        recommendations: [
          'Progesterone is elevated, which raises your core body temperature and resting metabolic rate.',
          'You may feel warmer during training and fatigue slightly sooner — this is physiological, not weakness.',
          'Reduce total volume by 10-15% while keeping intensity on your main lifts. Quality over quantity.',
          hasInsomnia
            ? 'Sleep disruption is common in the luteal phase. Reduce overall training load to match your recovery capacity.'
            : 'Training may feel harder than the numbers suggest. Trust the process — this is normal.',
          hasMoodChanges
            ? 'Mood fluctuations are a real physiological effect of progesterone. Exercise is one of the best evidence-based tools for managing this.'
            : 'If motivation dips in the last few days before your period, that is completely normal.',
        ],
        nutritionTips: [
          'Your BMR is higher in the luteal phase (+100-300 kcal/day). A small calorie increase is appropriate, not indulgent.',
          'Extra carbohydrates before training can help offset reduced carb efficiency. Try 20-30g extra pre-workout.',
          'Magnesium-rich foods (dark chocolate, nuts, avocado, leafy greens) may help with cramps and sleep.',
          hasSymptom('cravings')
            ? 'Cravings often reflect a genuine increase in energy needs. Honor them with nutrient-dense choices when possible.'
            : 'Slightly higher caloric intake supports the elevated metabolic demand.',
          'Calcium and vitamin D may reduce PMS symptom severity (research supports 1000-1200mg calcium/day).',
        ],
      };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. getCycleInsights
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a coaching narrative correlating cycle phase with training
 * performance. Uses empathetic, science-based language that normalizes
 * phase-related performance variation.
 */
export function getCycleInsights(
  cycleProfile: CycleProfile,
  workoutLogs: WorkoutLog[],
): CycleInsights {
  const { currentPhase, dayInCycle, averageCycleLength } = cycleProfile;

  // ── Phase description ──
  const phaseDescriptions: Record<CyclePhase, string> = {
    menstrual: `You are on day ${dayInCycle} of your cycle (menstrual phase). Hormone levels are at their lowest. Some women feel great, others need gentler sessions — both are normal.`,
    follicular: `You are on day ${dayInCycle} of your cycle (follicular phase). Estrogen is rising, which supports strength, recovery, and pain tolerance. This is your body's performance window.`,
    ovulatory: `You are on day ${dayInCycle} of your cycle (ovulatory phase). Estrogen has peaked. You may feel strong, but connective tissue laxity is also highest — warm up well and control your movements.`,
    luteal: `You are on day ${dayInCycle} of your cycle (luteal phase). Progesterone is dominant, raising body temperature and metabolic rate. Training may feel harder — that is physiology, not a lack of effort.`,
  };

  // ── Headlines ──
  const headlines: Record<CyclePhase, string> = {
    menstrual: 'Listen to your body today',
    follicular: 'Your strongest window is here',
    ovulatory: 'Strong but mindful',
    luteal: 'Consistent effort, adjusted expectations',
  };

  // ── Training tips ──
  const trainingTips: Record<CyclePhase, string> = {
    menstrual: 'If you feel good, train normally. If cramps or fatigue are present, a lighter session or active recovery is a smart call, not a cop-out.',
    follicular: 'Push the intensity — your body can handle it. This is the best time to chase PRs, test heavy singles, or add volume.',
    ovulatory: 'Train with controlled power. Extra warm-up time (especially for knees and ankles) is well worth it. Avoid true maximal attempts.',
    luteal: 'Keep your main lifts at normal intensity but cut 1-2 sets from accessories. Shorter, focused sessions beat long grinding ones right now.',
  };

  // ── Nutrition tips ──
  const nutritionTips: Record<CyclePhase, string> = {
    menstrual: 'Iron-rich meals and anti-inflammatory foods (fish, berries, ginger) support recovery during your period.',
    follicular: 'Fuel the performance — high protein, adequate carbs, and do not undereat during your strongest phase.',
    ovulatory: 'Vitamin C and collagen-supporting foods help protect connective tissue during this phase.',
    luteal: 'Your body needs slightly more calories now (+100-200 kcal). Extra pre-workout carbs and magnesium-rich foods help.',
  };

  // ── Performance context from workout history ──
  let performanceContext = buildPerformanceContext(cycleProfile, workoutLogs);

  return {
    headline: headlines[currentPhase],
    phaseDescription: phaseDescriptions[currentPhase],
    trainingTip: trainingTips[currentPhase],
    nutritionTip: nutritionTips[currentPhase],
    performanceContext,
    dayInCycle,
  };
}

/**
 * Analyse workout logs to find phase-correlated performance patterns.
 * Returns a human-readable insight string.
 */
function buildPerformanceContext(
  cycleProfile: CycleProfile,
  workoutLogs: WorkoutLog[],
): string {
  if (workoutLogs.length < 8) {
    return 'Keep logging workouts — after a few weeks, we can show you how your performance correlates with your cycle phases.';
  }

  // Bucket workout performance by estimated cycle phase
  const phasePerformance: Record<CyclePhase, { volumes: number[]; rpes: number[] }> = {
    menstrual: { volumes: [], rpes: [] },
    follicular: { volumes: [], rpes: [] },
    ovulatory: { volumes: [], rpes: [] },
    luteal: { volumes: [], rpes: [] },
  };

  // Find menstrual-phase period starts to establish cycle boundaries
  const periodStarts = cycleProfile.phaseHistory
    .filter(h => h.phase === 'menstrual')
    .map(h => parseDate(h.startDate))
    .sort((a, b) => a.getTime() - b.getTime());

  if (periodStarts.length === 0) {
    return 'Log a few period starts so we can correlate your training performance with your cycle phases.';
  }

  // For each workout, estimate which cycle phase it fell in
  workoutLogs.forEach(log => {
    const logDate = new Date(log.date);
    // Find the most recent period start before this workout
    let relevantPeriodStart: Date | null = null;
    for (let i = periodStarts.length - 1; i >= 0; i--) {
      if (periodStarts[i] <= logDate) {
        relevantPeriodStart = periodStarts[i];
        break;
      }
    }
    if (!relevantPeriodStart) return;

    const dayInCycle = daysBetween(logDate, relevantPeriodStart) + 1;
    if (dayInCycle > cycleProfile.averageCycleLength + 7) return; // skip outliers

    const phase = phaseForDay(dayInCycle, cycleProfile.averageCycleLength);
    phasePerformance[phase].volumes.push(log.totalVolume);
    phasePerformance[phase].rpes.push(log.overallRPE);
  });

  // Find the phase with highest average volume (proxy for best performance)
  let bestPhase: CyclePhase = 'follicular';
  let bestAvgVolume = 0;
  let worstPhase: CyclePhase = 'luteal';
  let worstAvgVolume = Infinity;

  const phases: CyclePhase[] = ['menstrual', 'follicular', 'ovulatory', 'luteal'];
  phases.forEach(phase => {
    const vols = phasePerformance[phase].volumes;
    if (vols.length >= 2) {
      const avg = vols.reduce((s, v) => s + v, 0) / vols.length;
      if (avg > bestAvgVolume) {
        bestAvgVolume = avg;
        bestPhase = phase;
      }
      if (avg < worstAvgVolume) {
        worstAvgVolume = avg;
        worstPhase = phase;
      }
    }
  });

  // Check if we have enough data for a meaningful comparison
  const hasEnoughData = phases.every(p => phasePerformance[p].volumes.length >= 2);

  if (!hasEnoughData) {
    return 'We are building your cycle-performance profile. A few more weeks of data will reveal your personal patterns.';
  }

  // Build the insight
  const phaseLabels: Record<CyclePhase, string> = {
    menstrual: 'menstrual phase',
    follicular: 'follicular phase',
    ovulatory: 'ovulatory phase',
    luteal: 'luteal phase',
  };

  if ((bestPhase as string) === (worstPhase as string)) {
    return 'Your training volume is consistent across all cycle phases — great work maintaining consistency.';
  }

  const volumeDiff = bestAvgVolume > 0 && worstAvgVolume > 0
    ? Math.round(((bestAvgVolume - worstAvgVolume) / worstAvgVolume) * 100)
    : 0;

  if (volumeDiff < 5) {
    return 'Your performance is remarkably stable across your cycle. Individual variation matters more than textbook predictions — and your data shows you handle all phases well.';
  }

  const insight = `Your training volume tends to be highest during your ${phaseLabels[bestPhase]} and lower during your ${phaseLabels[worstPhase]} (~${volumeDiff}% difference). `;

  if (worstPhase === 'luteal' || worstPhase === 'menstrual') {
    return insight + 'This aligns with common physiological patterns. The dip is expected and not a sign of anything wrong — your body is doing exactly what it should.';
  }

  return insight + 'Every body is different. Use this data to plan your hardest sessions during your peak phases.';
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. predictPerformanceWindow
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Predict upcoming peak and caution training windows based on cycle phase
 * timing. Helps with workout scheduling and periodization.
 */
export function predictPerformanceWindow(
  cycleProfile: CycleProfile,
): PerformanceWindow {
  const { dayInCycle, averageCycleLength } = cycleProfile;
  const today = new Date();

  // ── Peak window: mid-follicular phase (days 8-13, scaled to cycle length) ──
  const ratio = averageCycleLength / DEFAULT_CYCLE_LENGTH;
  const peakStart = Math.round(8 * ratio);
  const peakEnd = Math.round(13 * ratio);

  const daysUntilPeakStart = peakStart > dayInCycle
    ? peakStart - dayInCycle
    : (averageCycleLength - dayInCycle) + peakStart; // wrap to next cycle

  const peakStartDate = addDays(today, daysUntilPeakStart);
  const peakEndDate = addDays(peakStartDate, peakEnd - peakStart);

  // ── Caution window: last 3 days of luteal + first 2 days of menstrual ──
  const cautionStartDay = averageCycleLength - 2; // 3 days before period
  const cautionEndDay = 2; // first 2 days of menstrual

  const daysUntilCautionStart = cautionStartDay > dayInCycle
    ? cautionStartDay - dayInCycle
    : (averageCycleLength - dayInCycle) + cautionStartDay;

  const cautionStartDate = addDays(today, daysUntilCautionStart);
  const cautionEndDate = addDays(cautionStartDate, 4); // ~5 day window total

  return {
    peakWindow: {
      start: toDateStr(peakStartDate),
      end: toDateStr(peakEndDate),
      description: 'Follicular phase peak — estrogen is rising, strength and recovery are at their best. Schedule your hardest sessions here.',
    },
    cautionWindow: {
      start: toDateStr(cautionStartDate),
      end: toDateStr(cautionEndDate),
      description: 'Late luteal into early menstrual — energy and motivation may dip. Plan lighter sessions or active recovery. This is not a setback, it is your body cycling normally.',
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. getCycleNutritionGuidance
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Phase-specific nutrition guidance that adjusts calorie and protein targets
 * and provides actionable food suggestions.
 *
 * Calorie adjustments are based on documented BMR changes across the cycle
 * (Hackney et al. 2019: ~5-10% BMR increase in luteal phase).
 */
export function getCycleNutritionGuidance(
  phase: CyclePhase,
  macroTargets: { protein: number; calories: number },
): CycleNutritionGuidance {
  const { protein, calories } = macroTargets;

  switch (phase) {
    case 'menstrual':
      return {
        adjustedCalories: calories, // No change — eat to your normal target
        adjustedProtein: protein,
        keyNutrients: [
          'Iron (to offset menstrual blood loss)',
          'Vitamin C (enhances iron absorption)',
          'Omega-3 fatty acids (anti-inflammatory)',
          'Zinc (immune support)',
        ],
        mealSuggestions: [
          'Steak or beef stir-fry with broccoli and bell peppers (iron + vitamin C combo)',
          'Salmon with sweet potato and spinach salad',
          'Lentil soup with a side of citrus fruit',
          'Dark chocolate (70%+) with almonds as a snack',
          'Ginger tea for cramp relief',
        ],
        hydrationNote: 'Drink at least 2.5-3L of water today. Dehydration worsens cramps and fatigue. Warm beverages like ginger or chamomile tea can be soothing.',
      };

    case 'follicular':
      return {
        adjustedCalories: calories, // Standard — no adjustment needed
        adjustedProtein: protein,
        keyNutrients: [
          'Protein (1.6-2.2g/kg — support the training intensity)',
          'Complex carbohydrates (insulin sensitivity is high)',
          'B vitamins (energy metabolism)',
        ],
        mealSuggestions: [
          'Chicken breast with rice and roasted vegetables — classic fuel for hard training',
          'Greek yogurt with berries and granola post-workout',
          'Eggs with whole-grain toast and avocado',
          'Lean protein smoothie with banana and oats',
        ],
        hydrationNote: 'Standard hydration — aim for 2.5-3L. Your body processes carbs and fluids efficiently during this phase.',
      };

    case 'ovulatory':
      return {
        adjustedCalories: calories, // Slight increase is fine but not mandatory
        adjustedProtein: protein,
        keyNutrients: [
          'Vitamin C (collagen synthesis for connective tissue)',
          'Collagen or gelatin (ligament support)',
          'Antioxidants (manage oxidative stress from estrogen peak)',
          'Calcium (bone and muscle support)',
        ],
        mealSuggestions: [
          'Bone broth-based soup with vegetables (collagen + micronutrients)',
          'Citrus fruit salad or smoothie with berries',
          'Chicken thighs with quinoa and bell pepper medley',
          'Gelatin/collagen supplement with vitamin C 30-60 min before training',
        ],
        hydrationNote: 'Maintain 2.5-3L of water. Body temperature may begin rising — stay ahead of hydration needs.',
      };

    case 'luteal':
      return {
        adjustedCalories: calories + Math.round(clamp(calories * 0.07, 100, 250)),
        adjustedProtein: Math.round(protein * 1.05), // Slight increase to support elevated metabolism
        keyNutrients: [
          'Magnesium (sleep, cramp prevention, mood support)',
          'Calcium (reduces PMS symptoms — aim for 1000-1200mg/day)',
          'Vitamin D (works with calcium, supports mood)',
          'Complex carbohydrates (offset reduced carb efficiency)',
          'Fiber (supports digestion, which can slow in luteal phase)',
        ],
        mealSuggestions: [
          'Extra pre-workout carbs: oatmeal with banana and peanut butter',
          'Dark leafy green salad with salmon, avocado, and pumpkin seeds (magnesium powerhouse)',
          'Turkey or chicken with sweet potato and steamed broccoli',
          'Evening snack: warm milk with turmeric (calcium + anti-inflammatory)',
          'Dark chocolate (70%+) with almonds — magnesium-rich and satisfying',
        ],
        hydrationNote: 'Your core body temperature is elevated. Drink 3-3.5L today. You may sweat more during training than usual — bring extra water.',
      };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. shouldShowCycleFeatures
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gate function for cycle-tracking features. Returns true if the user
 * has indicated they could benefit from this feature.
 *
 * Respects user choice: some female users may not want cycle features,
 * and some non-female users (e.g., trans men, non-binary people) may
 * opt in. The feature is opt-in beyond the biological sex field.
 *
 * If the user has no profile yet, returns false (feature is hidden until
 * we know it's relevant).
 */
export function shouldShowCycleFeatures(
  user: UserProfile | null,
  cycleTrackingOptIn?: boolean,
): boolean {
  // Explicit opt-in always wins
  if (cycleTrackingOptIn === true) return true;

  // Explicit opt-out always respected
  if (cycleTrackingOptIn === false) return false;

  // No user profile — cannot determine, default to hidden
  if (!user) return false;

  // If biological sex is available, default to showing for female
  if (user.sex === 'female') return true;

  // Otherwise, the feature stays hidden until the user opts in
  return false;
}
