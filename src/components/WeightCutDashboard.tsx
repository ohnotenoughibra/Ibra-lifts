'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, Droplets, AlertTriangle, CheckCircle2, Clock,
  ChevronDown, ChevronUp, Activity, Thermometer, X,
  Target, TrendingDown, Shield, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import {
  getWaterProtocol, getSodiumProtocol, getCarbProtocol,
  generateDailyChecklist, assessWeightCutSafety, projectWeighInWeight,
  checkEmergencyTriggers, getRehydrationProtocol,
  WEIGHT_CUT_LIMITS,
} from '@/lib/weight-cut-engine';
import type { WeightCutDailyLog, WeightCutSafetyLevel } from '@/lib/types';

interface WeightCutDashboardProps {
  competitionId: string;
  onClose: () => void;
}

const SAFETY_COLORS: Record<WeightCutSafetyLevel, { bg: string; border: string; text: string; icon: string }> = {
  safe: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: 'text-green-400' },
  caution: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: 'text-yellow-400' },
  danger: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: 'text-red-400' },
  critical: { bg: 'bg-red-600/20', border: 'border-red-600/50', text: 'text-red-300', icon: 'text-red-300' },
};

const PHASE_LABELS: Record<string, { name: string; color: string }> = {
  not_started: { name: 'Not Started', color: 'text-zinc-400' },
  chronic_loss: { name: 'Chronic Weight Loss', color: 'text-blue-400' },
  acute_reduction: { name: 'Acute Reduction', color: 'text-blue-400' },
  water_cut: { name: 'Water Cut', color: 'text-red-400' },
  rehydration: { name: 'Rehydration', color: 'text-green-400' },
  fight_ready: { name: 'Fight Ready', color: 'text-emerald-400' },
  completed: { name: 'Completed', color: 'text-zinc-500' },
};

export default function WeightCutDashboard({ competitionId, onClose }: WeightCutDashboardProps) {
  const competitions = useAppStore(s => s.competitions);
  const weightCutPlans = useAppStore(s => s.weightCutPlans ?? []);
  const bodyWeightLog = useAppStore(s => s.bodyWeightLog);
  const user = useAppStore(s => s.user);

  const [showChecklist, setShowChecklist] = useState(true);
  const [showSafety, setShowSafety] = useState(true);
  const [showProtocols, setShowProtocols] = useState(false);
  const [dailyLog, setDailyLog] = useState<Partial<WeightCutDailyLog>>({});

  const competition = competitions.find(c => c.id === competitionId);
  const plan = weightCutPlans.find(p => p.competitionId === competitionId);

  if (!competition) {
    return (
      <div className="p-6 text-center text-zinc-400">
        <p>Competition not found.</p>
        <button aria-label="Close" onClick={onClose} className="mt-4 text-blue-400 hover:text-blue-300">Close</button>
      </div>
    );
  }

  const eventDate = new Date(competition.date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const daysToWeighIn = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const currentWeightKg = useMemo(() => {
    if (bodyWeightLog.length === 0) return user?.bodyWeightKg ?? 70;
    const latest = bodyWeightLog[bodyWeightLog.length - 1];
    return latest.unit === 'lbs' ? latest.weight * 0.453592 : latest.weight;
  }, [bodyWeightLog, user]);

  const targetWeightKg = competition.weightClass ?? currentWeightKg;
  const totalToLose = Math.max(0, currentWeightKg - targetWeightKg);
  const progressPercent = totalToLose > 0
    ? Math.min(100, Math.round(((plan?.startWeightKg ?? currentWeightKg) - currentWeightKg) / totalToLose * 100))
    : 100;

  // Safety assessment
  const safety = useMemo(() => assessWeightCutSafety({
    currentWeightKg,
    targetWeightKg,
    daysToWeighIn: Math.max(0, daysToWeighIn),
    rehydrationTimeHours: plan?.rehydrationTimeHours ?? 24,
    age: user?.age ?? 25,
    sex: user?.sex ?? 'male',
    cutExperience: undefined,
    menstrualStatus: undefined,
    hasEatingDisorderHistory: false,
  }), [currentWeightKg, targetWeightKg, daysToWeighIn, plan, user]);

  const safetyStyle = SAFETY_COLORS[safety.level];

  // Daily protocols
  const waterProtocol = getWaterProtocol(Math.max(0, daysToWeighIn), currentWeightKg);
  const sodiumProtocol = getSodiumProtocol(Math.max(0, daysToWeighIn));
  const carbProtocol = getCarbProtocol(Math.max(0, daysToWeighIn), currentWeightKg);
  const checklist = generateDailyChecklist(Math.max(0, daysToWeighIn), currentWeightKg);

  // Phase info
  const phaseInfo = PHASE_LABELS[checklist.phase] ?? PHASE_LABELS.not_started;

  // Weight projection (use recent trend from body weight log)
  const recentWeeklyChange = useMemo(() => {
    if (bodyWeightLog.length < 7) return -0.5; // assume moderate loss if no data
    const recent7 = bodyWeightLog.slice(-7);
    const older7 = bodyWeightLog.slice(-14, -7);
    if (older7.length === 0) return -0.5;
    const recentAvg = recent7.reduce((s, e) => s + (e.unit === 'lbs' ? e.weight * 0.453592 : e.weight), 0) / recent7.length;
    const olderAvg = older7.reduce((s, e) => s + (e.unit === 'lbs' ? e.weight * 0.453592 : e.weight), 0) / older7.length;
    return recentAvg - olderAvg;
  }, [bodyWeightLog]);

  const projection = projectWeighInWeight(currentWeightKg, targetWeightKg, Math.max(0, daysToWeighIn), recentWeeklyChange);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 pt-8"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-white">Weight Cut Dashboard</h2>
            <p className="text-sm text-zinc-400">{competition.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Status Bar */}
          <div className={cn('rounded-xl p-4 border', safetyStyle.bg, safetyStyle.border)}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className={cn('w-5 h-5', safetyStyle.icon)} />
              <span className={cn('font-semibold text-sm uppercase tracking-wider', safetyStyle.text)}>
                {safety.level === 'safe' ? 'Safe to proceed' :
                  safety.level === 'caution' ? 'Proceed with caution' :
                    safety.level === 'danger' ? 'Danger — review plan' :
                      'Critical — stop and reassess'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xl font-bold text-white">{currentWeightKg.toFixed(1)}</div>
                <div className="text-xs text-zinc-400">Current (kg)</div>
              </div>
              <div>
                <div className="text-xl font-bold text-white">{targetWeightKg.toFixed(1)}</div>
                <div className="text-xs text-zinc-400">Target (kg)</div>
              </div>
              <div>
                <div className="text-xl font-bold text-white">{Math.max(0, daysToWeighIn)}</div>
                <div className="text-xs text-zinc-400">Days Left</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>{totalToLose.toFixed(1)}kg to lose</span>
                <span>{progressPercent}% complete</span>
              </div>
              <div className="w-full bg-zinc-700 rounded-full h-2">
                <div
                  className={cn('h-2 rounded-full transition-all', safety.level === 'safe' ? 'bg-green-500' : safety.level === 'caution' ? 'bg-yellow-500' : 'bg-red-500')}
                  style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Current Phase */}
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-300">Current Phase</span>
            </div>
            <div className={cn('text-lg font-bold', phaseInfo.color)}>
              {phaseInfo.name}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {daysToWeighIn > 7 ? 'Focus on caloric deficit for fat loss' :
                daysToWeighIn > 1 ? 'Water/sodium/glycogen manipulation active' :
                  daysToWeighIn === 1 ? 'Final dehydration — make weight' :
                    daysToWeighIn === 0 ? 'Weigh in and begin rehydration' :
                      'Rehydration and recovery'}
            </p>
          </div>

          {/* Projection */}
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-300">Weight Projection</span>
            </div>
            <p className={cn('text-sm', projection.willMakeWeight ? 'text-green-400' : 'text-red-400')}>
              {projection.message}
            </p>
            {projection.waterCutNeeded > 0 && (
              <p className="text-xs text-zinc-400 mt-1">
                Estimated water cut needed: {projection.waterCutNeeded.toFixed(1)}kg ({((projection.waterCutNeeded / currentWeightKg) * 100).toFixed(1)}% BW)
              </p>
            )}
          </div>

          {/* Safety Alerts */}
          {(safety.alerts.length > 0 || safety.blockers.length > 0) && (
            <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4">
              <button
                onClick={() => setShowSafety(!showSafety)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className={cn('w-4 h-4', safetyStyle.icon)} />
                  <span className="text-sm font-medium text-zinc-300">
                    Safety Alerts ({safety.blockers.length + safety.alerts.length})
                  </span>
                </div>
                {showSafety ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
              </button>
              <AnimatePresence>
                {showSafety && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="mt-3 space-y-2">
                      {safety.blockers.map((b, i) => (
                        <div key={`b-${i}`} className="flex gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-red-300">{b}</p>
                        </div>
                      ))}
                      {safety.alerts.map((a, i) => (
                        <div key={`a-${i}`} className="flex gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-yellow-300">{a}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Today's Protocols */}
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4">
            <button
              onClick={() => setShowProtocols(!showProtocols)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">Today's Protocol</span>
              </div>
              {showProtocols ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>
            <AnimatePresence>
              {showProtocols && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
                        <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                        <div className="text-sm font-bold text-white">{Math.round(waterProtocol.targetMl / 1000)}L</div>
                        <div className="text-xs text-zinc-400">Water</div>
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
                        <Thermometer className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                        <div className="text-sm font-bold text-white">{sodiumProtocol.targetMg}mg</div>
                        <div className="text-xs text-zinc-400">Sodium</div>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2 text-center">
                        <Target className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                        <div className="text-sm font-bold text-white">{carbProtocol.targetG}g</div>
                        <div className="text-xs text-zinc-400">Carbs</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-zinc-400"><span className="text-blue-400">Water:</span> {waterProtocol.note}</p>
                      <p className="text-xs text-zinc-400"><span className="text-blue-400">Sodium:</span> {sodiumProtocol.note}</p>
                      <p className="text-xs text-zinc-400"><span className="text-purple-400">Carbs:</span> {carbProtocol.note}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Daily Checklist */}
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4">
            <button
              onClick={() => setShowChecklist(!showChecklist)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">
                  Daily Checklist ({checklist.tasks.length} tasks)
                </span>
              </div>
              {showChecklist ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>
            <AnimatePresence>
              {showChecklist && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="mt-3 space-y-2">
                    {checklist.tasks.map((task, i) => (
                      <div key={i} className={cn(
                        'flex items-start gap-2 p-2 rounded-lg text-xs',
                        task.critical ? 'bg-red-500/5 border border-red-500/10' : 'bg-zinc-700/30'
                      )}>
                        <div className={cn(
                          'w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center',
                          task.critical ? 'border-red-500/40' : 'border-zinc-600'
                        )}>
                        </div>
                        <span className={cn(task.critical ? 'text-zinc-200' : 'text-zinc-400')}>
                          {task.task}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Emergency Warning */}
          <div className="text-center p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">
              Emergency: if you experience confusion, chest pain, inability to urinate, or fainting — STOP immediately and seek medical attention
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
