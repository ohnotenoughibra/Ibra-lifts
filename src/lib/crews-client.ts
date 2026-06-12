import { localMondayKey, parseLocalDate } from './utils';
import type { WorkoutLog, TrainingSession, GamificationStats, UserProfile } from './types';

// ── Types returned by GET /api/crews ─────────────────────────────────────────
export interface CrewMember {
  displayName: string;
  sessionsThisWeek: number;
  currentStreak: number;
  totalPoints: number;
  isYou: boolean;
  stale: boolean;
  rank: number;
}
export interface Crew {
  id: string;
  name: string;
  joinCode: string;
  isOwner: boolean;
  memberCount: number;
  members: CrewMember[];
}

export interface CrewMetrics {
  displayName: string;
  weekKey: string;
  sessionsThisWeek: number;
  currentStreak: number;
  totalPoints: number;
}

// Local flag so useDbSync / app load only pushes metrics for users who are
// actually in a crew (avoids a request-per-sync for everyone else).
const ACTIVE_KEY = 'crews_active';
export function setCrewsActive(active: boolean) {
  try { active ? localStorage.setItem(ACTIVE_KEY, '1') : localStorage.removeItem(ACTIVE_KEY); } catch { /* ignore */ }
}
export function getCrewsActive(): boolean {
  try { return localStorage.getItem(ACTIVE_KEY) === '1'; } catch { return false; }
}

// Derive this week's consistency from the store. sessionsThisWeek = lifting
// workouts + combat/cardio training sessions completed since local Monday.
export function computeCrewMetrics(input: {
  user: UserProfile | null;
  workoutLogs: WorkoutLog[];
  trainingSessions: TrainingSession[];
  gamificationStats: GamificationStats;
}): CrewMetrics {
  const weekKey = localMondayKey(new Date());
  const monday = parseLocalDate(weekKey);
  const inWeek = (d: Date | string) => {
    const t = new Date(d);
    return !isNaN(t.getTime()) && t >= monday;
  };
  const liftCount = (input.workoutLogs ?? []).filter(w => !w._deleted && inWeek(w.date)).length;
  const sessionCount = (input.trainingSessions ?? []).filter(s => !s._deleted && inWeek(s.date)).length;
  return {
    displayName: (input.user?.name || 'Athlete').slice(0, 40),
    weekKey,
    sessionsThisWeek: liftCount + sessionCount,
    currentStreak: input.gamificationStats?.currentStreak ?? 0,
    totalPoints: input.gamificationStats?.totalPoints ?? 0,
  };
}

// ── API helpers ──────────────────────────────────────────────────────────────
async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Request failed');
  return data;
}

export async function fetchCrews(): Promise<Crew[]> {
  const res = await fetch(`/api/crews?weekKey=${encodeURIComponent(localMondayKey(new Date()))}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to load crews');
  return data?.data?.crews ?? [];
}

export async function createCrew(name: string, displayName: string) {
  const data = await postJson('/api/crews', { name, displayName });
  setCrewsActive(true);
  return data.data as { id: string; name: string; joinCode: string };
}

export async function joinCrew(joinCode: string, displayName: string) {
  const data = await postJson('/api/crews/join', { joinCode, displayName });
  setCrewsActive(true);
  return data.data as { id: string; name: string; joinCode: string };
}

export async function leaveCrew(crewId: string) {
  return postJson('/api/crews/leave', { crewId });
}

export async function deleteCrew(crewId: string) {
  const res = await fetch(`/api/crews/${crewId}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to delete crew');
  return data;
}

// Fire-and-forget: push the caller's weekly metrics to every crew they're in.
export async function pushCrewMetrics(metrics: CrewMetrics): Promise<void> {
  try { await postJson('/api/crews/metrics', metrics); } catch { /* best-effort */ }
}
