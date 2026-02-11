# IBRA-LIFTS NUTRITION SYSTEM: FULL AUDIT & REDESIGN PLAN

**Date:** 2026-02-11
**Auditor:** Sports Nutrition Performance Architect
**Scope:** Complete nutrition module — algorithms, UX, safety, combat-sport specificity

---

## EXECUTIVE SUMMARY

The current nutrition system is **significantly above average** for a self-built app. Evidence-based macros (Mifflin-St Jeor), sex-differentiated adjustments, contextual day-type multipliers, illness detection, Whoop integration, and weekly adaptive coaching put this ahead of most generic trackers.

**But it is not a combat sports nutrition system.** It is a general fitness nutrition tracker with some martial arts flavor. The gap between "good fitness app" and "elite combat nutrition system" is enormous. Here is exactly what is wrong and how to fix it.

---

## PART 1: SCIENTIFIC AUDIT — WHAT IS WRONG

### 1.1 Calorie Formula: Mifflin-St Jeor is the Wrong Choice

**Current:** Mifflin-St Jeor with a flat `1.55` activity multiplier.

**Problem:** Mifflin-St Jeor was validated on sedentary-to-moderately-active populations. Combat athletes training 2x/day with high-intensity grappling, sparring, and lifting have wildly different energy expenditures that a single multiplier cannot capture.

**Fix:**
- Use **Cunningham equation** (BMR = 500 + 22 × lean body mass in kg) when body fat % is available. This is far more accurate for muscular, lean athletes.
- Fall back to Mifflin-St Jeor only when body composition data is unavailable.
- Replace the flat `1.55` multiplier with a **dynamic activity factor** calculated from:
  - Training sessions logged that day/week (actual data from the app)
  - Session type (grappling hard = ~800-1200kcal/hr, lifting = ~400-600kcal/hr, light drilling = ~300-500kcal/hr)
  - Session duration
  - NEAT estimation based on occupation (desk job vs active job)

```
// Proposed: Dynamic TDEE
if (bodyFatPercent) {
  leanMass = bodyWeightKg * (1 - bodyFatPercent / 100);
  BMR = 500 + (22 * leanMass); // Cunningham
} else {
  BMR = mifflinStJeor(weight, height, age, sex); // fallback
}

// Replace flat 1.55 with computed activity
dailyActivityCals = sumOf(sessions.map(s => estimateSessionCalories(s.type, s.duration, bodyWeight)));
NEAT = occupationFactor * bodyWeightKg * hoursAwake;
TDEE = BMR + dailyActivityCals + NEAT + TEF(0.10 * totalCalories);
```

**Evidence:** Cunningham (1991), validated for athletes by Jagim et al. (2018). The flat multiplier approach has ±300-500kcal error range in athletes (Manore, 2015).

### 1.2 Protein Targets: Too Low for Combat Athletes in a Deficit

**Current:**
- Cut male: 2.4 g/kg | Cut female: 2.0 g/kg
- Bulk: 2.0 / 1.8 g/kg
- Maintain: 2.0 / 1.8 g/kg

**Problem:** During aggressive fight-camp cuts (common in combat sports), protein needs spike to **2.8-3.1 g/kg** to preserve lean mass under caloric restriction + high training volume. The current 2.4g/kg ceiling is based on Longland et al. (2016) which studied recreational trainees, not athletes doing 2-3hrs of grappling daily.

**Fix:**
```
// Context-dependent protein scaling
proteinGKg = {
  cut_mild:    sex === 'male' ? 2.4 : 2.0,   // <15% deficit
  cut_moderate: sex === 'male' ? 2.7 : 2.3,   // 15-25% deficit
  cut_aggressive: sex === 'male' ? 3.1 : 2.6, // >25% deficit (fight camp)
  bulk:        sex === 'male' ? 2.0 : 1.8,
  maintain:    sex === 'male' ? 2.0 : 1.8,
  fight_week:  sex === 'male' ? 3.0 : 2.5,    // extreme preservation mode
}
```

**Evidence:** Hector & Phillips (2018) — protein needs increase with deficit severity. Helms et al. (2014) recommends 2.3-3.1g/kg for lean athletes in deficit. Petrizzo et al. (2017) — combat athletes may need upper range.

### 1.3 Activity Multiplier: Static 1.55 is Dangerously Inaccurate

**Current:** Hardcoded `1.55` for all users.

**Problem:** A BJJ fighter doing 2x daily training (morning lifting + evening grappling) has an activity factor closer to **1.9-2.2**. A fighter on rest week is closer to **1.3-1.4**. Using 1.55 for both means you are:
- **Underfueling** the hard-training fighter by 500-800 kcal/day
- **Overfueling** the resting fighter by 200-400 kcal/day

This is not a small error. Over a fight camp, this compounds into either RED-S or unwanted weight gain.

**Fix:** Compute activity factor from actual logged training data:

```
// Per-session activity cost estimates (kcal/kg/hr)
SESSION_MET_VALUES = {
  grappling_hard: 10.0,   // ~700-900 kcal/hr for 80kg athlete
  grappling_light: 6.5,   // ~450-520 kcal/hr
  sparring: 12.0,         // highest intensity
  striking_pads: 8.0,
  lifting_heavy: 6.0,
  lifting_moderate: 4.5,
  drilling: 4.0,
  cardio_steady: 5.0,
  cardio_hiit: 9.0,
}

weeklyTrainingCals = sum(sessions.map(s =>
  SESSION_MET_VALUES[s.type] * bodyWeightKg * s.durationHours
));

// Actual activity factor
activityFactor = (BMR * 7 + weeklyTrainingCals + weeklyNEAT) / (BMR * 7);
```

### 1.4 Fat Floor: Too Low for Male Combat Athletes

**Current:** Male minimum 35g fat.

**Problem:** 35g fat is dangerously low. For a 77kg male fighter, that is **0.45 g/kg** — below the threshold for testosterone production and fat-soluble vitamin absorption. The literature floor for male athletes is **0.7 g/kg minimum**, with **1.0 g/kg preferred** during hard training.

**Fix:**
```
FAT_FLOOR_M = max(50, bodyWeightKg * 0.7)   // minimum 0.7 g/kg, floor of 50g
FAT_FLOOR_F = max(55, bodyWeightKg * 0.8)   // minimum 0.8 g/kg, floor of 55g
```

**Evidence:** Volek et al. (2001) — testosterone declines below 0.6 g/kg fat intake. Hämäläinen et al. (1984) — fat restriction impairs hormone production in athletes.

### 1.5 Calorie Floor: 1200/1400 is Too Aggressive

**Current:** Absolute calorie floors of 1200 (F) / 1400 (M).

**Problem:** For combat athletes, absolute floors are meaningless without context. A 52kg female strawweight has different needs than an 84kg female. LEA (Low Energy Availability) is the actual risk metric, not absolute calories.

**Fix:** Replace absolute floors with **energy availability (EA)** calculation:

```
// Energy Availability = (Energy Intake - Exercise Energy Expenditure) / Lean Body Mass
EA = (calorieIntake - exerciseCost) / leanMassKg;

THRESHOLDS:
  EA < 30 kcal/kg LBM = RED FLAG — RED-S risk, menstrual dysfunction, bone loss
  EA < 25 kcal/kg LBM = CRITICAL — must increase intake immediately
  EA 30-45 kcal/kg LBM = CAUTION — monitor symptoms
  EA >= 45 kcal/kg LBM = ADEQUATE
```

**Evidence:** Mountjoy et al. (2018) IOC Consensus Statement on RED-S. Loucks & Thuma (2003) — 30 kcal/kg FFM is the clinical threshold.

### 1.6 Hydration: Oversimplified

**Current:** `35ml/kg + bonuses for training/illness`. Water logged in "glasses" (250ml).

**Problems:**
1. No sweat rate estimation (a 90kg fighter in a hot gym loses 1.5-3L/hr)
2. No electrolyte calculation (sweat contains 0.5-1.5g sodium/L)
3. Glass-based tracking is imprecise
4. No urine color / specific gravity guidance
5. No weight-cut hydration manipulation logic (water loading → taper)
6. No post-training rehydration protocol (150% of fluid lost within 2-4hrs)

**Fix:** See Section 3 (Weight Cut System) and Section 5 (Performance Nutrition Layer).

### 1.7 Contextual Multipliers: Good Foundation, Missing Key Scenarios

**Current multipliers are solid** for generic training days but missing:

| Missing Scenario | Why It Matters |
|---|---|
| Two-a-day sessions | Fighters frequently train AM + PM. Need ~1.3-1.5× calories |
| Fight week (caloric restriction + water manipulation) | Completely different protocol |
| Tournament day (multiple matches in hours) | Intra-competition fueling is critical |
| Sauna/hot bath sessions | Common in fight camps, massive fluid loss |
| Travel days | Disrupted eating, increased stress hormones |
| Recovery-only days (massage, ice bath, stretching) | Lower NEAT than true rest |

### 1.8 Weekly Adaptation Algorithm: Solid but Missing Fight Camp Logic

**Current:** 7-day EMA, plateau detection, adherence gating — this is good.

**Missing:**
- No **acceleration** during fight camp (the system adjusts at the same rate whether you're 12 weeks out or 10 days out)
- No **rebound detection** (common post-weigh-in weight spike)
- No distinction between **fat loss** and **water manipulation** phases
- Weekly check-in cadence should be **daily during fight week**, not weekly

### 1.9 Supplement Recommendations: Surface-Level

**Current:** Generic tips per training type. No dosing, no timing, no periodization, no banned substance warnings.

**Missing:**
- Creatine loading vs maintenance discussion
- Caffeine dose per kg with combat-sport-specific timing (don't overstimulate before grappling)
- Sodium bicarbonate timing and GI side effect management
- Beta-alanine and paresthesia warnings
- Supplement cycling around weight cuts (creatine adds 1-3kg water weight)
- WADA/USADA considerations for tested athletes
- Interaction warnings (caffeine + beta-alanine timing)

### 1.10 Missing: Micronutrient Awareness

**Zero micronutrient tracking.** For combat athletes this matters because:
- Iron deficiency is common (especially in menstruating female fighters)
- Vitamin D deficiency impairs recovery and immune function
- Magnesium depletion from sweating affects sleep and muscle function
- Zinc loss through sweat impairs testosterone production
- Calcium is critical for bone health under high-impact training

**Fix:** Don't try to be Cronometer. Instead, add a **"nutrition quality score"** based on food diversity and known micronutrient-rich food choices.

---

## PART 2: COMBAT SPORTS OPTIMIZATION

### 2.1 Periodized Nutrition Engine

The app currently treats nutrition as a flat cut/bulk/maintain. Combat athletes need **periodized nutrition phases** that align with their training calendar:

```
NUTRITION_PHASES = {
  off_season: {
    // 4-8 weeks post-competition
    goal: 'recovery_and_growth',
    surplus: '10-15% above TDEE',
    protein: '1.8-2.2 g/kg',
    carbs: 'high (5-7 g/kg)',
    fat: '1.0-1.2 g/kg',
    focus: 'muscle gain, injury rehab, mental recovery',
    restrictions: 'none — enjoy food variety',
  },

  base_camp: {
    // 10-8 weeks out from fight
    goal: 'build_performance_base',
    surplus: '0 to slight surplus',
    protein: '2.0-2.4 g/kg',
    carbs: '4-6 g/kg',
    fat: '0.8-1.0 g/kg',
    focus: 'training fuel, volume tolerance, skill acquisition',
    restrictions: 'minimize processed foods',
  },

  intensification: {
    // 8-4 weeks out
    goal: 'lean_out_gradually',
    deficit: '10-20% below TDEE',
    protein: '2.4-2.8 g/kg',
    carbs: '3-5 g/kg (periodized around training)',
    fat: '0.7-0.9 g/kg',
    focus: 'body composition, maintain training intensity',
    restrictions: 'strict tracking, limit alcohol completely',
  },

  fight_camp_peak: {
    // 4-2 weeks out
    goal: 'final_body_comp_push',
    deficit: '15-25% below TDEE',
    protein: '2.8-3.1 g/kg',
    carbs: '2.5-4 g/kg (training days only)',
    fat: '0.7 g/kg minimum',
    focus: 'preserve muscle, sharpen weight',
    restrictions: 'strict meal prep, no eating out',
    warnings: ['Monitor energy availability', 'Watch for mood/sleep disruption'],
  },

  fight_week: {
    // 7-2 days out
    goal: 'final_weight_manipulation',
    protocol: 'see weight cut algorithm (Part 3)',
    focus: 'water/sodium manipulation, glycogen depletion',
    warnings: ['PROFESSIONAL SUPERVISION RECOMMENDED'],
  },

  weigh_in_day: {
    // Day of weigh-in
    protocol: 'water cut completion + rehydration',
    phases: ['final_dehydration', 'weigh_in', 'rehydration_phase_1', 'rehydration_phase_2'],
  },

  fight_day: {
    goal: 'maximize_performance',
    protocol: 'rehydration completion + strategic fueling',
    carbs: '8-10 g/kg (glycogen supercompensation)',
    protein: '1.5-2.0 g/kg (lower — GI comfort)',
    fat: 'minimal (slow digestion)',
    timing: 'every 2-3 hours, small frequent meals',
    hydration: '150% of water cut weight regained',
  },

  tournament_day: {
    goal: 'sustained_energy_across_matches',
    protocol: {
      pre_first_match: '3-4hrs before: 400-600cal meal (rice, chicken, banana)',
      between_matches: '100-200cal every 30-60min (dates, rice cakes, sports drink)',
      hydration: 'sip 200-400ml between matches with electrolytes',
      post_final_match: 'large recovery meal within 60min',
    },
  },
}
```

### 2.2 Training-Day Specificity (Upgrade)

Current multipliers are a start. Here is what they should become:

```
TRAINING_DAY_NUTRITION = {
  grappling_hard_sparring: {
    calMultiplier: 1.25,
    carbsGKg: { min: 5, max: 7 },
    timing: {
      pre: '2-3hrs before: 1-1.5g/kg carbs + 0.3g/kg protein',
      intra: 'electrolyte drink if >60min (500-1000mg sodium/L)',
      post: 'within 2hrs: 1g/kg carbs + 0.4g/kg protein',
    },
    hydration: 'weigh before/after — replace 150% of lost fluid',
    notes: 'Highest glycogen cost. Match-intensity work depletes stores rapidly.',
  },

  grappling_light_drilling: {
    calMultiplier: 1.1,
    carbsGKg: { min: 3, max: 5 },
    timing: {
      pre: 'normal meal 2-3hrs before',
      intra: 'water only unless >90min',
      post: 'normal meal schedule',
    },
  },

  strength_lifting: {
    calMultiplier: 1.15,
    carbsGKg: { min: 4, max: 6 },
    timing: {
      pre: '1-2hrs before: 0.5-1g/kg carbs + 25-30g protein',
      intra: 'water, optional BCAAs if fasted',
      post: '30-40g protein + 0.5-1g/kg carbs',
    },
    notes: 'Protein synthesis peaks 24-48hrs post-session. Spread protein across all meals.',
  },

  two_a_day: {
    calMultiplier: 1.4,
    carbsGKg: { min: 6, max: 8 },
    timing: {
      between_sessions: 'CRITICAL — 1-1.5g/kg carbs + 30g protein within 1hr of first session ending',
      pre_second: 'easily digestible carbs 60-90min before',
    },
    hydration: 'track both sessions separately, cumulative replacement',
    notes: 'Glycogen resynthesis rate is ~5-7% per hour. Need minimum 4hrs between sessions for adequate recovery.',
  },

  rest_day: {
    calMultiplier: 0.9, // during cut, 1.0 during maintain/bulk
    carbsGKg: { min: 2, max: 4 },
    protein: 'same as training day — MPS still elevated',
    focus: 'anti-inflammatory foods, omega-3, collagen',
    notes: 'Rest days are growth days. Do not slash calories excessively.',
  },
}
```

### 2.3 Session Intensity Detection

Integrate with the existing Whoop/wearable data:

```
// Intensity classification from HR data
if (avgHR > 85% maxHR && duration > 30min) → HARD_SESSION
if (avgHR > 70% maxHR) → MODERATE_SESSION
if (avgHR <= 70% maxHR) → LIGHT_SESSION

// Override with user tag (they know if it was hard sparring)
// Use wearable as secondary validation
```

---

## PART 3: WEIGHT CUT SYSTEM — FULL REDESIGN

### 3.1 The Problem

The current system has basic safety warnings but **zero actual weight cut protocol logic**. It tells users "consult a professional" at dangerous thresholds — that is a liability disclaimer, not a feature. Athletes need guided protocols.

### 3.2 Safe Weight Cut Algorithm

```
WEIGHT_CUT_PHASES = {
  phase_1_chronic: {
    // 10-4 weeks out: FAT LOSS (not water manipulation)
    name: 'Chronic Weight Loss',
    target: 'lose 70-80% of total weight needed through caloric deficit',
    rate: '0.5-1.0% BW/week',
    method: 'caloric deficit + high protein + maintained training',
    macros: {
      protein: '2.8-3.1 g/kg',
      fat: '0.7-0.8 g/kg minimum',
      carbs: 'fill remaining calories, periodized around training',
    },
    monitoring: ['daily weigh-in (AM, fasted, post-void)', 'weekly photo', 'energy levels', 'training performance'],
    red_flags: ['performance dropping >15%', 'sleep disruption >3 nights', 'mood instability', 'injury increase'],
  },

  phase_2_acute: {
    // 7-2 days out: GUT CONTENT + GLYCOGEN + EARLY WATER
    name: 'Acute Weight Reduction',
    target: 'lose another 2-4% BW through low-residue diet + glycogen depletion',
    protocol: {
      days_7_to_5: {
        food: 'low-fiber, low-volume, high-protein',
        carbs: 'reduce to 1-2 g/kg (deplete glycogen)',
        fiber: '<10g/day (reduce gut content)',
        sodium: 'MAINTAIN normal (do NOT restrict yet)',
        water: 'INCREASE to 8-10L/day (water loading begins)',
        training: 'maintain but reduce volume 30%',
      },
      days_4_to_3: {
        food: 'low-fiber, low-volume',
        carbs: 'reduce to <50g/day',
        fiber: '<5g/day',
        sodium: 'begin tapering: reduce to 1000mg/day',
        water: 'maintain 8-10L/day',
        training: 'light technique only, no hard sparring',
      },
    },
  },

  phase_3_water_cut: {
    // 24-2hrs before weigh-in: WATER MANIPULATION
    name: 'Water Cut',
    WARNING: 'MAXIMUM 5-6% BW via water manipulation. Beyond this is dangerous.',
    protocol: {
      day_minus_2: {
        water: 'reduce to 2L',
        sodium: 'reduce to 500mg',
        food: 'small protein-only meals, minimal volume',
        sauna: 'optional: 1 session, 20-30min max',
      },
      day_minus_1: {
        water: 'reduce to 1L (sips only)',
        sodium: '<250mg',
        food: 'protein shakes only, no solid food',
        sauna: '2-3 sessions, 20min each, with breaks',
        monitoring: 'weigh every 2hrs, track HR, check urine',
      },
      weigh_in_morning: {
        water: 'nothing (or tiny sips if needed)',
        food: 'nothing',
        sauna: 'final session if needed — SUPERVISED',
        hot_bath: 'alternative to sauna: epsom salt bath 15-20min',
      },
    },
    safety_limits: {
      max_sauna_total: '60min/day',
      stop_if: ['HR >160 at rest', 'dizziness/confusion', 'dark brown urine', 'muscle cramping', 'weight target achieved'],
      never_exceed: '8% BW total water cut',
      professional_required_above: '5% BW water cut',
    },
  },

  phase_4_rehydration: {
    // Post weigh-in: RECOVERY
    name: 'Rehydration Protocol',
    target: 'regain 100% of water weight + glycogen load',
    protocol: {
      first_30min: {
        fluid: '500ml oral rehydration solution (ORS)',
        composition: '1L water + 1/2 tsp salt + 6 tsp sugar + squeeze of lemon',
        food: 'nothing yet — stomach needs to re-adapt',
      },
      first_2hrs: {
        fluid: '1-1.5L sipped (NOT chugged — hyponatremia risk)',
        electrolytes: '1000-1500mg sodium, 500mg potassium',
        food: 'light carbs: white rice, banana, sports drink',
        avoid: 'fiber, dairy, fat (slow gastric emptying)',
      },
      hours_2_to_6: {
        fluid: 'continue sipping — target 150% of weight lost',
        food: 'moderate meals every 2hrs: rice + lean protein + electrolytes',
        carbs: '8-10 g/kg over 12-24hrs (glycogen supercompensation)',
        sodium: '3000-5000mg total over rehydration period',
      },
      hours_6_to_24: {
        fluid: 'ad libitum + electrolytes',
        food: 'normal meals, high carb, moderate protein, low fat',
        sleep: 'prioritize 8-9hrs with magnesium + melatonin if needed',
      },
    },
    targets: {
      weight_regain: '100% of water weight by fight time',
      urine_color: 'pale yellow before competition',
      body_weight: 'should be 5-8% above weigh-in weight by fight time',
    },
  },
}
```

### 3.3 Water Loading Protocol Logic

```
function waterLoadProtocol(weighInDate: Date, currentDate: Date) {
  const daysOut = daysBetween(currentDate, weighInDate);

  if (daysOut > 7) return { water: 'normal (35ml/kg)', note: 'not in water load phase' };
  if (daysOut === 7) return { water: '100ml/kg (e.g., 8L for 80kg athlete)', note: 'begin overhydration' };
  if (daysOut === 6) return { water: '100ml/kg', note: 'maintain high intake' };
  if (daysOut === 5) return { water: '100ml/kg', note: 'maintain — body upregulates excretion' };
  if (daysOut === 4) return { water: '80ml/kg', note: 'begin slight taper' };
  if (daysOut === 3) return { water: '40ml/kg', note: 'significant reduction — body still excreting at high rate' };
  if (daysOut === 2) return { water: '25ml/kg', note: 'restriction phase' };
  if (daysOut === 1) return { water: '15ml/kg (sips)', note: 'minimal intake — excretion exceeds intake' };
  if (daysOut === 0) return { water: '0 (until weigh-in)', note: 'nothing until after weigh-in' };
}
```

### 3.4 Sodium Manipulation Logic

```
function sodiumProtocol(weighInDate: Date, currentDate: Date) {
  const daysOut = daysBetween(currentDate, weighInDate);

  if (daysOut > 7) return { sodium: 'normal (2000-3000mg)', note: 'baseline' };
  if (daysOut >= 5) return { sodium: '4000-5000mg', note: 'sodium LOAD (paired with water load — drives excretion upregulation)' };
  if (daysOut === 4) return { sodium: '3000mg', note: 'begin taper' };
  if (daysOut === 3) return { sodium: '1500mg', note: 'moderate restriction' };
  if (daysOut === 2) return { sodium: '500mg', note: 'heavy restriction — body still excreting at loaded rate' };
  if (daysOut === 1) return { sodium: '<250mg', note: 'near-zero — maximum water excretion' };
  if (daysOut === 0) return { sodium: '0', note: 'nothing until after weigh-in' };
}
```

### 3.5 Safety Triggers

```
WEIGHT_CUT_RED_FLAGS = {
  immediate_stop: [
    { condition: 'HR_resting > 100 bpm', action: 'STOP all dehydration, begin rehydration' },
    { condition: 'confusion or slurred speech', action: 'MEDICAL EMERGENCY' },
    { condition: 'unable to produce urine for >8hrs', action: 'STOP, rehydrate, consult physician' },
    { condition: 'core_temp > 39.5°C / 103°F', action: 'STOP, cool down, rehydrate' },
    { condition: 'seizure or fainting', action: 'CALL 911' },
  ],
  warning_flags: [
    { condition: 'weight_cut_exceeds_8pct_bw', message: 'Consider moving up a weight class. This is dangerous.' },
    { condition: 'less_than_12hrs_rehydration_time', message: 'Insufficient rehydration time — performance will be severely impaired' },
    { condition: 'first_time_cutting_more_than_5pct', message: 'First large cut — trial run recommended before actual competition' },
    { condition: 'age_under_18', message: 'Water manipulation NOT recommended for youth athletes. Use chronic weight management only.' },
    { condition: 'history_of_eating_disorder', message: 'Weight cutting protocols contraindicated. Work with mental health professional.' },
    { condition: 'female_with_amenorrhea', message: 'RED-S likely active. Do NOT cut weight. Increase caloric intake.' },
  ],
}
```

---

## PART 4: PERSONALIZATION SYSTEM — REDESIGN

### 4.1 Current State: Incomplete

The app captures age, weight, height, sex, experience level, and training schedule. But it does not use most of this data meaningfully for nutrition.

### 4.2 Required Athlete Profile for Nutrition

```typescript
interface CombatAthleteNutritionProfile {
  // Physical
  bodyWeightKg: number;
  heightCm: number;
  age: number;
  sex: 'male' | 'female';
  bodyFatPercent?: number;         // from Navy method, DEXA, or estimate
  walkAroundWeight: number;        // natural weight with no dietary restrictions

  // Competition
  weightClass: number;             // target weight class in kg
  sport: CombatSport;
  sanctionBody?: string;           // IBJJF, UFC, ONE, amateur, etc.
  isTestedAthlete: boolean;        // affects supplement recommendations

  // Next Event
  nextCompetitionDate?: Date;
  competitionType: 'single_fight' | 'tournament' | 'none';
  weighInType: 'same_day' | 'day_before' | '2hr_before' | 'tournament_morning';
  rehydrationTime?: number;        // hours between weigh-in and competition

  // Training
  weeklySessionCount: number;
  typicalSessionTypes: SessionType[];
  twoADayFrequency: 'never' | 'sometimes' | 'often' | 'daily';
  averageSessionDuration: number;  // minutes

  // Dietary
  dietaryRestrictions: ('halal' | 'kosher' | 'vegetarian' | 'vegan' | 'dairy_free' | 'gluten_free')[];
  culturePreference?: string;       // affects food database suggestions
  mealPrepAbility: 'none' | 'basic' | 'advanced';
  cookingFrequency: 'rarely' | 'sometimes' | 'daily';

  // History
  previousCutExperience: 'none' | 'some' | 'experienced';
  hadEatingDisorderHistory: boolean; // gates weight cut features
  menstrualStatus?: 'regular' | 'irregular' | 'amenorrheic' | 'not_applicable';

  // Goal
  primaryGoal: 'fight_prep' | 'maintain_weight_class' | 'move_up' | 'move_down' | 'off_season_growth';
  timeframe: 'short_notice' | 'full_camp' | 'long_term';
}
```

### 4.3 Adaptive Logic

The system should automatically adjust based on:

```
1. DAILY: Adjust macros based on actual training logged
2. WEEKLY: Adjust calories based on weight trend vs target
3. PHASE-BASED: Shift entire nutritional strategy based on proximity to competition
4. RECOVERY-BASED: Use Whoop/wearable data to modulate intake
5. BEHAVIOR-BASED: If user consistently under-eats protein, increase target slightly and add nudges
6. SEASON-BASED: Auto-detect if user is in-season (competitions logged) or off-season
```

---

## PART 5: PERFORMANCE NUTRITION LAYER

### 5.1 Intra-Training Fueling

```typescript
function getIntraTrainingProtocol(sessionType: string, duration: number, isInCut: boolean) {
  if (duration < 60) return { fuel: 'water only', electrolytes: 'optional' };

  if (duration >= 60 && duration < 90) {
    return {
      fuel: isInCut ? 'water + electrolytes' : '15-30g carbs (sports drink)',
      electrolytes: '500-750mg sodium/L',
      volume: '400-800ml/hr',
    };
  }

  if (duration >= 90) {
    return {
      fuel: '30-60g carbs/hr (sports drink + gel or dates)',
      electrolytes: '750-1000mg sodium/L',
      volume: '600-1000ml/hr',
      note: 'Practice this in training — do NOT try new fueling on competition day',
    };
  }
}
```

### 5.2 Electrolyte Calculation

```typescript
function calculateElectrolyteNeeds(bodyWeightKg: number, sessionType: string, durationMin: number, temperature: 'cool' | 'moderate' | 'hot') {
  // Sweat rate estimation (L/hr)
  const baseSweatRate = {
    cool: 0.8,
    moderate: 1.2,
    hot: 1.8,
  }[temperature];

  const intensityMultiplier = {
    grappling_hard: 1.3,
    sparring: 1.4,
    lifting: 0.8,
    drilling: 0.9,
    cardio: 1.1,
  }[sessionType] || 1.0;

  const sweatRateLPerHr = baseSweatRate * intensityMultiplier * (bodyWeightKg / 70); // normalized to 70kg
  const totalSweatL = sweatRateLPerHr * (durationMin / 60);

  return {
    fluidLoss: totalSweatL,
    replacementFluid: totalSweatL * 1.5, // 150% replacement
    sodium: totalSweatL * 1000, // ~1000mg/L average sweat sodium
    potassium: totalSweatL * 200, // ~200mg/L
    magnesium: totalSweatL * 15, // ~15mg/L
    timing: 'begin replacing within 30min of session end',
  };
}
```

### 5.3 Collagen & Joint Health Timing

```
COLLAGEN_PROTOCOL = {
  dose: '15-20g hydrolyzed collagen',
  timing: '30-60 minutes BEFORE training',
  enhancer: '50mg vitamin C (taken with collagen — required for synthesis)',
  frequency: 'daily, especially on grappling days',
  evidence: 'Shaw et al. (2017) — 15g collagen + vitamin C 1hr before exercise doubled collagen synthesis markers',
  combat_relevance: 'BJJ/wrestling athletes have extremely high joint stress. This is not optional.',
}
```

### 5.4 Sleep-Support Nutrition

```
SLEEP_NUTRITION = {
  evening_meal: {
    timing: '2-3hrs before bed',
    composition: 'moderate carbs (improves serotonin → melatonin), moderate protein, low fat',
    foods: ['tart cherry juice (natural melatonin)', 'kiwi (serotonin precursor)', 'turkey (tryptophan)', 'rice (high GI → faster sleep onset)'],
  },
  supplements: {
    magnesium_glycinate: { dose: '200-400mg', timing: '30-60min before bed', note: 'glycinate form for sleep; avoid oxide' },
    zinc: { dose: '15-30mg', timing: 'with magnesium', note: 'ZMA stack common in fighters' },
    tart_cherry_extract: { dose: '480mg or 30ml juice concentrate', timing: 'evening' },
  },
  avoid: ['caffeine after 2pm (6-8hr half-life)', 'large meals within 1hr of bed', 'alcohol (disrupts REM)'],
}
```

### 5.5 Anti-Inflammatory Protocol

```
ANTI_INFLAMMATORY = {
  daily: {
    omega_3: '2-3g EPA+DHA combined (fish oil or algae for vegetarians)',
    turmeric_curcumin: '500mg with piperine (black pepper) for absorption',
    tart_cherry: '30ml concentrate or 480mg capsules',
    foods: ['fatty fish 2-3x/week', 'berries daily', 'leafy greens', 'extra virgin olive oil'],
  },
  post_hard_session: {
    protocol: 'DO NOT take NSAIDs (ibuprofen) — blocks muscle adaptation signals (Trappe et al., 2002)',
    instead: 'collagen + vitamin C, omega-3, tart cherry juice, adequate sleep',
  },
  competition_recovery: {
    day_1: 'high omega-3, tart cherry, adequate protein, extra sleep',
    days_2_to_5: 'continue anti-inflammatory foods, gentle movement, sauna 15-20min',
  },
}
```

### 5.6 Travel Protocol

```
TRAVEL_NUTRITION = {
  pre_travel: {
    prep: 'pack protein bars, jerky, rice cakes, electrolyte packets',
    hydration: 'hyperhydrate before flying (cabin air = 10-20% humidity)',
  },
  during_flight: {
    hydration: '500ml per 2hrs of flight',
    food: 'high-protein snacks, avoid salty airline food (bloating)',
    supplements: 'melatonin if crossing >2 time zones',
  },
  arrival: {
    first_meal: 'match new local meal timing immediately',
    hydration: 'extra 1L on arrival day',
    caffeine: 'use strategically to shift circadian rhythm',
  },
}
```

---

## PART 6: SUPPLEMENT FRAMEWORK

### Tier 1 — Evidence-Based Essentials (Daily for ALL combat athletes)

| Supplement | Dose | Timing | Evidence | Combat-Specific Notes |
|---|---|---|---|---|
| **Creatine Monohydrate** | 3-5g/day (no loading needed) | anytime, with meal | Kreider et al. (2017) — most studied, safest ergogenic | **PAUSE 7 days before weigh-in** (holds 1-3kg water). Resume immediately post weigh-in. |
| **Omega-3 (EPA+DHA)** | 2-3g combined EPA+DHA | with meals (fat enhances absorption) | Calder (2017) — anti-inflammatory, neuroprotective | Brain health for athletes taking head impacts. Non-negotiable. |
| **Vitamin D3** | 2000-5000 IU/day | morning with fat | Owens et al. (2018) — 56% of athletes deficient | Higher if indoor training, dark skin, or northern latitude. Test levels annually. |
| **Magnesium Glycinate** | 200-400mg elemental | evening, before bed | Zhang et al. (2017) — improves sleep quality | Fighters lose significant Mg through sweat. Critical for recovery + sleep. |

### Tier 2 — Situational Performance (Use based on training phase)

| Supplement | Dose | When to Use | Combat-Specific Notes |
|---|---|---|---|
| **Caffeine** | 3-6mg/kg | 30-60min pre-session | **Use for competition and hard sparring ONLY.** Do not build daily tolerance. Cycle: 5 days on, 2 off. Avoid before evening grappling (sleep disruption). |
| **Beta-Alanine** | 3.2-6.4g/day (split doses) | daily, any time | Buffers lactic acid. Best for high-rep grappling exchanges, 5-round fights. Takes 4+ weeks to saturate. Paresthesia (tingling) is harmless. |
| **Sodium Bicarbonate** | 0.3g/kg | 60-90min pre-competition | Buffers blood pH for repeated high-intensity bouts. **GI distress is common** — MUST trial in training first. Split dose over 30min with water. |
| **Collagen + Vitamin C** | 15-20g + 50mg vit C | 30-60min pre-training | Joint health, tendon repair. Critical for grapplers. Shaw et al. (2017). |
| **Electrolyte mix** | 500-1500mg sodium/L | during sessions >60min | Custom mix: 1000mg sodium, 200mg potassium, 50mg magnesium per liter. |
| **Tart Cherry Extract** | 480mg or 30ml juice | evening / post-training | Anti-inflammatory + melatonin. Good for tournament weekends. |

### Tier 3 — Optional/Advanced

| Supplement | Dose | Notes |
|---|---|---|
| **Ashwagandha (KSM-66)** | 600mg/day | Cortisol management during hard camps. Wankhede et al. (2015). Stop 2 weeks before drug testing if concerned. |
| **Zinc** | 15-30mg | Combined with Mg (ZMA). Important for testosterone in males. Only if deficient. |
| **Iron** | test first, then 18-65mg if deficient | **FEMALE FIGHTERS:** test ferritin annually. Do NOT supplement blindly — iron toxicity is real. |
| **Citrulline Malate** | 6-8g | 30-60min pre-lifting. Blood flow / pump. Less relevant for grappling. |
| **HMB** | 3g/day | Only during aggressive cuts to preserve lean mass. Moderate evidence (Wilson et al., 2014). |

### Supplement Safety for Tested Athletes

```
ANTI_DOPING_WARNING = {
  message: 'If you compete in a drug-tested organization (USADA, WADA, IBJJF, etc.):',
  rules: [
    'Only use supplements with third-party testing (NSF Certified for Sport, Informed Sport, BSCG)',
    'Contamination in supplements is common (up to 25% of supplements contain undeclared banned substances)',
    'Check every supplement at GlobalDRO.com before use',
    'When in doubt, skip it',
  ],
}
```

---

## PART 7: UX & BEHAVIORAL DESIGN

### 7.1 Smart Nudges

```
NUDGE_SYSTEM = {
  // Protein pacing — most important for combat athletes
  protein_reminder: {
    trigger: 'meals_logged_today < 3 AND protein_consumed < 50% of target AND time > 14:00',
    message: 'You have {remaining}g protein left today. That is {meals_needed} meals of {per_meal}g. Start now.',
    urgency: 'high',
  },

  // Pre-training fuel
  pre_training_fuel: {
    trigger: 'scheduled_session_in_90min AND no_meal_logged_in_3hrs',
    message: 'Training in 90 minutes. Eat: {suggestion} for optimal energy.',
    urgency: 'high',
  },

  // Post-training recovery
  post_training_recovery: {
    trigger: 'session_ended_30min_ago AND no_meal_logged',
    message: 'Recovery window open. Target: {protein}g protein + {carbs}g carbs in the next hour.',
    urgency: 'medium',
  },

  // Hydration
  hydration_check: {
    trigger: 'water_logged < 50% target AND time > 15:00',
    message: 'You are behind on water. Drink {remaining}ml before bed.',
    urgency: 'medium',
  },

  // Weight cut phase transitions
  weight_cut_phase: {
    trigger: 'competition_in_X_days AND current_phase_should_change',
    message: 'You are now entering {phase_name}. Here is what changes: {summary}.',
    urgency: 'high',
  },

  // Collagen timing
  collagen_reminder: {
    trigger: 'grappling_session_in_2hrs AND collagen_not_logged',
    message: 'Take 15-20g collagen + vitamin C now for maximum joint protection.',
    urgency: 'low',
  },

  // Creatine weight cut pause
  creatine_pause: {
    trigger: 'competition_in_7_days AND supplement_creatine_active',
    message: 'Stop creatine now to drop 1-2kg water weight by weigh-in. Resume immediately after.',
    urgency: 'high',
  },

  // Weekend drift
  weekend_accountability: {
    trigger: 'is_saturday AND calories_today > target * 1.3',
    message: 'Weekend surplus detected. You are {excess} calories over. Tomorrow is a new day — hit your target.',
    urgency: 'low',
  },
}
```

### 7.2 Weight Cut Dashboard

```
WEIGHT_CUT_DASHBOARD = {
  header: {
    currentWeight: number,
    targetWeight: number,
    daysToWeighIn: number,
    weightRemaining: number,
    projectedWeighInWeight: number, // based on current trajectory
    status: 'on_track' | 'behind' | 'ahead' | 'danger',
  },

  phases: {
    timeline: 'visual timeline showing current phase and upcoming phases',
    currentPhase: {
      name: string,
      daysInPhase: number,
      daysRemaining: number,
      keyProtocol: string[], // today's specific instructions
    },
  },

  dailyChecklist: [
    { task: 'Morning weigh-in', completed: boolean },
    { task: 'Water intake: {target}L', progress: 'X/Y liters' },
    { task: 'Sodium: {target}mg', progress: 'tracking' },
    { task: 'Calories: {target}', progress: 'X/Y kcal' },
    { task: 'Protein: {target}g', progress: 'X/Y g' },
  ],

  safetyPanel: {
    energyAvailability: number, // kcal/kg LBM
    restingHR: number, // from wearable
    sleepQuality: string, // from wearable
    moodSelfReport: 1-5, // daily check
    redFlags: string[], // any active warnings
  },

  weightChart: {
    type: 'line with projection',
    data: 'actual weight (dots) + smoothed trend (line) + target trajectory (dashed)',
    annotations: 'phase transitions, diet breaks, refeeds',
  },
}
```

### 7.3 Performance Readiness Score

```
PERFORMANCE_READINESS = {
  // Composite score 0-100
  components: {
    nutrition_adherence: {
      weight: 0.25,
      calculation: '7-day macro adherence (within ±10% of targets)',
    },
    hydration: {
      weight: 0.15,
      calculation: '3-day average water intake vs target',
    },
    recovery: {
      weight: 0.25,
      calculation: 'wearable recovery score (or sleep hours / subjective)',
    },
    weight_status: {
      weight: 0.20,
      calculation: 'how on-track weight is vs competition target',
    },
    energy_availability: {
      weight: 0.15,
      calculation: 'EA score (above/below 30 kcal/kg LBM)',
    },
  },

  display: {
    score: number, // 0-100
    color: 'green (80+) | yellow (60-79) | red (<60)',
    label: 'Ready to Compete | Needs Attention | At Risk',
    bottleneck: 'the lowest-scoring component',
    actionItem: 'specific fix for the bottleneck',
  },
}
```

### 7.4 Auto Adjustments After Weight Check-Ins

```
POST_CHECKIN_AUTO_ADJUST = {
  // Runs every time user logs a weigh-in
  steps: [
    '1. Update 7-day EMA',
    '2. Compare weekly rate of change vs target',
    '3. If off-track: propose macro adjustment with explanation',
    '4. If on-track: reinforce behavior ("You are on pace. Keep going.")',
    '5. If approaching phase transition: alert user to upcoming protocol change',
    '6. Update performance readiness score',
    '7. Recalculate projected weigh-in weight',
  ],

  // During fight week: daily adjustments instead of weekly
  fight_week_mode: {
    frequency: 'every weigh-in (ideally 2x/day: AM fasted + PM post-training)',
    adjustments: 'water and sodium protocol adherence, not calorie adjustments',
  },
}
```

---

## PART 8: COMPETITIVE ADVANTAGE vs. GENERIC APPS

### Current Landscape

| Feature | MyFitnessPal | Carbon | MacroFactor | RP Diet | **Ibra-Lifts (Proposed)** |
|---|---|---|---|---|---|
| Calorie tracking | Yes | Yes | Yes | Yes | Yes |
| Adaptive macros | No | Yes | Yes | Yes | **Yes + combat-specific** |
| Weight cut protocols | No | No | No | No | **YES — full water/sodium/glycogen system** |
| Fight camp periodization | No | No | No | No | **YES — 10-week to fight-day phasing** |
| Combat sport session types | No | No | No | No | **YES — grappling, sparring, drilling, two-a-day** |
| Rehydration protocols | No | No | No | No | **YES — timed post weigh-in recovery** |
| Tournament day fueling | No | No | No | No | **YES — multi-match intra-day fueling** |
| Wearable-driven nutrition | No | No | No | No | **YES — Whoop/recovery-based adjustment** |
| Energy Availability (RED-S) | No | No | No | Partial | **YES — real-time EA monitoring** |
| Supplement periodization | No | No | No | No | **YES — cut/compete/off-season cycling** |
| Electrolyte calculation | No | No | No | No | **YES — sweat-rate based** |
| Collagen timing | No | No | No | No | **YES — pre-training joint protocol** |
| Anti-doping warnings | No | No | No | No | **YES — for tested athletes** |
| Coach dashboard | No | No | No | Yes (paid) | **YES (planned)** |

### Moat Strategy

1. **Combat-sport-specific data models** — no generic app can add "fight week water manipulation" without rebuilding from scratch
2. **Integrated training + nutrition** — the app already knows what training the user did today, so nutrition adjusts automatically. MFP cannot do this.
3. **Weight cut algorithm** — this is the killer feature. No consumer app offers guided water/sodium/glycogen manipulation with safety guards.
4. **Wearable integration** — Whoop recovery data driving nutrition is unique
5. **Community lock-in** — fighters training at the same gym, coaches managing multiple athletes

---

## PART 9: MONETIZATION LEVERAGE

### Free Tier
- Basic calorie/macro tracking
- Food database + manual logging
- Weight tracking with trend line
- Generic contextual tips
- 3 meals/day logging limit

### Pro Tier ($9.99/month)
- Unlimited meal logging
- Adaptive weekly macro coaching (the diet coach algorithm)
- Training-day specific nutrition adjustments
- Full supplement framework
- Nutrition trends & analytics
- Protein timing optimization
- Sleep nutrition protocol
- Hydration tracker with electrolyte calculation
- Performance readiness score

### Elite / Fight Camp Tier ($19.99/month or $49.99 per fight camp)
- **Full weight cut planner** (the killer feature)
  - Water loading protocol
  - Sodium manipulation protocol
  - Glycogen depletion protocol
  - Rehydration protocol
  - Daily checklist during fight week
- **Fight camp nutrition periodization** (10-week phased plan)
- **Tournament day fueling plan** (multi-match)
- **Weight cut dashboard** with safety monitoring
- **Energy Availability tracker** (RED-S prevention)
- **Travel protocol**
- **Coach mode** (view multiple athletes)

### Coach Dashboard ($29.99/month)
- View all athletes' nutrition data
- Override/customize macros per athlete
- Weight cut monitoring for team
- Alert system for athletes in danger zones
- Competition calendar with team-wide prep tracking
- Bulk meal plan templates

### One-Time Purchases
- **Custom Weight Cut Plan** ($14.99) — AI-generated plan based on athlete profile, fight date, weight class
- **Fight Camp Nutrition Blueprint** ($9.99) — full 8-10 week periodized plan exported as PDF
- **Supplement Stack Builder** ($4.99) — personalized supplement protocol with shopping list

---

## PART 10: IMPLEMENTATION PLAN — PRIORITIZED PHASES

### Phase 1: Foundation Fixes (Week 1-2) — HIGH IMPACT, LOW EFFORT

**Files to modify:**
- `src/lib/diet-coach.ts` — upgrade calorie formula, fix protein targets, fix fat floors
- `src/lib/contextual-nutrition.ts` — add missing training scenarios
- `src/lib/types.ts` — extend athlete profile type

**Changes:**
1. Add Cunningham equation (use when body fat % available, fall back to Mifflin-St Jeor)
2. Replace static `1.55` activity multiplier with dynamic calculation from logged sessions
3. Increase protein targets for aggressive cuts (2.8-3.1 g/kg range)
4. Raise male fat floor from 35g to `max(50, bodyWeightKg * 0.7)`
5. Replace absolute calorie floors with Energy Availability calculation
6. Add two-a-day, tournament day, and fight week to contextual multipliers
7. Extend `CombatAthleteNutritionProfile` type with weight class, walk-around weight, competition fields

### Phase 2: Weight Cut Engine (Week 3-5) — THE KILLER FEATURE

**New files:**
- `src/lib/weight-cut-engine.ts` — core algorithm
- `src/components/WeightCutDashboard.tsx` — dedicated UI

**Changes:**
1. Build `WeightCutEngine` with 4-phase protocol (chronic → acute → water cut → rehydration)
2. Implement water loading protocol function
3. Implement sodium manipulation protocol function
4. Implement carb depletion logic
5. Build refeed structure
6. Add safety triggers and red flags (resting HR, urine, confusion)
7. Build Weight Cut Dashboard component with timeline, checklist, safety panel, chart
8. Gate behind fight week check (must have competition event set)

### Phase 3: Performance Nutrition Layer (Week 5-7)

**Files to modify/create:**
- `src/lib/contextual-nutrition.ts` — major upgrade
- `src/lib/electrolyte-engine.ts` — new
- `src/lib/supplement-engine.ts` — new or expand from contextual-nutrition

**Changes:**
1. Intra-training fueling logic (duration + intensity based)
2. Electrolyte calculation engine (sweat rate estimation)
3. Collagen + vitamin C timing system
4. Sleep-support nutrition recommendations
5. Anti-inflammatory protocol
6. Travel protocol
7. Tiered supplement framework with dosing, timing, cycling, and anti-doping warnings

### Phase 4: Fight Camp Periodization (Week 7-9)

**New files:**
- `src/lib/fight-camp-engine.ts`
- `src/components/FightCampNutrition.tsx`

**Changes:**
1. Build periodized nutrition phases (off-season → base → intensification → peak → fight week → fight day)
2. Auto-transition between phases based on competition date
3. Tournament day fueling mode (multi-match protocol)
4. Post-competition recovery protocol
5. Connect to existing CompetitionPrep component

### Phase 5: Smart UX & Nudges (Week 9-11)

**Files to modify/create:**
- `src/lib/nudge-engine.ts` — new
- `src/components/PerformanceReadiness.tsx` — new
- Modify `HomeTab.tsx`, `NutritionTracker.tsx`

**Changes:**
1. Build nudge engine with trigger conditions
2. Performance readiness score (composite of nutrition, hydration, recovery, weight, EA)
3. Pre-training fuel reminders
4. Post-training recovery nudges
5. Weekend drift detection
6. Creatine pause reminder before weigh-in
7. Auto-adjustment after every weigh-in

### Phase 6: Monetization & Coach Mode (Week 11-13)

**Changes:**
1. Gate weight cut planner behind Elite tier
2. Gate fight camp nutrition behind Elite tier
3. Build coach dashboard API endpoints
4. Coach view: multi-athlete nutrition monitoring
5. Export features (PDF fight camp plan, supplement shopping list)
6. One-time purchase flows

---

## WHAT TO REMOVE

1. **BMI classification on the dashboard** — misleading for muscular athletes. Replace with body fat % prominently, BMI as secondary.
2. **"Aesthetic event" competition type** — this is a combat sports app, not a bodybuilding app. Keep focus. (Or hide it as a secondary option.)
3. **Generic rest day multiplier of 0.93×** — too aggressive for combat athletes who need recovery nutrition. Change to 0.95-1.0× depending on phase.

## WHAT TO AUTOMATE

1. **Macro adjustment after weigh-in** — currently requires manual weekly check-in. Should auto-trigger when weight is logged.
2. **Phase transitions** — currently manual. Should auto-detect based on competition date proximity.
3. **Training day detection** — already partially done. Extend to detect two-a-days and auto-adjust.
4. **Supplement cycling** — auto-remind to pause creatine before weigh-in, resume after.
5. **Rehydration protocol activation** — auto-trigger post weigh-in logging.

## SAFETY CONSIDERATIONS

1. **Energy Availability monitoring** — the single most important safety feature missing. EA < 30 kcal/kg FFM must trigger hard warnings.
2. **Age gating** — water manipulation protocols must be locked for users under 18.
3. **Eating disorder screening** — if user flags history, disable aggressive cut features and show resources.
4. **Amenorrhea detection** — if female user reports irregular/absent periods, flag RED-S and prevent further caloric restriction.
5. **Maximum water cut limits** — hard cap at 8% BW. System refuses to generate protocol beyond this.
6. **Rehydration time minimums** — if less than 6 hours between weigh-in and competition, warn that water cut is inadvisable.
7. **First-time cut safeguards** — if user has never completed a weight cut in the app, limit to 3% BW water manipulation and require a "trial run" before competition.

---

## FILE-LEVEL CHANGE MAP

| File | Action | Priority |
|---|---|---|
| `src/lib/diet-coach.ts` | MODIFY — Cunningham eq, dynamic TDEE, protein scaling, fat floors, EA | P0 |
| `src/lib/contextual-nutrition.ts` | MODIFY — add two-a-day, tournament, fight week, travel | P0 |
| `src/lib/types.ts` | MODIFY — extend CombatAthleteNutritionProfile | P0 |
| `src/lib/weight-cut-engine.ts` | CREATE — full weight cut algorithm | P0 |
| `src/components/WeightCutDashboard.tsx` | CREATE — weight cut UI | P1 |
| `src/lib/electrolyte-engine.ts` | CREATE — sweat rate + electrolyte calc | P1 |
| `src/lib/supplement-engine.ts` | CREATE — tiered supplement framework | P1 |
| `src/lib/fight-camp-engine.ts` | CREATE — periodized nutrition phases | P1 |
| `src/lib/nudge-engine.ts` | CREATE — smart nudge triggers | P2 |
| `src/components/PerformanceReadiness.tsx` | CREATE — readiness score UI | P2 |
| `src/components/FightCampNutrition.tsx` | CREATE — fight camp nutrition UI | P2 |
| `src/components/NutritionTracker.tsx` | MODIFY — integrate nudges, collagen timing, intra-training | P2 |
| `src/components/CompetitionPrep.tsx` | MODIFY — connect to weight cut engine | P1 |
| `src/components/BodyWeightTracker.tsx` | MODIFY — EA display, remove BMI prominence | P2 |
| `src/components/HomeTab.tsx` | MODIFY — readiness score, weight cut status | P2 |
| `src/components/DietCoach.tsx` | MODIFY — auto-adjustments, fight camp phases | P2 |
| `src/lib/store.ts` | MODIFY — new state for weight cut, supplements, nudges | P1 |
| `src/lib/monetization-engine.ts` | MODIFY — new premium features | P3 |
| `src/lib/subscription.ts` | MODIFY — Elite tier, coach mode | P3 |

---

*This audit was conducted against the full codebase as of 2026-02-11. Every recommendation is evidence-based and combat-sport-specific. The current system is a strong foundation — but the gap between "good fitness app" and "elite combat nutrition platform" is exactly what is described above.*
