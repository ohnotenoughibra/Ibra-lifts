# Audit + Refactor: Today / Body / Settings tabs (2026-06-11)

First-principles audit of the three core surfaces. Shared disease: **everything fires at once, nothing was cut, dead code ships to the phone.** Fix = subtraction, then re-hierarchy.

Branch: `refactor/today-body-tabs`.

## TODAY tab (`HomeTab.tsx`, ~2,900 lines)
One job: *go-hard / go-light / rest + one tap to start the right session.* Verdict + action above the fold; everything else one tap away.
- Readiness renders up to 4× on one screen; protein 3×.
- 3 advice engines (daily-directive / one-thing / weekly-synthesis) contradict → reconciliation layers (`reconciledInsights`, `effectiveDeloadUrgency`) exist to patch the conflict.
- START buried at element #8; dock (most useful) is last. Reach inverted.
- Dead imports: WeeklyMomentum, StatusBar, WeeklyCalendar, DashboardInsights, InsightCard; dead local `AdaptiveRecoveryCard`; dead `showInsights`/`showMore`; `needsProgressRepair=false` banner.

## BODY tab (`ProgressTab.tsx` ~2,116 lines + ExploreTab body grid)
"Body" is a junk drawer: internal sections are literally "Strength / Body / History" — analytics misfiled under a body label.
- ~1,000 lines dead: 8 unrendered cards (PerformanceScore, PRTimelineCard, VolumeDashboard, SyntheticRecoveryCard, PlateauAnalysisCard, CombatBenchmarksCard, TrainingTimeline, WeeklyChallengeCard), dead `ProgressCharts` import, `PERF_FACTOR_EXPLAINERS`, dead `view`/`setView`.
- PhotoProgress (~1,210) + GripStrength (~910) fully built, routed, but **no tile** — unreachable.
- Volume shown ~5 ways, e1RM ~4 ways. Two standalone modules (BodyWeightTracker, WorkoutHistory) inlined into one scroll.
- Direction: rename **Body → Progress**; trajectory story (vitals → narrative → strength → body+photos → streak → drill-downs); durability tiles as a visible grid.

## SETTINGS (`ProfileSettings.tsx` ~1,471 lines, overlay `profile_settings`)
Footguns + ~25% dead code.
- **P0 footgun:** Training Days/Week silently calls `generateNewMesocycle()` (~:822) — wipes the block from a preference toggle, no confirm.
- **P0 lie:** Google Fit (~:1023) + Apple Health (~:1056) "Connect" buttons flip a flag and show "Connected" with no OAuth/import. Whoop is real.
- **P0 unreachable:** `NotificationSettings.tsx` rendered nowhere — notification prefs unreachable app-wide.
- Dead: email-verification machinery (~:246-296, fires an API call on open), Strength Standards (~:549-616), `colorTheme`/`setColorTheme` (theme picker never wired), ~16 dead imports, duplicate Weight Unit (BODY :756 + TRAINING :922).
- Gamification (level/XP/streak/badges) is not settings → belongs in a profile/stats view.
- Danger Zone too quiet (70% red, benign pill) — most destructive = quietest.

---

## Execution waves (verify build+tests after each)

### Wave 1 — P0 (make it honest)
- [ ] ProgressTab: delete 8 dead cards + dead ProgressCharts import + PERF_FACTOR_EXPLAINERS + dead view/setView
- [ ] HomeTab: delete dead imports + AdaptiveRecoveryCard + dead state + repair banner
- [ ] Settings: delete dead code (email-verif, strength standards, theme-if-unwired, dead imports, dup weight unit)
- [ ] Settings P0: gate Days/Week regen behind confirm
- [ ] Settings P0: fix/remove Google Fit + Apple Health fake-connect
- [ ] Settings P0: mount NotificationSettings (reachable)
- [x] ProgressTab dead-code delete done (2116 → 1263 lines)
- [ ] ~~Body P0: surface PhotoProgress~~ — CUT per user ("dont do the body progress photo thing")
- [ ] Today P0: collapse readiness to one place; START above the fold

### Wave 2 — P1 (re-hierarchy)
- [ ] Today: feed pile → one ranked context line; one advice engine; dock up + nutrition merged; coaching drawer
- [ ] Body: rename → Progress; History + BodyWeightTracker tap-to-open; merge vitals rows; tiles grid visible
- [ ] Settings: loud type-to-confirm Danger Zone; subscription block; gamification → profile header

### Wave 3 — P2 (consolidate)
- [ ] Body: consolidate 4 overlapping recharts modules → 1-2
- [ ] Reconcile to one canonical readiness across Today/Body
- [ ] Shared `<ProfileFields/>` for Onboarding + Settings; wire-or-delete theme
- [ ] Trim orphaned useMemos on hot paths
