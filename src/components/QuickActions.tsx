'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  X,
  Droplets,
  Scale,
  Moon,
  Zap,
  Heart,
  Shield,
  Leaf,
  Plus,
  Minus,
  Check,
  AlertCircle,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ACTIVITY_CATEGORY_MAP,
  type ActivityType,
  type TrainingIntensity,
  type SessionTiming,
} from '@/lib/types';

interface QuickActionsProps {
  onClose: () => void;
}

type QuickLogType = 'water' | 'weight' | 'sleep' | 'energy' | 'readiness' | 'training' | 'mobility' | null;

export default function QuickActions({ onClose }: QuickActionsProps) {
  const { user, addQuickLog, quickLogs = [], bodyWeightLog, addBodyWeight, trainingSessions, addTrainingSession } = useAppStore();

  const [activeLog, setActiveLog] = useState<QuickLogType>(null);
  const [waterMl, setWaterMl] = useState(250); // Default 250ml (1 glass)
  const latestWeight = bodyWeightLog?.[bodyWeightLog.length - 1]?.weight || 175;
  const [weightLbs, setWeightLbs] = useState(latestWeight);
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [energyLevel, setEnergyLevel] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [readinessScore, setReadinessScore] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [trainingMinutes, setTrainingMinutes] = useState(60);
  // Default type based on user's combat sport
  const defaultType: ActivityType = user?.combatSport === 'striking' ? 'muay_thai' :
    user?.combatSport === 'mma' ? 'mma' :
    user?.combatSport === 'grappling_gi' ? 'bjj_gi' : 'bjj_nogi';
  const [activityType, setActivityType] = useState<ActivityType>(defaultType);
  const [trainingIntensity, setTrainingIntensity] = useState<TrainingIntensity>('moderate');
  const [sessionTiming, setSessionTiming] = useState<SessionTiming>('standalone');
  const [perceivedExertion, setPerceivedExertion] = useState(6);
  const [mobilityMinutes, setMobilityMinutes] = useState(15);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Get today's quick logs
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayLogs = (quickLogs || []).filter(log => {
    const logDate = new Date(log.timestamp);
    logDate.setHours(0, 0, 0, 0);
    return logDate.getTime() === today.getTime();
  });

  const todayWater = todayLogs
    .filter(log => log.type === 'water')
    .reduce((sum, log) => sum + (typeof log.value === 'number' ? log.value : 0), 0);

  const todayWeight = bodyWeightLog?.find(w => {
    const wDate = new Date(w.date);
    wDate.setHours(0, 0, 0, 0);
    return wDate.getTime() === today.getTime();
  });

  const todayTraining = trainingSessions?.filter(s => {
    const sDate = new Date(s.date);
    sDate.setHours(0, 0, 0, 0);
    return sDate.getTime() === today.getTime();
  }) || [];

  const handleSaveLog = (type: QuickLogType) => {
    let message = '';

    switch (type) {
      case 'water':
        addQuickLog({ type: 'water', value: waterMl, unit: 'ml', timestamp: new Date() });
        message = `+${waterMl}ml water logged`;
        break;
      case 'weight':
        addBodyWeight(weightLbs);
        message = `Weight: ${weightLbs}lbs logged`;
        break;
      case 'sleep':
        addQuickLog({ type: 'sleep', value: sleepHours, unit: 'hours', timestamp: new Date(), notes: `Quality: ${sleepQuality}/5` });
        message = `Sleep: ${sleepHours}h (${sleepQuality}/5) logged`;
        break;
      case 'energy':
        addQuickLog({ type: 'energy', value: energyLevel, timestamp: new Date() });
        message = `Energy: ${energyLevel}/5 logged`;
        break;
      case 'readiness':
        addQuickLog({ type: 'readiness', value: readinessScore, timestamp: new Date() });
        message = `Readiness: ${readinessScore}/5 logged`;
        break;
      case 'training':
        addTrainingSession({
          date: new Date(),
          category: ACTIVITY_CATEGORY_MAP[activityType] || 'other',
          type: activityType,
          duration: trainingMinutes,
          plannedIntensity: trainingIntensity,
          timing: sessionTiming,
          perceivedExertion,
          notes: 'Quick logged',
        });
        message = `${trainingMinutes}min ${activityType.replace(/_/g, ' ').toUpperCase()} session logged`;
        break;
      case 'mobility':
        addQuickLog({ type: 'mobility', value: mobilityMinutes, unit: 'min', timestamp: new Date() });
        message = `${mobilityMinutes}min mobility logged`;
        break;
    }

    setSuccessMessage(message);
    setShowSuccess(true);
    setActiveLog(null);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const quickActions = [
    {
      id: 'water' as QuickLogType,
      icon: Droplets,
      label: 'Water',
      color: 'text-blue-400 bg-blue-500/20',
      stat: todayWater >= 1000 ? `${(todayWater / 1000).toFixed(1)}L today` : `${todayWater}ml today`,
      highlight: todayWater >= 2000, // 2L goal
    },
    {
      id: 'weight' as QuickLogType,
      icon: Scale,
      label: 'Weight',
      color: 'text-purple-400 bg-purple-500/20',
      stat: todayWeight ? `${todayWeight.weight}lbs` : 'Not logged',
      highlight: !!todayWeight,
    },
    {
      id: 'sleep' as QuickLogType,
      icon: Moon,
      label: 'Sleep',
      color: 'text-indigo-400 bg-indigo-500/20',
      stat: todayLogs.find(l => l.type === 'sleep') ? 'Logged' : 'Not logged',
      highlight: !!todayLogs.find(l => l.type === 'sleep'),
    },
    {
      id: 'energy' as QuickLogType,
      icon: Zap,
      label: 'Energy',
      color: 'text-yellow-400 bg-yellow-500/20',
      stat: todayLogs.find(l => l.type === 'energy') ? `${todayLogs.find(l => l.type === 'energy')?.value}/5` : 'Not logged',
      highlight: !!todayLogs.find(l => l.type === 'energy'),
    },
    {
      id: 'readiness' as QuickLogType,
      icon: Heart,
      label: 'Readiness',
      color: 'text-red-400 bg-red-500/20',
      stat: todayLogs.find(l => l.type === 'readiness') ? `${todayLogs.find(l => l.type === 'readiness')?.value}/5` : 'Not logged',
      highlight: !!todayLogs.find(l => l.type === 'readiness'),
    },
    {
      id: 'training' as QuickLogType,
      icon: Shield,
      label: user?.combatSport === 'striking' ? 'Striking' :
             user?.combatSport === 'mma' ? 'MMA' :
             user?.combatSport === 'grappling_gi' || user?.combatSport === 'grappling_nogi' ? 'Grappling' : 'Training',
      color: 'text-lime-400 bg-lime-500/20',
      stat: todayTraining.length > 0 ? `${todayTraining.reduce((s, t) => s + t.duration, 0)}min` : 'None',
      highlight: todayTraining.length > 0,
    },
    {
      id: 'mobility' as QuickLogType,
      icon: Leaf,
      label: 'Mobility',
      color: 'text-emerald-400 bg-emerald-500/20',
      stat: todayLogs.filter(l => l.type === 'mobility').reduce((s, l) => s + (typeof l.value === 'number' ? l.value : 0), 0) > 0
        ? `${todayLogs.filter(l => l.type === 'mobility').reduce((s, l) => s + (typeof l.value === 'number' ? l.value : 0), 0)}min`
        : 'None',
      highlight: todayLogs.filter(l => l.type === 'mobility').length > 0,
    },
  ];

  const renderQuickInput = () => {
    switch (activeLog) {
      case 'water':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Droplets className="w-12 h-12 mx-auto text-blue-400 mb-2" />
              <h3 className="text-lg font-semibold text-white">Log Water</h3>
              <p className="text-sm text-gray-400">Today: {todayWater >= 1000 ? `${(todayWater / 1000).toFixed(1)}L` : `${todayWater}ml`}</p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setWaterMl(Math.max(100, waterMl - 100))}
                className="btn btn-circle btn-ghost"
              >
                <Minus className="w-5 h-5" />
              </button>
              <div className="text-4xl font-bold text-white w-28 text-center">{waterMl}ml</div>
              <button
                onClick={() => setWaterMl(waterMl + 100)}
                className="btn btn-circle btn-ghost"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              {[250, 330, 500, 750, 1000].map(ml => (
                <button
                  key={ml}
                  onClick={() => setWaterMl(ml)}
                  className={cn(
                    "btn btn-sm",
                    waterMl === ml ? "btn-primary" : "btn-ghost"
                  )}
                >
                  {ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
                </button>
              ))}
            </div>
          </div>
        );

      case 'weight':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Scale className="w-12 h-12 mx-auto text-purple-400 mb-2" />
              <h3 className="text-lg font-semibold text-white">Log Weight</h3>
              {todayWeight && <p className="text-sm text-gray-400">Already logged: {todayWeight.weight}lbs</p>}
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setWeightLbs(Math.max(50, weightLbs - 0.5))}
                className="btn btn-circle btn-ghost"
              >
                <Minus className="w-5 h-5" />
              </button>
              <input
                type="number"
                value={weightLbs}
                onChange={(e) => setWeightLbs(parseFloat(e.target.value) || 0)}
                className="input input-bordered w-32 text-center text-2xl font-bold"
                step="0.1"
              />
              <button
                onClick={() => setWeightLbs(weightLbs + 0.5)}
                className="btn btn-circle btn-ghost"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <p className="text-center text-gray-400 text-sm">lbs</p>
          </div>
        );

      case 'sleep':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Moon className="w-12 h-12 mx-auto text-indigo-400 mb-2" />
              <h3 className="text-lg font-semibold text-white">Log Sleep</h3>
            </div>
            <div className="space-y-3">
              <label className="text-sm text-gray-400">Hours slept</label>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setSleepHours(Math.max(0, sleepHours - 0.5))}
                  className="btn btn-circle btn-ghost"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="text-4xl font-bold text-white w-20 text-center">{sleepHours}h</div>
                <button
                  onClick={() => setSleepHours(Math.min(14, sleepHours + 0.5))}
                  className="btn btn-circle btn-ghost"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Quality</label>
              <div className="flex gap-2 justify-center">
                {([1, 2, 3, 4, 5] as const).map(q => (
                  <button
                    key={q}
                    onClick={() => setSleepQuality(q)}
                    className={cn(
                      "btn btn-circle",
                      sleepQuality === q ? "btn-primary" : "btn-ghost"
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 px-2">
                <span>Poor</span>
                <span>Excellent</span>
              </div>
            </div>
          </div>
        );

      case 'energy':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Zap className="w-12 h-12 mx-auto text-yellow-400 mb-2" />
              <h3 className="text-lg font-semibold text-white">Energy Level</h3>
              <p className="text-sm text-gray-400">How energized do you feel?</p>
            </div>
            <div className="flex gap-3 justify-center">
              {([1, 2, 3, 4, 5] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setEnergyLevel(level)}
                  className={cn(
                    "w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all",
                    energyLevel === level
                      ? "bg-yellow-500/30 ring-2 ring-yellow-400"
                      : "bg-grappler-800 hover:bg-grappler-700"
                  )}
                >
                  <Zap className={cn("w-5 h-5", level <= energyLevel ? "text-yellow-400" : "text-gray-600")} />
                  <span className="text-xs mt-1 text-gray-400">{level}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 px-4">
              <span>Exhausted</span>
              <span>Energized</span>
            </div>
          </div>
        );

      case 'readiness':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Heart className="w-12 h-12 mx-auto text-red-400 mb-2" />
              <h3 className="text-lg font-semibold text-white">Training Readiness</h3>
              <p className="text-sm text-gray-400">How ready are you to train?</p>
            </div>
            <div className="flex gap-3 justify-center">
              {([1, 2, 3, 4, 5] as const).map(score => (
                <button
                  key={score}
                  onClick={() => setReadinessScore(score)}
                  className={cn(
                    "w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all",
                    readinessScore === score
                      ? "bg-red-500/30 ring-2 ring-red-400"
                      : "bg-grappler-800 hover:bg-grappler-700"
                  )}
                >
                  <Heart className={cn("w-5 h-5", score <= readinessScore ? "text-red-400" : "text-gray-600")} />
                  <span className="text-xs mt-1 text-gray-400">{score}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 px-4">
              <span>Rest day</span>
              <span>Peak</span>
            </div>
          </div>
        );

      case 'training':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Shield className="w-12 h-12 mx-auto text-lime-400 mb-2" />
              <h3 className="text-lg font-semibold text-white">Quick Training Log</h3>
            </div>
            <div className="space-y-3">
              <label className="text-sm text-gray-400">Duration (minutes)</label>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setTrainingMinutes(Math.max(5, trainingMinutes - 15))}
                  className="btn btn-circle btn-ghost"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="text-4xl font-bold text-white w-24 text-center">{trainingMinutes}</div>
                <button
                  onClick={() => setTrainingMinutes(trainingMinutes + 15)}
                  className="btn btn-circle btn-ghost"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Activity Type</label>
              <div className="flex gap-2 justify-center flex-wrap">
                {/* Show types based on user's combat sport preference */}
                {(user?.combatSport === 'striking' ? [
                  { value: 'muay_thai' as ActivityType, label: 'Muay Thai' },
                  { value: 'kickboxing' as ActivityType, label: 'Kickboxing' },
                  { value: 'boxing' as ActivityType, label: 'Boxing' },
                  { value: 'mma' as ActivityType, label: 'MMA' },
                ] : user?.combatSport === 'mma' ? [
                  { value: 'mma' as ActivityType, label: 'MMA' },
                  { value: 'bjj_nogi' as ActivityType, label: 'No-Gi' },
                  { value: 'wrestling' as ActivityType, label: 'Wrestling' },
                  { value: 'muay_thai' as ActivityType, label: 'Muay Thai' },
                ] : [
                  { value: 'bjj_gi' as ActivityType, label: 'BJJ Gi' },
                  { value: 'bjj_nogi' as ActivityType, label: 'No-Gi' },
                  { value: 'wrestling' as ActivityType, label: 'Wrestling' },
                  { value: 'mma' as ActivityType, label: 'MMA' },
                ]).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setActivityType(value)}
                    className={cn(
                      "btn btn-sm",
                      activityType === value ? "btn-primary" : "btn-ghost"
                    )}
                  >
                    {label}
                  </button>
                ))}
                {/* Additional activity options */}
                {[
                  { value: 'running' as ActivityType, label: 'Running' },
                  { value: 'yoga' as ActivityType, label: 'Yoga' },
                  { value: 'hiking' as ActivityType, label: 'Hiking' },
                  { value: 'other' as ActivityType, label: 'Other' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setActivityType(value)}
                    className={cn(
                      "btn btn-sm",
                      activityType === value ? "btn-primary" : "btn-ghost"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Intensity</label>
              <div className="flex gap-2 justify-center flex-wrap">
                {([
                  { value: 'light_flow' as TrainingIntensity, label: 'Light' },
                  { value: 'moderate' as TrainingIntensity, label: 'Moderate' },
                  { value: 'hard_sparring' as TrainingIntensity, label: 'Hard' },
                  { value: 'competition_prep' as TrainingIntensity, label: 'Comp Prep' },
                ]).map(int => (
                  <button
                    key={int.value}
                    onClick={() => setTrainingIntensity(int.value)}
                    className={cn(
                      "btn btn-sm",
                      trainingIntensity === int.value ? "btn-primary" : "btn-ghost"
                    )}
                  >
                    {int.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Timing (relative to lifting)</label>
              <div className="flex gap-2 justify-center flex-wrap">
                {([
                  { value: 'standalone' as SessionTiming, label: 'Standalone' },
                  { value: 'before_lifting' as SessionTiming, label: 'Before Lifting' },
                  { value: 'after_lifting' as SessionTiming, label: 'After Lifting' },
                  { value: 'same_day_separate' as SessionTiming, label: 'Same Day' },
                ]).map(timing => (
                  <button
                    key={timing.value}
                    onClick={() => setSessionTiming(timing.value)}
                    className={cn(
                      "btn btn-sm",
                      sessionTiming === timing.value ? "btn-primary" : "btn-ghost"
                    )}
                  >
                    {timing.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Perceived Exertion (1-10)</label>
              <div className="flex gap-1 justify-center flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                  <button
                    key={val}
                    onClick={() => setPerceivedExertion(val)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-medium transition-all",
                      perceivedExertion === val
                        ? "bg-lime-500/30 ring-2 ring-lime-400 text-lime-300"
                        : "bg-grappler-800 text-gray-400 hover:bg-grappler-700"
                    )}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'mobility':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Leaf className="w-12 h-12 mx-auto text-emerald-400 mb-2" />
              <h3 className="text-lg font-semibold text-white">Log Mobility Work</h3>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setMobilityMinutes(Math.max(5, mobilityMinutes - 5))}
                className="btn btn-circle btn-ghost"
              >
                <Minus className="w-5 h-5" />
              </button>
              <div className="text-4xl font-bold text-white w-24 text-center">{mobilityMinutes}</div>
              <button
                onClick={() => setMobilityMinutes(mobilityMinutes + 5)}
                className="btn btn-circle btn-ghost"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <p className="text-center text-gray-400 text-sm">minutes</p>
            <div className="flex gap-2 justify-center">
              {[5, 10, 15, 20, 30].map(min => (
                <button
                  key={min}
                  onClick={() => setMobilityMinutes(min)}
                  className={cn(
                    "btn btn-sm",
                    mobilityMinutes === min ? "btn-primary" : "btn-ghost"
                  )}
                >
                  {min}m
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-grappler-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-grappler-950/95 backdrop-blur border-b border-grappler-800">
        <div className="p-4 flex items-center gap-3">
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-400" />
              Quick Actions
            </h1>
            <p className="text-sm text-gray-400">Fast logging for daily tracking</p>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-2 rounded-xl flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 space-y-4">
        {/* Quick Action Grid */}
        {!activeLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 gap-3"
          >
            {quickActions.map((action) => (
              <motion.button
                key={action.id}
                onClick={() => setActiveLog(action.id)}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative p-4 rounded-xl border transition-all",
                  action.highlight
                    ? "bg-grappler-800/80 border-grappler-600"
                    : "bg-grappler-900/50 border-grappler-800 hover:border-grappler-600"
                )}
              >
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-2", action.color)}>
                  <action.icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-white">{action.label}</p>
                  <p className={cn("text-xs", action.highlight ? "text-green-400" : "text-gray-500")}>
                    {action.stat}
                  </p>
                </div>
                {action.highlight && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Active Log Input */}
        <AnimatePresence mode="wait">
          {activeLog && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-grappler-900/50 border border-grappler-800 rounded-xl p-6"
            >
              {renderQuickInput()}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setActiveLog(null)}
                  className="btn btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveLog(activeLog)}
                  className="btn btn-primary flex-1 gap-2"
                >
                  <Check className="w-4 h-4" />
                  Save
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Today's Summary */}
        {!activeLog && (
          <div className="bg-grappler-900/50 border border-grappler-800 rounded-xl p-4">
            <h3 className="font-medium text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-400" />
              Today&apos;s Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Water intake</span>
                <span className={cn(todayWater >= 2000 ? "text-green-400" : "text-gray-300")}>
                  {todayWater >= 1000 ? `${(todayWater / 1000).toFixed(1)}L` : `${todayWater}ml`} {todayWater >= 2000 && '✓'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Weight logged</span>
                <span className={cn(todayWeight ? "text-green-400" : "text-gray-500")}>
                  {todayWeight ? `${todayWeight.weight}lbs ✓` : 'Not yet'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Sleep logged</span>
                <span className={cn(todayLogs.find(l => l.type === 'sleep') ? "text-green-400" : "text-gray-500")}>
                  {todayLogs.find(l => l.type === 'sleep') ? 'Yes ✓' : 'Not yet'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Training</span>
                <span className={cn(todayTraining.length > 0 ? "text-lime-400" : "text-gray-500")}>
                  {todayTraining.length > 0
                    ? `${todayTraining.reduce((s, t) => s + t.duration, 0)}min ✓`
                    : 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Mobility</span>
                <span className={cn(
                  todayLogs.filter(l => l.type === 'mobility').length > 0 ? "text-emerald-400" : "text-gray-500"
                )}>
                  {todayLogs.filter(l => l.type === 'mobility').reduce((s, l) => s + (typeof l.value === 'number' ? l.value : 0), 0) > 0
                    ? `${todayLogs.filter(l => l.type === 'mobility').reduce((s, l) => s + (typeof l.value === 'number' ? l.value : 0), 0)}min ✓`
                    : 'None'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tip */}
        {!activeLog && (
          <div className="flex items-start gap-3 p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-300">
              Quick logging helps build consistent habits. Track water, weight, and readiness daily for best results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
