'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import {
  User,
  Trophy,
  Star,
  Medal,
  LogOut,
  ChevronRight,
  Target,
  Dumbbell,
  Calendar,
  Save,
  DoorOpen,
  RefreshCw,
  Ruler,
  Scale,
  Watch,
  Activity,
  X,
  Pencil,
  AlertTriangle,
  Mail,
  Loader2,
  Trash2,
  Check,
  ShieldAlert,
  Palette,
  Info,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Download,
  Flame,
  Zap,
  Crown,
  Shield,
  Settings,
  Cloud,
  CloudOff,
  TrendingUp,
  Lock,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { useComputedGamification } from '@/lib/computed-gamification';
import { APP_VERSION, VERSION_HISTORY } from '@/lib/app-version';
import { getLevelTitle, levelProgress, pointsToNextLevel, badges } from '@/lib/gamification';
import { BiologicalSex, WeightUnit, ExperienceLevel, GoalFocus, Equipment, WearableUsage, WearableProvider, DEFAULT_EQUIPMENT_PROFILES, EquipmentType, Badge, UserBadge, SessionsPerWeek, CombatSport } from '@/lib/types';
import type { ColorTheme } from '@/lib/types';
import { useToast } from './Toast';
import { hapticMedium, hapticHeavy, hapticLight } from '@/lib/haptics';

// ─── SVG Circular Progress Ring (redesigned — bold level number) ─────────────
function LevelRing({ progress, level, size = 128, stroke = 5 }: {
  progress: number; level: number; size?: number; stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor"
          className="text-grappler-700/30"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="url(#levelGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="[stop-color:var(--p-400)]" />
            <stop offset="100%" className="[stop-color:var(--a-400)]" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[32px] font-black text-grappler-50 leading-none tabular-nums">{level}</span>
        <span className="text-[9px] text-grappler-400 uppercase tracking-[0.2em] mt-0.5">Level</span>
      </div>
    </div>
  );
}

// ─── Collapsible Section ─────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, subtitle, children, defaultOpen = false }: {
  title: string; icon: typeof User; subtitle?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => { setOpen(!open); hapticLight(); }}
        className="w-full p-4 flex items-center justify-between hover:bg-grappler-700/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-grappler-700/60 flex items-center justify-center flex-shrink-0">
            <Icon className="w-[18px] h-[18px] text-grappler-300" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold text-grappler-100">{title}</p>
            {subtitle && <p className="text-xs text-grappler-400 truncate">{subtitle}</p>}
          </div>
        </div>
        <ChevronRight className={cn(
          'w-4 h-4 text-grappler-500 transition-transform flex-shrink-0',
          open && 'rotate-90'
        )} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-grappler-700/50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Inline Editable Field ───────────────────────────────────────────────────
function InlineField({ label, value, type = 'text', suffix, onSave, options, min, max }: {
  label: string; value: string | number; type?: string; suffix?: string;
  onSave: (v: string) => void; options?: { value: string; label: string }[];
  min?: number; max?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const commit = () => {
    onSave(draft);
    setEditing(false);
    hapticLight();
  };

  if (options) {
    return (
      <div className="flex items-center justify-between py-2.5">
        <span className="text-sm text-grappler-400">{label}</span>
        <div className="flex gap-1.5">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onSave(opt.value); hapticLight(); }}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-medium transition-all active:scale-95',
                String(value) === opt.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-grappler-700/60 text-grappler-400 hover:text-grappler-200'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-grappler-400">{label}</span>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type={type}
            inputMode={type === 'number' ? 'decimal' : undefined}
            enterKeyHint="done"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
            onBlur={commit}
            min={min}
            max={max}
            className="w-24 bg-grappler-900 border border-primary-500/50 rounded-lg px-2.5 py-1 text-sm text-right text-grappler-100 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {suffix && <span className="text-xs text-grappler-500">{suffix}</span>}
        </div>
      ) : (
        <button
          onClick={() => { setDraft(String(value)); setEditing(true); }}
          className="flex items-center gap-1.5 group"
        >
          <span className="text-sm font-medium text-grappler-100">
            {value || 'Not set'}{value && suffix ? ` ${suffix}` : ''}
          </span>
          <Pencil className="w-3 h-3 text-grappler-600 group-hover:text-primary-400 transition-colors" />
        </button>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function ProfileSettings({ onClose }: { onClose?: () => void }) {
  const { user, gamificationStats, baselineLifts, setBaselineLifts, resetStore, setUser, updateUserFields, restartOnboarding, generateNewMesocycle, colorTheme, setColorTheme, homeGymEquipment, setHomeGymEquipment, recalculateGamificationStats, workoutLogCount, currentMesocycle, workoutLogs } = useAppStore(
    useShallow(s => ({
      user: s.user, gamificationStats: s.gamificationStats, baselineLifts: s.baselineLifts, setBaselineLifts: s.setBaselineLifts,
      resetStore: s.resetStore, setUser: s.setUser, updateUserFields: s.updateUserFields, restartOnboarding: s.restartOnboarding, generateNewMesocycle: s.generateNewMesocycle,
      colorTheme: s.colorTheme, setColorTheme: s.setColorTheme, homeGymEquipment: s.homeGymEquipment, setHomeGymEquipment: s.setHomeGymEquipment,
      recalculateGamificationStats: s.recalculateGamificationStats, workoutLogCount: (s.workoutLogs || []).length,
      currentMesocycle: s.currentMesocycle,
      workoutLogs: s.workoutLogs || [],
    }))
  );
  const computed = useComputedGamification();
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
  const weightUnit = user?.weightUnit || 'kg';
  const { showToast } = useToast();

  // ── State ────────────────────────────────────────────────────────────────
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifySent, setVerifySent] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [recoverStatus, setRecoverStatus] = useState<'idle' | 'scanning' | 'found' | 'restoring' | 'restored' | 'nothing' | 'error'>('idle');
  const [recoverStats, setRecoverStats] = useState<{
    workoutLogs?: number; hasProfile?: boolean; mesocycles?: number;
    hasGamification?: boolean; storeEmpty?: boolean; storeUpdatedAt?: string | null;
    hasMesocycle?: boolean; mesocycleHistory?: number; hasBaselineLifts?: boolean; badges?: number;
    source?: string; backupDate?: string | null;
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void;
  } | null>(null);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<{ badge: Badge; earned: boolean; earnedAt?: Date } | null>(null);
  const [editingLift, setEditingLift] = useState<string | null>(null);
  const [liftDraft, setLiftDraft] = useState('');
  const liftSavedRef = useRef(false);

  const progress = levelProgress(computed.totalPoints);
  const pointsNeeded = pointsToNextLevel(computed.totalPoints);
  const badgesList = Array.isArray(gamificationStats?.badges) ? gamificationStats.badges : [];
  const earnedBadgeIds = new Set(badgesList.map(b => b.badgeId));

  // ── Email verification ────────────────────────────────────────────────────
  useEffect(() => {
    if (isSignedIn && session?.user?.email) {
      fetch('/api/auth/verify-email')
        .then(res => res.json())
        .then(data => { if (typeof data.verified === 'boolean') setEmailVerified(data.verified); })
        .catch(() => {});
    }
  }, [isSignedIn, session?.user?.email]);

  const handleResendVerification = useCallback(async () => {
    setVerifyLoading(true);
    setVerifySent(false);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.user?.email }),
      });
      const data = await res.json();
      if (res.ok && data.emailSent) setVerifySent(true);
      else if (res.ok && !data.emailSent) showToast('Email service not configured. Contact support.', 'error');
      else showToast(data.error || 'Failed to send verification email.', 'error');
    } catch { showToast('Network error. Please try again.', 'error'); }
    finally { setVerifyLoading(false); }
  }, [session?.user?.email, showToast]);

  // ── Data recovery ──────────────────────────────────────────────────────────
  const handleScanForData = useCallback(async () => {
    setRecoverStatus('scanning');
    setRecoverStats(null);
    try {
      // Use the backup-aware recovery endpoint — checks user_store_backups first
      const res = await fetch('/api/sync/recover');
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      if (result.recovered && result.data) {
        setRecoverStats({
          workoutLogs: result.stats?.workoutLogs || 0,
          hasProfile: result.stats?.hasProfile || false,
          mesocycles: result.stats?.mesocycleHistory || 0,
          hasGamification: result.stats?.hasGamification || false,
          storeEmpty: true,
          storeUpdatedAt: null,
          hasMesocycle: result.stats?.hasMesocycle || false,
          mesocycleHistory: result.stats?.mesocycleHistory || 0,
          hasBaselineLifts: result.stats?.hasBaselineLifts || false,
          badges: result.stats?.badges || 0,
          source: result.source || 'unknown',
          backupDate: result.backupDate || null,
        });
        setRecoverStatus('found');
      } else {
        // Fallback: also check legacy tables via debug endpoint
        const debugRes = await fetch('/api/debug/my-data');
        if (debugRes.ok) {
          const data = await debugRes.json();
          const logs = data.workout_logs?.total_count || 0;
          const hasProfile = !!data.profiles;
          const hasMeso = data.mesocycles?.count > 0;
          const hasGamification = !!data.gamification_stats;
          if (logs > 0 || hasProfile || hasMeso || hasGamification) {
            setRecoverStats({ workoutLogs: logs, hasProfile, mesocycles: data.mesocycles?.count || 0, hasGamification, storeEmpty: true, storeUpdatedAt: null });
            setRecoverStatus('found');
            return;
          }
        }
        setRecoverStatus('nothing');
      }
    } catch { setRecoverStatus('error'); }
  }, []);

  const handleRestoreData = useCallback(async () => {
    setRecoverStatus('restoring');
    try {
      // First try backup-aware recovery
      const recoverRes = await fetch('/api/sync/recover');
      if (recoverRes.ok) {
        const result = await recoverRes.json();
        if (result.recovered && result.data) {
          // Apply recovered data to the store
          const store = useAppStore.getState();
          const data = result.data as Record<string, unknown>;
          // Merge all recovered fields into the store
          const restoreFields = [
            'user', 'isOnboarded', 'onboardingData', 'baselineLifts',
            'currentMesocycle', 'mesocycleHistory', 'mesocycleQueue', 'workoutLogs',
            'gamificationStats', 'bodyWeightLog', 'injuryLog', 'customExercises',
            'sessionTemplates', 'hrSessions', 'trainingSessions', 'themeMode',
            'meals', 'macroTargets', 'waterLog', 'activeDietPhase', 'weeklyCheckIns',
            'bodyComposition', 'muscleEmphasis', 'competitions', 'subscription',
            'quickLogs', 'gripTests', 'gripExerciseLogs', 'activeEquipmentProfile',
            'notificationPreferences', 'workoutSkips', 'illnessLogs', 'cycleLogs',
            'mealReminders', 'dailyLoginBonus', 'featureFeedback',
          ];
          const patch: Record<string, unknown> = {};
          for (const key of restoreFields) {
            if (data[key] !== undefined && data[key] !== null) {
              patch[key] = data[key];
            }
          }
          if (data.isOnboarded) patch.isOnboarded = true;
          // Apply to store (setState merges — triggers listeners & sync)
          useAppStore.setState(patch);

          // Persist recovered data directly to server (bypass the 3s debounce)
          // Without this, the page reload kills the pending debounce timer
          // and the old stale data overwrites the recovery on next pull.
          const userId = useAppStore.getState().user?.id || session?.user?.id;
          if (userId) {
            const fullState = useAppStore.getState();
            const syncPayload: Record<string, unknown> = {};
            for (const key of restoreFields) {
              const val = (fullState as unknown as Record<string, unknown>)[key];
              if (val !== undefined) syncPayload[key] = val;
            }
            syncPayload.isOnboarded = fullState.isOnboarded;
            try {
              await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, data: syncPayload }),
              });
            } catch {
              // Non-fatal — the store is already updated locally
            }
          }

          setRecoverStats(result.stats);
          setRecoverStatus('restored');
          showToast(`Data restored from ${result.source === 'backup' ? 'backup' : 'database'}! Refreshing...`, 'success');
          setTimeout(() => window.location.reload(), 1500);
          return;
        }
      }

      // Fallback to legacy restore
      const res = await fetch('/api/debug/restore', { method: 'POST' });
      if (!res.ok) throw new Error('Restore failed');
      const result = await res.json();
      if (result.restored) {
        setRecoverStats(result.stats);
        setRecoverStatus('restored');
        showToast('Data restored! Refreshing...', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else { setRecoverStatus('nothing'); showToast(result.reason || 'No data to recover', 'error'); }
    } catch { setRecoverStatus('error'); showToast('Restore failed. Try again.', 'error'); }
  }, [showToast, session]);

  // ── Account deletion ───────────────────────────────────────────────────────
  const executeDeleteAccount = useCallback(async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/auth/account', { method: 'DELETE' });
      if (res.ok) {
        // Only clear local data AFTER server confirms deletion succeeded
        resetStore();
        signOut({ callbackUrl: '/' });
      } else {
        const body = await res.json().catch(() => ({}));
        showToast(body.error || 'Failed to delete account. Please try again.', 'error');
      }
    } catch { showToast('Something went wrong. Please try again.', 'error'); }
    finally { setDeleteLoading(false); }
  }, [resetStore, showToast]);

  const handleDeleteAccount = useCallback(() => {
    hapticHeavy();
    setConfirmDialog({
      title: 'Delete Account', message: 'Permanently delete your account and all cloud data? This cannot be undone.',
      confirmLabel: 'Delete Forever', danger: true,
      onConfirm: () => { setConfirmDialog(null); executeDeleteAccount(); },
    });
  }, [executeDeleteAccount]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const updateUser = useCallback((patch: Partial<NonNullable<typeof user>>) => {
    if (!user) return;
    updateUserFields(patch);
  }, [user, updateUserFields]);

  const displayWeight = (kg: number | undefined) => {
    if (!kg) return '';
    return weightUnit === 'kg' ? `${Math.round(kg)}` : `${Math.round(kg * 2.205)}`;
  };

  const parseWeightToKg = (val: string) => {
    const num = parseFloat(val) || 0;
    return weightUnit === 'kg' ? num : num / 2.205;
  };

  const saveLift = (key: string, val: string) => {
    if (liftSavedRef.current) return; // prevent double-save from blur + Enter
    liftSavedRef.current = true;
    const num = val === '' ? null : Math.round(Number(val));
    const updated = {
      id: baselineLifts?.id || (user?.id || 'user') + '-baseline',
      userId: user?.id || 'user',
      squat: baselineLifts?.squat ?? null,
      deadlift: baselineLifts?.deadlift ?? null,
      benchPress: baselineLifts?.benchPress ?? null,
      overheadPress: baselineLifts?.overheadPress ?? null,
      barbellRow: baselineLifts?.barbellRow ?? null,
      pullUp: baselineLifts?.pullUp ?? null,
      createdAt: baselineLifts?.createdAt || new Date(),
      updatedAt: new Date(),
      [key]: num,
    };
    setBaselineLifts(updated);
    setEditingLift(null);
    showToast('Lift updated');
  };

  const nextBadge = badges.find(b => !earnedBadgeIds.has(b.id));

  // ── Achievement Showcase state ───────────────────────────────────────────
  const [activeBadgeIdx, setActiveBadgeIdx] = useState(0);
  const badgeTouchRef = useRef(0);

  const sortedBadges = useMemo(() =>
    [...badgesList].sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()),
    [badgesList]
  );

  const activeBadge = sortedBadges[activeBadgeIdx] || null;

  const badgeProgress = useMemo(() => {
    if (!nextBadge) return null;
    const req = nextBadge.requirement;
    let current = 0;
    let target = 0;
    let label = '';

    if (req.includes('personal_records')) {
      target = parseInt(req.split('>=')[1].trim());
      current = computed.personalRecords;
      label = 'PRs';
    } else if (req.includes('total_workouts')) {
      target = parseInt(req.split('>=')[1].trim());
      current = computed.totalWorkouts;
      label = 'workouts';
    } else if (req.startsWith('streak')) {
      target = parseInt(req.split('>=')[1].trim());
      current = computed.currentStreak;
      label = 'day streak';
    } else if (req.includes('total_volume')) {
      target = parseInt(req.split('>=')[1].trim());
      current = computed.totalVolume;
      label = weightUnit;
    } else if (req.includes('level')) {
      target = parseInt(req.split('>=')[1].trim());
      current = computed.level;
      label = 'level';
    } else if (req.includes('mesocycles_completed')) {
      target = parseInt(req.split('>=')[1].trim());
      current = 0;
      label = 'blocks';
    } else if (req.includes('training_sessions')) {
      target = parseInt(req.split('>=')[1].trim());
      current = gamificationStats?.totalTrainingSessions ?? 0;
      label = 'sessions';
    } else {
      return null;
    }

    const pct = target > 0 ? Math.min((current / target) * 100, 99.9) : 0;
    return { current: Math.min(current, target), target, pct, label };
  }, [nextBadge, computed, workoutLogCount, weightUnit]);

  // ── Strength Standards computation ───────────────────────────────────────
  const COMPOUND_IDS: Record<string, string[]> = {
    squat: ['back-squat', 'barbell-back-squat'],
    deadlift: ['deadlift', 'sumo-deadlift'],
    benchPress: ['bench-press', 'barbell-bench-press'],
    overheadPress: ['overhead-press', 'barbell-overhead-press'],
    barbellRow: ['barbell-row', 'bent-over-row'],
  };

  const actual1RMs = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [liftKey, exerciseIds] of Object.entries(COMPOUND_IDS)) {
      let best = 0;
      for (const log of workoutLogs) {
        for (const ex of log.exercises) {
          if (exerciseIds.includes(ex.exerciseId) && ex.estimated1RM && ex.estimated1RM > best) {
            best = ex.estimated1RM;
          }
        }
      }
      if (best > 0) result[liftKey] = best;
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutLogs.length]);

  const ELITE_MALE: Record<string, number> = { squat: 2.50, benchPress: 2.25, deadlift: 3.00, overheadPress: 1.25, barbellRow: 1.60 };
  const ELITE_FEMALE: Record<string, number> = { squat: 1.85, benchPress: 1.25, deadlift: 2.10, overheadPress: 0.85, barbellRow: 1.10 };

  const MALE_MULTS: Record<string, Record<string, number>> = {
    beginner:     { squat: 1.00, benchPress: 0.75, deadlift: 1.25, overheadPress: 0.55, barbellRow: 0.70 },
    intermediate: { squat: 1.50, benchPress: 1.25, deadlift: 1.75, overheadPress: 0.75, barbellRow: 1.00 },
    advanced:     { squat: 2.00, benchPress: 1.75, deadlift: 2.50, overheadPress: 1.00, barbellRow: 1.30 },
    elite:        ELITE_MALE,
  };
  const FEMALE_MULTS: Record<string, Record<string, number>> = {
    beginner:     { squat: 0.75, benchPress: 0.50, deadlift: 0.90, overheadPress: 0.35, barbellRow: 0.50 },
    intermediate: { squat: 1.10, benchPress: 0.75, deadlift: 1.35, overheadPress: 0.55, barbellRow: 0.70 },
    advanced:     { squat: 1.50, benchPress: 1.00, deadlift: 1.75, overheadPress: 0.70, barbellRow: 0.90 },
    elite:        ELITE_FEMALE,
  };

  const getStrengthTier = (liftKey: string, liftValue: number) => {
    const bwKg = user?.bodyWeightKg;
    if (!bwKg || !liftValue) return null;
    const bwDisplay = weightUnit === 'kg' ? bwKg : bwKg * 2.205;
    const ratio = liftValue / bwDisplay;
    const mults = user?.sex === 'female' ? FEMALE_MULTS : MALE_MULTS;
    const eliteMult = (user?.sex === 'female' ? ELITE_FEMALE : ELITE_MALE)[liftKey] || 2.5;

    const tiers = ['beginner', 'intermediate', 'advanced', 'elite'] as const;
    let tierName = 'Untrained';
    for (const t of tiers) {
      if (ratio >= (mults[t]?.[liftKey] || 0)) tierName = t.charAt(0).toUpperCase() + t.slice(1);
    }

    // Position on bar: 0% = 0, 100% = elite * 1.15 (headroom)
    const maxMult = eliteMult * 1.15;
    const pct = Math.min((ratio / maxMult) * 100, 100);

    // Tier boundary positions for marker display
    const tierPositions = tiers.map(t => ({
      name: t,
      pct: ((mults[t]?.[liftKey] || 0) / maxMult) * 100,
    }));

    return { ratio: Math.round(ratio * 100) / 100, tierName, pct, tierPositions, maxMult };
  };

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  // ═════════════════════════════════════════════════════════════════════════
  // SINGLE-PAGE SETTINGS — YOU, BODY, TRAINING, CONNECTED, ACCOUNT
  // ═════════════════════════════════════════════════════════════════════════
  const recentBadges = sortedBadges.slice(0, 3);

  return (
    <div className="min-h-screen bg-grappler-900 px-4 pt-4 space-y-6 pb-32 safe-area-bottom">

      {/* Close button (overlay mode) */}
      {onClose && (
        <button
          onClick={() => { onClose(); hapticLight(); }}
          className="w-8 h-8 rounded-xl bg-grappler-800/60 backdrop-blur-sm flex items-center justify-center hover:bg-grappler-700/80 transition-colors active:scale-95 z-10 mb-2"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-grappler-400" />
        </button>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: YOU                                                  */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-bold text-grappler-100 uppercase tracking-wide mb-4">You</h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Avatar + Name + Level Ring + XP */}
          <div className="flex items-center gap-3">
            <LevelRing progress={progress} level={computed.level} size={72} stroke={4} />

            <div className="flex-1 min-w-0">
              <InlineField
                label=""
                value={user?.name || 'Athlete'}
                onSave={v => updateUser({ name: v })}
              />
              <div className="flex items-center gap-1.5 -mt-1">
                <Crown className="w-3 h-3 text-primary-400" />
                <span className="text-xs text-primary-400 font-semibold">
                  {getLevelTitle(computed.level)}
                </span>
              </div>

              {/* XP bar */}
              <div className="mt-2">
                <div className="h-1.5 bg-grappler-800/60 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                  />
                </div>
                <div className="flex justify-between text-xs text-grappler-500 mt-1 tabular-nums">
                  <span>{formatNumber(computed.totalPoints)} XP</span>
                  <span>{formatNumber(pointsNeeded)} to next</span>
                </div>
              </div>
            </div>
          </div>

          {/* Current streak */}
          <div className="flex items-center gap-2 mt-3">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-grappler-100 tabular-nums">{computed.currentStreak}</span>
            <span className="text-xs text-grappler-400">day streak</span>
          </div>

          {/* Next badge — one line */}
          {nextBadge && badgeProgress && (
            <div className="flex items-center gap-2 mt-2 text-xs text-grappler-400">
              <Zap className="w-3 h-3 text-primary-400 flex-shrink-0" />
              <span>
                Next badge: <span className="font-semibold text-grappler-200">{nextBadge.name}</span>
                {badgeProgress.target - badgeProgress.current > 0
                  ? <>{' '}&mdash; {badgeProgress.target - badgeProgress.current} {badgeProgress.label} away</>
                  : <>{' '}&mdash; <span className="text-green-400">ready to unlock!</span></>
                }
              </span>
            </div>
          )}
          {nextBadge && !badgeProgress && (
            <div className="flex items-center gap-2 mt-2 text-xs text-grappler-400">
              <Zap className="w-3 h-3 text-primary-400 flex-shrink-0" />
              <span>
                Next badge: <span className="font-semibold text-grappler-200">{nextBadge.name}</span>
              </span>
            </div>
          )}

          {/* 3 most recently earned badges — inline pills */}
          {recentBadges.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {recentBadges.map((ub) => (
                <button
                  key={ub.id}
                  onClick={() => { hapticLight(); setSelectedBadge({ badge: ub.badge, earned: true, earnedAt: ub.earnedAt }); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-grappler-800/60 ring-1 ring-grappler-700/40 active:scale-95 transition-transform"
                >
                  <span className="text-sm">{ub.badge.icon}</span>
                  <span className="text-[10px] font-medium text-grappler-300 truncate max-w-[80px]">{ub.badge.name}</span>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </section>

      <div className="h-px bg-grappler-700/40 my-6" />

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: BODY                                                 */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-bold text-grappler-100 uppercase tracking-wide mb-4">Body</h2>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="divide-y divide-grappler-700/30"
        >
          <InlineField label="Age" value={user?.age || ''} type="number" suffix="years" min={14} max={100}
            onSave={v => updateUser({ age: parseInt(v) || 0 })} />
          <InlineField label="Body Weight"
            value={user?.bodyWeightKg ? (weightUnit === 'kg' ? Math.round(user.bodyWeightKg) : Math.round(user.bodyWeightKg * 2.205)) : ''}
            type="number" suffix={weightUnit}
            onSave={v => updateUser({ bodyWeightKg: Math.round((parseWeightToKg(v) || 0) * 10) / 10 || undefined })} />
          <InlineField label="Height" value={user?.heightCm || ''} type="number" suffix="cm" min={100} max={230}
            onSave={v => updateUser({ heightCm: parseInt(v) || undefined })} />
          <InlineField label="Sex" value={user?.sex || ''}
            options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]}
            onSave={v => updateUser({ sex: v as BiologicalSex })} />
          <InlineField label="Units" value={user?.weightUnit || 'kg'}
            options={[{ value: 'kg', label: 'KG' }, { value: 'lbs', label: 'LBS' }]}
            onSave={v => updateUser({ weightUnit: v as WeightUnit })} />
        </motion.div>
      </section>

      <div className="h-px bg-grappler-700/40 my-6" />

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3: TRAINING                                             */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-bold text-grappler-100 uppercase tracking-wide mb-4">Training</h2>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-4"
        >
          {/* Experience Level */}
          <div>
            <p className="text-xs text-grappler-400 mb-2">Experience Level</p>
            <div className="grid grid-cols-3 gap-2">
              {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map(lvl => (
                <button key={lvl} onClick={() => { updateUser({ experienceLevel: lvl }); hapticLight(); }}
                  className={cn(
                    'py-2.5 rounded-xl text-xs font-medium capitalize transition-all active:scale-95',
                    user?.experienceLevel === lvl
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                      : 'bg-grappler-700/60 text-grappler-400'
                  )}>
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Goal Focus */}
          <div>
            <p className="text-xs text-grappler-400 mb-2">Goal Focus</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'strength' as GoalFocus, label: 'Strength' },
                { value: 'hypertrophy' as GoalFocus, label: 'Hypertrophy' },
                { value: 'balanced' as GoalFocus, label: 'Balanced' },
              ]).map(g => (
                <button key={g.value} onClick={() => { updateUser({ goalFocus: g.value }); hapticLight(); }}
                  className={cn(
                    'py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95',
                    user?.goalFocus === g.value
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                      : 'bg-grappler-700/60 text-grappler-400'
                  )}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Training days per week */}
          <div>
            <p className="text-xs text-grappler-400 mb-2">Training Days / Week</p>
            <div className="flex gap-1.5">
              {([1, 2, 3, 4, 5, 6] as SessionsPerWeek[]).map(n => (
                <button key={n} onClick={() => {
                  updateUser({ sessionsPerWeek: n });
                  const weeks = currentMesocycle?.weeks?.length || 5;
                  generateNewMesocycle(weeks, user?.sessionDurationMinutes || 60);
                  hapticLight();
                }}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-xs font-bold tabular-nums transition-all active:scale-95',
                    user?.sessionsPerWeek === n
                      ? 'bg-primary-500 text-white'
                      : 'bg-grappler-700/60 text-grappler-400'
                  )}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div>
            <p className="text-xs text-grappler-400 mb-2">Equipment Access</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'full_gym' as Equipment, label: 'Full Gym' },
                { value: 'home_gym' as Equipment, label: 'Home' },
                { value: 'minimal' as Equipment, label: 'Travel' },
              ]).map(eq => (
                <button key={eq.value}
                  onClick={() => {
                    hapticLight();
                    const profile = DEFAULT_EQUIPMENT_PROFILES.find(p =>
                      p.name === (eq.value === 'full_gym' ? 'gym' : eq.value === 'home_gym' ? 'home' : 'travel')
                    );
                    const equipmentList = eq.value === 'home_gym' ? homeGymEquipment : (profile?.equipment || []);
                    updateUser({ equipment: eq.value, availableEquipment: equipmentList });
                  }}
                  className={cn(
                    'py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95',
                    user?.equipment === eq.value
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                      : 'bg-grappler-700/60 text-grappler-400'
                  )}>
                  {eq.label}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {user?.equipment === 'home_gym' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-3"
                >
                  <p className="text-xs text-grappler-400 mb-2">Home Equipment</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      { type: 'barbell' as EquipmentType, label: 'Barbell' },
                      { type: 'dumbbell' as EquipmentType, label: 'Dumbbells' },
                      { type: 'kettlebell' as EquipmentType, label: 'Kettlebells' },
                      { type: 'bench' as EquipmentType, label: 'Bench' },
                      { type: 'pull_up_bar' as EquipmentType, label: 'Pull-Up Bar' },
                      { type: 'resistance_band' as EquipmentType, label: 'Bands' },
                      { type: 'dip_station' as EquipmentType, label: 'Dip Station' },
                      { type: 'cable' as EquipmentType, label: 'Cable Machine' },
                      { type: 'machine' as EquipmentType, label: 'Machines' },
                      { type: 'ez_bar' as EquipmentType, label: 'EZ Curl Bar' },
                      { type: 'ab_wheel' as EquipmentType, label: 'Ab Wheel' },
                      { type: 'medicine_ball' as EquipmentType, label: 'Medicine Ball' },
                      { type: 'box' as EquipmentType, label: 'Plyo Box' },
                    ]).map(({ type, label }) => {
                      const current = user?.availableEquipment || homeGymEquipment;
                      const isSelected = current.includes(type);
                      return (
                        <button key={type}
                          onClick={() => {
                            const updated = isSelected ? current.filter(e => e !== type) : [...current, type];
                            if (!updated.includes('bodyweight')) updated.push('bodyweight');
                            setHomeGymEquipment(updated);
                            updateUser({ availableEquipment: updated });
                            hapticLight();
                          }}
                          className={cn(
                            'py-2 px-3 rounded-lg text-xs font-medium transition-all active:scale-95 text-left',
                            isSelected
                              ? 'bg-primary-500/20 text-primary-300 ring-1 ring-primary-500/40'
                              : 'bg-grappler-800/60 text-grappler-500 ring-1 ring-grappler-700/50'
                          )}>
                          {isSelected ? '\u2713 ' : ''}{label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-grappler-600 mt-1.5">Bodyweight always included</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Weight Unit */}
          <InlineField label="Weight Unit" value={user?.weightUnit || 'kg'}
            options={[{ value: 'kg', label: 'KG' }, { value: 'lbs', label: 'LBS' }]}
            onSave={v => updateUser({ weightUnit: v as WeightUnit })} />

          {/* Combat Sport Type */}
          {(user?.combatSport || user?.combatSports?.length) && (
            <div>
              <p className="text-xs text-grappler-400 mb-2">Combat Sport</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'grappling_gi' as CombatSport, label: 'BJJ (Gi)' },
                  { value: 'grappling_nogi' as CombatSport, label: 'No-Gi' },
                  { value: 'mma' as CombatSport, label: 'MMA' },
                  { value: 'striking' as CombatSport, label: 'Striking' },
                ]).map(cs => {
                  const isSelected = user?.combatSport === cs.value || user?.combatSports?.includes(cs.value);
                  return (
                    <button key={cs.value}
                      onClick={() => { updateUser({ combatSport: cs.value }); hapticLight(); }}
                      className={cn(
                        'py-2 rounded-xl text-xs font-medium transition-all active:scale-95',
                        isSelected
                          ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/40'
                          : 'bg-grappler-700/60 text-grappler-400'
                      )}>
                      {cs.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </section>

      <div className="h-px bg-grappler-700/40 my-6" />

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3: CONNECTED                                            */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-bold text-grappler-100 uppercase tracking-wide mb-4">Connected</h2>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          {/* Whoop */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-grappler-100">Whoop</p>
                <p className="text-xs text-grappler-500">
                  {user?.wearableUsage === 'whoop' ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                hapticLight();
                if (user?.wearableUsage === 'whoop') {
                  updateUser({ wearableUsage: 'no_wearable', wearableProvider: undefined });
                } else {
                  updateUser({ wearableUsage: 'whoop', wearableProvider: 'whoop' });
                }
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95',
                user?.wearableUsage === 'whoop'
                  ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
              )}
            >
              {user?.wearableUsage === 'whoop' ? 'Disconnect' : 'Connect'}
            </button>
          </div>

          {/* Google Fit */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-grappler-100">Google Fit</p>
                <p className="text-xs text-grappler-500">
                  {user?.wearableProvider === 'google_fit' ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                hapticLight();
                if (user?.wearableProvider === 'google_fit') {
                  updateUser({ wearableUsage: 'no_wearable', wearableProvider: undefined });
                } else {
                  updateUser({ wearableUsage: 'other_wearable', wearableProvider: 'google_fit' as WearableProvider });
                }
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95',
                user?.wearableProvider === 'google_fit'
                  ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
                  : 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20'
              )}
            >
              {user?.wearableProvider === 'google_fit' ? 'Disconnect' : 'Connect'}
            </button>
          </div>

          {/* Apple Health */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-pink-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-grappler-100">Apple Health</p>
                <p className="text-xs text-grappler-500">
                  {user?.wearableProvider === 'apple_health' ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                hapticLight();
                if (user?.wearableProvider === 'apple_health') {
                  updateUser({ wearableUsage: 'no_wearable', wearableProvider: undefined });
                } else {
                  updateUser({ wearableUsage: 'other_wearable', wearableProvider: 'apple_health' });
                }
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95',
                user?.wearableProvider === 'apple_health'
                  ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
                  : 'bg-pink-500/10 text-pink-400 ring-1 ring-pink-500/20'
              )}
            >
              {user?.wearableProvider === 'apple_health' ? 'Disconnect' : 'Connect'}
            </button>
          </div>

          {/* Cloud Sync Status */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', isSignedIn ? 'bg-green-500/10' : 'bg-grappler-700/50')}>
                {isSignedIn ? <Cloud className="w-4 h-4 text-green-400" /> : <CloudOff className="w-4 h-4 text-grappler-500" />}
              </div>
              <div>
                <p className="text-sm font-medium text-grappler-100">Cloud Sync</p>
                <p className="text-xs text-grappler-500">
                  {isSignedIn ? `Synced — ${session.user?.email}` : 'Sign in to enable'}
                </p>
              </div>
            </div>
            {isSignedIn && <Check className="w-4 h-4 text-green-400" />}
          </div>
        </motion.div>
      </section>

      <div className="h-px bg-grappler-700/40 my-6" />

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SECTION 5: ACCOUNT                                              */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-bold text-grappler-100 uppercase tracking-wide mb-4">Account</h2>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3"
        >
          {/* Sign In / Sign Out */}
          {isSignedIn ? (
            <button
              onClick={() => {
                setConfirmDialog({
                  title: 'Sign Out',
                  message: 'Local data stays, cloud sync stops until you sign back in.',
                  confirmLabel: 'Sign Out',
                  onConfirm: () => { setConfirmDialog(null); signOut({ callbackUrl: '/' }); },
                });
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-grappler-700/50 text-grappler-300 text-sm font-medium hover:bg-grappler-700 transition-colors active:scale-95"
            >
              <DoorOpen className="w-4 h-4" />
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => signIn(undefined, { callbackUrl: '/' })}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 transition-colors active:scale-[0.98]"
            >
              <User className="w-4 h-4" />
              Sign In
            </button>
          )}

          {/* Export Data */}
          <button
            onClick={() => {
              try {
                const raw = localStorage.getItem('roots-gains-storage');
                if (!raw) return;
                const blob = new Blob([raw], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `roots-gains-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              } catch { /* ignore */ }
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-grappler-700/50 text-grappler-300 text-sm font-medium hover:bg-grappler-700 transition-colors active:scale-95"
          >
            <Download className="w-4 h-4" />
            Export My Data
          </button>

          {/* Reconfigure Training */}
          <button
            onClick={() => {
              setConfirmDialog({
                title: 'Reconfigure Training',
                message: 'This takes you through setup again. Your workouts and history are preserved.',
                confirmLabel: 'Reconfigure',
                onConfirm: () => { setConfirmDialog(null); restartOnboarding(); },
              });
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-grappler-700/50 text-grappler-300 text-sm font-medium hover:bg-grappler-700 transition-colors active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Reconfigure Training
          </button>

          {/* Data Recovery (signed-in users only) */}
          {isSignedIn && (
            <div className="pt-2">
              {recoverStatus === 'idle' && (
                <div className="space-y-2">
                  <button onClick={handleScanForData}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 text-xs font-medium ring-1 ring-amber-500/20 hover:bg-amber-500/20 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Scan for Lost Data
                  </button>
                  {workoutLogCount > 0 && (
                    <button
                      onClick={() => {
                        hapticMedium();
                        recalculateGamificationStats();
                        showToast(`Recomputed stats from ${workoutLogCount} workouts!`, 'success');
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-500/10 text-primary-400 text-xs font-medium ring-1 ring-primary-500/20 hover:bg-primary-500/20 transition-colors">
                      <Sparkles className="w-3.5 h-3.5" /> Recalculate XP &amp; Stats
                    </button>
                  )}
                </div>
              )}
              {recoverStatus === 'scanning' && (
                <div className="flex items-center justify-center gap-2 py-2.5 text-amber-300 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Scanning...
                </div>
              )}
              {recoverStatus === 'found' && recoverStats && (
                <div className="space-y-2">
                  <div className="bg-grappler-800/50 rounded-xl p-2.5 space-y-1">
                    <p className="text-xs font-medium text-green-400">
                      Found{recoverStats.source === 'backup' ? ' (from backup)' : ''}:
                    </p>
                    {recoverStats.hasProfile && <p className="text-xs text-grappler-300">&#10003; Profile</p>}
                    {(recoverStats.workoutLogs ?? 0) > 0 && <p className="text-xs text-grappler-300">&#10003; {recoverStats.workoutLogs} workout logs</p>}
                    {recoverStats.hasMesocycle && <p className="text-xs text-grappler-300">&#10003; Current program</p>}
                    {(recoverStats.mesocycleHistory ?? 0) > 0 && <p className="text-xs text-grappler-300">&#10003; {recoverStats.mesocycleHistory} past programs</p>}
                    {recoverStats.hasGamification && <p className="text-xs text-grappler-300">&#10003; Gamification (XP, level, streaks)</p>}
                    {(recoverStats.badges ?? 0) > 0 && <p className="text-xs text-grappler-300">&#10003; {recoverStats.badges} badges</p>}
                    {recoverStats.hasBaselineLifts && <p className="text-xs text-grappler-300">&#10003; Baseline lifts</p>}
                    {recoverStats.backupDate && (
                      <p className="text-xs text-grappler-500 mt-1">
                        Backup from {new Date(recoverStats.backupDate).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button onClick={handleRestoreData}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/10 text-green-400 text-xs font-medium ring-1 ring-green-500/20">
                    <RefreshCw className="w-3.5 h-3.5" /> Restore Now
                  </button>
                </div>
              )}
              {recoverStatus === 'restoring' && (
                <div className="flex items-center justify-center gap-2 py-2.5 text-green-300 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Restoring...
                </div>
              )}
              {recoverStatus === 'restored' && (
                <div className="flex items-center justify-center gap-2 py-2.5 text-green-400 text-xs">
                  <Check className="w-3.5 h-3.5" /> Restored! Reloading...
                </div>
              )}
              {recoverStatus === 'nothing' && (
                <div className="space-y-2">
                  <p className="text-xs text-grappler-500 py-1">No backups found.</p>
                  {workoutLogCount > 0 && (
                    <button
                      onClick={() => {
                        hapticMedium();
                        recalculateGamificationStats();
                        showToast(`Recomputed from ${workoutLogCount} workouts!`, 'success');
                        setRecoverStatus('restored');
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-500/10 text-primary-400 text-xs font-medium ring-1 ring-primary-500/20"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Recalculate XP &amp; Stats
                    </button>
                  )}
                </div>
              )}
              {recoverStatus === 'error' && (
                <div className="space-y-1">
                  <p className="text-xs text-red-400">Scan failed.</p>
                  <button onClick={() => setRecoverStatus('idle')} className="text-xs text-amber-400 underline">Retry</button>
                </div>
              )}
            </div>
          )}

          {/* Danger Zone */}
          <div className="pt-3 border-t border-red-500/10 mt-3">
            <div className="space-y-2">
              <button
                onClick={() => {
                  hapticHeavy();
                  setConfirmDialog({
                    title: 'Reset All Data',
                    message: 'Erase all progress, workouts, and achievements. Cannot be undone.',
                    confirmLabel: 'Reset Everything', danger: true,
                    onConfirm: () => { setConfirmDialog(null); resetStore(); },
                  });
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-red-400/70 text-xs font-medium ring-1 ring-red-500/15 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Reset All Data
              </button>
              {isSignedIn && (
                <button onClick={handleDeleteAccount} disabled={deleteLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-red-400/70 text-xs font-medium ring-1 ring-red-500/15 hover:bg-red-500/10 transition-colors">
                  {deleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  {deleteLoading ? 'Deleting...' : 'Delete Account'}
                </button>
              )}
            </div>
          </div>

          <VersionFooter />
        </motion.div>
      </section>

      {/* ── MODALS ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {/* ── Badge Detail Modal ──────────────────────────────────────── */}
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg rounded-t-2xl bg-grappler-900 border-t border-grappler-700/50 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pt-3 pb-6 px-5">
                {/* Handle */}
                <div className="w-8 h-1 rounded-full bg-grappler-600 mx-auto mb-5" />

                {/* Badge icon + name */}
                <div className="text-center mb-5">
                  <div className={cn(
                    'w-20 h-20 rounded-lg flex items-center justify-center mx-auto mb-3 text-4xl',
                    selectedBadge.earned
                      ? 'bg-grappler-700/60 ring-2 ring-primary-500/40'
                      : 'bg-grappler-800/60 grayscale opacity-60'
                  )}>
                    {selectedBadge.badge.icon}
                  </div>
                  <h3 className="text-lg font-bold text-grappler-50">{selectedBadge.badge.name}</h3>
                  <p className="text-sm text-grappler-400 mt-1">{selectedBadge.badge.description}</p>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-grappler-800/50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-primary-400">+{selectedBadge.badge.points}</p>
                    <p className="text-xs text-grappler-500">XP Reward</p>
                  </div>
                  <div className="bg-grappler-800/50 rounded-xl p-3 text-center">
                    <p className="text-sm font-semibold text-grappler-200 capitalize">{selectedBadge.badge.category}</p>
                    <p className="text-xs text-grappler-500">Category</p>
                  </div>
                </div>

                {/* Status */}
                <div className={cn(
                  'rounded-xl p-3 text-center',
                  selectedBadge.earned ? 'bg-green-500/10 border border-green-500/20' : 'bg-grappler-800/50 border border-grappler-700/30'
                )}>
                  {selectedBadge.earned ? (
                    <div className="flex items-center justify-center gap-2">
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400 font-medium">
                        Earned {selectedBadge.earnedAt ? new Date(selectedBadge.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-grappler-400">Not yet earned — keep pushing</p>
                  )}
                </div>

                {/* Close button */}
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="w-full mt-4 py-3 rounded-xl bg-grappler-800 text-sm font-medium text-grappler-300 active:bg-grappler-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {confirmDialog && (
          <motion.div
            key="confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={confirmDialog.title}
            onClick={() => setConfirmDialog(null)}
            onKeyDown={(e) => { if (e.key === 'Escape') setConfirmDialog(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-lg bg-grappler-800 border border-grappler-700 shadow-2xl overflow-hidden"
            >
              <div className="p-5">
                <h3 className={cn('text-base font-bold mb-1.5', confirmDialog.danger ? 'text-red-400' : 'text-grappler-100')}>
                  {confirmDialog.title}
                </h3>
                <p className="text-sm text-grappler-400 leading-relaxed">{confirmDialog.message}</p>
              </div>
              <div className="flex gap-2 px-5 pb-5">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-2.5 rounded-xl bg-grappler-700 text-grappler-300 text-sm font-medium hover:bg-grappler-600 transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors active:scale-95',
                    confirmDialog.danger
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-1 ring-red-500/30'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  )}
                >
                  {confirmDialog.confirmLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── VERSION FOOTER ──────────────────────────────────────────────────────────
function VersionFooter() {
  const [showChangelog, setShowChangelog] = useState(false);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowChangelog(!showChangelog)}
        className="w-full flex items-center justify-center gap-2 py-3 text-grappler-600 hover:text-grappler-400 transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
        <span className="text-xs">Ibra Lifts v{APP_VERSION}</span>
        {showChangelog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {showChangelog && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="card p-4 space-y-4">
              {VERSION_HISTORY.map((ver) => (
                <div key={ver.version} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-primary-400" />
                    <span className="text-xs font-mono font-bold text-primary-400">v{ver.version}</span>
                    <span className="text-xs text-grappler-500">{ver.releasedAt}</span>
                  </div>
                  <ul className="space-y-1 pl-5">
                    {ver.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-grappler-500">
                        <ChevronRight className="w-2.5 h-2.5 text-grappler-600 flex-shrink-0 mt-0.5" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
