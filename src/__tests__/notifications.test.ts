import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getLoginBonusXP,
  checkDailyLoginBonus,
  getStreakReminderNotification,
  getTrainingReminderNotification,
  getDailyLoginNotification,
  getChallengeCompleteNotification,
} from '@/lib/notifications';

// ═════════════════════════════════════════════════════════════════════════════
// getLoginBonusXP — XP schedule: 10, 15, 20, 25, 30, 40, 50
// ═════════════════════════════════════════════════════════════════════════════
describe('getLoginBonusXP', () => {
  it('day 1 = 10 XP', () => {
    expect(getLoginBonusXP(1)).toBe(10);
  });

  it('day 2 = 15 XP', () => {
    expect(getLoginBonusXP(2)).toBe(15);
  });

  it('day 3 = 20 XP', () => {
    expect(getLoginBonusXP(3)).toBe(20);
  });

  it('day 4 = 25 XP', () => {
    expect(getLoginBonusXP(4)).toBe(25);
  });

  it('day 5 = 30 XP', () => {
    expect(getLoginBonusXP(5)).toBe(30);
  });

  it('day 6 = 40 XP', () => {
    expect(getLoginBonusXP(6)).toBe(40);
  });

  it('day 7 = 50 XP', () => {
    expect(getLoginBonusXP(7)).toBe(50);
  });

  it('clamps below 1 to day 1', () => {
    expect(getLoginBonusXP(0)).toBe(10);
    expect(getLoginBonusXP(-5)).toBe(10);
  });

  it('clamps above 7 to day 7', () => {
    expect(getLoginBonusXP(8)).toBe(50);
    expect(getLoginBonusXP(100)).toBe(50);
  });

  it('total 7-day XP is 190', () => {
    const total = [1, 2, 3, 4, 5, 6, 7].reduce((sum, day) => sum + getLoginBonusXP(day), 0);
    expect(total).toBe(190);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// checkDailyLoginBonus
// ═════════════════════════════════════════════════════════════════════════════
describe('checkDailyLoginBonus', () => {
  const today = new Date().toISOString().split('T')[0];

  it('returns bonus for first-ever login (null lastClaimed)', () => {
    const result = checkDailyLoginBonus(null, 0);
    expect(result).not.toBeNull();
    expect(result!.day).toBe(1);
    expect(result!.points).toBe(10);
    expect(result!.isMysteryDay).toBe(false);
  });

  it('returns null if already claimed today', () => {
    const result = checkDailyLoginBonus(today, 3);
    expect(result).toBeNull();
  });

  it('increments consecutive days for day-after claim', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const result = checkDailyLoginBonus(yesterdayStr, 3);
    expect(result).not.toBeNull();
    expect(result!.day).toBe(4);
    expect(result!.points).toBe(25); // day 4 = 25 XP
  });

  it('resets streak after 2+ day gap', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeStr = threeDaysAgo.toISOString().split('T')[0];

    const result = checkDailyLoginBonus(threeStr, 5);
    expect(result).not.toBeNull();
    expect(result!.day).toBe(1); // Reset
    expect(result!.points).toBe(10);
  });

  it('wraps day 7 back to day 1', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const result = checkDailyLoginBonus(yesterdayStr, 7);
    expect(result).not.toBeNull();
    expect(result!.day).toBe(1); // Wrap around
    expect(result!.points).toBe(10);
    expect(result!.isMysteryDay).toBe(false);
  });

  it('day 7 is mystery day', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const result = checkDailyLoginBonus(yesterdayStr, 6);
    expect(result).not.toBeNull();
    expect(result!.day).toBe(7);
    expect(result!.points).toBe(50);
    expect(result!.isMysteryDay).toBe(true);
  });

  it('day 6 is not mystery day', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const result = checkDailyLoginBonus(yesterdayStr, 5);
    expect(result).not.toBeNull();
    expect(result!.day).toBe(6);
    expect(result!.isMysteryDay).toBe(false);
  });

  it('two-day gap resets even if previous streak was long', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoStr = twoDaysAgo.toISOString().split('T')[0];

    const result = checkDailyLoginBonus(twoStr, 6);
    expect(result).not.toBeNull();
    expect(result!.day).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Notification content templates
// ═════════════════════════════════════════════════════════════════════════════
describe('getStreakReminderNotification', () => {
  it('includes streak count in title', () => {
    const notif = getStreakReminderNotification(5);
    expect(notif.title).toBe('5-day streak at risk!');
    expect(notif.tag).toBe('streak-reminder');
  });

  it('has motivational body text', () => {
    const notif = getStreakReminderNotification(10);
    expect(notif.body).toContain('quick session');
  });

  it('works with streak of 1', () => {
    const notif = getStreakReminderNotification(1);
    expect(notif.title).toBe('1-day streak at risk!');
  });
});

describe('getTrainingReminderNotification', () => {
  it('includes session name when provided', () => {
    const notif = getTrainingReminderNotification('Upper Body A');
    expect(notif.body).toContain('Upper Body A');
    expect(notif.tag).toBe('training-reminder');
  });

  it('uses generic body without session name', () => {
    const notif = getTrainingReminderNotification();
    expect(notif.body).toBe('Your workout is waiting.');
  });

  it('title is always "Time to train!"', () => {
    expect(getTrainingReminderNotification().title).toBe('Time to train!');
    expect(getTrainingReminderNotification('Leg Day').title).toBe('Time to train!');
  });
});

describe('getDailyLoginNotification', () => {
  it('includes day number and XP', () => {
    const notif = getDailyLoginNotification(3);
    expect(notif.body).toContain('day-3');
    expect(notif.body).toContain('20 XP');
    expect(notif.tag).toBe('daily-login');
  });

  it('day 7 mentions mystery reward', () => {
    const notif = getDailyLoginNotification(7);
    expect(notif.body).toContain('mystery reward');
    expect(notif.body).toContain('50 XP');
  });

  it('day 1 does not mention mystery reward', () => {
    const notif = getDailyLoginNotification(1);
    expect(notif.body).not.toContain('mystery');
  });
});

describe('getChallengeCompleteNotification', () => {
  it('has correct content', () => {
    const notif = getChallengeCompleteNotification();
    expect(notif.title).toBe('Weekly challenge complete!');
    expect(notif.body).toContain('3 goals');
    expect(notif.tag).toBe('challenge-complete');
  });
});
