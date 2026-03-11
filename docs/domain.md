# Domain Model — Combat Sports Fitness

The business rules and domain knowledge that power this app. When modifying training logic, nutrition rules, or recovery systems — check here first. Most engines cite scientific papers inline; this document captures the conceptual model.

---

## Training Periodization

### Mesocycle
A **mesocycle** is a 4-6 week training block with a specific focus (strength, hypertrophy, or power). The app generates mesocycles based on user profile:

- **Goal focus**: Strength (3-5 reps, RPE 8-9.5), Hypertrophy (6-12 reps, RPE 7-9), Power (2-5 reps, RPE 6-8)
- **Undulating periodization**: Within a week, sessions alternate types (e.g., 3 days/week = strength → hypertrophy → power)
- **Progressive overload**: Volume increases week-over-week within the block, then deloads

### Volume Landmarks (per muscle group, weekly sets)
Based on Renaissance Periodization / scientific literature:

| Landmark | Meaning | Example (Chest) |
|----------|---------|-----------------|
| **MEV** | Minimum Effective Volume — below this, no gains | 8 sets |
| **MAV** | Maximum Adaptive Volume — sweet spot | 16 sets |
| **MRV** | Maximum Recoverable Volume — above this, overtraining | 22 sets |

The generator targets MAV and adjusts based on experience level, diet phase, and biological sex.

### Sex-Based Modifiers
Evidence-based differences (Hunter 2014, Ansdell et al. 2020):
- **Female athletes**: +15% volume tolerance, 25% shorter rest, +2 rep range shift for hypertrophy, less aggressive deloads, extra upper body volume
- **Male athletes**: Default prescriptions (most research was done on men)

### Diet Phase Modifiers
- **Cutting**: -20% volume, -0.5 RPE, +25% rest (recovery impaired in deficit)
- **Bulking**: +10% volume, +0.3 RPE, -10% rest (surplus supports more stress)
- **Maintain**: No modification

### Deload
A planned recovery period when fatigue accumulates beyond recovery capacity.

**Deload types** (matched to fatigue source):
- **Volume deload**: Drop 40-50% sets, keep weights (fatigue from volume)
- **Intensity deload**: Drop 15-20% weight, keep sets (joint fatigue, high RPE)
- **Frequency deload**: Drop 1-2 training days (life stress)
- **Active recovery**: Mobility + light movement only
- **Full rest**: No training (severe accumulated fatigue)

**Fatigue debt model** (Banister 1991): Tracks accumulated fatigue across training volume (40%), RPE trend (25%), recovery scores (20%), sleep quality (15%). When debt exceeds threshold → deload recommendation with urgency level.

### Auto-Regulation
Session-to-session adjustment based on real-time feedback:

- **RPE feedback**: If last session felt too easy/hard, next session adjusts weight/reps
- **Readiness score**: Pre-workout check-in (sleep, nutrition, stress, soreness, motivation) → 0-100 score → volume/intensity gates
- **Readiness throttle**: Score < 50 = 30% volume reduction. Score < 30 = critical warning
- **1RM tracking**: Estimated 1RM updated every workout from actual performance (not just tested maxes)
- **Personal baselines**: HRV and RHR baselines from 7-14 day rolling average (wearable data)

---

## Combat Sport Specifics

### Fight Camp
Triggered automatically when a competition is within **70 days**. Cascading effects:

- Nutrition phases shift (off-season → base camp → peak week → fight day → recovery)
- Training volume adjusts (can't be destroyed before competition)
- Deload scheduling aligns with competition date
- Supplement timing adjusts (creatine paused near weigh-in for water weight)

### Weight Cut Protocol
4-phase system for making weight safely (Reale et al. 2017, Barley et al. 2018):

| Phase | Timing | Method |
|-------|--------|--------|
| **Chronic Loss** | 10-4 weeks out | Caloric deficit for fat loss (0.7% BW/week) |
| **Acute Reduction** | 7-2 days out | Low-residue diet, glycogen depletion, water/sodium loading |
| **Water Cut** | 24-2 hrs before weigh-in | Controlled dehydration |
| **Rehydration** | Post weigh-in | Fluid + glycogen recovery |

**Safety limits**:
- Max 6% BW via water manipulation (3% for first-time cutters)
- Age gate: no water manipulation under 18
- Emergency HR threshold: 100 bpm resting → stop immediately
- RED-S detection: Energy Availability < 30 kcal/kg FFM → flag and prevent further restriction
- Max sauna: 60 min/day

**Water loading protocol** (7 days out):
- Days 7-5: 100 ml/kg (body upregulates excretion)
- Day 4: 80 ml/kg (taper begins, excretion still elevated)
- Day 3: 40 ml/kg (significant reduction)
- Day 2: 25 ml/kg (restriction)
- Day 1: 15 ml/kg (sips only)
- Day 0: nothing until after weigh-in

### Concurrent Training (Gym + Combat)
Manages the interference between strength training and sport practice:

- **ACWR** (Acute:Chronic Workload Ratio): Monitors training load spikes. Ratio > 1.5 = injury risk
- **Sport load scoring**: Rates combat sessions by type and intensity
- **Interference management**: If grappling the same day as lifting, volume is reduced and sets removed
- **Lifting slot recommendations**: When to lift relative to combat sessions

### Grappling-Specific
- Exercise cues optimized for grapplers (grip endurance, rotational strength, neck)
- Conditioning templates matched to sport demands (round-based intervals)
- Grip strength tracking module
- Sparring load tracking

### Combat Sport Exercise Selection Rationale
Exercise selection is informed by combat sports science research. Each category addresses a specific demand of combat athletics:

**Neck Training**
- Collins et al. 2014: Each 1 lb increase in neck strength reduces concussion risk by 5%
- Neck exercises are essential for all combat athletes to reduce head trauma risk during strikes, takedowns, and scrambles

**Grip & Forearm Training**
- Grappling demands sustained grip endurance for collar ties, wrist control, and submission attempts
- Key exercises: farmer carries, dead hangs, towel pull-ups
- Grip strength is tracked as a peripheral fatigue marker (see Recovery Model)

**Rotational Power**
- Striking power is generated through kinetic chain rotation (hips → core → shoulders)
- Key exercises: Pallof press (anti-rotation stability), medicine ball rotational throws (power output), cable woodchops (rotational strength through range)

**Hip Mobility**
- Guard passing, leg lock defense, and high kicks require exceptional hip mobility
- Key exercises: hip CARs, 90/90 stretches, deep squat holds

**Posterior Chain**
- Takedown power and sprawl defense require strong hip extension
- Key exercises: deadlift variations, hip thrusts, Nordic curls
- Nordic curls also reduce hamstring injury risk (Al Attar et al. 2017)

---

## Nutrition Model

### BMR Calculation
Two equations, used based on available data:

1. **Mifflin-St Jeor** (fallback): `10 × weight(kg) + 6.25 × height(cm) - 5 × age + sex_constant`
   - Used when body fat % is unknown
2. **Cunningham** (preferred): `500 + 22 × lean_body_mass(kg)`
   - More accurate for lean/muscular athletes (Cunningham 1991, Jagim 2018)

### TDEE (Total Daily Energy Expenditure)
Dynamic calculation from actual training data:
- Base: BMR × NEAT multiplier (occupation-based: sedentary 1.2 → very active 1.725)
- Training: MET values per session type (BJJ 9.0, boxing 9.0, wrestling 10.0, lifting 5.0-6.0)
- Intensity multiplier: light 0.7, moderate 1.0, hard sparring 1.3, comp prep 1.4

### Protein Scaling
Scales with deficit severity (Helms et al. 2014, Hector & Phillips 2018):
- Maintenance: 1.6-2.2 g/kg
- Mild deficit: 2.3-2.5 g/kg
- Moderate deficit: 2.5-2.8 g/kg
- Aggressive (fight camp): 2.8-3.1 g/kg

### Fat Floors
Minimum dietary fat to maintain hormonal function:
- Male: 0.7 g/kg (Volek et al. 2001: testosterone declines below this)
- Female: 0.8 g/kg (additional hormonal sensitivity)

### Energy Availability (RED-S)
`EA = (Energy Intake - Exercise Energy Expenditure) / Fat-Free Mass`

- **Optimal**: > 45 kcal/kg FFM
- **Reduced**: 30-45 kcal/kg FFM (performance decline)
- **Low**: < 30 kcal/kg FFM (RED-S threshold — health risk)
- **Critical**: < 20 kcal/kg FFM (medical intervention needed)

When EA drops below 30: app flags RED-S warning, prevents further caloric restriction, alerts about amenorrhea risk for female athletes.

### Diet Phases
- **Cut**: Caloric deficit for fat loss. Weekly rate: 0.7% BW/week optimal (Garthe et al. 2011)
- **Bulk**: Caloric surplus for muscle gain. +10% volume tolerance
- **Maintain**: Eucaloric. Baseline programming
- **Recomp**: Slight deficit with high protein. Most useful for beginners

---

## Recovery Model

### Readiness Score (0-100)
Multi-factor composite. Two systems:

1. **Simple readiness** (`auto-adjust.ts`): Pre-workout check-in → sleep quality/hours, nutrition, stress, soreness, motivation
2. **Full readiness** (`performance-engine.ts`): 20 factors including wearable data, training load, injury status, hydration, age. Gracefully degrades if data is missing (redistributes weights)

### Readiness Categories
- **Optimal** (80-100): Full send, PR attempts welcome
- **Ready** (60-79): Normal training
- **Moderate** (40-59): Reduce volume or intensity
- **Compromised** (20-39): Light work only, focus on technique
- **Rest recommended** (0-19): Skip training, prioritize recovery

### Wearable Integration (Whoop)
- **Recovery score**: Maps directly to readiness modification
- **HRV**: Compared against personal baseline (7-14 day rolling average)
- **RHR**: Elevated resting HR = accumulated fatigue signal
- **Strain**: Training load quantification
- **Sleep**: Duration and quality scoring

### Fatigue Tracking
- **Central fatigue**: Motivation decline, coordination issues, RPE inflation
- **Peripheral fatigue**: Muscle-specific soreness, grip strength decline, ROM restriction
- Tracked over time to detect overtraining patterns

---

## Exercise Classification

### Structure
Each exercise has:
- `id`, `name`, `category` (compound/isolation/bodyweight)
- `primaryMuscle`, `secondaryMuscles`
- `equipment` required
- `movementPattern` (push/pull/hinge/squat/carry)
- `difficulty` (beginner/intermediate/advanced)
- `cues` — coaching cues (grappler-optimized where relevant)
- `alternatives` — substitute exercises for equipment limitations

### Equipment Profiles
Pre-configured equipment sets:
- **Full Gym**: All equipment available
- **Home Gym**: User-customized equipment list
- **Minimal/Travel**: Bodyweight + dumbbells + bands
- **Outdoors**: No equipment

### Movement Patterns
Used for balanced programming and injury prevention:
- **Push** (horizontal + vertical)
- **Pull** (horizontal + vertical)
- **Hinge** (hip-dominant)
- **Squat** (knee-dominant)
- **Carry** (loaded carries, core)
- **Core** (rotation, anti-rotation, flexion)

### Gamification
- **52 badges** across 5 categories (strength, endurance, consistency, recovery, combat)
- **XP/Level system**: Points for completing workouts, logging meals, tracking recovery
- **Streaks**: Consecutive days with activity (lifting + sport + mobility all count)
- **Streak shield**: 1 miss forgiven, refills weekly
- **Wellness multiplier**: 1.0-1.5x XP based on domains tracked (sleep, nutrition, etc.)
- **Weekly challenges**: Reset Sundays, tier-specific difficulty
- **Variable-ratio rewards**: Engagement engine uses behavioral psychology for retention
