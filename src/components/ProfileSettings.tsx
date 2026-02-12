'use client';

import { useState, useEffect, useCallback } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
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
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { getLevelTitle, levelProgress, pointsToNextLevel, badges } from '@/lib/gamification';
import { BiologicalSex, WeightUnit, ExperienceLevel, GoalFocus, Equipment, WearableUsage, WearableProvider, DEFAULT_EQUIPMENT_PROFILES, EquipmentType } from '@/lib/types';
import type { ColorTheme } from '@/lib/types';
import { useToast } from './Toast';
import { hapticMedium, hapticHeavy, hapticLight } from '@/lib/haptics';

export default function ProfileSettings() {
  const { user, gamificationStats, baselineLifts, setBaselineLifts, resetStore, setUser, restartOnboarding, generateNewMesocycle, colorTheme, setColorTheme } = useAppStore();
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
  const weightUnit = user?.weightUnit || 'kg';
  const [showBadges, setShowBadges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifySent, setVerifySent] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Edit form state
  const [editName, setEditName] = useState(user?.name || '');
  const [editAge, setEditAge] = useState(user?.age || 0);
  const [editHeight, setEditHeight] = useState(user?.heightCm || 0);
  const [editSex, setEditSex] = useState<BiologicalSex | undefined>(user?.sex);
  const [editBodyWeight, setEditBodyWeight] = useState(user?.bodyWeightKg || 0);
  const [editUnit, setEditUnit] = useState<WeightUnit>(user?.weightUnit || 'kg');
  const [editExperience, setEditExperience] = useState<ExperienceLevel>(user?.experienceLevel || 'intermediate');
  const [editEquipment, setEditEquipment] = useState<Equipment>(user?.equipment || 'full_gym');
  const [editAvailableEquipment, setEditAvailableEquipment] = useState<EquipmentType[]>(user?.availableEquipment || []);
  const [editWearable, setEditWearable] = useState<WearableUsage | undefined>(user?.wearableUsage);
  const [editWearableProvider, setEditWearableProvider] = useState<WearableProvider | undefined>(user?.wearableProvider);
  const [editSquat, setEditSquat] = useState<number | ''>(baselineLifts?.squat ?? '');
  const [editDeadlift, setEditDeadlift] = useState<number | ''>(baselineLifts?.deadlift ?? '');
  const [editBench, setEditBench] = useState<number | ''>(baselineLifts?.benchPress ?? '');
  const [editOHP, setEditOHP] = useState<number | ''>(baselineLifts?.overheadPress ?? '');
  const [editRow, setEditRow] = useState<number | ''>(baselineLifts?.barbellRow ?? '');

  const progress = levelProgress(gamificationStats.totalPoints);
  const pointsNeeded = pointsToNextLevel(gamificationStats.totalPoints);
  const earnedBadgeIds = new Set(gamificationStats.badges.map(b => b.badgeId));

  // Check email verification status when signed in
  useEffect(() => {
    if (isSignedIn && session?.user?.email) {
      fetch('/api/auth/verify-email')
        .then(res => res.json())
        .then(data => {
          if (typeof data.verified === 'boolean') setEmailVerified(data.verified);
        })
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
      if (res.ok && data.emailSent) {
        setVerifySent(true);
      } else if (res.ok && !data.emailSent) {
        showToast('Email service not configured. Contact support.', 'error');
      } else {
        showToast(data.error || 'Failed to send verification email.', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setVerifyLoading(false);
    }
  }, [session?.user?.email]);

  const executeDeleteAccount = useCallback(async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/auth/account', { method: 'DELETE' });
      if (res.ok) {
        resetStore();
        signOut({ callbackUrl: '/' });
      } else {
        showToast('Failed to delete account. Please try again.', 'error');
      }
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  }, [resetStore]);

  const handleDeleteAccount = useCallback(() => {
    hapticHeavy();
    setConfirmDialog({
      title: 'Delete Account',
      message: 'Permanently delete your account and all cloud data? This cannot be undone.',
      confirmLabel: 'Delete Forever',
      danger: true,
      onConfirm: () => {
        setConfirmDialog(null);
        executeDeleteAccount();
      },
    });
  }, [executeDeleteAccount]);

  const startEditing = () => {
    setEditName(user?.name || '');
    setEditAge(user?.age || 0);
    setEditHeight(user?.heightCm || 0);
    setEditSex(user?.sex);
    setEditBodyWeight(user?.bodyWeightKg || 0);
    setEditUnit(user?.weightUnit || 'kg');
    setEditExperience(user?.experienceLevel || 'intermediate');
    setEditEquipment(user?.equipment || 'full_gym');
    setEditAvailableEquipment(user?.availableEquipment || []);
    setEditWearable(user?.wearableUsage);
    setEditWearableProvider(user?.wearableProvider);
    setEditSquat(baselineLifts?.squat ?? '');
    setEditDeadlift(baselineLifts?.deadlift ?? '');
    setEditBench(baselineLifts?.benchPress ?? '');
    setEditOHP(baselineLifts?.overheadPress ?? '');
    setEditRow(baselineLifts?.barbellRow ?? '');
    setIsEditing(true);
  };

  const saveEdits = () => {
    if (!user) return;
    hapticMedium();
    setSaving(true);

    // Detect if training-critical fields changed (these affect mesocycle programming)
    const trainingFieldsChanged =
      editSex !== user.sex ||
      editExperience !== user.experienceLevel ||
      editEquipment !== user.equipment ||
      JSON.stringify(editAvailableEquipment) !== JSON.stringify(user.availableEquipment);

    setUser({
      ...user,
      name: editName,
      age: editAge,
      bodyWeightKg: editBodyWeight || undefined,
      heightCm: editHeight || undefined,
      sex: editSex,
      weightUnit: editUnit,
      experienceLevel: editExperience,
      equipment: editEquipment,
      availableEquipment: editAvailableEquipment,
      wearableUsage: editWearable,
      wearableProvider: editWearableProvider,
      updatedAt: new Date(),
    });
    // Save baseline lifts
    const newBaseline = {
      id: baselineLifts?.id || user.id + '-baseline',
      userId: user.id,
      squat: editSquat === '' ? null : Number(editSquat),
      deadlift: editDeadlift === '' ? null : Number(editDeadlift),
      benchPress: editBench === '' ? null : Number(editBench),
      overheadPress: editOHP === '' ? null : Number(editOHP),
      barbellRow: editRow === '' ? null : Number(editRow),
      pullUp: baselineLifts?.pullUp ?? null,
      createdAt: baselineLifts?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    setBaselineLifts(newBaseline);

    // Check if baseline lifts actually changed
    const baselineChanged =
      (editSquat === '' ? null : Number(editSquat)) !== (baselineLifts?.squat ?? null) ||
      (editDeadlift === '' ? null : Number(editDeadlift)) !== (baselineLifts?.deadlift ?? null) ||
      (editBench === '' ? null : Number(editBench)) !== (baselineLifts?.benchPress ?? null) ||
      (editOHP === '' ? null : Number(editOHP)) !== (baselineLifts?.overheadPress ?? null) ||
      (editRow === '' ? null : Number(editRow)) !== (baselineLifts?.barbellRow ?? null);

    setIsEditing(false);

    // Brief save animation then show toast
    setTimeout(() => {
      setSaving(false);
      showToast('Profile saved');

      // If critical training fields changed, offer to regenerate the mesocycle
      if (trainingFieldsChanged || baselineChanged) {
        setTimeout(() => {
          setConfirmDialog({
            title: 'Regenerate Program?',
            message: 'You changed settings that affect your program. Regenerate your mesocycle with the new settings? Your workout history will be preserved.',
            confirmLabel: 'Regenerate',
            onConfirm: () => {
              setConfirmDialog(null);
              generateNewMesocycle();
              showToast('Program regenerated');
            },
          });
        }, 200);
      }
    }, 400);
  };

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 text-center"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-grappler-50">{user?.name || 'Athlete'}</h2>
        <p className="text-grappler-400 text-sm mb-4">
          Level {gamificationStats.level} {getLevelTitle(gamificationStats.level)}
        </p>

        {/* Level Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-grappler-400 mb-1">
            <span>{formatNumber(gamificationStats.totalPoints)} XP</span>
            <span>{formatNumber(pointsNeeded)} to Level {gamificationStats.level + 1}</span>
          </div>
          <div className="progress-bar">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="progress-bar-fill bg-gradient-to-r from-primary-500 to-accent-500"
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-grappler-800/50 rounded-lg p-2.5">
            <p className="text-lg font-bold text-grappler-50">{gamificationStats.totalWorkouts}</p>
            <p className="text-[11px] text-grappler-400">Workouts</p>
          </div>
          <div className="bg-grappler-800/50 rounded-lg p-2.5">
            <p className="text-lg font-bold text-grappler-50">{gamificationStats.personalRecords}</p>
            <p className="text-[11px] text-grappler-400">PRs</p>
          </div>
          <div className="bg-grappler-800/50 rounded-lg p-2.5">
            <p className="text-lg font-bold text-grappler-50">{gamificationStats.badges.length}</p>
            <p className="text-[11px] text-grappler-400">Badges</p>
          </div>
        </div>
      </motion.div>

      {/* Color Theme Picker */}
      <div className="card overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-grappler-400" />
            <h3 className="font-medium text-grappler-200 text-sm">Color Theme</h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {([
              { id: 'steel' as ColorTheme, label: 'Steel', colors: ['#3b82f6', '#06b6d4'] },
              { id: 'rose' as ColorTheme, label: 'Rose', colors: ['#ec4899', '#f43f5e'] },
              { id: 'emerald' as ColorTheme, label: 'Emerald', colors: ['#10b981', '#22c55e'] },
              { id: 'amber' as ColorTheme, label: 'Amber', colors: ['#f59e0b', '#f97316'] },
            ]).map(theme => {
              const isActive = (colorTheme || 'steel') === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => { hapticLight(); setColorTheme(theme.id); }}
                  className={cn(
                    'relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all active:scale-95',
                    isActive
                      ? 'border-primary-500/60 bg-primary-500/10'
                      : 'border-grappler-700/50 bg-grappler-800/40 hover:border-grappler-600'
                  )}
                >
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded-full" style={{ background: theme.colors[0] }} />
                    <div className="w-4 h-4 rounded-full" style={{ background: theme.colors[1] }} />
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium',
                    isActive ? 'text-primary-400' : 'text-grappler-400'
                  )}>
                    {theme.label}
                  </span>
                  {isActive && (
                    <div className="absolute top-1 right-1">
                      <Check className="w-3 h-3 text-primary-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-grappler-500 mt-2">Works with both dark and light mode</p>
        </div>
      </div>

      {/* Profile Settings — Editable */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-grappler-700 flex items-center justify-between">
          <h3 className="font-medium text-grappler-200">Profile Settings</h3>
          {!isEditing ? (
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-1 text-xs text-grappler-400 hover:text-grappler-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                onClick={saveEdits}
                className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 bg-primary-500/10 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
          )}
        </div>

        <div className="divide-y divide-grappler-700">
          {!isEditing ? (
            <>
              <SettingRow icon={User} label="Name" value={user?.name || 'Not set'} />
              <SettingRow icon={Calendar} label="Age" value={user?.age ? `${user.age} years` : 'Not set'} />
              <SettingRow icon={Scale} label="Body Weight" value={user?.bodyWeightKg ? `${weightUnit === 'kg' ? Math.round(user.bodyWeightKg) : Math.round(user.bodyWeightKg * 2.205)} ${weightUnit}` : 'Not set'} />
              <SettingRow icon={Ruler} label="Height" value={user?.heightCm ? `${user.heightCm} cm` : 'Not set'} />
              <SettingRow icon={User} label="Sex" value={user?.sex ? (user.sex === 'male' ? 'Male' : 'Female') : 'Not set'} />
              <SettingRow icon={Scale} label="Units" value={(user?.weightUnit || 'lbs').toUpperCase()} />
              <SettingRow icon={Target} label="Experience" value={user?.experienceLevel || 'Intermediate'} className="capitalize" />
              <SettingRow icon={Dumbbell} label="Equipment" value={user?.equipment?.replace('_', ' ') || 'Full Gym'} className="capitalize" />
              <SettingRow icon={Calendar} label="Sessions/Week" value={`${user?.sessionsPerWeek || 3} sessions`} />
            </>
          ) : (
            <div className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs text-grappler-400 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input w-full"
                />
              </div>

              {/* Age + Body Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-grappler-400 mb-1">Age</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editAge || ''}
                    onChange={(e) => setEditAge(parseInt(e.target.value) || 0)}
                    className="input w-full"
                    min={14} max={100}
                  />
                </div>
                <div>
                  <label className="block text-xs text-grappler-400 mb-1">Body Weight ({editUnit})</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={
                      editBodyWeight
                        ? editUnit === 'kg'
                          ? Math.round(editBodyWeight)
                          : Math.round(editBodyWeight * 2.205)
                        : ''
                    }
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const kg = editUnit === 'kg' ? val : val / 2.205;
                      setEditBodyWeight(kg > 0 ? Math.round(kg * 10) / 10 : 0);
                    }}
                    className="input w-full"
                    min={1}
                  />
                </div>
              </div>

              {/* Height */}
              <div>
                <label className="block text-xs text-grappler-400 mb-1">Height (cm)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={editHeight || ''}
                  onChange={(e) => setEditHeight(parseInt(e.target.value) || 0)}
                  className="input w-full"
                  min={100} max={230}
                />
              </div>

              {/* Sex */}
              <div>
                <label className="block text-xs text-grappler-400 mb-1">Biological sex</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['male', 'female'] as BiologicalSex[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditSex(s)}
                      className={cn(
                        'py-2 rounded-lg text-sm font-medium transition-all',
                        editSex === s ? 'bg-primary-500 text-white' : 'bg-grappler-700 text-grappler-400'
                      )}
                    >
                      {s === 'male' ? 'Male' : 'Female'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Units */}
              <div>
                <label className="block text-xs text-grappler-400 mb-1">Weight units</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['kg', 'lbs'] as WeightUnit[]).map((u) => (
                    <button
                      key={u}
                      onClick={() => setEditUnit(u)}
                      className={cn(
                        'py-2 rounded-lg text-sm font-medium transition-all',
                        editUnit === u ? 'bg-primary-500 text-white' : 'bg-grappler-700 text-grappler-400'
                      )}
                    >
                      {u.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div>
                <label className="block text-xs text-grappler-400 mb-1">Experience level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setEditExperience(lvl)}
                      className={cn(
                        'py-2.5 rounded-lg text-xs font-medium transition-all capitalize active:scale-95',
                        editExperience === lvl ? 'bg-primary-500 text-white' : 'bg-grappler-700 text-grappler-400'
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Equipment profile */}
              <div>
                <label className="block text-xs text-grappler-400 mb-1">Training location</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'full_gym' as Equipment, label: 'Full Gym' },
                    { value: 'home_gym' as Equipment, label: 'Home' },
                    { value: 'minimal' as Equipment, label: 'Travel' },
                  ]).map((eq) => (
                    <button
                      key={eq.value}
                      onClick={() => {
                        setEditEquipment(eq.value);
                        const profile = DEFAULT_EQUIPMENT_PROFILES.find(p =>
                          p.name === (eq.value === 'full_gym' ? 'gym' : eq.value === 'home_gym' ? 'home' : 'travel')
                        );
                        setEditAvailableEquipment(profile?.equipment || []);
                      }}
                      className={cn(
                        'py-2.5 rounded-lg text-xs font-medium transition-all active:scale-95',
                        editEquipment === eq.value ? 'bg-primary-500 text-white' : 'bg-grappler-700 text-grappler-400'
                      )}
                    >
                      {eq.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wearable Setup */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-grappler-700">
          <h3 className="font-medium text-grappler-200">Wearable Integration</h3>
          <p className="text-xs text-grappler-500 mt-1">Auto-adjust training based on recovery data</p>
        </div>
        <div className="p-4 space-y-3">
          {([
            { value: 'whoop' as WearableUsage, icon: Activity, label: 'Whoop', desc: 'Auto-sync recovery & strain', color: 'emerald' },
            { value: 'other_wearable' as WearableUsage, icon: Watch, label: 'Other Wearable', desc: 'Apple Watch, Oura, Garmin', color: 'blue' },
            { value: 'no_wearable' as WearableUsage, icon: X, label: 'No Wearable', desc: 'Manual check-ins', color: 'gray' },
          ]).map((opt) => {
            const current = user?.wearableUsage;
            const selected = current === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  if (!user) return;
                  const provider: WearableProvider | undefined =
                    opt.value === 'whoop' ? 'whoop' :
                    opt.value === 'no_wearable' ? undefined : user.wearableProvider;
                  setUser({
                    ...user,
                    wearableUsage: opt.value,
                    wearableProvider: provider,
                    updatedAt: new Date(),
                  });
                }}
                className={cn(
                  'w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 border-2',
                  selected
                    ? opt.color === 'emerald' ? 'border-emerald-500 bg-emerald-500/10'
                      : opt.color === 'blue' ? 'border-blue-500 bg-blue-500/10'
                      : 'border-grappler-600 bg-grappler-700/50'
                    : 'border-grappler-700 hover:border-grappler-600'
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
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
                <div>
                  <p className="text-sm font-medium text-grappler-100">{opt.label}</p>
                  <p className="text-xs text-grappler-400">{opt.desc}</p>
                </div>
              </button>
            );
          })}

          {/* Provider picker for other_wearable */}
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
                    <button
                      key={w.value}
                      onClick={() => {
                        if (!user) return;
                        setUser({ ...user, wearableProvider: w.value, updatedAt: new Date() });
                      }}
                      className={cn(
                        'py-2 rounded-lg text-xs font-medium transition-all',
                        user?.wearableProvider === w.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-grappler-700 text-grappler-400'
                      )}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Training Day Schedule */}
      {user && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-grappler-700">
            <h3 className="font-medium text-grappler-200">Training Schedule</h3>
            <p className="text-xs text-grappler-500 mt-1">Tap days you plan to lift</p>
          </div>
          <div className="p-4 flex gap-1.5 justify-between">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, i) => {
              const selected = user.trainingDays?.includes(i) ?? false;
              return (
                <button
                  key={day}
                  onClick={() => {
                    const current = user.trainingDays || [];
                    const next = selected
                      ? current.filter(d => d !== i)
                      : [...current, i].sort();
                    setUser({ ...user, trainingDays: next, updatedAt: new Date() });
                  }}
                  className={cn(
                    'w-9 h-9 rounded-full text-[11px] font-medium transition-all active:scale-95',
                    selected
                      ? 'bg-primary-500 text-white'
                      : 'bg-grappler-800 text-grappler-500 hover:text-grappler-300'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Baseline Lifts */}
      {(baselineLifts || isEditing) && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-grappler-700">
            <h3 className="font-medium text-grappler-200">Baseline Lifts (1RM)</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            {([
              { label: 'Squat', value: baselineLifts?.squat, setter: setEditSquat, editValue: editSquat },
              { label: 'Deadlift', value: baselineLifts?.deadlift, setter: setEditDeadlift, editValue: editDeadlift },
              { label: 'Bench Press', value: baselineLifts?.benchPress, setter: setEditBench, editValue: editBench },
              { label: 'OHP', value: baselineLifts?.overheadPress, setter: setEditOHP, editValue: editOHP },
              { label: 'Barbell Row', value: baselineLifts?.barbellRow, setter: setEditRow, editValue: editRow },
            ] as const).map((lift) => (
              <div key={lift.label} className="bg-grappler-800/50 rounded-lg p-3">
                <p className="text-xs text-grappler-400 mb-1">{lift.label}</p>
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={lift.editValue}
                      onChange={(e) => lift.setter(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="—"
                      className="w-full bg-grappler-900 border border-grappler-600 rounded-lg px-2 py-1.5 text-sm font-bold text-grappler-100 outline-none focus-visible:border-primary-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-grappler-500 shrink-0">{weightUnit}</span>
                  </div>
                ) : (
                  <p className="text-lg font-bold text-grappler-100">
                    {lift.value ? `${lift.value} ${weightUnit}` : 'Not set'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges Section */}
      <button
        onClick={() => setShowBadges(!showBadges)}
        className="w-full card p-4 flex items-center justify-between hover:bg-grappler-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-left">
            <p className="font-medium text-grappler-100">Badges & Achievements</p>
            <p className="text-sm text-grappler-400">
              {gamificationStats.badges.length} earned of {badges.length}
            </p>
          </div>
        </div>
        <ChevronRight className={cn(
          'w-5 h-5 text-grappler-400 transition-transform',
          showBadges && 'rotate-90'
        )} />
      </button>

      <AnimatePresence>
      {showBadges && (
        <motion.div
          key="badges-content"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="card p-4 space-y-4 overflow-hidden"
        >
          <div>
            <h4 className="text-sm font-medium text-grappler-300 mb-3">Earned Badges</h4>
            {gamificationStats.badges.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {gamificationStats.badges.map((userBadge) => (
                  <div key={userBadge.id} className="text-center">
                    <div className="w-14 h-14 bg-grappler-700 rounded-xl flex items-center justify-center mx-auto mb-1 text-2xl">
                      {userBadge.badge.icon}
                    </div>
                    <p className="text-xs text-grappler-300 truncate">{userBadge.badge.name}</p>
                    <p className="text-xs text-primary-400">+{userBadge.badge.points}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-grappler-500">Complete workouts to earn badges!</p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium text-grappler-300 mb-3">Available Badges</h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {badges.filter(b => !earnedBadgeIds.has(b.id)).slice(0, 8).map((badge) => (
                <div key={badge.id} className="text-center opacity-50">
                  <div className="w-14 h-14 bg-grappler-800 rounded-xl flex items-center justify-center mx-auto mb-1 text-2xl grayscale">
                    {badge.icon}
                  </div>
                  <p className="text-xs text-grappler-500 truncate">{badge.name}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Stats Summary */}
      <div className="card p-4">
        <h3 className="font-medium text-grappler-200 mb-4">Lifetime Stats</h3>
        <div className="space-y-3">
          <StatRow icon={Dumbbell} label="Total Volume" value={`${formatNumber(gamificationStats.totalVolume)} ${weightUnit}`} />
          <StatRow icon={Star} label="Total Points" value={formatNumber(gamificationStats.totalPoints)} />
          <StatRow icon={Medal} label="Longest Streak" value={`${gamificationStats.longestStreak} days`} />
        </div>
      </div>

      {/* Reconfigure Training */}
      <div className="card p-4">
        <h3 className="font-medium text-grappler-200 mb-1 text-sm">Training Setup</h3>
        <p className="text-xs text-grappler-500 mb-3">
          Re-run setup to change goals, equipment, schedule, or training style. Your history is kept.
        </p>
        <button
          onClick={() => {
            setConfirmDialog({
              title: 'Reconfigure Training',
              message: 'This will take you through the setup again. Your workouts and history will be preserved.',
              confirmLabel: 'Reconfigure',
              onConfirm: () => { setConfirmDialog(null); restartOnboarding(); },
            });
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-500/10 text-primary-400 font-medium text-sm hover:bg-primary-500/20 transition-colors border border-primary-500/20"
        >
          <RefreshCw className="w-4 h-4" />
          Reconfigure Training
        </button>
      </div>

      {/* Auth Section */}
      <div className="card p-4 space-y-3">
        {isSignedIn ? (
          <>
            <div className="flex items-center gap-2 text-xs text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              Cloud sync active — {session.user?.email}
            </div>

            {/* Email verification nag */}
            {emailVerified === false && (
              <div className="flex items-start gap-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-yellow-300 font-medium">Email not verified</p>
                  <p className="text-xs text-grappler-400 mt-0.5">Verify to ensure you can recover your account.</p>
                  {verifySent ? (
                    <p className="text-xs text-green-400 mt-2">Verification email sent! Check your inbox.</p>
                  ) : (
                    <button
                      onClick={handleResendVerification}
                      disabled={verifyLoading}
                      className="mt-2 flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
                    >
                      {verifyLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                      {verifyLoading ? 'Sending...' : 'Resend verification email'}
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setConfirmDialog({
                  title: 'Sign Out',
                  message: 'Your local data will be kept, but cloud sync will stop until you sign back in.',
                  confirmLabel: 'Sign Out',
                  onConfirm: () => { setConfirmDialog(null); signOut({ callbackUrl: '/' }); },
                });
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-grappler-700 text-grappler-200 font-medium text-sm hover:bg-grappler-600 transition-colors"
            >
              <DoorOpen className="w-4 h-4" />
              Sign Out
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-grappler-400">
              Your data is saved locally on this device. Sign in to enable cloud backup &amp; sync across devices.
            </p>
            <button
              onClick={() => { signIn(undefined, { callbackUrl: '/' }); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 transition-colors"
            >
              <User className="w-4 h-4" />
              Sign In for Cloud Sync
            </button>
          </>
        )}
      </div>

      {/* Danger Zone */}
      <div className="card p-4 border border-red-500/20 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <h3 className="font-medium text-red-400 text-sm">Danger Zone</h3>
        </div>
        <div>
          <h4 className="text-sm text-grappler-300 mb-1">Reset Data</h4>
          <p className="text-sm text-grappler-400 mb-3">
            This will erase all your progress, workouts, and achievements. Your account will remain.
          </p>
          <button
            onClick={() => {
              setConfirmDialog({
                title: 'Reset All Data',
                message: 'This will erase all your progress, workouts, and achievements. This cannot be undone.',
                confirmLabel: 'Reset Everything',
                danger: true,
                onConfirm: () => { setConfirmDialog(null); resetStore(); },
              });
            }}
            className="btn btn-danger btn-sm gap-2"
          >
            <LogOut className="w-4 h-4" />
            Reset All Data
          </button>
        </div>

        {isSignedIn && (
          <div className="pt-4 border-t border-red-500/20">
            <h4 className="text-sm text-grappler-300 mb-1">Delete Account</h4>
            <p className="text-sm text-grappler-400 mb-3">
              Permanently delete your account, cloud data, and all synced workouts. Local data will also be cleared.
            </p>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
              className="btn btn-danger btn-sm gap-2"
            >
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deleteLoading ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
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
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
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

      {/* Saving overlay */}
      <AnimatePresence>
        {saving && (
          <motion.div
            key="saving"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-3 bg-grappler-800 border border-grappler-700 rounded-2xl px-6 py-4 shadow-2xl"
            >
              <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
              <span className="text-sm font-medium text-grappler-200">Saving...</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingRow({ icon: Icon, label, value, className }: {
  icon: any; label: string; value: string; className?: string;
}) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-grappler-400" />
        <span className="text-grappler-300">{label}</span>
      </div>
      <span className={cn('text-grappler-100', className)}>{value}</span>
    </div>
  );
}

function StatRow({ icon: Icon, label, value }: { icon: any; label: string; value: string; }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-grappler-500" />
        <span className="text-sm text-grappler-400">{label}</span>
      </div>
      <span className="font-medium text-grappler-200">{value}</span>
    </div>
  );
}
