# Current Tasks

## 1. Weekly Session Overflow — handle 9/8+ gracefully
**Status:** Planned

**Problem:** Counter shows 8/8 and "Week complete. Recovery earned." when the user exceeds planned sessions. No acknowledgment of the extra work. The bar caps at 100% and there's zero distinction between "hit target" and "crushed it."

**Root cause:**
- `WeeklyMomentum.tsx:131` — `Math.min(1, weekDone / weekTarget)` caps bar at 100%
- `WeeklyMomentum.tsx:110` — headline hardcoded: "Week complete. Recovery earned." for ANY pct >= 1
- The counter `{weekDone}/{weekTarget}` does show raw numbers (should display 9/8), but today's grappling dot may be hollow if session isn't reflected yet

**Plan:**
- [ ] Overflow headline: "Going beyond. {n} bonus session{s}." or "Extra credit earned."
- [ ] Overflow visual: subtle glow/pulse on progress bar when weekDone > weekTarget
- [ ] Show overflow fraction clearly: "9/8" with a small +1 badge
- [ ] Ensure weekly dot updates immediately when a session is logged for today

---

## 2. Wearable Tools — bring back to Explore tab
**Status:** Planned

**Problem:** Wearable was removed during Explore Tab redesign (Phase 1) as "one-time setup → belongs in Profile/Settings." This was wrong — it's NOT just setup. After connecting Whoop, users need ongoing access to: sync data, view strain/HR/recovery trends, review auto-imported sessions, check sync status. Currently there is NO way to access WearableIntegration after the initial "Connect" CTA disappears.

**Plan:**
- [ ] Add "Wearable" tool to Explore tab Body category (id: 'wearable')
- [ ] Place between Recovery Hub and HR Zones
- [ ] Make it pinnable to Quick Access dock
- [ ] Keywords: whoop wearable heart rate sync strain recovery hrv connect watch
- [ ] Desc: "Whoop sync, strain & HR data"

---

## Completed
- [x] RPE formula rewrite (multi-signal composite replacing naive strain/2.1)
- [x] Stale Whoop data update on re-sync
- [x] Stale pin IDs cleanup
- [x] AI builder in BlockQueue New Block flow
- [x] Explorer Tab Redesign (4 categories, 22 tools)
- [x] XP curve rebalanced
