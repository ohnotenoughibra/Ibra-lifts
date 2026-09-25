/**
 * Server-sent reminders — local time zone, quiet hours, once a day.
 */
import { describe, it, expect } from 'vitest';
import { dueReminders, localParts } from '@/lib/push-reminders';

const sess = (id: string) => ({ id, name: id, type: 'strength', exercises: [], warmUp: [], coolDown: [], dayNumber: 1, estimatedDuration: 50 });
const snap = (over: any = {}) => ({
  user: { trainingDays: [1, 3, 5], combatTrainingDays: [{ day: 3, intensity: 'hard' }] },
  notificationPreferences: { pushEnabled: true, trainingReminders: true, streakAlerts: true, reminderTime: '17:00', timeZone: 'Europe/Vienna' },
  workoutLogs: [],
  currentMesocycle: { id: 'm', weeks: [{ weekNumber: 1, sessions: [sess('Mon lift'), sess('Wed lift'), sess('Fri lift')] }] },
  gamificationStats: { currentStreak: 5 },
  competitions: [],
  ...over,
});
// Wed 2026-09-23 16:30 UTC = 18:30 in Vienna (CEST)
const WED_1830_VIENNA = new Date('2026-09-23T16:30:00Z');

describe('push reminders', () => {
  it('uses the athlete\'s time zone', () => {
    expect(localParts(WED_1830_VIENNA, 'Europe/Vienna')).toMatchObject({ dateKey: '2026-09-23', weekday: 3, minutes: 18 * 60 + 30 });
    expect(localParts(WED_1830_VIENNA, 'Not/AZone').minutes).toBe(16 * 60 + 30); // bad zone → UTC
  });

  it('lift day after the reminder time names today\'s session and the mats', () => {
    const due = dueReminders(snap() as any, WED_1830_VIENNA);
    const t = due.find(d => d.tag === 'training-reminder')!;
    expect(t.body).toContain('Wed lift');
    expect(t.body).toContain('hard mats');
  });

  it('nothing before the reminder time, on rest days, or once logged today', () => {
    expect(dueReminders(snap() as any, new Date('2026-09-23T13:00:00Z')).some(d => d.tag === 'training-reminder')).toBe(false);
    expect(dueReminders(snap() as any, new Date('2026-09-24T16:30:00Z')).some(d => d.tag === 'training-reminder')).toBe(false); // Thu
    expect(dueReminders(snap({ workoutLogs: [{ date: '2026-09-23T08:00:00Z' }] }) as any, WED_1830_VIENNA)).toEqual([]);
  });

  it('once a day, quiet hours, and off when push is off', () => {
    expect(dueReminders(snap() as any, WED_1830_VIENNA, { 'training-reminder': '2026-09-23' }).some(d => d.tag === 'training-reminder')).toBe(false);
    expect(dueReminders(snap() as any, new Date('2026-09-23T20:30:00Z'))).toEqual([]); // 22:30 Vienna
    expect(dueReminders(snap({ notificationPreferences: { pushEnabled: false } }) as any, WED_1830_VIENNA)).toEqual([]);
  });

  it('streak nudge from 19:00 when streak ≥ 3', () => {
    const at1930 = new Date('2026-09-23T17:30:00Z');
    expect(dueReminders(snap() as any, at1930).some(d => d.tag === 'streak-reminder')).toBe(true);
    expect(dueReminders(snap() as any, WED_1830_VIENNA).some(d => d.tag === 'streak-reminder')).toBe(false);
    expect(dueReminders(snap({ gamificationStats: { currentStreak: 2 } }) as any, at1930).some(d => d.tag === 'streak-reminder')).toBe(false);
  });

  it('fight week fires when the competition is 7 days out', () => {
    const due = dueReminders(snap({ competitions: [{ date: '2026-09-30T10:00:00Z', name: 'ADCC Open' }] }) as any, WED_1830_VIENNA);
    expect(due.find(d => d.tag === 'fight-week')?.body).toContain('ADCC Open');
  });
});
