# Auth & Onboarding UX Audit — Roots Gains

## Executive Summary

The current auth system works and is reasonably secure, but creates unnecessary friction that kills conversions. The onboarding wizard is comprehensive but frontloads too much before the user gets any value. The core problem: **you ask for too much before giving anything back**.

This audit covers every screen from first visit through first workout, identifies 37 specific issues, and proposes a phased master plan.

---

## Current User Journey (As-Is)

```
Landing on / → LoadingScreen → Onboarding Step 1 (Disclaimer)
→ Step 2 (Identity + Goals + Name + Age + Weight + Sex + Experience + Program Style)
→ Step 3 (Sessions/week + Calendar picker + Combat schedule)
→ Step 4 (Baseline lifts)
→ Step 5 (Summary)
→ Dashboard (guest mode, no account)
```

Auth is optional and separate — users can sign up later from Profile Settings for cloud sync. Login/Register are standard separate pages at `/login` and `/register`.

**Total fields before first value delivered: ~15+ inputs across 5 steps.**

---

## Part 1: Authentication Audit

### 1.1 What Exists

| Page | Path | Method |
|------|------|--------|
| Login | `/login` | Email/password + Google OAuth |
| Register | `/register` | Name + email + password + confirm + Google |
| Reset Password | `/reset-password` | Email → token → new password |
| Sign Out | ProfileSettings button | `signOut({ callbackUrl: '/' })` |

Backend: NextAuth v5 with JWT (30-day), Credentials + Google providers, Vercel Postgres.

### 1.2 Bugs Found

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| B1 | **High** | Password reset accepts 6-char passwords but registration requires 8 | `src/app/api/auth/reset-password/route.ts:117` vs `register/route.ts:25` |
| B2 | **Medium** | "Keep me signed in" checkbox does nothing — JWT is always 30 days regardless | `src/app/login/page.tsx:24,133-140` |
| B3 | **Low** | Google sign-in button has no loading state (email button does) | `src/app/login/page.tsx:170-182` |

### 1.3 UX Issues — Login Page

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| L1 | Generic "Invalid email or password" error | User doesn't know if they need to register or just mistyped | Show "No account with this email — create one?" when email not found (yes, minor info leak, but the register page already confirms email existence via 409) |
| L2 | No link to reset password on login failure | User fails login → has to scan the page for "Forgot password?" | After failed attempt, surface "Forgot your password? Reset it" inline in the error |
| L3 | No Google button loading feedback | User clicks Google, nothing visible happens for 1-2s | Add spinner or "Redirecting to Google..." state |
| L4 | Non-functional "Keep me signed in" | Creates false expectations | Remove checkbox entirely, or implement it by varying JWT maxAge |
| L5 | No keyboard optimization | Mobile users must tap between fields manually | Add `autoComplete`, `inputMode="email"`, proper `enterKeyHint` attributes |

### 1.4 UX Issues — Register Page

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| R1 | 4 fields before the CTA | High friction — most fitness apps ask 1-2 fields max to sign up | See master plan: defer registration entirely until after onboarding |
| R2 | Duplicate email returns generic "Registration failed" | User doesn't know they already have an account | Catch 409 specifically: "An account with this email exists — sign in instead?" with link |
| R3 | No password strength indicator | User picks weak passwords or over-guesses requirements | Add inline strength meter (weak/fair/strong) |
| R4 | Confirm password field is redundant friction | Modern UX trend: single password + show/hide toggle is sufficient | Remove confirm field; keep show/hide toggle as the safety net |
| R5 | Google signup buried below the form | Google is fastest path — should be primary | Move Google button above the email form |

### 1.5 UX Issues — Password Reset

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| P1 | No feedback if email service isn't configured | User waits for email that never comes | Log warning server-side + show "If you don't receive an email within 5 minutes, try again" |
| P2 | Expired token shows generic error | User doesn't know why it failed | Show "This link has expired. Request a new one." with button |
| P3 | No resend option | User must restart the flow | Add "Didn't get the email? Send again" button with rate-limit indicator |

### 1.6 Security Issues

| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| S1 | **High** | No email verification | Users can register with any string. Add email verification flow (can be deferred — let them use the app, but nag to verify before enabling sync) |
| S2 | **High** | No account lockout | Unlimited login attempts per account. Add exponential backoff after 5 failures (lock 1min, 5min, 15min) |
| S3 | **Medium** | Rate limiting is in-memory only | Resets on deploy/restart, not shared across serverless instances. Move to Redis/Upstash or Vercel KV |
| S4 | **Medium** | No foreign key constraints in DB | `password_reset_tokens.user_id` doesn't reference `auth_users.id`. Add FK + CASCADE |
| S5 | **Low** | No cleanup of expired reset tokens | Tokens accumulate forever. Add a cron or cleanup-on-read |
| S6 | **Low** | No sign-out confirmation | Single click signs out permanently. Add "Are you sure?" modal |

---

## Part 2: Onboarding Audit

### 2.1 Current 5-Step Flow

**Step 1 — Disclaimer:**
- Accept terms checkbox
- PWA install guide (mobile browsers)
- Parental consent for ages 14-15

**Step 2 — Identity & Profile (THE MEGA-STEP):**
- Training identity (Combat / Recreational / General)
- Combat sport sub-selection (if combat)
- Goal focus (4 context-aware options)
- Name (min 2 chars)
- Age (14-100)
- Body weight (kg/lbs toggle)
- Biological sex
- Experience level
- Program style (Linear / Undulating / Block)

**Step 3 — Schedule:**
- Sessions per week (1-6)
- Weekly calendar day picker
- Per-day combat session scheduling (time of day)
- Validation: selected days >= sessions/week

**Step 4 — Baseline Lifts (Optional):**
- Squat, Bench, Deadlift, OHP, Barbell Row
- "Skip — auto-estimate" option
- Pre-calculated defaults from body weight

**Step 5 — Summary:**
- Program overview card
- Feature highlights
- "Start Training" CTA

### 2.2 Onboarding UX Issues

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| O1 | **Step 2 is a wall of inputs** | 9+ fields in one step. Users bail when they see this much upfront | Split into multiple focused micro-steps (identity → goals → basic stats → program style) |
| O2 | **Disclaimer as Step 1 is a cold start** | First thing user sees is legal text. Kills excitement | Move disclaimer to end of step 2 or make it a bottom-sheet overlay |
| O3 | **No value preview before commitment** | User doesn't know what they're getting before answering 15 questions | Show a preview/demo of the generated program before asking for all details |
| O4 | **Combat sport multi-select but only first is used** | `combatSports[]` collected but `combatSport` (singular) drives logic | Either make it single-select or actually use all selections |
| O5 | **Program style requires knowledge users don't have** | "Linear vs Undulating vs Block" — beginners don't know what these mean | Either auto-select based on experience (already partially done) or remove from onboarding, let the system decide |
| O6 | **Calendar picker is complex for step 3** | Day picker with per-day combat scheduling is powerful but overwhelming | Simplify to "which days do you train?" + auto-suggest. Move granular scheduling to settings |
| O7 | **No progress persistence across sessions** | If user closes app mid-onboarding, they restart from step 1 | `onboardingData` is persisted in Zustand/localStorage but `currentStep` is local state — persist the step too |
| O8 | **NewUserGuide exists but isn't auto-triggered** | 8-step tutorial at `NewUserGuide.tsx` is never shown automatically | Auto-show after first workout completion, or offer it on the dashboard |
| O9 | **No "why do you need this" context** | Users wonder why you need their sex, age, body weight | Add brief helper text: "Used to calculate your starting weights" |
| O10 | **Baseline lifts step feels redundant** | Most beginners don't know their maxes, and the skip button makes it feel pointless | Merge into onboarding as a "do you know these?" optional section, not a full step |
| O11 | **Summary step (5) adds no value** | Users just want to start. The summary is a speed bump | Remove as a step — show the summary as a toast/card after they land on the dashboard |

### 2.3 Post-Onboarding Issues

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| PO1 | **No guided first action** | User lands on dashboard and has to figure out what to do | Auto-highlight "Start Today's Workout" with a pulsing CTA or coach mark |
| PO2 | **PWA install banner competes for attention** | Right after onboarding, install + notification banners stack | Delay install banner to after first workout completion |
| PO3 | **Notification permission asked too early** | 5 seconds after onboarding = user hasn't gotten value yet | Ask after 3rd workout or 1 week of use |
| PO4 | **No sign-up prompt at the right moment** | Auth is optional but cloud sync is valuable. No nudge at peak moments | Prompt to create account after first workout completion ("Save your progress to the cloud") |
| PO5 | **Feature gates (Pro) hit immediately** | User explores app, taps something, gets paywall. Feels like bait | Give 7-day full-access trial, or at least let them see the feature before gating |

---

## Part 3: Master Plan

### Philosophy

1. **Value before commitment** — Let users experience the app before asking for anything
2. **Progressive disclosure** — Collect information when it's needed, not all upfront
3. **One thing at a time** — Never show more than 3 inputs on a single screen
4. **Social proof the fast path** — Make Google OAuth the primary, visible path
5. **Smart defaults over questions** — If you can infer it, don't ask it

---

### Phase 1: Quick Wins (Bug Fixes & Low-Effort UX)

These can ship immediately with minimal risk.

**1a. Fix password validation inconsistency**
- File: `src/app/api/auth/reset-password/route.ts:117`
- Change minimum from 6 to 8 to match registration

**1b. Remove "Keep me signed in" checkbox**
- File: `src/app/login/page.tsx`
- It does nothing — remove it to reduce visual clutter

**1c. Better error messages on login**
- File: `src/app/login/page.tsx`
- On failed login, show: "Wrong password? [Reset it](/reset-password)"
- When the credentials provider returns null because no password_hash exists (Google account), show: "This account uses Google sign-in"

**1d. Better error on duplicate registration**
- File: `src/app/register/page.tsx`
- Catch 409: "This email already has an account. [Sign in instead](/login)"

**1e. Add loading state to Google buttons**
- Files: `login/page.tsx`, `register/page.tsx`
- Track google loading state separately, show spinner on click

**1f. Persist onboarding step in Zustand**
- File: `src/components/Onboarding.tsx`
- Change `const [currentStep, setCurrentStep] = useState(1)` to use `onboardingData.step` from the store
- Users who close mid-onboarding return to where they left off

**1g. Add sign-out confirmation**
- File: `src/components/ProfileSettings.tsx`
- Simple confirm dialog before calling `signOut()`

---

### Phase 2: Streamline Onboarding (Medium Effort)

Restructure the 5 steps into a faster, cleaner flow.

**New flow: 4 focused micro-steps**

```
Step 1: "What brings you here?"
  → Training identity cards (Combat / Lifting / General Fitness) — BIG tappable cards
  → If combat: sport sub-selection (single select, not multi)
  → Goal selection (context-aware, same as today)
  [1 screen, 2-3 taps total]

Step 2: "Quick stats"
  → Name
  → Body weight (with unit toggle)
  → Experience level (Beginner / Intermediate / Advanced)
  → Biological sex (for strength calculations)
  [1 screen, 4 fields — all above the fold]

Step 3: "When do you train?"
  → Sessions per week (simple number selector)
  → Quick day picker (tap the days, no per-day drilling)
  [1 screen, 2 interactions]

Step 4: "You're ready"
  → Show generated program preview (sessions/week, split type, first workout peek)
  → Disclaimer acceptance as inline checkbox (not a full step)
  → "Start Training" CTA
  [1 screen, 1 tap to go]
```

**What gets removed/deferred:**
- **Disclaimer as step 1** → Inline checkbox on final step
- **Age field** → Deferred to Profile Settings (only needed for parental consent edge case — add age gate only if detected as minor via device/OS signals, or ask later)
- **Program style selection** → Auto-selected based on experience level (already has this logic). Power users can change in Settings
- **Baseline lifts step** → Removed from onboarding. Auto-estimated from body weight. Users can enter real numbers from the workout screen after their first session
- **Summary step** → The "You're ready" step IS the summary
- **Per-day combat scheduling** → Deferred to Settings. Onboarding just collects which days
- **PWA install guide on step 1** → Moved to after first workout

**Net result: 4 steps, ~8 inputs, ~30 seconds to complete vs current ~15+ inputs across 5 steps.**

---

### Phase 3: Auth Flow Redesign (Medium-High Effort)

**Principle: Auth should happen AFTER the user has gotten value, not before.**

**New auth strategy:**

```
1. User arrives → Onboarding (no auth required, same as today)
2. User completes onboarding → Dashboard (guest mode)
3. User completes first workout → Celebration screen
4. After celebration: "Save your progress?"
   → "Continue with Google" (primary, one tap)
   → "Use email instead" (secondary, expands form)
   → "Maybe later" (dismissible, but will remind again)
5. Remind again after 3rd workout if still guest
6. Remind on any "Pro" feature tap
```

**Registration form simplification:**
- Remove confirm password field (keep show/hide toggle)
- Move Google OAuth button ABOVE the email form on both login and register
- Add "Continue as guest" escape hatch on auth pages (redirect to `/`)
- Auto-merge: if user onboards as guest then signs up, link the localStorage data to their new account (this already works via `authUserId` in `completeOnboarding`)

**Login page improvements:**
- Distinguish "no account" from "wrong password" in error messages
- Auto-suggest password reset after 2 failed attempts
- Add `autoComplete="email"` and `autoComplete="current-password"` for browser autofill
- Add `enterKeyHint="next"` / `"done"` for mobile keyboards

---

### Phase 4: Post-Onboarding Experience (Medium Effort)

**4a. Guided first workout**
- After onboarding, auto-navigate to Home tab
- Pulse/highlight "Start Today's Workout" button
- Show a coach mark: "Your first session is ready. Tap to begin."
- First workout should have inline hints (what is RPE? what does this button do?)

**4b. Smart notification timing**
- Remove the 5-second post-onboarding notification prompt
- Instead, ask after 3rd workout: "Want reminders on your training days?"
- If user says yes, schedule notifications only on their selected training days

**4c. Auto-trigger NewUserGuide**
- After first workout completion, offer: "Want a quick tour of all features?"
- If dismissed, add "App Tour" button to Settings

**4d. Progressive feature unlock messaging**
- Instead of hard paywall on first tap, show a preview
- "AI Coach analyzes your last 4 weeks of training. [Try free for 7 days]"
- Gate after preview, not before

---

### Phase 5: Advanced Auth Features (Higher Effort, Future)

These are nice-to-haves for a mature product:

| Feature | Priority | Notes |
|---------|----------|-------|
| Email verification | High | Nag to verify, don't block usage. Required before cloud sync |
| Account lockout | High | Exponential backoff after 5 failed login attempts |
| Magic link login | Medium | "Email me a sign-in link" — no password needed |
| Apple Sign In | Medium | Required for iOS App Store if you have social login |
| Session management | Low | "View active sessions" in settings |
| 2FA/TOTP | Low | For power users who want extra security |
| Passkeys/WebAuthn | Low | Passwordless future, but ecosystem still maturing |
| Account deletion | Medium | GDPR compliance, self-service in Settings |

---

## Priority Matrix

```
                    HIGH IMPACT
                        |
     Phase 1 (fixes)    |    Phase 3 (auth redesign)
     Phase 2 (onboarding)|
                        |
  LOW EFFORT -----------+------------ HIGH EFFORT
                        |
                        |    Phase 5 (advanced auth)
     Phase 4 (post-     |
     onboarding)        |
                        |
                    LOW IMPACT
```

**Recommended execution order:**
1. Phase 1 — Ship today. Bug fixes and quick wins
2. Phase 2 — Next sprint. Biggest UX improvement for effort spent
3. Phase 3 — Following sprint. Moves auth to the right moment
4. Phase 4 — Parallel with Phase 3. Polish the post-signup experience
5. Phase 5 — Backlog. Pick based on user feedback and growth needs

---

## Key Files Reference

| File | Lines | Role |
|------|-------|------|
| `src/app/login/page.tsx` | 195 | Login form |
| `src/app/register/page.tsx` | 215 | Registration form |
| `src/app/reset-password/page.tsx` | 279 | Password reset flow |
| `src/app/page.tsx` | 446 | Root page — loading, onboarding gate, PWA banners |
| `src/components/Onboarding.tsx` | 1,370 | 5-step onboarding wizard |
| `src/components/NewUserGuide.tsx` | 273 | 8-step tutorial (currently not auto-shown) |
| `src/components/ProfileSettings.tsx` | 731 | Settings + sign out |
| `src/components/Dashboard.tsx` | 250+ | Main app shell + tab navigation |
| `src/components/HomeTab.tsx` | 600+ | Home tab with workout CTA |
| `src/lib/auth.ts` | 114 | NextAuth config (Credentials + Google) |
| `src/lib/auth.config.ts` | 79 | Edge-safe auth config (middleware) |
| `src/app/api/auth/register/route.ts` | 56 | Registration API |
| `src/app/api/auth/reset-password/route.ts` | 150 | Password reset API |
| `src/lib/rate-limit.ts` | 68 | In-memory rate limiting |
| `src/lib/db-init.ts` | 39 | DB table creation |
| `src/middleware.ts` | 15 | Route protection |
