'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Scale, Plus, Trash2, TrendingUp, TrendingDown, Minus as TrendFlat, Activity, ChevronDown, ChevronUp, Lightbulb, Heart, Dumbbell, Utensils, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateAdherence, analyzeWeightTrend, calculateEnergyAvailability, estimateDailyExerciseCost } from '@/lib/diet-coach';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * WHO BMI Classification (WHO 2000, updated 2004):
 *   < 16.0      Severe Underweight
 *   16.0–16.9   Moderate Underweight
 *   17.0–18.4   Mild Underweight
 *   18.5–24.9   Normal weight
 *   25.0–29.9   Overweight (Pre-obese)
 *   30.0–34.9   Obese Class I
 *   35.0–39.9   Obese Class II
 *   >= 40.0     Obese Class III
 *
 * Note: BMI has limitations for athletes — muscular individuals may
 * register as "overweight" despite low body fat. Always interpret
 * BMI alongside body fat % and waist measurements.
 */
function getBMICategory(bmi: number): { label: string; color: string; range: string; description: string } {
  if (bmi < 16) return { label: 'Severe Underweight', color: 'text-red-400', range: '< 16', description: 'Significantly below healthy range. Consult a healthcare provider.' };
  if (bmi < 17) return { label: 'Moderate Underweight', color: 'text-orange-400', range: '16–16.9', description: 'Below healthy range. May indicate insufficient nutrition.' };
  if (bmi < 18.5) return { label: 'Mild Underweight', color: 'text-yellow-400', range: '17–18.4', description: 'Slightly below normal. Monitor intake and energy levels.' };
  if (bmi < 25) return { label: 'Normal', color: 'text-green-400', range: '18.5–24.9', description: 'Healthy weight range associated with lowest health risks.' };
  if (bmi < 30) return { label: 'Overweight', color: 'text-yellow-400', range: '25–29.9', description: 'Above normal range. For athletes, check body fat % — muscle mass can skew BMI.' };
  if (bmi < 35) return { label: 'Obese Class I', color: 'text-orange-400', range: '30–34.9', description: 'Moderate obesity. Elevated risk for metabolic conditions.' };
  if (bmi < 40) return { label: 'Obese Class II', color: 'text-red-400', range: '35–39.9', description: 'Severe obesity. Significantly elevated health risks.' };
  return { label: 'Obese Class III', color: 'text-red-500', range: '≥ 40', description: 'Very severe obesity. Medical consultation strongly recommended.' };
}

// Navy method body fat estimation
function estimateBodyFat(waistCm: number, neckCm: number, heightCm: number, sex: 'male' | 'female', hipCm?: number): number | null {
  if (sex === 'male') {
    if (waistCm <= neckCm) return null;
    return Math.round((495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450) * 10) / 10;
  } else {
    if (!hipCm || (waistCm + hipCm) <= neckCm) return null;
    return Math.round((495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.22100 * Math.log10(heightCm)) - 450) * 10) / 10;
  }
}

/**
 * Body fat % categories based on ACE (American Council on Exercise) guidelines.
 * Male:   Essential 2–5%, Athletic 6–13%, Fit 14–17%, Average 18–24%, Above Average 25%+
 * Female: Essential 10–13%, Athletic 14–20%, Fit 21–24%, Average 25–31%, Above Average 32%+
 */
function getBodyFatCategory(bf: number, sex: 'male' | 'female'): { label: string; color: string; range: string } {
  if (sex === 'male') {
    if (bf < 6) return { label: 'Essential', color: 'text-red-400', range: '2–5%' };
    if (bf < 14) return { label: 'Athletic', color: 'text-green-400', range: '6–13%' };
    if (bf < 18) return { label: 'Fit', color: 'text-blue-400', range: '14–17%' };
    if (bf < 25) return { label: 'Average', color: 'text-yellow-400', range: '18–24%' };
    return { label: 'Above Average', color: 'text-orange-400', range: '25%+' };
  } else {
    if (bf < 14) return { label: 'Essential', color: 'text-red-400', range: '10–13%' };
    if (bf < 21) return { label: 'Athletic', color: 'text-green-400', range: '14–20%' };
    if (bf < 25) return { label: 'Fit', color: 'text-blue-400', range: '21–24%' };
    if (bf < 32) return { label: 'Average', color: 'text-yellow-400', range: '25–31%' };
    return { label: 'Above Average', color: 'text-orange-400', range: '32%+' };
  }
}

/** WHO BMI scale segments for visual bar */
const BMI_SCALE_SEGMENTS = [
  { label: 'UW', max: 18.5, color: 'bg-yellow-400' },
  { label: 'Normal', max: 25, color: 'bg-green-400' },
  { label: 'OW', max: 30, color: 'bg-yellow-500' },
  { label: 'OB I', max: 35, color: 'bg-orange-400' },
  { label: 'OB II', max: 40, color: 'bg-red-400' },
  { label: 'OB III', max: 50, color: 'bg-red-600' },
];

/** Visual BMI scale bar component */
function BMIScaleBar({ bmi }: { bmi: number }) {
  const minBMI = 14;
  const maxBMI = 45;
  const clampedBMI = Math.max(minBMI, Math.min(maxBMI, bmi));
  const position = ((clampedBMI - minBMI) / (maxBMI - minBMI)) * 100;

  return (
    <div className="mt-2 space-y-1">
      <div className="relative h-3 rounded-full overflow-hidden flex">
        {BMI_SCALE_SEGMENTS.map((seg, i) => {
          const prevMax = i > 0 ? BMI_SCALE_SEGMENTS[i - 1].max : minBMI;
          const width = ((Math.min(seg.max, maxBMI) - prevMax) / (maxBMI - minBMI)) * 100;
          return (
            <div
              key={seg.label}
              className={cn(seg.color, 'h-full opacity-70')}
              style={{ width: `${width}%` }}
            />
          );
        })}
        {/* Marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]"
          style={{ left: `${position}%` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-grappler-500">
        <span>18.5</span>
        <span>25</span>
        <span>30</span>
        <span>35</span>
        <span>40</span>
      </div>
    </div>
  );
}

/** Body fat % scale bar component */
function BodyFatScaleBar({ bf, sex }: { bf: number; sex: 'male' | 'female' }) {
  const segments = sex === 'male'
    ? [
        { label: 'Ess', max: 6, color: 'bg-red-400' },
        { label: 'Athletic', max: 14, color: 'bg-green-400' },
        { label: 'Fit', max: 18, color: 'bg-blue-400' },
        { label: 'Avg', max: 25, color: 'bg-yellow-400' },
        { label: 'Above', max: 40, color: 'bg-orange-400' },
      ]
    : [
        { label: 'Ess', max: 14, color: 'bg-red-400' },
        { label: 'Athletic', max: 21, color: 'bg-green-400' },
        { label: 'Fit', max: 25, color: 'bg-blue-400' },
        { label: 'Avg', max: 32, color: 'bg-yellow-400' },
        { label: 'Above', max: 45, color: 'bg-orange-400' },
      ];
  const minBF = sex === 'male' ? 2 : 8;
  const maxBF = sex === 'male' ? 40 : 45;
  const clampedBF = Math.max(minBF, Math.min(maxBF, bf));
  const position = ((clampedBF - minBF) / (maxBF - minBF)) * 100;

  return (
    <div className="mt-2 space-y-1">
      <div className="relative h-3 rounded-full overflow-hidden flex">
        {segments.map((seg, i) => {
          const prevMax = i > 0 ? segments[i - 1].max : minBF;
          const width = ((Math.min(seg.max, maxBF) - prevMax) / (maxBF - minBF)) * 100;
          return (
            <div
              key={seg.label}
              className={cn(seg.color, 'h-full opacity-70')}
              style={{ width: `${width}%` }}
            />
          );
        })}
        <div
          className="absolute top-0 h-full w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]"
          style={{ left: `${position}%` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-grappler-500">
        {sex === 'male' ? (
          <>
            <span>6%</span>
            <span>14%</span>
            <span>18%</span>
            <span>25%</span>
          </>
        ) : (
          <>
            <span>14%</span>
            <span>21%</span>
            <span>25%</span>
            <span>32%</span>
          </>
        )}
      </div>
    </div>
  );
}

interface HealthSuggestion {
  icon: 'heart' | 'dumbbell' | 'utensils' | 'alert' | 'info';
  title: string;
  text: string;
  priority: 'info' | 'warning' | 'success';
}

interface DietCoachContext {
  dietGoal: string | null;           // 'cut' | 'bulk' | 'maintain' | null
  adherencePercent: number | null;   // 0–100 from calculateAdherence
  weeksInPhase: number | null;       // activeDietPhase.weeksCompleted
  weeksAtPlateau: number;            // from analyzeWeightTrend
  macroCalories: number | null;      // current macro target calories
  isFemale: boolean;
}

/**
 * Generate contextual health suggestions based on BMI, body fat, weight trend,
 * AND diet coach intelligence (adherence, phase duration, plateau, macros).
 * Suggestions are evidence-informed and intended to guide — not diagnose.
 */
function getHealthSuggestions(
  bmi: number | null,
  bodyFat: number | null,
  sex: 'male' | 'female',
  weightTrend: number | null,
  dietCoach: DietCoachContext,
): HealthSuggestion[] {
  const suggestions: HealthSuggestion[] = [];
  const { dietGoal, adherencePercent, weeksInPhase, weeksAtPlateau, macroCalories, isFemale } = dietCoach;

  // ── Diet Coach: Adherence warnings (highest priority — unreliable data affects everything) ──
  if (dietGoal && adherencePercent !== null && adherencePercent < 50) {
    suggestions.push({
      icon: 'utensils',
      title: 'Low meal logging',
      text: `Only ${adherencePercent}% of days logged this week. Your suggestions and macro adjustments rely on consistent data — aim to log at least 2 meals per day for accurate coaching.`,
      priority: 'warning',
    });
  }

  // ── Diet Coach: Diet break timing (sex-aware — women every 4 weeks, men every 6) ──
  if (dietGoal === 'cut' && weeksInPhase !== null) {
    const breakInterval = isFemale ? 4 : 6;
    const maxCutWeeks = isFemale ? 8 : 12;
    if (weeksInPhase >= maxCutWeeks) {
      suggestions.push({
        icon: 'alert',
        title: 'Extended cut — time to transition',
        text: isFemale
          ? `You've been cutting for ${weeksInPhase} weeks. Prolonged deficits increase RED-S risk in women. Transition to maintenance for 2–3 weeks to normalize hormones before resuming.`
          : `You've been cutting for ${weeksInPhase} weeks. Transition to maintenance for 2–3 weeks to restore metabolic rate and training performance.`,
        priority: 'warning',
      });
    } else if (weeksInPhase >= breakInterval && weeksInPhase % breakInterval === 0) {
      suggestions.push({
        icon: 'heart',
        title: 'Diet break recommended',
        text: isFemale
          ? `${weeksInPhase} weeks in your cut. Women benefit from a 1-week break every ${breakInterval} weeks — it protects hormonal function, thyroid, and training performance (Byrne et al. 2017).`
          : `${weeksInPhase} weeks in your cut. A 1-week diet break at maintenance supports hormones, recovery, and long-term adherence (MATADOR study).`,
        priority: 'info',
      });
    }
  }

  // ── Diet Coach: Plateau detection ──
  if (dietGoal && weeksAtPlateau >= 2) {
    if (dietGoal === 'cut') {
      suggestions.push({
        icon: 'info',
        title: `Weight stalled for ${weeksAtPlateau} weeks`,
        text: adherencePercent !== null && adherencePercent >= 70
          ? 'Adherence looks solid but weight isn\'t moving. Your weekly check-in will suggest a small calorie reduction (~7%). Alternatively, add 1–2 low-intensity cardio sessions.'
          : 'Weight has stalled, but your logging adherence is low. Before adjusting calories, try hitting your current targets consistently for a full week.',
        priority: 'warning',
      });
    } else if (dietGoal === 'bulk') {
      suggestions.push({
        icon: 'info',
        title: `Not gaining for ${weeksAtPlateau} weeks`,
        text: 'Your weight trend has been flat despite a bulk goal. Your weekly check-in will suggest adding ~5% more calories from carbs. Make sure you\'re eating on rest days too.',
        priority: 'info',
      });
    }
  }

  // ── Diet Coach: Calorie floor warning ──
  if (dietGoal === 'cut' && macroCalories !== null) {
    const calorieFloor = isFemale ? 1200 : 1400;
    if (macroCalories <= calorieFloor) {
      suggestions.push({
        icon: 'alert',
        title: 'Calories are very low',
        text: isFemale
          ? `At ${macroCalories} kcal you're at the minimum safe threshold. Below ~30 kcal/kg FFM risks hormonal disruption (RED-S). Take a 1–2 week diet break at maintenance.`
          : `At ${macroCalories} kcal your deficit is aggressive. Consider a 1–2 week diet break at maintenance to support recovery and metabolic health.`,
        priority: 'warning',
      });
    }
  }

  // ── BMI + Body Fat composition insights ──
  if (bmi !== null) {
    if (bmi >= 25 && bodyFat !== null) {
      const athleticBF = sex === 'male' ? 14 : 21;
      if (bodyFat < athleticBF) {
        suggestions.push({
          icon: 'info',
          title: 'BMI may overestimate for you',
          text: `Your BMI is ${bmi} (${getBMICategory(bmi).label}) but your body fat is ${bodyFat}% (${getBodyFatCategory(bodyFat, sex).label}). For muscular athletes, body fat % is a more reliable indicator. You're in great shape.`,
          priority: 'success',
        });
      } else if (bmi >= 30 && bodyFat >= (sex === 'male' ? 25 : 32)) {
        suggestions.push({
          icon: 'heart',
          title: 'Health priority: body composition',
          text: dietGoal === 'cut'
            ? 'Both BMI and body fat are elevated — your cut is the right move. Stay consistent with your macros and the diet coach will guide weekly adjustments.'
            : 'Both BMI and body fat indicate elevated health risk. Consider starting a cut phase in Diet Coach — a gradual deficit (0.5–0.7% BW/week) combined with resistance training preserves muscle.',
          priority: 'warning',
        });
      }
    }

    // Underweight
    if (bmi < 18.5 && !(bodyFat !== null && bodyFat > (sex === 'male' ? 14 : 21))) {
      suggestions.push({
        icon: 'utensils',
        title: 'Consider a caloric surplus',
        text: dietGoal === 'bulk'
          ? 'Underweight BMI — your bulk phase is the right call. Focus on hitting your protein target and eating consistently on rest days too.'
          : 'Underweight BMI can affect energy, recovery, and hormonal health. Set up a bulk phase in Diet Coach for personalized macro targets (+300–500 cal surplus).',
        priority: 'warning',
      });
    }

    // Overweight with no body fat data
    if (bmi >= 25 && bmi < 30 && bodyFat === null) {
      suggestions.push({
        icon: 'info',
        title: 'Log body composition for better insights',
        text: 'BMI alone doesn\'t distinguish muscle from fat. Add waist and neck measurements to estimate body fat % — this gives a much clearer picture of your health.',
        priority: 'info',
      });
    }
  }

  // ── Body fat specific ──
  if (bodyFat !== null) {
    const essentialThreshold = sex === 'male' ? 6 : 14;
    if (bodyFat < essentialThreshold) {
      suggestions.push({
        icon: 'alert',
        title: 'Body fat is very low',
        text: sex === 'male'
          ? 'Below 6% body fat can impair hormone production, immune function, and recovery. This is not sustainable long-term. Consider transitioning to maintenance.'
          : 'Below 14% body fat in women can disrupt menstrual function, bone density, and thyroid health (RED-S). Prioritize transitioning to a higher caloric intake.',
        priority: 'warning',
      });
    }
  }

  // ── Weight trend vs diet goal mismatches ──
  if (weightTrend !== null && Math.abs(weightTrend) > 0.1) {
    if (dietGoal === 'cut' && weightTrend > 0.1) {
      suggestions.push({
        icon: 'utensils',
        title: 'Weight trending up during cut',
        text: adherencePercent !== null && adherencePercent < 70
          ? 'Your weight is rising during a cut, but logging is inconsistent. Before adjusting calories, focus on tracking all meals for a full week — the data might not reflect reality.'
          : 'Your weight is rising despite a cut goal. Check that you\'re logging all meals accurately — liquids and sauces add up. Your weekly check-in will suggest a calorie adjustment.',
        priority: 'warning',
      });
    } else if (dietGoal === 'bulk' && weightTrend < -0.1) {
      suggestions.push({
        icon: 'utensils',
        title: 'Weight trending down during bulk',
        text: 'You\'re losing weight while trying to bulk. Increase daily calories by 200–300, focusing on carbs around training. Your weekly check-in will auto-adjust macros.',
        priority: 'warning',
      });
    } else if (dietGoal === 'cut' && weightTrend < -1.0) {
      suggestions.push({
        icon: 'dumbbell',
        title: 'Losing weight quickly',
        text: 'Losing more than 1% body weight per week risks muscle loss. Slow your deficit slightly and keep protein high (2.0+ g/kg) to preserve lean mass during your cut.',
        priority: 'warning',
      });
    }
  }

  // ── No diet phase active — nudge to start one ──
  if (!dietGoal && bmi !== null && (bmi < 18.5 || bmi >= 25) && bodyFat !== null) {
    const needsCut = bmi >= 25 && bodyFat >= (sex === 'male' ? 18 : 25);
    const needsBulk = bmi < 18.5;
    if (needsCut || needsBulk) {
      suggestions.push({
        icon: 'utensils',
        title: 'Set up Diet Coach',
        text: needsCut
          ? 'Based on your body composition, a structured cut could help. The Diet Coach calculates macros, tracks adherence, and adjusts weekly — tap Diet Coach on the home tab to start.'
          : 'A structured bulk with tracked macros will help you gain weight safely. The Diet Coach provides personalized targets — set it up on the home tab.',
        priority: 'info',
      });
    }
  }

  // ── Diet Coach: Good adherence + on track ──
  if (dietGoal && adherencePercent !== null && adherencePercent >= 80 && weeksAtPlateau < 2 && suggestions.length === 0) {
    suggestions.push({
      icon: 'dumbbell',
      title: 'Dialed in',
      text: `${adherencePercent}% adherence${weeksInPhase !== null ? `, week ${weeksInPhase + 1} of your ${dietGoal}` : ''}. Your logging is consistent and weight is trending as expected. Keep it up.`,
      priority: 'success',
    });
  }

  // ── Fallback: healthy range, no issues ──
  if (suggestions.length === 0 && bmi !== null && bmi >= 18.5 && bmi < 25) {
    suggestions.push({
      icon: 'dumbbell',
      title: 'On track',
      text: 'Your weight is in a healthy range. Focus on progressive overload in training and adequate protein intake to continue improving body composition.',
      priority: 'success',
    });
  }

  return suggestions.slice(0, 3); // Max 3 suggestions
}

const SUGGESTION_ICONS = {
  heart: Heart,
  dumbbell: Dumbbell,
  utensils: Utensils,
  alert: AlertTriangle,
  info: Info,
};

const SUGGESTION_STYLES = {
  info: { border: 'border-blue-500/20', bg: 'bg-blue-500/5', iconColor: 'text-blue-400' },
  warning: { border: 'border-amber-500/20', bg: 'bg-amber-500/5', iconColor: 'text-amber-400' },
  success: { border: 'border-green-500/20', bg: 'bg-green-500/5', iconColor: 'text-green-400' },
};

export default function BodyWeightTracker() {
  const { bodyWeightLog, bodyComposition: rawBodyComposition, addBodyWeight, deleteBodyWeight, addBodyComposition, deleteBodyComposition, user, activeDietPhase, meals, macroTargets } = useAppStore();
  const bodyComposition = rawBodyComposition || [];
  const [showAddForm, setShowAddForm] = useState(false);
  const [showComposition, setShowComposition] = useState(false);
  const [showBenchmarks, setShowBenchmarks] = useState(false);
  // Form fields
  const [newWeight, setNewWeight] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [formWaist, setFormWaist] = useState('');
  const [formNeck, setFormNeck] = useState('');
  const [formHip, setFormHip] = useState('');
  const [formBodyFat, setFormBodyFat] = useState('');
  const [formBMI, setFormBMI] = useState('');
  const [useManualBF, setUseManualBF] = useState(false);
  const [useManualBMI, setUseManualBMI] = useState(false);

  const weightUnit = user?.weightUnit || 'lbs';
  const heightCm = user?.heightCm || 0;
  const sex = user?.sex || 'male';

  const sortedLog = [...(bodyWeightLog || [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const chartData = sortedLog.map(entry => ({
    date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: entry.weight,
    fullDate: new Date(entry.date).toLocaleDateString()
  }));

  const latestWeight = sortedLog.length > 0 ? sortedLog[sortedLog.length - 1].weight : null;
  const previousWeight = sortedLog.length > 1 ? sortedLog[sortedLog.length - 2].weight : null;
  const weightChange = latestWeight && previousWeight ? latestWeight - previousWeight : null;
  const avgWeight = sortedLog.length > 0
    ? Math.round(sortedLog.reduce((sum, e) => sum + e.weight, 0) / sortedLog.length * 10) / 10
    : null;

  // BMI from latest weight
  const bmi = useMemo(() => {
    if (!latestWeight || !heightCm) return null;
    const weightKg = weightUnit === 'lbs' ? latestWeight * 0.453592 : latestWeight;
    return calculateBMI(weightKg, heightCm);
  }, [latestWeight, heightCm, weightUnit]);

  const bmiCategory = bmi ? getBMICategory(bmi) : null;

  // Weekly weight trend (simple: difference over last 7+ days)
  const weeklyWeightTrend = useMemo(() => {
    if (sortedLog.length < 2) return null;
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentEntries = sortedLog.filter(e => new Date(e.date).getTime() > weekAgo);
    if (recentEntries.length < 1) return null;
    const oldest = recentEntries[0];
    const newest = recentEntries[recentEntries.length - 1];
    if (oldest.id === newest.id) {
      // Only one entry this week; compare to entry before it
      const idx = sortedLog.indexOf(oldest);
      if (idx <= 0) return null;
      return newest.weight - sortedLog[idx - 1].weight;
    }
    return newest.weight - oldest.weight;
  }, [sortedLog]);

  // Diet coach data for suggestions
  const adherencePercent = useMemo(() => calculateAdherence(meals), [meals]);
  const smoothedTrend = useMemo(
    () => analyzeWeightTrend(bodyWeightLog, weightUnit === 'lbs' ? 'lbs' : 'kg'),
    [bodyWeightLog, weightUnit]
  );

  // Health suggestions — now powered by diet coach intelligence
  const healthSuggestions = useMemo(() => {
    const effectiveBMI = bmi || (latestWeight && heightCm
      ? calculateBMI(weightUnit === 'lbs' ? latestWeight * 0.453592 : latestWeight, heightCm)
      : null);
    const sortedComp = [...bodyComposition].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const bf = sortedComp.length > 0 ? sortedComp[sortedComp.length - 1]?.bodyFatPercent ?? null : null;
    const dietCoach: DietCoachContext = {
      dietGoal: activeDietPhase?.isActive ? activeDietPhase.goal : null,
      adherencePercent: activeDietPhase?.isActive ? adherencePercent : null,
      weeksInPhase: activeDietPhase?.isActive ? activeDietPhase.weeksCompleted : null,
      weeksAtPlateau: smoothedTrend.weeksAtPlateau,
      macroCalories: activeDietPhase?.isActive ? macroTargets.calories : null,
      isFemale: sex === 'female',
    };
    return getHealthSuggestions(effectiveBMI, bf, sex, weeklyWeightTrend, dietCoach);
  }, [bmi, latestWeight, heightCm, weightUnit, bodyComposition, sex, weeklyWeightTrend, activeDietPhase, adherencePercent, smoothedTrend, macroTargets]);

  // Latest saved body composition entry
  const sortedComposition = [...bodyComposition].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const latestComp = sortedComposition.length > 0 ? sortedComposition[sortedComposition.length - 1] : null;
  const latestBF = latestComp?.bodyFatPercent ?? null;
  const latestSavedBMI = latestComp?.bmi ?? null;

  // Auto-calculate BF from form measurements
  const autoCalcBF = useMemo(() => {
    const w = parseFloat(formWaist);
    const n = parseFloat(formNeck);
    const h = formHip ? parseFloat(formHip) : undefined;
    if (!w || !n || !heightCm) return null;
    return estimateBodyFat(w, n, heightCm, sex, h);
  }, [formWaist, formNeck, formHip, heightCm, sex]);

  // Auto-calculate BMI from form weight
  const autoCalcBMI = useMemo(() => {
    const w = parseFloat(newWeight);
    if (!w || !heightCm) return null;
    const weightKg = weightUnit === 'lbs' ? w * 0.453592 : w;
    return calculateBMI(weightKg, heightCm);
  }, [newWeight, heightCm, weightUnit]);

  const effectiveBF = useManualBF ? (parseFloat(formBodyFat) || null) : autoCalcBF;
  const effectiveBMI = useManualBMI ? (parseFloat(formBMI) || null) : autoCalcBMI;

  const resetForm = () => {
    setNewWeight('');
    setNewNotes('');
    setFormWaist('');
    setFormNeck('');
    setFormHip('');
    setFormBodyFat('');
    setFormBMI('');
    setUseManualBF(false);
    setUseManualBMI(false);
    setShowComposition(false);
  };

  const handleAdd = () => {
    const w = parseFloat(newWeight);
    if (isNaN(w) || w <= 0) return;
    addBodyWeight(w, newNotes || undefined);

    // Save body composition if any composition data was entered
    const waist = parseFloat(formWaist) || undefined;
    const neck = parseFloat(formNeck) || undefined;
    const hip = parseFloat(formHip) || undefined;
    const bf = effectiveBF ?? undefined;
    const bmiVal = effectiveBMI ?? undefined;

    if (waist || neck || hip || bf || bmiVal) {
      addBodyComposition({
        date: new Date(),
        weight: w,
        unit: weightUnit,
        bodyFatPercent: bf,
        bmi: bmiVal,
        waist,
        neck,
        hip,
        notes: newNotes || undefined,
      });
    }

    resetForm();
    setShowAddForm(false);
  };

  // Body fat chart data
  const bfChartData = sortedComposition
    .filter(e => e.bodyFatPercent != null)
    .map(entry => ({
      date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      bf: entry.bodyFatPercent,
    }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-grappler-50 flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary-400" />
          Body Weight
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary btn-sm gap-1"
        >
          <Plus className="w-4 h-4" />
          Log
        </button>
      </div>

      {/* Quick stats */}
      {latestWeight && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-grappler-800/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-grappler-50">{latestWeight}</p>
            <p className="text-xs text-grappler-400">Current ({weightUnit})</p>
          </div>
          <div className="bg-grappler-800/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              {weightChange !== null && (
                <>
                  {weightChange > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                  ) : weightChange < 0 ? (
                    <TrendingDown className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <TrendFlat className="w-3.5 h-3.5 text-grappler-400" />
                  )}
                  <p className={cn(
                    'text-lg font-bold',
                    weightChange > 0 ? 'text-red-400' : weightChange < 0 ? 'text-green-400' : 'text-grappler-400'
                  )}>
                    {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}
                  </p>
                </>
              )}
              {weightChange === null && <p className="text-lg font-bold text-grappler-400">-</p>}
            </div>
            <p className="text-xs text-grappler-400">Change</p>
          </div>
          <div className="bg-grappler-800/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-grappler-50">{avgWeight}</p>
            <p className="text-xs text-grappler-400">Average</p>
          </div>
        </div>
      )}

      {/* BMI & Body Fat Section */}
      {latestWeight && (
        <div className="bg-grappler-800/30 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-semibold text-grappler-300 uppercase tracking-wide flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-primary-400" />
            Body Composition
          </h4>

          <div className="flex items-center gap-3">
            {/* BMI display */}
            <div className="flex-1 bg-grappler-700/50 rounded-lg p-2.5">
              <p className="text-xs text-grappler-500 mb-0.5">BMI</p>
              {(latestSavedBMI || bmi) ? (() => {
                const displayBMI = latestSavedBMI || bmi!;
                const cat = getBMICategory(displayBMI);
                return (
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-grappler-50">{displayBMI}</span>
                      <span className={cn('text-xs font-medium', cat.color)}>
                        {cat.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-grappler-500 mt-0.5">Range: {cat.range}</p>
                    <BMIScaleBar bmi={displayBMI} />
                  </div>
                );
              })() : (
                <p className="text-xs text-grappler-500">Set height in settings</p>
              )}
            </div>

            {/* Body Fat display */}
            <div className="flex-1 bg-grappler-700/50 rounded-lg p-2.5">
              <p className="text-xs text-grappler-500 mb-0.5">Body Fat</p>
              {latestBF != null ? (() => {
                const bfCat = getBodyFatCategory(latestBF, sex);
                return (
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-grappler-50">{latestBF}%</span>
                      <span className={cn('text-xs font-medium', bfCat.color)}>
                        {bfCat.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-grappler-500 mt-0.5">Range: {bfCat.range}</p>
                    <BodyFatScaleBar bf={latestBF} sex={sex} />
                  </div>
                );
              })() : (
                <p className="text-xs text-grappler-500">Log measurements below</p>
              )}
            </div>
          </div>

          {/* BMI description (de-emphasized for athletes) */}
          {(latestSavedBMI || bmi) && (
            <p className="text-[10px] text-grappler-500 leading-relaxed">
              {getBMICategory(latestSavedBMI || bmi!).description}
              {' '}BMI is less reliable for muscular athletes — body fat % is more meaningful.
            </p>
          )}

          {/* Energy Availability (combat athletes / anyone on a cut) */}
          {latestWeight && latestBF != null && (() => {
            const wKg = latestWeight.unit === 'lbs' ? latestWeight.weight / 2.205 : latestWeight.weight;
            const leanMass = wKg * (1 - latestBF / 100);
            const ea = calculateEnergyAvailability(
              macroTargets?.calories || 0,
              0, // simplified — no exercise cost here
              leanMass,
            );
            const color = ea.status === 'critical' ? 'text-red-400 border-red-500/30 bg-red-500/10'
              : ea.status === 'low' ? 'text-orange-400 border-orange-500/30 bg-orange-500/10'
              : ea.status === 'caution' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
              : 'text-green-400 border-green-500/30 bg-green-500/10';
            return (
              <div className={cn('p-2.5 rounded-lg border', color)}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Energy Availability</span>
                  <span className="text-sm font-bold">{Math.round(ea.ea)} kcal/kg FFM</span>
                </div>
                <p className="text-[10px] mt-0.5 opacity-80">{ea.message}</p>
                {ea.status === 'critical' && (
                  <p className="text-[10px] mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    RED-S risk: Do not restrict further
                  </p>
                )}
              </div>
            );
          })()}

          {/* Latest measurements */}
          {latestComp && (latestComp.waist || latestComp.neck) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-grappler-400">
              {latestComp.waist && <span>Waist: {latestComp.waist} cm</span>}
              {latestComp.neck && <span>Neck: {latestComp.neck} cm</span>}
              {latestComp.hip && <span>Hip: {latestComp.hip} cm</span>}
              <span className="text-grappler-600">
                {new Date(latestComp.date).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Benchmarks toggle */}
          <button
            type="button"
            onClick={() => setShowBenchmarks(!showBenchmarks)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-grappler-700/30 hover:bg-grappler-700/50 transition-colors"
          >
            <span className="text-xs font-medium text-grappler-300 flex items-center gap-1.5">
              <Info className="w-3 h-3" />
              Classification Benchmarks
            </span>
            {showBenchmarks ? (
              <ChevronUp className="w-4 h-4 text-grappler-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-grappler-400" />
            )}
          </button>

          <AnimatePresence>
            {showBenchmarks && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 pt-1">
                  {/* BMI Benchmarks */}
                  <div>
                    <p className="text-[11px] font-semibold text-grappler-300 mb-1.5">BMI Classification (WHO)</p>
                    <div className="space-y-1">
                      {[
                        { range: '< 16', label: 'Severe Underweight', color: 'bg-red-400' },
                        { range: '16–16.9', label: 'Moderate Underweight', color: 'bg-orange-400' },
                        { range: '17–18.4', label: 'Mild Underweight', color: 'bg-yellow-400' },
                        { range: '18.5–24.9', label: 'Normal', color: 'bg-green-400' },
                        { range: '25–29.9', label: 'Overweight', color: 'bg-yellow-500' },
                        { range: '30–34.9', label: 'Obese Class I', color: 'bg-orange-400' },
                        { range: '35–39.9', label: 'Obese Class II', color: 'bg-red-400' },
                        { range: '≥ 40', label: 'Obese Class III', color: 'bg-red-600' },
                      ].map(row => {
                        const isActive = bmiCategory && row.label === bmiCategory.label;
                        return (
                          <div
                            key={row.label}
                            className={cn(
                              'flex items-center gap-2 px-2 py-1 rounded text-[11px]',
                              isActive ? 'bg-grappler-700/60 ring-1 ring-primary-500/30' : ''
                            )}
                          >
                            <div className={cn('w-2 h-2 rounded-full flex-shrink-0', row.color)} />
                            <span className={cn('font-mono w-16 flex-shrink-0', isActive ? 'text-grappler-100 font-bold' : 'text-grappler-400')}>
                              {row.range}
                            </span>
                            <span className={isActive ? 'text-grappler-100 font-medium' : 'text-grappler-400'}>
                              {row.label}
                            </span>
                            {isActive && <span className="ml-auto text-primary-400 text-[10px] font-bold">YOU</span>}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-grappler-600 mt-1.5 leading-relaxed">
                      BMI can overestimate body fat in muscular athletes. Use alongside body fat % for a complete picture.
                    </p>
                  </div>

                  {/* Body Fat Benchmarks */}
                  <div className="border-t border-grappler-700/50 pt-2">
                    <p className="text-[11px] font-semibold text-grappler-300 mb-1.5">
                      Body Fat % Classification (ACE) — {sex === 'male' ? 'Male' : 'Female'}
                    </p>
                    <div className="space-y-1">
                      {(sex === 'male'
                        ? [
                            { range: '2–5%', label: 'Essential', color: 'bg-red-400' },
                            { range: '6–13%', label: 'Athletic', color: 'bg-green-400' },
                            { range: '14–17%', label: 'Fit', color: 'bg-blue-400' },
                            { range: '18–24%', label: 'Average', color: 'bg-yellow-400' },
                            { range: '25%+', label: 'Above Average', color: 'bg-orange-400' },
                          ]
                        : [
                            { range: '10–13%', label: 'Essential', color: 'bg-red-400' },
                            { range: '14–20%', label: 'Athletic', color: 'bg-green-400' },
                            { range: '21–24%', label: 'Fit', color: 'bg-blue-400' },
                            { range: '25–31%', label: 'Average', color: 'bg-yellow-400' },
                            { range: '32%+', label: 'Above Average', color: 'bg-orange-400' },
                          ]
                      ).map(row => {
                        const isActive = latestBF != null && row.label === getBodyFatCategory(latestBF, sex).label;
                        return (
                          <div
                            key={row.label}
                            className={cn(
                              'flex items-center gap-2 px-2 py-1 rounded text-[11px]',
                              isActive ? 'bg-grappler-700/60 ring-1 ring-primary-500/30' : ''
                            )}
                          >
                            <div className={cn('w-2 h-2 rounded-full flex-shrink-0', row.color)} />
                            <span className={cn('font-mono w-16 flex-shrink-0', isActive ? 'text-grappler-100 font-bold' : 'text-grappler-400')}>
                              {row.range}
                            </span>
                            <span className={isActive ? 'text-grappler-100 font-medium' : 'text-grappler-400'}>
                              {row.label}
                            </span>
                            {isActive && <span className="ml-auto text-primary-400 text-[10px] font-bold">YOU</span>}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-grappler-600 mt-1.5 leading-relaxed">
                      {sex === 'male'
                        ? 'Essential fat is the minimum needed for physiological function. Sustained levels below 6% are not recommended.'
                        : 'Women need higher essential fat for hormonal health. Below 14% can disrupt menstrual function and bone density.'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Health Suggestions */}
      {healthSuggestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-grappler-300 uppercase tracking-wide flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            Suggestions
          </h4>
          {healthSuggestions.map((suggestion, i) => {
            const IconComp = SUGGESTION_ICONS[suggestion.icon];
            const style = SUGGESTION_STYLES[suggestion.priority];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  'rounded-xl border p-3',
                  style.border,
                  style.bg,
                )}
              >
                <div className="flex gap-2.5">
                  <div className={cn('mt-0.5 flex-shrink-0', style.iconColor)}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-grappler-100">{suggestion.title}</p>
                    <p className="text-xs text-grappler-400 mt-0.5 leading-relaxed">{suggestion.text}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-grappler-800/50 rounded-xl p-4 space-y-3">
              {/* Weight */}
              <div>
                <label className="text-xs text-grappler-400 mb-1 block">Weight ({weightUnit})</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  placeholder={weightUnit === 'lbs' ? '185' : '84'}
                  className="input"
                  autoFocus
                />
              </div>

              {/* Auto-calculated BMI preview */}
              {autoCalcBMI && !useManualBMI && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-grappler-700/40">
                  <span className="text-xs text-grappler-400">BMI:</span>
                  <span className="text-sm font-bold text-grappler-100">{autoCalcBMI}</span>
                  <span className={cn('text-xs font-medium', getBMICategory(autoCalcBMI).color)}>
                    {getBMICategory(autoCalcBMI).label}
                  </span>
                </div>
              )}

              {/* Body Composition toggle */}
              <button
                type="button"
                onClick={() => setShowComposition(!showComposition)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-grappler-700/30 hover:bg-grappler-700/50 transition-colors"
              >
                <span className="text-xs font-medium text-grappler-300">Body Composition (optional)</span>
                {showComposition ? (
                  <ChevronUp className="w-4 h-4 text-grappler-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-grappler-400" />
                )}
              </button>

              <AnimatePresence>
                {showComposition && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 pt-1">
                      {/* Measurements for Navy method */}
                      <div>
                        <p className="text-xs text-grappler-400 mb-2">Measurements (for body fat calculation)</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-grappler-500 mb-0.5 block">Waist (cm)</label>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={formWaist}
                              onChange={(e) => setFormWaist(e.target.value)}
                              placeholder="84"
                              className="input text-sm py-1.5"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-grappler-500 mb-0.5 block">Neck (cm)</label>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={formNeck}
                              onChange={(e) => setFormNeck(e.target.value)}
                              placeholder="38"
                              className="input text-sm py-1.5"
                            />
                          </div>
                          {sex === 'female' && (
                            <div className="col-span-2">
                              <label className="text-[11px] text-grappler-500 mb-0.5 block">Hip (cm)</label>
                              <input
                                type="number"
                                inputMode="decimal"
                                value={formHip}
                                onChange={(e) => setFormHip(e.target.value)}
                                placeholder="96"
                                className="input text-sm py-1.5"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Auto-calculated BF preview */}
                      {autoCalcBF != null && !useManualBF && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-grappler-700/40">
                          <span className="text-xs text-grappler-400">Estimated BF:</span>
                          <span className="text-sm font-bold text-grappler-100">{autoCalcBF}%</span>
                          <span className={cn('text-xs font-medium', getBodyFatCategory(autoCalcBF, sex).color)}>
                            {getBodyFatCategory(autoCalcBF, sex).label}
                          </span>
                          <span className="text-[10px] text-grappler-600 ml-auto">Navy method</span>
                        </div>
                      )}

                      {/* Manual overrides */}
                      <div className="border-t border-grappler-700/50 pt-3 space-y-2">
                        <p className="text-xs text-grappler-500">Or enter manually</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-grappler-500 mb-0.5 block">Body Fat %</label>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={formBodyFat}
                              onChange={(e) => {
                                setFormBodyFat(e.target.value);
                                setUseManualBF(e.target.value.length > 0);
                              }}
                              placeholder={autoCalcBF != null ? String(autoCalcBF) : '15'}
                              className="input text-sm py-1.5"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-grappler-500 mb-0.5 block">BMI</label>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={formBMI}
                              onChange={(e) => {
                                setFormBMI(e.target.value);
                                setUseManualBMI(e.target.value.length > 0);
                              }}
                              placeholder={autoCalcBMI != null ? String(autoCalcBMI) : '24'}
                              className="input text-sm py-1.5"
                            />
                          </div>
                        </div>
                        {useManualBF && formBodyFat && (
                          <p className="text-[11px] text-grappler-500">
                            Using your manual body fat value. Clear the field to use Navy method calculation.
                          </p>
                        )}
                        {useManualBMI && formBMI && (
                          <p className="text-[11px] text-grappler-500">
                            Using your manual BMI value. Clear the field to auto-calculate from weight & height.
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Notes */}
              <div>
                <label className="text-xs text-grappler-400 mb-1 block">Notes (optional)</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g., morning weight, post-meal..."
                  className="input"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button onClick={() => { setShowAddForm(false); resetForm(); }} className="btn btn-secondary btn-sm flex-1">
                  Cancel
                </button>
                <button onClick={handleAdd} className="btn btn-primary btn-sm flex-1">
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Weight Chart */}
      {chartData.length >= 2 && (
        <div className="bg-grappler-800/30 rounded-xl p-4">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#9ca3af' }}
              />
              {avgWeight && (
                <ReferenceLine
                  y={avgWeight}
                  stroke="#6366f1"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              )}
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 3 }}
                activeDot={{ r: 5, fill: '#a78bfa' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Body Fat Trend Chart */}
      {bfChartData.length >= 2 && (
        <div className="bg-grappler-800/30 rounded-xl p-4">
          <p className="text-xs text-grappler-400 mb-2 uppercase tracking-wide">Body Fat % Trend</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={bfChartData}>
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value: number) => [`${value}%`, 'Body Fat']}
              />
              <Line
                type="monotone"
                dataKey="bf"
                stroke="#00b894"
                strokeWidth={2}
                dot={{ fill: '#00b894', r: 3 }}
                activeDot={{ r: 5, fill: '#55efc4' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent entries */}
      {sortedLog.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-grappler-400 uppercase tracking-wide">Recent Entries</p>
          {[...sortedLog].reverse().slice(0, 5).map(entry => {
            // Find matching composition entry for same date
            const entryDate = new Date(entry.date).toDateString();
            const comp = sortedComposition.find(c => new Date(c.date).toDateString() === entryDate);
            return (
              <div key={entry.id} className="flex items-center justify-between py-2 border-b border-grappler-800 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-grappler-200 font-medium">
                      {entry.weight} {entry.unit}
                    </p>
                    {comp?.bmi && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-grappler-700/60 text-grappler-300">
                        BMI {comp.bmi}
                      </span>
                    )}
                    {comp?.bodyFatPercent != null && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-grappler-700/60 text-grappler-300">
                        {comp.bodyFatPercent}% BF
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-grappler-500">
                    {new Date(entry.date).toLocaleDateString()}
                    {comp?.waist && ` · W: ${comp.waist}cm`}
                    {comp?.neck && ` · N: ${comp.neck}cm`}
                    {entry.notes && ` — ${entry.notes}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    deleteBodyWeight(entry.id);
                    if (comp) deleteBodyComposition(comp.id);
                  }}
                  className="p-1.5 rounded hover:bg-grappler-700 text-grappler-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {sortedLog.length === 0 && !showAddForm && (
        <p className="text-sm text-grappler-500 text-center py-6">
          No body weight entries yet. Tap &quot;Log&quot; to start tracking.
        </p>
      )}
    </div>
  );
}
