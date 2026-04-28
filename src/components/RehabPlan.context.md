# RehabPlan.tsx — Structural Map

~900 lines. 5-phase rehab UI built on `rehab-engine.ts`. Don't read entire file — use this map.

## Section Index

| Section | Lines | What's There |
|---------|-------|-------------|
| Imports + types | 1–82 | `RehabPlanProps`, `REGION_LABELS`, `PHASE_COLORS`, `View` union |
| Main component | 84–254 | `RehabPlan` — overlay shell, view switching, injury selection, store actions |
| Header | 256–289 | Sticky title bar with injury label + tissue + day count |
| Phase mapper | 277–289 | `mapPhase` — classification → 1-5 (mirrors engine's `mapClassificationToRehabPhase`) |
| StartScreen | 291–344 | Pre-rehab onboarding: shows injury info + "Start Rehab Plan" CTA |
| Stat / Bullet | 346–366 | Small reusable cells |
| PlanView | 368–447 | Phase headline, timeline (5 dots), healing progress bar |
| SessionView | 449–536 | Today's session: warm-up, exercises, cool-down, post-guidance, red flags |
| Section helper | 538–548 | Card wrapper used by SessionView |
| ExerciseCard | 550–621 | Single exercise display with cues + video link + complete-checkbox |
| CheckInView | 623–725 | Daily check-in form: 4 pain sliders, ROM, swelling, completed-flag, notes |
| Slider helper | 727–751 | 0-10 pain slider with color tier |
| AdvanceView | 753–861 | Phase advancement gate: shows met/unmet criteria, advance button, manual override |
| RTSTestsView | 863–end | Return-to-Sport functional tests (phase 5 only) |

## State Flow

```
RehabPlan
  ├─ view = 'plan' | 'session' | 'checkin' | 'advance' | 'rts-tests'
  ├─ selectedId (which active injury)
  └─ store: rehabStates[injuryId] = { startedAt, phaseOverride?, checkIns[] }

Plan tab        → reads getDailyRehabPlan()
Session tab     → reads generateRehabSession()
Check-In tab    → builds RehabCheckIn → addRehabCheckIn() → switch to Advance
Advance tab     → reads evaluatePhaseAdvancement() → advanceRehabPhase() or resolve injury
RTS Tests tab   → reads getReturnToSportTests() (only reachable from Advance in phase 5)
```

## Engine Touchpoints

All called from `rehab-engine.ts`:
- `classifyInjury(injury)` — derives current phase from injury date + tissue type
- `getInjuryTimeline(injury)` — days since, days remaining, % healed
- `generateRehabSession(injury, phase?)` — today's exercises with sets/reps/cues
- `getDailyRehabPlan(injury, state?)` — session + motivational framing
- `evaluatePhaseAdvancement(injury, state)` — pass/fail gate with met/unmet criteria
- `getPhasedTimeline(injury, state?)` — 5-phase timeline with status
- `getReturnToSportTests(region)` — phase 5 functional tests
- `buildCheckIn(input)` — adds id to a check-in submission

## Editing Notes

- New phase color scheme → update `PHASE_COLORS` (line 74)
- New tab → extend `View` union (line 82) + add a button in the tab strip (~line 156) + add `<motion.div key=...>` block in AnimatePresence
- New body region → update `REGION_LABELS` (line 63) AND `rehab-exercises.ts` library
- Pain slider tier colors → `Slider` helper line 727
