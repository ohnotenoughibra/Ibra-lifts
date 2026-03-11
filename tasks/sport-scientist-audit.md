# Sport Scientist Feedback Audit

**Date**: 2026-03-11
**Source**: External sport scientist review

## Validated Strengths

1. **Workout execution UI** — Tempo/weight/RPE tracking is best-in-class
2. **Science Hub** — Evidence-based articles, well-curated
3. **Exercise search by muscle group** — Works well
4. **Performance tips** — Good engagement, credible content
5. **Superset engine exists** — `src/lib/superset-engine.ts` is built but not discoverable in UI

## Valid Criticisms

### P0 — Fix Now
- [ ] **Template quality**: PPL, Upper/Lower, Full Body 3x templates don't match their labels. Wrong exercises, too few sets, weird rest periods (3:32, 4:43). Destroys trust with knowledgeable users
- [ ] **Add strength endurance workout type**: Current types are `strength | hypertrophy | power`. Missing strength endurance — critical for combat athletes doing 3-5 min rounds

### P1 — Next Sprint
- [ ] **Surface superset UI**: Engine exists but scientist couldn't find it. Discoverability problem
- [ ] **Custom exercise name input**: No free-text option in WorkoutBuilder. "Razor curl" not in DB = dead end
- [ ] **Weekly calendar view on Home**: Smart scheduler exists (`smart-schedule.ts`) but no weekly day-level UI
- [ ] **Program template preview**: Can't view day-by-day content before committing to a mesocycle

### P2 — Polish
- [ ] **Clarify "Recreational Lifter" vs "General Fitness"**: Distinction too subtle in onboarding
- [ ] **Training day selection in onboarding**: Can't designate lifting vs combat days during setup
- [ ] **Round rest periods**: Auto-generated values like 3:32, 4:43 look unpolished. Round to clean numbers
- [ ] **"+" button tooltip**: First-time user guidance missing
- [ ] **"Change Workout" CTA on Program page**: No obvious path to Explore page from current program

### P3 — Future
- [ ] **Polar & Garmin integration**: Only Whoop exists. Polar/Garmin dominant in combat sports
- [ ] **Endurance & flexibility modules**: App is strength-only. No conditioning, cardio, or mobility

## Key Insight

The science foundation is strong. Templates are the public face of programming knowledge — if they're wrong, nothing else matters. Fix templates first, then surface hidden features (supersets, smart scheduling).
