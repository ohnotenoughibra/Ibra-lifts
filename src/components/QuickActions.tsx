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
  UtensilsCrossed,
  Dumbbell,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ACTIVITY_CATEGORY_MAP,
  type ActivityType,
  type TrainingIntensity,
  type SessionTiming,
  type MealType,
} from '@/lib/types';
import { generateQuickWorkout } from '@/lib/workout-generator';

interface QuickActionsProps {
  onClose: () => void;
}

type QuickLogType = 'water' | 'weight' | 'sleep' | 'energy' | 'readiness' | 'training' | 'mobility' | 'food' | null;

const QUICK_FOODS = [
  { name: 'Protein Shake', cal: 160, p: 30, c: 8, f: 2 },
  { name: 'Chicken Breast', cal: 165, p: 31, c: 0, f: 3.6 },
  { name: 'Rice (1 cup)', cal: 206, p: 4, c: 45, f: 0.4 },
  { name: 'Eggs (2)', cal: 156, p: 12, c: 1, f: 11 },
  { name: 'Banana', cal: 105, p: 1.3, c: 27, f: 0.4 },
  { name: 'Greek Yogurt', cal: 130, p: 17, c: 6, f: 4.5 },
  { name: 'Oats (1 cup)', cal: 307, p: 11, c: 55, f: 5 },
  { name: 'Peanut Butter (2 tbsp)', cal: 190, p: 7, c: 7, f: 16 },
] as const;

export default function QuickActions({ onClose }: QuickActionsProps) {
  const { user, addQuickLog, quickLogs = [], bodyWeightLog, addBodyWeight, trainingSessions, addTrainingSession, addMeal, meals, startWorkout } = useAppStore();

  const [activeLog, setActiveLog] = useState<QuickLogType>(null);
  const [waterMl, setWaterMl] = useState(250); // Default 250ml (1 glass)
  const latestWeight = bodyWeightLog?.[bodyWeightLog.length - 1]?.weight || (user?.weightUnit === 'kg' ? 80 : 175);
  const [weightValue, setWeightValue] = useState(latestWeight);
  const weightUnit = user?.weightUnit || 'lbs';
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
  const [foodName, setFoodName] = useState('');
  const [foodCal, setFoodCal] = useState(0);
  const [foodProtein, setFoodProtein] = useState(0);
  const [foodCarbs, setFoodCarbs] = useState(0);
  const [foodFat, setFoodFat] = useState(0);
  const [foodMealType, setFoodMealType] = useState<MealType>(() => {
    const h = new Date().getHours();
    if (h < 11) return 'breakfast';
    if (h < 15) return 'lunch';
    if (h < 18) return 'snack';
    return 'dinner';
  });
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

  const todayMeals = (meals || []).filter(m => {
    const mDate = new Date(m.date);
    mDate.setHours(0, 0, 0, 0);
    return mDate.getTime() === today.getTime();
  });
  const todayCals = todayMeals.reduce((s, m) => s + m.calories, 0);
  const todayProteinG = todayMeals.reduce((s, m) => s + m.protein, 0);

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
        addBodyWeight(weightValue);
        message = `Weight: ${weightValue}${weightUnit} logged`;
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
      case 'food':
        if (!foodName.trim() || foodCal <= 0) return;
        addMeal({
          date: new Date(),
          mealType: foodMealType,
          name: foodName.trim(),
          calories: Math.round(foodCal),
          protein: Math.round(foodProtein),
          carbs: Math.round(foodCarbs),
          fat: Math.round(foodFat),
        });
        message = `${foodName.trim()} — ${Math.round(foodCal)} cal logged`;
        setFoodName('');
        setFoodCal(0);
        setFoodProtein(0);
        setFoodCarbs(0);
        setFoodFat(0);
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
      id: 'food' as QuickLogType,
      icon: UtensilsCrossed,
      label: 'Food',
      color: 'text-orange-400 bg-orange-500/20',
      stat: todayCals > 0 ? `${todayCals} cal · ${todayProteinG}g P` : 'No meals',
      highlight: todayMeals.length > 0,
    },
    {
      id: 'weight' as QuickLogType,
      icon: Scale,
      label: 'Weight',
      color: 'text-purple-400 bg-purple-500/20',
      stat: todayWeight ? `${todayWeight.weight}${weightUnit}` : 'Not logged',
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
              <h3 className="text-lg font-semibold text-grappler-50">Log Water</h3>
              <p className="text-sm text-grappler-400">Today: {todayWater >= 1000 ? `${(todayWater / 1000).toFixed(1)}L` : `${todayWater}ml`}</p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                aria-label="Decrease water amount"
                onClick={() => setWaterMl(Math.max(100, waterMl - 100))}
                className="btn btn-circle btn-ghost"
              >
                <Minus className="w-5 h-5" />
              </button>
              <div className="text-4xl font-bold text-grappler-50 w-28 text-center">{waterMl}ml</div>
              <button
                aria-label="Increase water amount"
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
              <h3 className="text-lg font-semibold text-grappler-50">Log Weight</h3>
              {todayWeight && <p className="text-sm text-grappler-400">Already logged: {todayWeight.weight}{todayWeight.unit || weightUnit}</p>}
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                aria-label="Decrease weight"
                onClick={() => setWeightValue(Math.max(20, Math.round((weightValue - 0.5) * 10) / 10))}
                className="btn btn-circle btn-ghost"
              >
                <Minus className="w-5 h-5" />
              </button>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={weightValue}
                onChange={(e) => {
                  const v = e.target.value.replace(',', '.');
                  const num = parseFloat(v);
                  if (!isNaN(num)) setWeightValue(num);
                }}
                className="input input-bordered w-32 text-center text-2xl font-bold"
              />
              <button
                aria-label="Increase weight"
                onClick={() => setWeightValue(Math.round((weightValue + 0.5) * 10) / 10)}
                className="btn btn-circle btn-ghost"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <p className="text-center text-grappler-400 text-sm">{weightUnit}</p>
          </div>
        );

      case 'sleep':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Moon className="w-12 h-12 mx-auto text-indigo-400 mb-2" />
              <h3 className="text-lg font-semibold text-grappler-50">Log Sleep</h3>
            </div>
            <div className="space-y-3">
              <label className="text-sm text-grappler-400">Hours slept</label>
              <div className="flex items-center justify-center gap-4">
                <button
                  aria-label="Decrease sleep hours"
                  onClick={() => setSleepHours(Math.max(0, sleepHours - 0.5))}
                  className="btn btn-circle btn-ghost"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="text-4xl font-bold text-grappler-50 w-20 text-center">{sleepHours}h</div>
                <button
                  aria-label="Increase sleep hours"
                  onClick={() => setSleepHours(Math.min(14, sleepHours + 0.5))}
                  className="btn btn-circle btn-ghost"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-grappler-400">Quality</label>
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
              <div className="flex justify-between text-xs text-grappler-500 px-2">
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
              <h3 className="text-lg font-semibold text-grappler-50">Energy Level</h3>
              <p className="text-sm text-grappler-400">How energized do you feel?</p>
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
                  <Zap className={cn("w-5 h-5", level <= energyLevel ? "text-yellow-400" : "text-grappler-600")} />
                  <span className="text-xs mt-1 text-grappler-400">{level}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-grappler-500 px-4">
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
              <h3 className="text-lg font-semibold text-grappler-50">Training Readiness</h3>
              <p className="text-sm text-grappler-400">How ready are you to train?</p>
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
                  <Heart className={cn("w-5 h-5", score <= readinessScore ? "text-red-400" : "text-grappler-600")} />
                  <span className="text-xs mt-1 text-grappler-400">{score}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-grappler-500 px-4">
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
              <h3 className="text-lg font-semibold text-grappler-50">Quick Training Log</h3>
            </div>
            <div className="space-y-3">
              <label className="text-sm text-grappler-400">Duration (minutes)</label>
              <div className="flex items-center justify-center gap-4">
                <button
                  aria-label="Decrease training duration"
                  onClick={() => setTrainingMinutes(Math.max(5, trainingMinutes - 15))}
                  className="btn btn-circle btn-ghost"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="text-4xl font-bold text-grappler-50 w-24 text-center">{trainingMinutes}</div>
                <button
                  aria-label="Increase training duration"
                  onClick={() => setTrainingMinutes(trainingMinutes + 15)}
                  className="btn btn-circle btn-ghost"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-grappler-400">Activity Type</label>
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
              <label className="text-sm text-grappler-400">Intensity</label>
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
              <label className="text-sm text-grappler-400">Timing (relative to lifting)</label>
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
              <label className="text-sm text-grappler-400">Perceived Exertion (1-10)</label>
              <div className="flex gap-1 justify-center flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                  <button
                    key={val}
                    onClick={() => setPerceivedExertion(val)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-medium transition-all",
                      perceivedExertion === val
                        ? "bg-lime-500/30 ring-2 ring-lime-400 text-lime-300"
                        : "bg-grappler-800 text-grappler-400 hover:bg-grappler-700"
                    )}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'food':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <UtensilsCrossed className="w-12 h-12 mx-auto text-orange-400 mb-2" />
              <h3 className="text-lg font-semibold text-grappler-50">Quick Food Log</h3>
              <p className="text-sm text-grappler-400">{todayCals > 0 ? `${todayCals} cal today` : 'No meals yet'}</p>
            </div>

            {/* Meal type selector */}
            <div className="flex gap-1.5 justify-center flex-wrap">
              {([
                { v: 'breakfast' as MealType, l: 'Breakfast' },
                { v: 'lunch' as MealType, l: 'Lunch' },
                { v: 'dinner' as MealType, l: 'Dinner' },
                { v: 'snack' as MealType, l: 'Snack' },
                { v: 'pre_workout' as MealType, l: 'Pre-WO' },
                { v: 'post_workout' as MealType, l: 'Post-WO' },
              ]).map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setFoodMealType(v)}
                  className={cn(
                    "btn btn-xs",
                    foodMealType === v ? "btn-primary" : "btn-ghost"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Quick presets */}
            <div>
              <p className="text-xs text-grappler-500 mb-1.5">Quick add</p>
              <div className="flex gap-1.5 flex-wrap">
                {QUICK_FOODS.map(food => (
                  <button
                    key={food.name}
                    onClick={() => {
                      setFoodName(food.name);
                      setFoodCal(food.cal);
                      setFoodProtein(food.p);
                      setFoodCarbs(food.c);
                      setFoodFat(food.f);
                    }}
                    className={cn(
                      "btn btn-xs",
                      foodName === food.name ? "btn-primary" : "btn-ghost"
                    )}
                  >
                    {food.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom input */}
            <div className="space-y-2">
              <input
                type="text"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="Food name"
                className="input input-bordered w-full text-sm"
              />
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-xs text-grappler-500">Cal</label>
                  <input
                    type="number"
                    value={foodCal || ''}
                    onChange={(e) => setFoodCal(parseFloat(e.target.value) || 0)}
                    className="input input-bordered w-full text-sm text-center"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-grappler-500">Protein</label>
                  <input
                    type="number"
                    value={foodProtein || ''}
                    onChange={(e) => setFoodProtein(parseFloat(e.target.value) || 0)}
                    className="input input-bordered w-full text-sm text-center"
                    placeholder="0g"
                  />
                </div>
                <div>
                  <label className="text-xs text-grappler-500">Carbs</label>
                  <input
                    type="number"
                    value={foodCarbs || ''}
                    onChange={(e) => setFoodCarbs(parseFloat(e.target.value) || 0)}
                    className="input input-bordered w-full text-sm text-center"
                    placeholder="0g"
                  />
                </div>
                <div>
                  <label className="text-xs text-grappler-500">Fat</label>
                  <input
                    type="number"
                    value={foodFat || ''}
                    onChange={(e) => setFoodFat(parseFloat(e.target.value) || 0)}
                    className="input input-bordered w-full text-sm text-center"
                    placeholder="0g"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'mobility':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Leaf className="w-12 h-12 mx-auto text-emerald-400 mb-2" />
              <h3 className="text-lg font-semibold text-grappler-50">Log Mobility Work</h3>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                aria-label="Decrease mobility duration"
                onClick={() => setMobilityMinutes(Math.max(5, mobilityMinutes - 5))}
                className="btn btn-circle btn-ghost"
              >
                <Minus className="w-5 h-5" />
              </button>
              <div className="text-4xl font-bold text-grappler-50 w-24 text-center">{mobilityMinutes}</div>
              <button
                aria-label="Increase mobility duration"
                onClick={() => setMobilityMinutes(mobilityMinutes + 5)}
                className="btn btn-circle btn-ghost"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <p className="text-center text-grappler-400 text-sm">minutes</p>
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
      {/* Header — clean minimal */}
      <div className="sticky top-0 z-10 bg-grappler-950/95 backdrop-blur-xl border-b border-grappler-800/50">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-grappler-50">Quick Actions</h1>
          <button aria-label="Close" onClick={onClose} className="w-8 h-8 rounded-full bg-grappler-800/60 flex items-center justify-center hover:bg-grappler-700 transition-colors">
            <X className="w-4 h-4 text-grappler-400" />
          </button>
        </div>
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-green-500/15 border border-green-500/40 text-green-400 px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg"
          >
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 space-y-3">

        {/* ─── Quick Workout Hero Card ─── */}
        {!activeLog && user && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const session = generateQuickWorkout(
                user.equipment,
                30,
                user.goalFocus,
                user.availableEquipment,
                user.trainingIdentity
              );
              startWorkout(session);
              onClose();
            }}
            className="w-full rounded-2xl overflow-hidden border border-primary-500/30 bg-gradient-to-br from-primary-500/15 via-grappler-800 to-accent-500/10 p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/20">
              <Dumbbell className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-grappler-50">Quick Workout</p>
              <p className="text-xs text-grappler-400 mt-0.5">30-min auto-generated lift session</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <Play className="w-4 h-4 text-primary-400" />
            </div>
          </motion.button>
        )}

        {/* Smart Contextual Prompts */}
        {!activeLog && (() => {
          const hour = new Date().getHours();
          const prompts: { text: string; action: QuickLogType; icon: string; color: string }[] = [];

          if (hour < 12 && !todayWeight) {
            prompts.push({ text: 'Log morning weight (fasted)', action: 'weight', icon: 'scale', color: 'text-purple-400' });
          }
          if (todayTraining.length > 0 && todayMeals.length === 0) {
            prompts.push({ text: 'Log your post-workout meal', action: 'food', icon: 'food', color: 'text-orange-400' });
          } else if (todayTraining.length > 0 && todayCals < 500) {
            prompts.push({ text: 'You trained today — fuel up!', action: 'food', icon: 'food', color: 'text-orange-400' });
          }
          if (todayWater < 1500 && hour >= 14) {
            prompts.push({ text: 'Water intake is low — drink up', action: 'water', icon: 'water', color: 'text-blue-400' });
          }
          if (hour >= 20 && !todayLogs.find(l => l.type === 'sleep')) {
            prompts.push({ text: 'Log last night\'s sleep', action: 'sleep', icon: 'sleep', color: 'text-indigo-400' });
          }

          if (prompts.length === 0) return null;

          return (
            <div className="space-y-1.5">
              {prompts.slice(0, 2).map((p, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setActiveLog(p.action)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-grappler-800/40 border border-grappler-700/30 hover:border-grappler-600 transition-colors"
                >
                  <Sparkles className={cn('w-3.5 h-3.5', p.color)} />
                  <span className="text-xs text-grappler-300 font-medium">{p.text}</span>
                  <TrendingUp className="w-3 h-3 text-grappler-600 ml-auto" />
                </motion.button>
              ))}
            </div>
          );
        })()}

        {/* ─── Quick Action Grid ─── */}
        {!activeLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 gap-2.5"
          >
            {quickActions.map((action, idx) => (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => setActiveLog(action.id)}
                whileTap={{ scale: 0.96 }}
                className={cn(
                  "relative p-3.5 rounded-xl border transition-all text-left",
                  action.highlight
                    ? "bg-grappler-800/60 border-grappler-600/50"
                    : "bg-grappler-900/40 border-grappler-700/30 hover:border-grappler-600/50 hover:bg-grappler-800/30"
                )}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", action.color)}>
                    <action.icon className="w-4 h-4" />
                  </div>
                  {action.highlight && (
                    <Check className="w-3.5 h-3.5 text-green-400 ml-auto" />
                  )}
                </div>
                <p className="text-sm font-semibold text-grappler-100">{action.label}</p>
                <p className={cn("text-[11px] mt-0.5", action.highlight ? "text-green-400/80" : "text-grappler-500")}>
                  {action.stat}
                </p>
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

              <div className="flex gap-2.5 mt-6">
                <button
                  onClick={() => setActiveLog(null)}
                  className="btn btn-ghost flex-1 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveLog(activeLog)}
                  className="btn btn-primary flex-1 gap-2 text-sm"
                >
                  <Check className="w-4 h-4" />
                  Save
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Today's Summary — compact, theme-consistent */}
        {!activeLog && (
          <div className="rounded-xl border border-grappler-700/30 bg-grappler-900/40 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-grappler-500 mb-2.5">Today</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className={cn("text-sm font-bold tabular-nums", todayWater >= 2000 ? "text-blue-400" : "text-grappler-300")}>
                  {todayWater >= 1000 ? `${(todayWater / 1000).toFixed(1)}L` : `${todayWater}ml`}
                </p>
                <p className="text-[10px] text-grappler-500">Water</p>
              </div>
              <div className="text-center">
                <p className={cn("text-sm font-bold tabular-nums", todayCals > 0 ? "text-orange-400" : "text-grappler-500")}>
                  {todayCals > 0 ? `${todayCals}` : '—'}
                </p>
                <p className="text-[10px] text-grappler-500">Calories</p>
              </div>
              <div className="text-center">
                <p className={cn("text-sm font-bold tabular-nums", todayProteinG > 0 ? "text-grappler-200" : "text-grappler-500")}>
                  {todayProteinG > 0 ? `${Math.round(todayProteinG)}g` : '—'}
                </p>
                <p className="text-[10px] text-grappler-500">Protein</p>
              </div>
            </div>
            {/* Secondary row */}
            <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-grappler-700/20">
              <span className={cn("text-[10px] font-medium", todayWeight ? "text-green-400" : "text-grappler-600")}>
                {todayWeight ? `${todayWeight.weight}${weightUnit} ✓` : 'No weight'}
              </span>
              <span className="text-grappler-700">·</span>
              <span className={cn("text-[10px] font-medium", todayLogs.find(l => l.type === 'sleep') ? "text-green-400" : "text-grappler-600")}>
                {todayLogs.find(l => l.type === 'sleep') ? 'Sleep ✓' : 'No sleep'}
              </span>
              <span className="text-grappler-700">·</span>
              <span className={cn("text-[10px] font-medium", todayTraining.length > 0 ? "text-green-400" : "text-grappler-600")}>
                {todayTraining.length > 0 ? `${todayTraining.reduce((s, t) => s + t.duration, 0)}min ✓` : 'No training'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
