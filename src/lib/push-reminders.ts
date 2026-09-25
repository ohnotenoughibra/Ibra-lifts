/**
 * push-reminders — which reminders are due for one athlete right now.
 *
 * Pure: takes the synced store snapshot (the JSON in user_store.data) and the
 * current time, returns the notifications to send. The cron route does the
 * I/O. Everything is in the athlete's own time zone (saved by the app as
 * notificationPreferences.timeZone); without it we fall back to UTC.
 *
 *   training   — a lift day, nothing logged yet, at/after the reminder time
 *   streak     — streak ≥ 3, nothing logged today, from 19:00
 *   fight week — a competition 7 days out (once)
 *
 * Quiet hours: nothing before 07:00 or from 22:00. `sent` (tag → local date
 * it was last sent) makes every reminder at most once a day, so a late or
 * doubled cron run can't spam.
 */
import type { CombatTrainingDay, Mesocycle, NotificationPreferences } from './types';
import { plannedDays } from './plan-edit';
import { getCompletedSessionIds } from './session-matching';

export interface PushPayload { title: string; body: string; tag: string; url: string }

interface Snapshot {
  user?: { trainingDays?: number[]; combatTrainingDays?: CombatTrainingDay[] } | null;
  notificationPreferences?: Partial<NotificationPreferences> & { timeZone?: string };
  workoutLogs?: { date: string | Date; mesocycleId?: string; sessionId?: string; _deleted?: boolean }[];
  currentMesocycle?: Mesocycle | null;
  gamificationStats?: { currentStreak?: number };
  competitions?: { date: string | Date; name?: string; isActive?: boolean; _deleted?: boolean }[];
}

/** Local calendar parts of `at` in `timeZone` (falls back to UTC on a bad zone). */
export function localParts(at: Date, timeZone?: string): { dateKey: string; weekday: number; minutes: number } {
  let tz = timeZone || 'UTC';
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch { tz = 'UTC'; }
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(at).map(x => [x.type, x.value]));
  const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { dateKey: `${p.year}-${p.month}-${p.day}`, weekday: WD[p.weekday], minutes: Number(p.hour) * 60 + Number(p.minute) };
}

const hhmm = (s: string | undefined, fallback: number) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s ?? '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : fallback;
};

export function dueReminders(snap: Snapshot, now: Date, sent: Record<string, string> = {}): PushPayload[] {
  const prefs = snap.notificationPreferences ?? {};
  if (!prefs.pushEnabled) return [];
  const tz = prefs.timeZone;
  const { dateKey, weekday, minutes } = localParts(now, tz);
  if (minutes < 7 * 60 || minutes >= 22 * 60) return [];

  const loggedToday = (snap.workoutLogs ?? []).some(l => !l._deleted && localParts(new Date(l.date), tz).dateKey === dateKey);
  const out: PushPayload[] = [];
  const add = (p: PushPayload) => { if (sent[p.tag] !== dateKey) out.push(p); };

  // Training reminder — the session planned for today's weekday
  if (prefs.trainingReminders !== false && !loggedToday && minutes >= hhmm(prefs.reminderTime, 17 * 60)) {
    const meso = snap.currentMesocycle;
    const trainingDays = snap.user?.trainingDays ?? [];
    let name: string | null = null;
    if (meso) {
      // The week being trained: first week with a session not yet done
      const done = getCompletedSessionIds(meso, (snap.workoutLogs ?? []).filter(l => !l._deleted) as never);
      const week = [...meso.weeks].sort((a, b) => a.weekNumber - b.weekNumber).find(w => w.sessions.some(x => !done.has(x.id)));
      if (week) {
        const days = plannedDays(week, trainingDays);
        const s = week.sessions.find(x => days.get(x.id) === weekday && !done.has(x.id));
        if (s) name = s.name;
      }
    }
    const isLiftDay = name !== null || trainingDays.includes(weekday);
    if (isLiftDay) {
      const mat = (snap.user?.combatTrainingDays ?? []).find(c => c.day === weekday);
      add({
        title: 'Lift day',
        body: `${name ?? 'Your session'} is planned today${mat ? ` — ${mat.intensity} mats too, the app eases legs & grip` : ''}.`,
        tag: 'training-reminder',
        url: '/',
      });
    }
  }

  // Streak — evening nudge when a real streak is about to break
  const streak = snap.gamificationStats?.currentStreak ?? 0;
  if (prefs.streakAlerts !== false && streak >= 3 && !loggedToday && minutes >= 19 * 60) {
    add({ title: `${streak}-day streak`, body: 'Nothing logged today yet — a short session or a mat log keeps it.', tag: 'streak-reminder', url: '/' });
  }

  // Fight week — the day the competition is 7 days out
  for (const c of snap.competitions ?? []) {
    if (c._deleted || c.isActive === false) continue;
    const compKey = localParts(new Date(c.date), tz).dateKey;
    const days = Math.round((Date.parse(compKey) - Date.parse(dateKey)) / 864e5);
    if (days === 7) {
      add({ title: 'Fight week', body: `${c.name ?? 'Your competition'} is in 7 days — lifting switches to a taper: less volume, same intensity.`, tag: 'fight-week', url: '/' });
      break;
    }
  }
  return out;
}
