'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  ArrowLeft,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { APP_VERSION, VERSION_HISTORY } from '@/lib/app-version';
import { getLevelTitle, levelProgress, pointsToNextLevel, badges } from '@/lib/gamification';
import { BiologicalSex, WeightUnit, ExperienceLevel, GoalFocus, Equipment, WearableUsage, WearableProvider, DEFAULT_EQUIPMENT_PROFILES, EquipmentType, Badge, UserBadge } from '@/lib/types';
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
        <span className="text-[42px] font-black text-grappler-50 leading-none tabular-nums">{level}</span>
        <span className="text-[10px] text-grappler-400 uppercase tracking-[0.2em] mt-0.5">Level</span>
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
            inputMode={type === 'number' ? 'numeric' : undefined}
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
  const { user, gamificationStats, baselineLifts, setBaselineLifts, resetStore, setUser, restartOnboarding, generateNewMesocycle, colorTheme, setColorTheme, homeGymEquipment, setHomeGymEquipment, recalculateGamificationStats, workoutLogCount } = useAppStore(
    useShallow(s => ({
      user: s.user, gamificationStats: s.gamificationStats, baselineLifts: s.baselineLifts, setBaselineLifts: s.setBaselineLifts,
      resetStore: s.resetStore, setUser: s.setUser, restartOnboarding: s.restartOnboarding, generateNewMesocycle: s.generateNewMesocycle,
      colorTheme: s.colorTheme, setColorTheme: s.setColorTheme, homeGymEquipment: s.homeGymEquipment, setHomeGymEquipment: s.setHomeGymEquipment,
      recalculateGamificationStats: s.recalculateGamificationStats, workoutLogCount: s.workoutLogs.length,
    }))
  );
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
  const weightUnit = user?.weightUnit || 'kg';
  const { showToast } = useToast();

  // ── State ────────────────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  const progress = levelProgress(gamificationStats.totalPoints);
  const pointsNeeded = pointsToNextLevel(gamificationStats.totalPoints);
  const earnedBadgeIds = new Set(gamificationStats.badges.map(b => b.badgeId));

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
    setUser({ ...user, ...patch, updatedAt: new Date() });
  }, [user, setUser]);

  const displayWeight = (kg: number | undefined) => {
    if (!kg) return '';
    return weightUnit === 'kg' ? `${Math.round(kg)}` : `${Math.round(kg * 2.205)}`;
  };

  const parseWeightToKg = (val: string) => {
    const num = parseFloat(val) || 0;
    return weightUnit === 'kg' ? num : num / 2.205;
  };

  const saveLift = (key: string, val: string) => {
    const num = val === '' ? null : Number(val);
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

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  // ── Settings sub-screen (slides in from right) ─────────────────────────
  if (settingsOpen) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="space-y-3 pb-4"
      >
        {/* Settings Header */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => { setSettingsOpen(false); hapticLight(); }}
            className="w-9 h-9 rounded-xl bg-grappler-800/80 backdrop-blur-sm flex items-center justify-center hover:bg-grappler-700 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-grappler-300" />
          </button>
          <h2 className="text-lg font-bold text-grappler-50">Settings</h2>
        </div>

        {/* Body & Identity */}
        <SectionCard
          title="Body & Identity"
          icon={User}
          subtitle={[
            user?.sex ? (user.sex === 'male' ? 'M' : 'F') : null,
            user?.age ? `${user.age}y` : null,
            user?.bodyWeightKg ? `${displayWeight(user.bodyWeightKg)}${weightUnit}` : null,
          ].filter(Boolean).join(' · ') || 'Not configured'}
          defaultOpen
        >
          <div className="pt-3 divide-y divide-grappler-700/30">
            <InlineField label="Name" value={user?.name || ''} onSave={v => updateUser({ name: v })} />
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
          </div>
        </SectionCard>

        {/* Training Setup */}
        <SectionCard
          title="Training Setup"
          icon={Target}
          subtitle={[user?.experienceLevel, user?.equipment?.replace('_', ' ')].filter(Boolean).join(' · ') || 'Not configured'}
        >
          <div className="pt-3 space-y-4">
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

            <div>
              <p className="text-xs text-grappler-400 mb-2">Training Location</p>
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
            </div>

            <AnimatePresence>
              {user?.equipment === 'home_gym' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
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
                          {isSelected ? '✓ ' : ''}{label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-grappler-600 mt-1.5">Bodyweight always included</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </SectionCard>

        {/* Wearable */}
        <SectionCard
          title="Wearable"
          icon={Watch}
          subtitle={
            user?.wearableUsage === 'whoop' ? 'Whoop connected'
              : user?.wearableUsage === 'other_wearable' ? (user?.wearableProvider || 'Connected')
              : 'Not connected'
          }
        >
          <div className="pt-3 space-y-2">
            {([
              { value: 'whoop' as WearableUsage, icon: Activity, label: 'Whoop', desc: 'Auto-sync recovery & strain', color: 'emerald' },
              { value: 'other_wearable' as WearableUsage, icon: Watch, label: 'Other Wearable', desc: 'Apple Watch, Oura, Garmin', color: 'blue' },
              { value: 'no_wearable' as WearableUsage, icon: X, label: 'No Wearable', desc: 'Manual check-ins', color: 'gray' },
            ]).map((opt) => {
              const selected = user?.wearableUsage === opt.value;
              return (
                <button key={opt.value}
                  onClick={() => {
                    if (!user) return;
                    const provider: WearableProvider | undefined =
                      opt.value === 'whoop' ? 'whoop' :
                      opt.value === 'no_wearable' ? undefined : user.wearableProvider;
                    updateUser({ wearableUsage: opt.value, wearableProvider: provider });
                    hapticLight();
                  }}
                  className={cn(
                    'w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 ring-1',
                    selected
                      ? opt.color === 'emerald' ? 'ring-emerald-500/50 bg-emerald-500/10'
                        : opt.color === 'blue' ? 'ring-blue-500/50 bg-blue-500/10'
                        : 'ring-grappler-600 bg-grappler-700/30'
                      : 'ring-grappler-700/50 hover:ring-grappler-600'
                  )}>
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                    selected
                      ? opt.color === 'emerald' ? 'bg-emerald-500/20'
                        : opt.color === 'blue' ? 'bg-blue-500/20'
                        : 'bg-grappler-700'
                      : 'bg-grappler-700/50'
                  )}>
                    <opt.icon className={cn(
                      'w-4 h-4',
                      selected
                        ? opt.color === 'emerald' ? 'text-emerald-400'
                          : opt.color === 'blue' ? 'text-blue-400'
                          : 'text-grappler-400'
                        : 'text-grappler-500'
                    )} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-grappler-100">{opt.label}</p>
                    <p className="text-xs text-grappler-400">{opt.desc}</p>
                  </div>
                  {selected && <Check className="w-4 h-4 text-primary-400 flex-shrink-0" />}
                </button>
              );
            })}

            <AnimatePresence>
              {user?.wearableUsage === 'other_wearable' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {([
                      { value: 'apple_health' as WearableProvider, label: 'Apple Watch' },
                      { value: 'oura' as WearableProvider, label: 'Oura' },
                      { value: 'garmin' as WearableProvider, label: 'Garmin' },
                    ]).map((w) => (
                      <button key={w.value}
                        onClick={() => { updateUser({ wearableProvider: w.value }); hapticLight(); }}
                        className={cn(
                          'py-2 rounded-xl text-xs font-medium transition-all active:scale-95',
                          user?.wearableProvider === w.value
                            ? 'bg-blue-500 text-white'
                            : 'bg-grappler-700/60 text-grappler-400'
                        )}>
                        {w.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </SectionCard>

        {/* Advanced */}
        <SectionCard title="Advanced" icon={Settings} subtitle="Reconfigure, recovery, danger zone">
          <div className="pt-3 space-y-4">
            <div>
              <p className="text-xs text-grappler-400 mb-2">Re-run setup to change goals and style. History is preserved.</p>
              <button
                onClick={() => {
                  setConfirmDialog({
                    title: 'Reconfigure Training',
                    message: 'This takes you through setup again. Your workouts and history are preserved.',
                    confirmLabel: 'Reconfigure',
                    onConfirm: () => { setConfirmDialog(null); restartOnboarding(); },
                  });
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-500/10 text-primary-400 font-medium text-xs ring-1 ring-primary-500/20 hover:bg-primary-500/20 transition-colors active:scale-[0.98]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reconfigure Training
              </button>
            </div>

            {isSignedIn && (
              <div className="pt-3 border-t border-grappler-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <p className="text-xs text-amber-400 font-medium">Data Recovery</p>
                </div>
                <p className="text-xs text-grappler-500 mb-2">Scan the database if your data disappeared.</p>

                {recoverStatus === 'idle' && (
                  <div className="space-y-2">
                    <button onClick={handleScanForData}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 text-xs font-medium ring-1 ring-amber-500/20 hover:bg-amber-500/20 transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" /> Scan for Lost Data
                    </button>
                    {workoutLogCount > 0 && gamificationStats.totalWorkouts === 0 && (
                      <button
                        onClick={() => {
                          hapticMedium();
                          recalculateGamificationStats();
                          showToast(`Recomputed stats from ${workoutLogCount} workouts!`, 'success');
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-500/10 text-primary-400 text-xs font-medium ring-1 ring-primary-500/20 hover:bg-primary-500/20 transition-colors">
                        <Sparkles className="w-3.5 h-3.5" /> Recompute Stats from {workoutLogCount} Workouts
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
                    <div className="bg-grappler-900/50 rounded-xl p-2.5 space-y-1">
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
                    <p className="text-xs text-grappler-500 py-1">No backups or database records found.</p>
                    {workoutLogCount > 0 && gamificationStats.totalWorkouts === 0 && (
                      <button
                        onClick={() => {
                          hapticMedium();
                          recalculateGamificationStats();
                          showToast(`Recomputed from ${workoutLogCount} workouts!`, 'success');
                          setRecoverStatus('restored');
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-500/10 text-primary-400 text-xs font-medium ring-1 ring-primary-500/20"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Recompute from {workoutLogCount} Workouts
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

            <div className="pt-3 border-t border-red-500/10">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400/60" />
                <p className="text-xs text-red-400/60 font-medium">Danger Zone</p>
              </div>
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
          </div>
        </SectionCard>

        <VersionFooter />

        {/* Confirm Dialog (shared) */}
        <AnimatePresence>
          {confirmDialog && (
            <motion.div
              key="confirm-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setConfirmDialog(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl bg-grappler-800 border border-grappler-700 shadow-2xl overflow-hidden"
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
      </motion.div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // FIGHTER CARD (main profile view)
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4 pb-4">

      {/* ── 1. COMPACT HERO ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative -mx-4 -mt-4 overflow-hidden"
      >
        <div className="relative bg-gradient-to-b from-primary-500/15 via-primary-500/5 to-transparent px-4 pt-5 pb-4">
          {/* Decorative glow — smaller */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary-500/8 rounded-full blur-3xl pointer-events-none" />

          {/* Close button (overlay mode) */}
          {onClose && (
            <button
              onClick={() => { onClose(); hapticLight(); }}
              className="absolute top-3 left-3 w-8 h-8 rounded-xl bg-grappler-800/60 backdrop-blur-sm flex items-center justify-center hover:bg-grappler-700/80 transition-colors active:scale-95 z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-grappler-400" />
            </button>
          )}

          {/* Gear icon */}
          <button
            onClick={() => { setSettingsOpen(true); hapticLight(); }}
            className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-grappler-800/60 backdrop-blur-sm flex items-center justify-center hover:bg-grappler-700/80 transition-colors active:scale-95 z-10"
          >
            <Settings className="w-4 h-4 text-grappler-400" />
          </button>

          {/* Horizontal layout: Ring left, Identity right */}
          <div className="relative flex items-center gap-4 pt-1">
            <LevelRing progress={progress} level={gamificationStats.level} size={88} stroke={4} />

            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-grappler-50 tracking-tight truncate">
                {user?.name || 'Athlete'}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Crown className="w-3 h-3 text-primary-400" />
                <span className="text-xs text-primary-400 font-semibold">
                  {getLevelTitle(gamificationStats.level)}
                </span>
              </div>

              {/* XP bar — inline */}
              <div className="mt-2.5">
                <div className="h-1.5 bg-grappler-800/60 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-grappler-500 mt-1 tabular-nums">
                  <span>{formatNumber(gamificationStats.totalPoints)} XP</span>
                  <span>{formatNumber(pointsNeeded)} to next</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Banner — compact */}
        <div className="grid grid-cols-4 divide-x divide-grappler-700/30 px-2">
          {([
            { value: gamificationStats.totalWorkouts, label: 'Workouts' },
            { value: gamificationStats.personalRecords, label: 'PRs' },
            { value: gamificationStats.currentStreak, label: 'Streak' },
            { value: gamificationStats.badges.length, label: 'Badges' },
          ]).map((s) => (
            <div key={s.label} className="text-center py-2">
              <span className="text-xl font-black text-grappler-50 tabular-nums block leading-none">{s.value}</span>
              <span className="text-[9px] text-grappler-500 uppercase tracking-widest mt-0.5 block">{s.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── 2. ACHIEVEMENT SHELF ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card overflow-hidden"
      >
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-yellow-500" />
              <h3 className="text-xs font-semibold text-grappler-100">Achievements</h3>
              <span className="text-[10px] text-grappler-500">{gamificationStats.badges.length}/{badges.length}</span>
            </div>
            {gamificationStats.badges.length > 0 && (
              <button
                onClick={() => { setShowAllBadges(!showAllBadges); hapticLight(); }}
                className="text-[10px] text-primary-400 hover:text-primary-300 font-medium"
              >
                {showAllBadges ? 'Less' : 'See all'}
              </button>
            )}
          </div>

          {gamificationStats.badges.length > 0 ? (
            <div className={cn(
              showAllBadges ? 'grid grid-cols-5 gap-2' : 'flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-0.5 px-0.5'
            )}>
              {(showAllBadges ? gamificationStats.badges : gamificationStats.badges.slice(0, 8)).map((ub) => (
                <button
                  key={ub.id}
                  onClick={() => { hapticLight(); setSelectedBadge({ badge: ub.badge, earned: true, earnedAt: ub.earnedAt }); }}
                  className={cn('text-center active:scale-95 transition-transform', !showAllBadges && 'flex-shrink-0')}
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-grappler-700/80 to-grappler-800/80 rounded-xl flex items-center justify-center mx-auto mb-1 text-lg ring-1 ring-primary-500/30 shadow-md shadow-primary-500/10">
                      {ub.badge.icon}
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary-500 rounded-full flex items-center justify-center">
                      <Check className="w-2 h-2 text-white" />
                    </div>
                  </div>
                  <p className="text-[10px] font-medium text-grappler-200 truncate max-w-[52px] mx-auto">{ub.badge.name}</p>
                  <p className="text-[9px] text-primary-400 font-semibold">+{ub.badge.points}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-grappler-800/60 rounded-xl flex items-center justify-center mx-auto mb-2 text-xl opacity-40 ring-1 ring-grappler-700/50">
                🏆
              </div>
              <p className="text-xs text-grappler-500 font-medium">No badges yet</p>
              <p className="text-[10px] text-grappler-600 mt-0.5">Complete workouts to start earning</p>
            </div>
          )}

          {showAllBadges && (
            <div className="mt-3 pt-2 border-t border-grappler-700/50">
              <p className="text-[10px] text-grappler-500 mb-2">Locked</p>
              <div className="grid grid-cols-5 gap-2">
                {badges.filter(b => !earnedBadgeIds.has(b.id)).map((badge) => (
                  <button
                    key={badge.id}
                    onClick={() => { hapticLight(); setSelectedBadge({ badge, earned: false }); }}
                    className="text-center opacity-40 active:scale-95 active:opacity-60 transition-all"
                  >
                    <div className="w-11 h-11 bg-grappler-800/60 rounded-xl flex items-center justify-center mx-auto mb-0.5 text-lg grayscale">
                      {badge.icon}
                    </div>
                    <p className="text-[10px] text-grappler-500 truncate max-w-[48px] mx-auto">{badge.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {nextBadge && !showAllBadges && (
            <div className="mt-2 flex items-center gap-2.5 bg-gradient-to-r from-primary-500/10 to-accent-500/10 rounded-lg p-2.5 ring-1 ring-primary-500/20">
              <div className="w-8 h-8 bg-grappler-800/80 rounded-lg flex items-center justify-center text-sm grayscale opacity-50 flex-shrink-0">
                {nextBadge.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-primary-300 font-semibold truncate">Up next: {nextBadge.name}</p>
                <p className="text-[10px] text-grappler-500 truncate">{nextBadge.description}</p>
              </div>
              <Zap className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
            </div>
          )}
        </div>
      </motion.div>

      {/* ── 3. LIFETIME STATS ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 gap-1.5"
      >
        {([
          { icon: Dumbbell, label: 'Total Volume', value: formatNumber(gamificationStats.totalVolume), suffix: weightUnit, color: 'from-primary-500/15 to-primary-500/5' },
          { icon: Flame, label: 'Best Streak', value: `${gamificationStats.longestStreak}`, suffix: 'days', color: 'from-orange-500/15 to-orange-500/5' },
          { icon: Star, label: 'Total Points', value: formatNumber(gamificationStats.totalPoints), suffix: '', color: 'from-yellow-500/15 to-yellow-500/5' },
          { icon: Medal, label: 'Current Streak', value: `${gamificationStats.currentStreak}`, suffix: 'days', color: 'from-accent-500/15 to-accent-500/5' },
        ] as const).map((stat) => (
          <div key={stat.label} className={cn('card p-2.5 bg-gradient-to-br', stat.color)}>
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon className="w-3 h-3 text-grappler-400" />
              <p className="text-[10px] text-grappler-400 uppercase tracking-wider">{stat.label}</p>
            </div>
            <p className="text-base font-bold text-grappler-50 tabular-nums leading-tight">
              {stat.value}
              {stat.suffix && <span className="text-[10px] text-grappler-400 ml-1 font-normal">{stat.suffix}</span>}
            </p>
          </div>
        ))}
      </motion.div>

      {/* ── 4. STRENGTH PROFILE ─────────────────────────────────────────── */}
      {(baselineLifts || user) && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card overflow-hidden"
        >
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Dumbbell className="w-4 h-4 text-grappler-400" />
              <h3 className="text-sm font-semibold text-grappler-100">Strength Profile</h3>
              <span className="text-xs text-grappler-500 ml-auto">1RM · {weightUnit}</span>
            </div>

            <div className="space-y-3">
              {([
                { key: 'squat', label: 'Squat', value: baselineLifts?.squat, color: 'from-red-500 to-red-400', bg: 'bg-red-500/10' },
                { key: 'deadlift', label: 'Deadlift', value: baselineLifts?.deadlift, color: 'from-orange-500 to-amber-400', bg: 'bg-orange-500/10' },
                { key: 'benchPress', label: 'Bench', value: baselineLifts?.benchPress, color: 'from-blue-500 to-sky-400', bg: 'bg-blue-500/10' },
                { key: 'overheadPress', label: 'OHP', value: baselineLifts?.overheadPress, color: 'from-purple-500 to-violet-400', bg: 'bg-purple-500/10' },
                { key: 'barbellRow', label: 'Row', value: baselineLifts?.barbellRow, color: 'from-emerald-500 to-green-400', bg: 'bg-emerald-500/10' },
              ] as const).map((lift) => {
                const maxLift = Math.max(
                  baselineLifts?.squat || 0, baselineLifts?.deadlift || 0,
                  baselineLifts?.benchPress || 0, baselineLifts?.overheadPress || 0,
                  baselineLifts?.barbellRow || 0, 1
                );
                const pct = lift.value ? (lift.value / maxLift) * 100 : 0;
                const isEditing = editingLift === lift.key;

                return (
                  <div key={lift.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-grappler-400 w-12">{lift.label}</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            type="number"
                            inputMode="numeric"
                            value={liftDraft}
                            onChange={e => setLiftDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveLift(lift.key, liftDraft);
                              if (e.key === 'Escape') setEditingLift(null);
                            }}
                            onBlur={() => saveLift(lift.key, liftDraft)}
                            className="w-16 bg-grappler-900 border border-primary-500/50 rounded px-2 py-0.5 text-xs text-right text-grappler-100 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-xs text-grappler-500">{weightUnit}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingLift(lift.key); setLiftDraft(lift.value ? String(lift.value) : ''); }}
                          className="flex items-center gap-1 group"
                        >
                          <span className="text-sm font-black text-grappler-50 tabular-nums">
                            {lift.value ? `${lift.value}` : '—'}
                            {lift.value && <span className="text-xs font-normal text-grappler-400 ml-0.5">{weightUnit}</span>}
                          </span>
                          <Pencil className="w-2.5 h-2.5 text-grappler-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </div>
                    <div className={cn('h-2.5 rounded-full overflow-hidden', lift.bg)}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={cn('h-full rounded-full bg-gradient-to-r', lift.color)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── 5. TRAINING WEEK ────────────────────────────────────────────── */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-grappler-400" />
            <h3 className="text-sm font-semibold text-grappler-100">Training Week</h3>
            {(() => {
              const liftCount = user.trainingDays?.length || 0;
              const combatCount = new Set((user.combatTrainingDays || []).map(d => d.day)).size;
              const allActive = new Set([...(user.trainingDays || []), ...(user.combatTrainingDays || []).map(d => d.day)]);
              return <span className="text-xs text-grappler-500 ml-auto">{liftCount}L · {combatCount}C · {7 - allActive.size}R</span>;
            })()}
          </div>

          <div className="flex justify-between px-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => {
              const isLift = user.trainingDays?.includes(i) ?? false;
              const hasCombat = (user.combatTrainingDays || []).some(d => d.day === i);
              const isBoth = isLift && hasCombat;
              return (
                <button
                  key={i}
                  onClick={() => {
                    const current = user.trainingDays || [];
                    const next = isLift ? current.filter(d => d !== i) : [...current, i].sort();
                    updateUser({ trainingDays: next });
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const current = user.combatTrainingDays || [];
                    const next = hasCombat
                      ? current.filter(d => d.day !== i)
                      : [...current, { day: i, intensity: 'moderate' as const }];
                    updateUser({ combatTrainingDays: next });
                  }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span className="text-[10px] text-grappler-500 font-medium">{day}</span>
                  <div className={cn(
                    'w-8 h-8 rounded-full transition-all active:scale-90 flex items-center justify-center',
                    isBoth ? 'bg-gradient-to-br from-green-500 to-purple-500 shadow-md shadow-green-500/20'
                      : isLift ? 'bg-green-500/25 ring-2 ring-green-500/40'
                      : hasCombat ? 'bg-purple-500/25 ring-2 ring-purple-500/40'
                      : 'bg-grappler-800/40 ring-1 ring-grappler-700/40'
                  )}>
                    {(isLift || hasCombat) && (
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        isBoth ? 'bg-white' : isLift ? 'bg-green-400' : 'bg-purple-400'
                      )} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-4 mt-2.5">
            {[
              { color: 'bg-green-500/30 ring-1 ring-green-500/50', label: 'Lift' },
              { color: 'bg-purple-500/30 ring-1 ring-purple-500/50', label: 'Combat' },
              { color: 'bg-gradient-to-br from-green-500 to-purple-500', label: 'Both' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-grappler-500">
                <div className={cn('w-2 h-2 rounded-full', l.color)} />
                {l.label}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── 6. THEME ─────────────────────────────────────────────────── */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4 text-grappler-400" />
          <h3 className="text-sm font-semibold text-grappler-100">Theme</h3>
        </div>
        <div className="flex gap-2">
          {([
            { id: 'steel' as ColorTheme, label: 'Steel', colors: ['#3b82f6', '#06b6d4'] },
            { id: 'rose' as ColorTheme, label: 'Rose', colors: ['#ec4899', '#f43f5e'] },
            { id: 'emerald' as ColorTheme, label: 'Emerald', colors: ['#10b981', '#22c55e'] },
            { id: 'amber' as ColorTheme, label: 'Amber', colors: ['#f59e0b', '#f97316'] },
          ]).map(theme => {
            const isActive = (colorTheme || 'steel') === theme.id;
            return (
              <button key={theme.id}
                onClick={() => { hapticLight(); setColorTheme(theme.id); }}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl transition-all active:scale-95',
                  isActive
                    ? 'ring-2 ring-primary-500/60 bg-primary-500/10'
                    : 'bg-grappler-800/40 ring-1 ring-grappler-700/50 hover:ring-grappler-600'
                )}>
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded-full" style={{ background: theme.colors[0] }} />
                  <div className="w-4 h-4 rounded-full" style={{ background: theme.colors[1] }} />
                </div>
                <span className={cn('text-xs font-medium', isActive ? 'text-primary-400' : 'text-grappler-500')}>
                  {theme.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 7. ACCOUNT ────────────────────────────────────────────────── */}
      <div className="card p-4 space-y-3">
        {isSignedIn ? (
          <>
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400 font-medium">Synced</span>
              <span className="text-xs text-grappler-500 truncate">{session.user?.email}</span>
            </div>

            {emailVerified === false && (
              <div className="flex items-start gap-2 rounded-xl bg-yellow-500/10 ring-1 ring-yellow-500/30 p-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-yellow-300 font-medium">Verify your email</p>
                  {verifySent ? (
                    <p className="text-xs text-green-400 mt-1">Sent! Check inbox.</p>
                  ) : (
                    <button onClick={handleResendVerification} disabled={verifyLoading}
                      className="mt-1 flex items-center gap-1 text-xs text-primary-400 font-medium">
                      {verifyLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                      {verifyLoading ? 'Sending...' : 'Resend email'}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
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
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-grappler-700/50 text-grappler-300 text-xs font-medium hover:bg-grappler-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <button
                onClick={() => {
                  setConfirmDialog({
                    title: 'Sign Out',
                    message: 'Local data stays, cloud sync stops until you sign back in.',
                    confirmLabel: 'Sign Out',
                    onConfirm: () => { setConfirmDialog(null); signOut({ callbackUrl: '/' }); },
                  });
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-grappler-700/50 text-grappler-300 text-xs font-medium hover:bg-grappler-700 transition-colors"
              >
                <DoorOpen className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <CloudOff className="w-4 h-4 text-grappler-500" />
              <span className="text-xs text-grappler-400">Local only — sign in for cloud sync</span>
            </div>
            <button
              onClick={() => signIn(undefined, { callbackUrl: '/' })}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 transition-colors active:scale-[0.98]"
            >
              <User className="w-4 h-4" />
              Sign In
            </button>
          </>
        )}
      </div>


      {/* ── VERSION ──────────────────────────────────────────────────── */}
      <VersionFooter />

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
                    'w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-4xl',
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
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setConfirmDialog(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-grappler-800 border border-grappler-700 shadow-2xl overflow-hidden"
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
        <span className="text-xs">Roots Gains v{APP_VERSION}</span>
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
