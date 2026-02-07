/**
 * Illness Engine
 *
 * Evidence-based illness classification and return-to-training protocols.
 *
 * Key references:
 * - Neck Check Rule: Weidner et al. (1998), Medicine & Science in Sports
 * - J-Curve of Immune Function: Nieman (1994), Int J Sports Med
 * - Return-to-play: Schwellnus et al. (2016), Br J Sports Med
 * - Fever + exercise risks: Friman & Wesslén (2000)
 */

import type {
  IllnessSymptom,
  IllnessSymptomLocation,
  IllnessSeverity,
  IllnessLog,
  IllnessStatus,
  IllnessTrainingRecommendation,
  IllnessDailyCheckin,
  ReturnToTrainingPhaseType,
} from './types';

// ── Symptom Classification ────────────────────────────────────────────────

const SYMPTOM_LOCATION: Record<IllnessSymptom, IllnessSymptomLocation> = {
  runny_nose: 'above_neck',
  sore_throat: 'above_neck',
  sneezing: 'above_neck',
  headache: 'above_neck',
  cough: 'below_neck',
  chest_congestion: 'below_neck',
  shortness_of_breath: 'below_neck',
  fever: 'systemic',
  chills: 'systemic',
  body_aches: 'systemic',
  fatigue: 'systemic',
  nausea: 'systemic',
  diarrhea: 'systemic',
  vomiting: 'systemic',
  dizziness: 'systemic',
  loss_of_appetite: 'systemic',
};

const SYMPTOM_LABELS: Record<IllnessSymptom, string> = {
  runny_nose: 'Runny Nose',
  sore_throat: 'Sore Throat',
  sneezing: 'Sneezing',
  headache: 'Headache',
  cough: 'Cough',
  chest_congestion: 'Chest Congestion',
  shortness_of_breath: 'Shortness of Breath',
  fever: 'Fever',
  chills: 'Chills',
  body_aches: 'Body Aches',
  fatigue: 'Fatigue',
  nausea: 'Nausea',
  diarrhea: 'Diarrhea',
  vomiting: 'Vomiting',
  dizziness: 'Dizziness',
  loss_of_appetite: 'Loss of Appetite',
};

export function getSymptomLabel(symptom: IllnessSymptom): string {
  return SYMPTOM_LABELS[symptom];
}

export function getSymptomLocation(symptom: IllnessSymptom): IllnessSymptomLocation {
  return SYMPTOM_LOCATION[symptom];
}

export function getSymptomsByLocation(location: IllnessSymptomLocation): IllnessSymptom[] {
  return (Object.keys(SYMPTOM_LOCATION) as IllnessSymptom[]).filter(
    s => SYMPTOM_LOCATION[s] === location
  );
}

// ── Neck Check Algorithm ──────────────────────────────────────────────────

interface NeckCheckResult {
  classification: 'above_neck_mild' | 'above_neck_moderate' | 'below_neck' | 'systemic' | 'gi_symptoms';
  canTrain: boolean;
  maxIntensity: 'light' | 'very_light' | 'none';
  message: string;
}

export function performNeckCheck(symptoms: IllnessSymptom[], severity: IllnessSeverity): NeckCheckResult {
  const locations = symptoms.map(s => SYMPTOM_LOCATION[s]);
  const hasSystemic = locations.includes('systemic');
  const hasBelowNeck = locations.includes('below_neck');
  const hasAboveNeck = locations.includes('above_neck');
  const hasFever = symptoms.includes('fever');
  const hasGI = symptoms.some(s => ['nausea', 'diarrhea', 'vomiting'].includes(s));

  // Fever = absolute rest (myocarditis risk)
  if (hasFever) {
    return {
      classification: 'systemic',
      canTrain: false,
      maxIntensity: 'none',
      message: 'Fever detected — complete rest required. Training with a fever risks myocarditis.',
    };
  }

  // GI symptoms = rest (dehydration risk)
  if (hasGI) {
    return {
      classification: 'gi_symptoms',
      canTrain: false,
      maxIntensity: 'none',
      message: 'GI symptoms present — rest and rehydrate. Training risks dangerous dehydration.',
    };
  }

  // Systemic symptoms (body aches, chills, fatigue) = rest
  if (hasSystemic) {
    return {
      classification: 'systemic',
      canTrain: false,
      maxIntensity: 'none',
      message: 'Systemic symptoms — your body is fighting something. Complete rest recommended.',
    };
  }

  // Below-neck symptoms (cough, chest congestion, SOB) = rest
  if (hasBelowNeck) {
    return {
      classification: 'below_neck',
      canTrain: false,
      maxIntensity: 'none',
      message: 'Below-the-neck symptoms — avoid training until these clear. Focus on rest and hydration.',
    };
  }

  // Above-neck only
  if (hasAboveNeck) {
    if (severity === 'mild') {
      return {
        classification: 'above_neck_mild',
        canTrain: true,
        maxIntensity: 'light',
        message: 'Mild above-the-neck symptoms — light activity is OK. Keep intensity low and listen to your body.',
      };
    }
    return {
      classification: 'above_neck_moderate',
      canTrain: false,
      maxIntensity: 'very_light',
      message: 'Moderate above-the-neck symptoms — rest is preferred. Very light mobility or walking only.',
    };
  }

  // Fallback
  return {
    classification: 'above_neck_mild',
    canTrain: true,
    maxIntensity: 'light',
    message: 'Symptoms are mild — light activity may be appropriate.',
  };
}

// ── Illness Duration Calculation ──────────────────────────────────────────

export function getIllnessDurationDays(illness: IllnessLog): number {
  const start = new Date(illness.startDate);
  const end = illness.endDate ? new Date(illness.endDate) : new Date();
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

// ── Return-to-Training Protocol ───────────────────────────────────────────

interface ReturnPhaseDetails {
  phase: ReturnToTrainingPhaseType;
  label: string;
  volumePercent: number;
  intensityPercent: number;
  rpeCap: number;
  maxDurationMinutes: number;
  description: string;
  guidelines: string[];
}

export function getReturnPhase(
  illnessDurationDays: number,
  daysSinceResolved: number,
): ReturnPhaseDetails {
  // Scale phases based on how long you were sick
  if (illnessDurationDays <= 3) {
    // Short illness: 1 easy session then back to normal
    if (daysSinceResolved <= 1) {
      return {
        phase: 'test_day',
        label: 'Test Day',
        volumePercent: 50,
        intensityPercent: 60,
        rpeCap: 6,
        maxDurationMinutes: 35,
        description: 'Ease back in with a short, light session.',
        guidelines: [
          'Keep RPE at 6 or below',
          'Stop immediately if symptoms return',
          'Focus on movement quality, not performance',
          'Hydrate well before, during, and after',
        ],
      };
    }
    return {
      phase: 'full_return',
      label: 'Full Return',
      volumePercent: 100,
      intensityPercent: 100,
      rpeCap: 10,
      maxDurationMinutes: 120,
      description: 'You\'re cleared for normal training.',
      guidelines: ['Resume normal programming', 'Monitor energy levels'],
    };
  }

  if (illnessDurationDays <= 7) {
    // Medium illness: 2-3 sessions graduated
    if (daysSinceResolved <= 2) {
      return {
        phase: 'test_day',
        label: 'Test Day',
        volumePercent: 50,
        intensityPercent: 60,
        rpeCap: 6,
        maxDurationMinutes: 35,
        description: 'First session back — go easy.',
        guidelines: [
          'Max 50% of normal sets',
          'RPE cap at 6 — leave plenty in the tank',
          'If you feel worse 2h post-workout, extend rest',
          'No heavy compounds today',
        ],
      };
    }
    if (daysSinceResolved <= 5) {
      return {
        phase: 'building_back',
        label: 'Building Back',
        volumePercent: 75,
        intensityPercent: 80,
        rpeCap: 7,
        maxDurationMinutes: 50,
        description: 'Ramping back up — 75% volume.',
        guidelines: [
          'Reintroduce compounds at moderate weight',
          'Keep RPE under 7',
          'Listen to your body — fatigue is expected',
        ],
      };
    }
    return {
      phase: 'full_return',
      label: 'Full Return',
      volumePercent: 100,
      intensityPercent: 100,
      rpeCap: 10,
      maxDurationMinutes: 120,
      description: 'Resume normal training.',
      guidelines: ['Back to your programmed sessions'],
    };
  }

  // Long illness (7-14+ days): extended graduated return
  if (daysSinceResolved <= 3) {
    return {
      phase: 'test_day',
      label: 'Test Day',
      volumePercent: 40,
      intensityPercent: 50,
      rpeCap: 5,
      maxDurationMinutes: 30,
      description: 'Extended illness — start very light.',
      guidelines: [
        'Max 40% volume, 50% intensity',
        'Focus on movement patterns and blood flow',
        'No heavy compounds',
        'Stop if any symptom returns',
      ],
    };
  }
  if (daysSinceResolved <= 7) {
    return {
      phase: 'building_back',
      label: 'Building Back',
      volumePercent: 65,
      intensityPercent: 70,
      rpeCap: 7,
      maxDurationMinutes: 45,
      description: 'Gradually rebuilding capacity.',
      guidelines: [
        'Reintroduce compounds at moderate loads',
        'Add 1-2 sets per session compared to test day',
        'Extra rest between sets is fine',
      ],
    };
  }
  if (daysSinceResolved <= 12) {
    return {
      phase: 'building_back',
      label: 'Building Back (Late)',
      volumePercent: 85,
      intensityPercent: 90,
      rpeCap: 8,
      maxDurationMinutes: 60,
      description: 'Almost back to normal capacity.',
      guidelines: [
        'Near-normal volume, watch for lingering fatigue',
        'RPE can go up to 8 on compounds',
      ],
    };
  }
  return {
    phase: 'full_return',
    label: 'Full Return',
    volumePercent: 100,
    intensityPercent: 100,
    rpeCap: 10,
    maxDurationMinutes: 120,
    description: 'Resume normal training.',
    guidelines: ['Full programming resumed'],
  };
}

// ── Active Illness Training Recommendation ────────────────────────────────

export function getIllnessTrainingRecommendation(illness: IllnessLog): IllnessTrainingRecommendation {
  if (illness.status === 'resolved') {
    const durationDays = getIllnessDurationDays(illness);
    const daysSinceResolved = illness.endDate
      ? Math.ceil((Date.now() - new Date(illness.endDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const phase = getReturnPhase(durationDays, daysSinceResolved);

    if (phase.phase === 'full_return') {
      return {
        canTrain: true,
        maxIntensityPercent: 100,
        maxVolumePercent: 100,
        maxDurationMinutes: 120,
        rpeCap: 10,
        message: 'Fully cleared — resume normal training.',
        detailedReason: 'Illness resolved and return-to-training phases complete.',
        suggestedActivities: ['Normal programming'],
        returnPhase: 'full_return',
      };
    }

    return {
      canTrain: true,
      maxIntensityPercent: phase.intensityPercent,
      maxVolumePercent: phase.volumePercent,
      maxDurationMinutes: phase.maxDurationMinutes,
      rpeCap: phase.rpeCap,
      message: `${phase.label}: ${phase.description}`,
      detailedReason: phase.guidelines.join(' '),
      suggestedActivities: phase.phase === 'test_day'
        ? ['Light full-body session', 'Walking', 'Mobility work']
        : ['Moderate training', 'Normal exercises at reduced load'],
      returnPhase: phase.phase,
    };
  }

  if (illness.status === 'recovering') {
    const neckCheck = performNeckCheck(illness.symptoms, illness.severity);

    if (neckCheck.canTrain) {
      return {
        canTrain: true,
        maxIntensityPercent: 40,
        maxVolumePercent: 30,
        maxDurationMinutes: 30,
        rpeCap: 5,
        message: 'Recovering — very light activity only.',
        detailedReason: neckCheck.message,
        suggestedActivities: ['Walking', 'Light stretching', 'Mobility work'],
        returnPhase: 'test_day',
      };
    }

    return {
      canTrain: false,
      maxIntensityPercent: 0,
      maxVolumePercent: 0,
      maxDurationMinutes: 0,
      rpeCap: 0,
      message: 'Still recovering — rest recommended.',
      detailedReason: neckCheck.message,
      suggestedActivities: ['Rest', 'Sleep', 'Hydration'],
    };
  }

  // Active illness
  const neckCheck = performNeckCheck(illness.symptoms, illness.severity);

  if (neckCheck.canTrain) {
    return {
      canTrain: true,
      maxIntensityPercent: 30,
      maxVolumePercent: 30,
      maxDurationMinutes: 25,
      rpeCap: 4,
      message: 'Light activity only — keep it very easy.',
      detailedReason: neckCheck.message,
      suggestedActivities: ['Walking', 'Very light mobility', 'Gentle stretching'],
    };
  }

  return {
    canTrain: false,
    maxIntensityPercent: 0,
    maxVolumePercent: 0,
    maxDurationMinutes: 0,
    rpeCap: 0,
    message: 'No training — your body needs rest to recover.',
    detailedReason: neckCheck.message,
    suggestedActivities: ['Complete rest', 'Sleep', 'Hydration', 'Nutrition'],
  };
}

// ── Severity Auto-Detection ───────────────────────────────────────────────

export function autoDetectSeverity(symptoms: IllnessSymptom[], hasFever: boolean): IllnessSeverity {
  if (hasFever) return 'severe';

  const locations = symptoms.map(s => SYMPTOM_LOCATION[s]);
  const hasSystemic = locations.includes('systemic');
  const hasBelowNeck = locations.includes('below_neck');

  if (hasSystemic && symptoms.length >= 3) return 'severe';
  if (hasSystemic || hasBelowNeck) return 'moderate';
  if (symptoms.length >= 3) return 'moderate';
  return 'mild';
}

// ── Illness Status Logic ──────────────────────────────────────────────────

export function shouldMarkRecovering(illness: IllnessLog): boolean {
  if (illness.status !== 'active') return false;
  if (illness.dailyCheckins.length < 2) return false;

  const last = illness.dailyCheckins[illness.dailyCheckins.length - 1];
  const prev = illness.dailyCheckins[illness.dailyCheckins.length - 2];

  // Improving if: fewer symptoms OR lower severity OR no fever when previously had it
  const fewerSymptoms = last.symptoms.length < prev.symptoms.length;
  const lowerSeverity =
    (last.severity === 'mild' && prev.severity !== 'mild') ||
    (last.severity === 'moderate' && prev.severity === 'severe');
  const feverCleared = !last.hasFever && prev.hasFever;
  const betterEnergy = last.energyLevel > prev.energyLevel;

  return (fewerSymptoms || lowerSeverity || feverCleared) && betterEnergy;
}

export function shouldMarkResolved(checkin: IllnessDailyCheckin): boolean {
  return (
    checkin.symptoms.length === 0 &&
    !checkin.hasFever &&
    checkin.energyLevel >= 3 &&
    checkin.appetiteLevel >= 3
  );
}

// ── Mesocycle Impact ──────────────────────────────────────────────────────

export function getMesocycleImpact(illnessDurationDays: number): {
  action: 'none' | 'extend' | 'restart_week' | 'restart_block';
  extensionDays: number;
  message: string;
} {
  if (illnessDurationDays <= 2) {
    return {
      action: 'none',
      extensionDays: 0,
      message: 'Short illness — no program changes needed.',
    };
  }
  if (illnessDurationDays <= 5) {
    return {
      action: 'extend',
      extensionDays: illnessDurationDays,
      message: `Extending your program by ${illnessDurationDays} days to account for missed sessions.`,
    };
  }
  if (illnessDurationDays <= 14) {
    return {
      action: 'restart_week',
      extensionDays: 7,
      message: 'Restarting the current week of your program with reduced loads.',
    };
  }
  return {
    action: 'restart_block',
    extensionDays: 0,
    message: 'Extended illness — consider regenerating your training block with adjusted baselines.',
  };
}

// ── Streak Impact ─────────────────────────────────────────────────────────

export function getStreakProtection(illness: IllnessLog): {
  freezeStreak: boolean;
  reason: string;
} {
  // Active or recovering illness = unlimited streak freeze
  if (illness.status === 'active' || illness.status === 'recovering') {
    return {
      freezeStreak: true,
      reason: 'Your streak is frozen while you\'re sick. Focus on getting better.',
    };
  }
  return { freezeStreak: false, reason: '' };
}
