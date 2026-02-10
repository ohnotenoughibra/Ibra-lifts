/**
 * App Version & Data Migration
 *
 * Tracks the app version in localStorage and provides migration utilities
 * for upgrading user data between versions. Shows an upgrade popup when
 * users open a new version for the first time.
 */

// ── Version Constants ─────────────────────────────────────────────────────

export const APP_VERSION = '2.0.0';
export const APP_VERSION_KEY = 'roots-gains-version';
export const UPGRADE_DISMISSED_KEY = 'roots-gains-upgrade-dismissed';

export interface VersionInfo {
  version: string;
  releasedAt: string;
  highlights: string[];
  breakingChanges: boolean;
  migrationNotes?: string;
}

// Version history — newest first
export const VERSION_HISTORY: VersionInfo[] = [
  {
    version: '2.0.0',
    releasedAt: '2026-02-10',
    highlights: [
      'Daily Directive — one clear mission every day based on your readiness',
      'Weekly Coaching — AI narrative reviewing your training week',
      'Injury Intelligence — body map, auto-substitution, risk alerts',
      'Performance Model — strength curves, weak links, progression tracking',
      'Engagement Engine — variable rewards, streak analysis, milestones',
      'Female Athlete Intelligence — cycle phase-aware training adjustments',
      'Smart Deloads — fatigue debt tracking with 5 deload protocols',
      'Nutrition Coaching — protein timing, caloric periodization, hydration',
      'Monetization — feature tiers (free/pro/elite) with value-driven prompts',
      'Seamless upgrades — updates install silently without interruption',
    ],
    breakingChanges: false,
    migrationNotes: 'All new features are added automatically. Your existing data is fully compatible.',
  },
  {
    version: '1.1.0',
    releasedAt: '2026-02-07',
    highlights: [
      'Illness logging with neck-check algorithm and smart rest suggestions',
      'Workout skip tracking with automatic program adaptation',
      'Streamlined navigation — reduced from 6 to 4 tabs',
      'Progress & History merged into a unified tab',
      'App versioning with upgrade notifications',
    ],
    breakingChanges: false,
    migrationNotes: 'New fields (illnessLogs, workoutSkips) are added automatically. Your existing data is fully compatible.',
  },
  {
    version: '1.0.0',
    releasedAt: '2025-01-01',
    highlights: [
      'Initial release — workout programming, tracking, and gamification',
    ],
    breakingChanges: false,
  },
];

// ── Version Comparison ────────────────────────────────────────────────────

function parseVersion(v: string): number[] {
  return v.split('.').map(Number);
}

export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

// ── Migration Engine ──────────────────────────────────────────────────────

interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  migrationsApplied: string[];
  error?: string;
}

type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

// Register migrations here. Each migration transforms the stored state.
// Key = version that introduced the change.
const MIGRATIONS: Record<string, MigrationFn> = {
  '1.1.0': (data) => {
    // Add new fields for illness tracking and workout skips
    if (!data.illnessLogs) data.illnessLogs = [];
    if (!data.workoutSkips) data.workoutSkips = [];
    return data;
  },
  '2.0.0': (data) => {
    // Ensure all array/object fields added by Sprints 1-9 exist.
    // Zustand's persist migrate handles this too, but this catches
    // edge cases where app-version migration runs first.
    if (!data.quickLogs) data.quickLogs = [];
    if (!data.gripTests) data.gripTests = [];
    if (!data.gripExerciseLogs) data.gripExerciseLogs = [];
    if (!data.injuryLog) data.injuryLog = [];
    if (!data.hrSessions) data.hrSessions = [];
    if (!data.bodyComposition) data.bodyComposition = [];
    if (!data.competitions) data.competitions = [];
    if (!data.blockQueue) data.blockQueue = [];
    if (!data.weeklyCheckIns) data.weeklyCheckIns = [];
    if (!data.waterLog || typeof data.waterLog !== 'object') data.waterLog = {};
    if (!data.macroTargets) data.macroTargets = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    if (!data.muscleEmphasis) data.muscleEmphasis = {};
    return data;
  },
};

export function migrateData(data: Record<string, unknown>, fromVersion: string): MigrationResult {
  const migrationsApplied: string[] = [];
  let current = data;

  const sortedVersions = Object.keys(MIGRATIONS).sort(compareVersions);

  for (const version of sortedVersions) {
    if (compareVersions(version, fromVersion) > 0 && compareVersions(version, APP_VERSION) <= 0) {
      try {
        current = MIGRATIONS[version](current);
        migrationsApplied.push(version);
      } catch (e) {
        return {
          success: false,
          fromVersion,
          toVersion: APP_VERSION,
          migrationsApplied,
          error: `Migration to ${version} failed: ${e}`,
        };
      }
    }
  }

  return {
    success: true,
    fromVersion,
    toVersion: APP_VERSION,
    migrationsApplied,
  };
}

// ── Version Check Utilities ───────────────────────────────────────────────

export function getStoredVersion(): string | null {
  try {
    return localStorage.getItem(APP_VERSION_KEY);
  } catch {
    return null;
  }
}

export function setStoredVersion(version: string): void {
  try {
    localStorage.setItem(APP_VERSION_KEY, version);
  } catch {}
}

export function isUpgrade(): boolean {
  const stored = getStoredVersion();
  if (!stored) return false; // First install, not an upgrade
  return compareVersions(APP_VERSION, stored) > 0;
}

export function isFirstInstall(): boolean {
  return getStoredVersion() === null;
}

export function isUpgradeDismissed(): boolean {
  try {
    const dismissed = localStorage.getItem(UPGRADE_DISMISSED_KEY);
    return dismissed === APP_VERSION;
  } catch {
    return false;
  }
}

export function dismissUpgrade(): void {
  try {
    localStorage.setItem(UPGRADE_DISMISSED_KEY, APP_VERSION);
  } catch {}
}

export function getChangesSinceVersion(fromVersion: string): VersionInfo[] {
  return VERSION_HISTORY.filter(v => compareVersions(v.version, fromVersion) > 0);
}

export function hasBreakingChanges(fromVersion: string): boolean {
  return getChangesSinceVersion(fromVersion).some(v => v.breakingChanges);
}

// ── Auto-Migrate on Load ──────────────────────────────────────────────────

export function runStartupMigration(): MigrationResult | null {
  const storedVersion = getStoredVersion();

  if (!storedVersion) {
    // First install — set version and return
    setStoredVersion(APP_VERSION);
    return null;
  }

  if (compareVersions(APP_VERSION, storedVersion) <= 0) {
    // Same or older version — no migration needed
    return null;
  }

  // Run migrations on the stored data
  try {
    const storageKey = 'roots-gains-storage';
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      setStoredVersion(APP_VERSION);
      return null;
    }

    const parsed = JSON.parse(raw);
    const stateData = parsed?.state || parsed;

    const result = migrateData(stateData, storedVersion);

    if (result.success && result.migrationsApplied.length > 0) {
      // Write migrated data back
      if (parsed?.state) {
        parsed.state = stateData;
      }
      localStorage.setItem(storageKey, JSON.stringify(parsed));
    }

    // Always update version
    setStoredVersion(APP_VERSION);
    return result;
  } catch (e) {
    // Don't break the app if migration fails
    console.error('[version] Migration error:', e);
    setStoredVersion(APP_VERSION);
    return {
      success: false,
      fromVersion: storedVersion,
      toVersion: APP_VERSION,
      migrationsApplied: [],
      error: String(e),
    };
  }
}
