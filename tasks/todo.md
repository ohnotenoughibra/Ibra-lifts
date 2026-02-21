# Current Tasks

- [ ] Explore section: Add combat-identity tools (Technique Journal, Sparring Rounds, Competition Log)
- [ ] Explore section: Add medium-impact tools (Game Plan, Conditioning, Belt/Rank Progress)
- [ ] Explore section: Contextual surfacing ("Suggested for you" row based on user state)

---

## First-Principles Analysis: Explore Section + Suggested Tools

### The Core Question

The app claims to be **combat-sport-focused**. The Explore tab has 26 tools — but only 3 serve the combat identity directly (Grappling, Fight Prep, Mobility). The rest are generic strength training tools that any fitness app has.

**From first principles: what does a combat athlete actually need that's missing?**

### Structural Issues with Explore

**1. Categories don't match athlete mental models**
- "Build" / "Track" / "Analyze" / "Body" are software engineer categories
- An athlete thinks: "I need to prepare for my comp" → Fight Prep is under Track, Periodization under Build, Training Load under Analyze, Recovery under Body. Same user journey, 4 categories.
- Better framing: organize by athlete workflow (Train → Track → Compete → Recover)

**2. 21/26 tools are PRO-gated**
- Free tier: Workout Builder, 1RM Calculator, Progression — barely functional
- Consider: unlock 1-2 combat tools (Grappling tracker?) as free to hook the target audience

**3. No contextual surfacing**
- Explore shows the same static grid regardless of context
- If you have a competition in 4 weeks, Fight Prep should be promoted
- If you just trained hard, Recovery Hub should surface

**4. The `Activity` icon is reused 3 times** (HR Zones, Volume Map, Cycle Tracking)

### Suggested New Tools (Ranked by Impact)

#### HIGH IMPACT — fills clear gaps in the combat identity

| Tool | ID | Category | Tagline | Why |
|------|-----|----------|---------|-----|
| **Technique Journal** | `technique_journal` | Track | Log drills & concepts | #1 missing feature. Every BJJ/MMA athlete keeps a training journal. App tracks sessions but not WHAT you practiced |
| **Sparring Rounds** | `sparring_rounds` | Track | Track rounds & outcomes | Sparring IS the sport. Reveals patterns — who taps you, weak positions, finish rate |
| **Competition Log** | `competition_log` | Track | Win/loss record & results | Fight Prep helps you prepare but there's nowhere to log RESULTS |

#### MEDIUM IMPACT — serious athletes will use these

| Tool | ID | Category | Tagline | Why |
|------|-----|----------|---------|-----|
| **Game Plan** | `game_plan` | Build | Competition strategy | Athletes build game plans by scenario (standing/guard/top/back) before tournaments |
| **Conditioning** | `conditioning` | Track | Cardio & interval protocols | Combat athletes do significant cardio separate from lifting. Currently tracked as generic "training sessions" |
| **Belt/Rank Progress** | `rank_progress` | Body | Track promotions & milestones | Belt promotions are huge emotional milestones. Creates long-term retention hook |

### App-Wide First-Principles Observations

**What the app gets right:**
- Single adaptive card on Home that changes based on day type
- Readiness ring as the single health metric
- Gamification (streaks, grades, badges)
- Progressive overload teaser on lift days

**What needed care (fixed in this PR):**
1. Light mode — 126+ CSS classes had no override. Dark gradient endpoints stayed dark on white backgrounds.
2. Session cards — info shown 3-4x (headline + session card + stats + actions). Single sessions now flattened.
3. Intensity labels showed raw enums (HARD_SPARRING). Now humanized.
4. Redundant "Next lift" shown in 3 places. Deduplicated.

**Remaining gaps:**
- The "combat" identity is skin-deep — tool library is 90% powerlifting/bodybuilding
- Explore → Progress disconnect — no combat-specific analytics (sparring win rate, technique frequency, competitive record trend)

---

## Completed
- [x] Profile Tab Redesign v2.2.0 — ground-up rewrite with SVG level ring, achievement shelf, strength profile bars, inline editing, collapsible settings, buried danger zone
- [x] Weekly session overflow UX (headline, glow bar, +N badge when exceeding target)
- [x] Wearable tool added back to Explore tab Body category (pinnable, searchable)
- [x] RPE formula rewrite (multi-signal composite replacing naive strain/2.1)
- [x] Stale Whoop data update on re-sync
- [x] Stale pin IDs cleanup
- [x] AI builder in BlockQueue New Block flow
- [x] Explorer Tab Redesign (4 categories, 22 tools)
- [x] XP curve rebalanced
- [x] Session card redesign — light mode fixes, combat card flatten, deduplication, humanized labels
