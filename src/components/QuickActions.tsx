'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  X,
  Droplets,
  Scale,
  Moon,
  Zap,
  Shield,
  Leaf,
  Plus,
  Minus,
  Check,
  TrendingUp,
  Sparkles,
  UtensilsCrossed,
  Dumbbell,
  Play,
  Pill,
  ChevronDown,
  Undo2,
  Swords,
  ThermometerSun,
  Brain,
  Snowflake,
} from 'lucide-react';
import { cn, toLocalDateStr} from '@/lib/utils';
import { useToast } from './Toast';
import {
  ACTIVITY_CATEGORY_MAP,
  type ActivityType,
  type TrainingIntensity,
  type SessionTiming,
  type MealType,
} from '@/lib/types';
import { generateQuickWorkout, getVolumeGaps } from '@/lib/workout-generator';
import {
  getTodayChecklist,
  SUPPLEMENT_DATABASE,
} from '@/lib/supplement-engine';

interface QuickActionsProps {
  onClose: () => void;
}

type QuickLogType = 'water' | 'weight' | 'sleep' | 'energy' | 'training' | 'mobility' | 'food' | 'supplements' | 'sparring' | 'pain' | 'recovery' | 'mental' | null;

const QUICK_FOODS = [
  { name: 'Protein Shake', cal: 160, p: 30, c: 8, f: 2 },
  { name: 'Chicken Breast', cal: 165, p: 31, c: 0, f: 3.6 },
  { name: 'Rice (1 cup)', cal: 206, p: 4, c: 45, f: 0.4 },
  { name: 'Eggs (2)', cal: 156, p: 12, c: 1, f: 11 },
  { name: 'Greek Yogurt', cal: 130, p: 17, c: 6, f: 4.5 },
  { name: 'Oats (1 cup)', cal: 307, p: 11, c: 55, f: 5 },
  { name: 'PB (2 tbsp)', cal: 190, p: 7, c: 7, f: 16 },
  { name: 'Banana', cal: 105, p: 1.3, c: 27, f: 0.4 },
] as const;

export default function QuickActions({ onClose }: QuickActionsProps) {
  const { showToast } = useToast();
  const user = useAppStore(s => s.user);
  const addQuickLog = useAppStore(s => s.addQuickLog);
  const quickLogs = useAppStore(s => s.quickLogs) ?? [];
  const bodyWeightLog = useAppStore(s => s.bodyWeightLog.filter(e => !e._deleted));
  const addBodyWeight = useAppStore(s => s.addBodyWeight);
  const trainingSessions = useAppStore(s => s.trainingSessions);
  const addTrainingSession = useAppStore(s => s.addTrainingSession);
  const addMeal = useAppStore(s => s.addMeal);
  const meals = useAppStore(s => s.meals.filter(m => !m._deleted));
  const startWorkout = useAppStore(s => s.startWorkout);
  const supplementStack = useAppStore(s => s.supplementStack);
  const supplementIntakes = useAppStore(s => (s.supplementIntakes ?? []).filter((i: any) => !i._deleted));
  const logSupplementIntake = useAppStore(s => s.logSupplementIntake);
  const removeSupplementIntake = useAppStore(s => s.removeSupplementIntake);
  const workoutLogs = useAppStore(s => s.workoutLogs);
  const activeWorkout = useAppStore(s => s.activeWorkout);
  const injuryLog = useAppStore(s => s.injuryLog);
  const addInjury = useAppStore(s => s.addInjury);
  const addMentalCheckIn = useAppStore(s => s.addMentalCheckIn);
  const latestWhoopData = useAppStore(s => s.latestWhoopData);

  const [activeLog, setActiveLog] = useState<QuickLogType>(null);
  const [undoAction, setUndoAction] = useState<{ label: string; undo: () => void } | null>(null);
  const [waterMl, setWaterMl] = useState(250);
  const latestWeight = bodyWeightLog?.[bodyWeightLog.length - 1]?.weight || (user?.weightUnit === 'kg' ? 80 : 175);
  const [weightValue, setWeightValue] = useState(latestWeight);
  const weightUnit = user?.weightUnit || 'lbs';
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [energyLevel, setEnergyLevel] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [trainingMinutes, setTrainingMinutes] = useState(60);
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
  // Combat-specific state
  const [sparringNotes, setSparringNotes] = useState('');
  const [sparringRounds, setSparringRounds] = useState(5);
  const [painLevel, setPainLevel] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [painLocation, setPainLocation] = useState('');
  const [recoveryType, setRecoveryType] = useState<'ice_bath' | 'sauna' | 'massage' | 'contrast' | 'stretching'>('ice_bath');
  const [recoveryMinutes, setRecoveryMinutes] = useState(15);
  const [mentalRating, setMentalRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [mentalNotes, setMentalNotes] = useState('');

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showMore, setShowMore] = useState(false);

  // ── Today's data ────────────────────────────────────────────────────────
  const today = new Date();
  const todayStr = toLocalDateStr(today);
  today.setHours(0, 0, 0, 0);

  const todayLogs = useMemo(() =>
    quickLogs.filter(log => {
      const d = new Date(log.timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }),
    [quickLogs, today]
  );

  const todayWater = todayLogs
    .filter(l => l.type === 'water')
    .reduce((s, l) => s + (typeof l.value === 'number' ? l.value : 0), 0);

  const todayMeals = useMemo(() =>
    meals.filter(m => {
      const d = new Date(m.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }),
    [meals, today]
  );
  const todayCals = todayMeals.reduce((s, m) => s + m.calories, 0);
  const todayProteinG = todayMeals.reduce((s, m) => s + m.protein, 0);

  const todayWeight = bodyWeightLog?.find(w => {
    const d = new Date(w.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  const todayTraining = useMemo(() =>
    (trainingSessions ?? []).filter(s => {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }),
    [trainingSessions, today]
  );

  const hasSleep = !!todayLogs.find(l => l.type === 'sleep');
  const hasEnergy = !!todayLogs.find(l => l.type === 'energy');

  // ── Supplement data ─────────────────────────────────────────────────────
  const isTrainingDay = useMemo(() => {
    const todayWorkout = workoutLogs.some(l =>
      toLocalDateStr(l.date) === todayStr
    );
    return !!activeWorkout || todayWorkout;
  }, [activeWorkout, workoutLogs, todayStr]);

  const todaySupplementIntakes = useMemo(() =>
    supplementIntakes.filter(i => i.date === todayStr),
    [supplementIntakes, todayStr]
  );

  const supplementChecklist = useMemo(() =>
    getTodayChecklist(supplementStack, todaySupplementIntakes, isTrainingDay),
    [supplementStack, todaySupplementIntakes, isTrainingDay]
  );

  const totalSupps = supplementChecklist.reduce((s, g) => s + g.supplements.length, 0);
  const takenSupps = supplementChecklist.reduce((s, g) => s + g.supplements.filter(ss => ss.taken).length, 0);

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // ── Handlers ────────────────────────────────────────────────────────────
  const flash = useCallback((msg: string, undoFn?: () => void, closeForm = false) => {
    setSuccessMessage(msg);
    setShowSuccess(true);
    if (closeForm) setActiveLog(null);
    if (undoFn) {
      setUndoAction({ label: msg, undo: undoFn });
    } else {
      setUndoAction(null);
    }
    setTimeout(() => { setShowSuccess(false); setUndoAction(null); }, 3000);
  }, []);

  const deleteQuickLog = useAppStore(s => s.deleteQuickLog);
  const deleteTrainingSession = useAppStore(s => s.deleteTrainingSession);
  const deleteMeal = useAppStore(s => s.deleteMeal);

  // Instant log: one-tap water/mobility without opening the stepper form
  const instantWater = useCallback((ml: number) => {
    addQuickLog({ type: 'water', value: ml, unit: 'ml', timestamp: new Date() });
    const id = useAppStore.getState().quickLogs.at(-1)?.id;
    flash(`+${ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`} water`, id ? () => deleteQuickLog(id) : undefined);
  }, [addQuickLog, deleteQuickLog, flash]);

  const instantMobility = useCallback((mins: number) => {
    addQuickLog({ type: 'mobility', value: mins, unit: 'min', timestamp: new Date() });
    const id = useAppStore.getState().quickLogs.at(-1)?.id;
    flash(`+${mins}min mobility`, id ? () => deleteQuickLog(id) : undefined);
  }, [addQuickLog, deleteQuickLog, flash]);

  // Helper: get the last item ID from a store array after an add
  const getLastId = (field: 'quickLogs' | 'trainingSessions' | 'meals'): string | undefined => {
    const arr = useAppStore.getState()[field] as Array<{ id: string }>;
    return arr[arr.length - 1]?.id;
  };

  const handleSaveLog = useCallback((type: QuickLogType) => {
    switch (type) {
      case 'water': {
        addQuickLog({ type: 'water', value: waterMl, unit: 'ml', timestamp: new Date() });
        const id = getLastId('quickLogs');
        flash(`+${waterMl}ml water`, id ? () => deleteQuickLog(id) : undefined);
        break;
      }
      case 'weight': {
        addBodyWeight(weightValue);
        flash(`${weightValue}${weightUnit} logged`, undefined, true);
        break;
      }
      case 'sleep': {
        addQuickLog({ type: 'sleep', value: sleepHours, unit: 'hours', timestamp: new Date(), notes: `Quality: ${sleepQuality}/5` });
        const id = getLastId('quickLogs');
        flash(`${sleepHours}h sleep (${sleepQuality}/5)`, id ? () => deleteQuickLog(id) : undefined, true);
        break;
      }
      case 'energy': {
        addQuickLog({ type: 'energy', value: energyLevel, timestamp: new Date() });
        const id = getLastId('quickLogs');
        flash(`Energy: ${energyLevel}/5`, id ? () => deleteQuickLog(id) : undefined, true);
        break;
      }
      case 'training': {
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
        const id = getLastId('trainingSessions');
        flash(`${trainingMinutes}min ${activityType.replace(/_/g, ' ')}`, id ? () => deleteTrainingSession(id) : undefined, true);
        break;
      }
      case 'mobility': {
        addQuickLog({ type: 'mobility', value: mobilityMinutes, unit: 'min', timestamp: new Date() });
        const id = getLastId('quickLogs');
        flash(`${mobilityMinutes}min mobility`, id ? () => deleteQuickLog(id) : undefined, true);
        break;
      }
      case 'food': {
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
        const id = getLastId('meals');
        flash(`${foodName.trim()} — ${Math.round(foodCal)} cal`, id ? () => deleteMeal(id) : undefined);
        setFoodName(''); setFoodCal(0); setFoodProtein(0); setFoodCarbs(0); setFoodFat(0);
        break;
      }
      case 'sparring': {
        addTrainingSession({
          date: new Date(),
          category: ACTIVITY_CATEGORY_MAP[defaultType] || 'grappling',
          type: defaultType,
          duration: sparringRounds * 6, // ~6 min per round
          plannedIntensity: 'hard_sparring',
          timing: 'standalone',
          perceivedExertion: 7,
          notes: `Sparring: ${sparringRounds} rounds${sparringNotes ? ` — ${sparringNotes}` : ''}`,
        });
        const id = getLastId('trainingSessions');
        flash(`${sparringRounds} rounds sparring`, id ? () => deleteTrainingSession(id) : undefined, true);
        setSparringNotes('');
        break;
      }
      case 'pain': {
        if (!painLocation.trim()) return;
        const regionMap: Record<string, string> = {
          'Shoulder': 'left_shoulder', 'Knee': 'left_knee', 'Lower Back': 'lower_back',
          'Neck': 'neck', 'Elbow': 'left_elbow', 'Wrist': 'left_wrist',
          'Hip': 'left_hip', 'Ankle': 'left_ankle',
        };
        addInjury({
          bodyRegion: (regionMap[painLocation] || 'lower_back') as never,
          severity: painLevel,
          painType: painLevel >= 4 ? 'sharp' : 'dull',
          date: new Date(),
          notes: `Quick pain check: ${painLocation} ${painLevel}/5`,
          resolved: false,
        });
        flash(`${painLocation} pain: ${painLevel}/5`, undefined, true);
        setPainLocation('');
        break;
      }
      case 'recovery': {
        addQuickLog({
          type: 'mobility',
          value: recoveryMinutes,
          unit: 'min',
          timestamp: new Date(),
          notes: `Recovery: ${recoveryType.replace(/_/g, ' ')}`,
        });
        const id = getLastId('quickLogs');
        flash(`${recoveryMinutes}min ${recoveryType.replace(/_/g, ' ')}`, id ? () => deleteQuickLog(id) : undefined, true);
        break;
      }
      case 'mental': {
        addMentalCheckIn({
          date: toLocalDateStr(),
          timestamp: new Date().toISOString(),
          context: 'standalone',
          energy: mentalRating,
          focus: mentalRating,
          confidence: mentalRating,
          composure: mentalRating,
          selfTalk: mentalRating <= 2 ? 'negative' : mentalRating >= 4 ? 'positive' : 'neutral',
          triggers: mentalNotes || undefined,
        });
        flash(`Mental: ${mentalRating}/5${mentalNotes ? ' — noted' : ''}`, undefined, true);
        setMentalNotes('');
        break;
      }
    }
  }, [addQuickLog, addBodyWeight, addTrainingSession, addMeal, addInjury, addMentalCheckIn, flash,
      deleteQuickLog, deleteTrainingSession, deleteMeal,
      waterMl, weightValue, weightUnit, sleepHours, sleepQuality, energyLevel,
      trainingMinutes, activityType, trainingIntensity, sessionTiming, perceivedExertion,
      mobilityMinutes, foodName, foodCal, foodProtein, foodCarbs, foodFat, foodMealType,
      sparringRounds, sparringNotes, defaultType, painLevel, painLocation,
      recoveryType, recoveryMinutes, mentalRating, mentalNotes]);

  const handleLogSupplement = useCallback((suppId: string, name: string, macros: { calories: number; protein: number; carbs: number; fat: number } | null, servings: number) => {
    logSupplementIntake({
      supplementId: suppId,
      name,
      date: todayStr,
      time: timeStr,
      servings,
      macrosPerServing: macros,
    });
    flash(`${name.split(' ')[0]} logged${macros?.protein ? ` (+${Math.round(macros.protein * servings)}g protein)` : ''}`);
  }, [logSupplementIntake, todayStr, timeStr, flash]);

  // ── Primary action tiles (always visible) ──────────────────────────────
  const primaryActions = [
    {
      id: 'water' as QuickLogType,
      icon: Droplets,
      label: 'Water',
      color: 'text-blue-400',
      bg: 'bg-blue-500/15',
      stat: todayWater >= 1000 ? `${(todayWater / 1000).toFixed(1)}L` : todayWater > 0 ? `${todayWater}ml` : null,
      done: todayWater >= 2000,
    },
    {
      id: 'food' as QuickLogType,
      icon: UtensilsCrossed,
      label: 'Food',
      color: 'text-orange-400',
      bg: 'bg-orange-500/15',
      stat: todayCals > 0 ? `${todayCals}cal` : null,
      done: todayMeals.length >= 3,
    },
    {
      id: 'weight' as QuickLogType,
      icon: Scale,
      label: 'Weight',
      color: 'text-purple-400',
      bg: 'bg-purple-500/15',
      stat: todayWeight ? `${todayWeight.weight}${weightUnit}` : null,
      done: !!todayWeight,
    },
    {
      id: 'supplements' as QuickLogType,
      icon: Pill,
      label: 'Supps',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/15',
      stat: totalSupps > 0 ? `${takenSupps}/${totalSupps}` : null,
      done: totalSupps > 0 && takenSupps === totalSupps,
    },
  ];

  const secondaryActions = [
    {
      id: 'sleep' as QuickLogType,
      icon: Moon,
      label: 'Sleep',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/15',
      stat: hasSleep ? 'Logged' : null,
      done: hasSleep,
    },
    {
      id: 'energy' as QuickLogType,
      icon: Zap,
      label: 'Energy',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/15',
      stat: hasEnergy ? `${todayLogs.find(l => l.type === 'energy')?.value}/5` : null,
      done: hasEnergy,
    },
    {
      id: 'training' as QuickLogType,
      icon: Shield,
      label: user?.combatSport === 'striking' ? 'Striking' :
             user?.combatSport === 'mma' ? 'MMA' :
             user?.combatSport === 'grappling_gi' || user?.combatSport === 'grappling_nogi' ? 'Grappling' : 'Training',
      color: 'text-lime-400',
      bg: 'bg-lime-500/15',
      stat: todayTraining.length > 0 ? `${todayTraining.reduce((s, t) => s + t.duration, 0)}min` : null,
      done: todayTraining.length > 0,
    },
    {
      id: 'mobility' as QuickLogType,
      icon: Leaf,
      label: 'Mobility',
      color: 'text-emerald-400',
      bg: 'bg-teal-500/15',
      stat: todayLogs.filter(l => l.type === 'mobility').reduce((s, l) => s + (typeof l.value === 'number' ? l.value : 0), 0) > 0
        ? `${todayLogs.filter(l => l.type === 'mobility').reduce((s, l) => s + (typeof l.value === 'number' ? l.value : 0), 0)}min`
        : null,
      done: todayLogs.filter(l => l.type === 'mobility').length > 0,
    },
  ];

  // Combat-specific actions
  const combatActions = [
    {
      id: 'sparring' as QuickLogType,
      icon: Swords,
      label: 'Sparring',
      color: 'text-red-400',
      bg: 'bg-red-500/15',
      stat: todayTraining.filter(t => t.notes?.includes('Sparring')).length > 0 ? 'Logged' : null,
      done: todayTraining.filter(t => t.notes?.includes('Sparring')).length > 0,
    },
    {
      id: 'pain' as QuickLogType,
      icon: ThermometerSun,
      label: 'Pain Check',
      color: 'text-amber-400',
      bg: 'bg-amber-500/15',
      stat: null,
      done: false,
    },
    {
      id: 'recovery' as QuickLogType,
      icon: Snowflake,
      label: 'Recovery',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/15',
      stat: todayLogs.filter(l => l.notes?.includes('Recovery')).length > 0 ? 'Logged' : null,
      done: todayLogs.filter(l => l.notes?.includes('Recovery')).length > 0,
    },
    {
      id: 'mental' as QuickLogType,
      icon: Brain,
      label: 'Mental',
      color: 'text-violet-400',
      bg: 'bg-violet-500/15',
      stat: null,
      done: false,
    },
  ];

  // ── Render input forms ──────────────────────────────────────────────────
  const renderQuickInput = () => {
    switch (activeLog) {
      case 'water':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setWaterMl(Math.max(100, waterMl - 100))} className="w-9 h-9 rounded-lg bg-grappler-800 flex items-center justify-center">
                <Minus className="w-4 h-4 text-grappler-300" />
              </button>
              <div className="text-3xl font-bold text-grappler-50 w-24 text-center tabular-nums">{waterMl}ml</div>
              <button onClick={() => setWaterMl(waterMl + 100)} className="w-9 h-9 rounded-lg bg-grappler-800 flex items-center justify-center">
                <Plus className="w-4 h-4 text-grappler-300" />
              </button>
            </div>
            <div className="flex gap-1.5 justify-center">
              {[250, 330, 500, 750, 1000].map(ml => (
                <button key={ml} onClick={() => setWaterMl(ml)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", waterMl === ml ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30" : "bg-grappler-800 text-grappler-400")}>
                  {ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
                </button>
              ))}
            </div>
            {todayWater > 0 && <p className="text-center text-xs text-grappler-400">Today: {todayWater >= 1000 ? `${(todayWater / 1000).toFixed(1)}L` : `${todayWater}ml`}</p>}
          </div>
        );

      case 'weight':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setWeightValue(Math.max(20, Math.round((weightValue - 0.5) * 10) / 10))} className="w-9 h-9 rounded-lg bg-grappler-800 flex items-center justify-center">
                <Minus className="w-4 h-4 text-grappler-300" />
              </button>
              <div className="flex items-baseline gap-1">
                <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" value={weightValue} onChange={(e) => { const v = e.target.value.replace(',', '.'); const num = parseFloat(v); if (!isNaN(num)) setWeightValue(num); }} className="w-24 bg-transparent text-center text-3xl font-bold text-grappler-50 outline-none tabular-nums" />
                <span className="text-sm text-grappler-400">{weightUnit}</span>
              </div>
              <button onClick={() => setWeightValue(Math.round((weightValue + 0.5) * 10) / 10)} className="w-9 h-9 rounded-lg bg-grappler-800 flex items-center justify-center">
                <Plus className="w-4 h-4 text-grappler-300" />
              </button>
            </div>
            {todayWeight && <p className="text-center text-xs text-grappler-400">Already logged: {todayWeight.weight}{todayWeight.unit || weightUnit}</p>}
          </div>
        );

      case 'sleep':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setSleepHours(Math.max(0, sleepHours - 0.5))} className="w-9 h-9 rounded-lg bg-grappler-800 flex items-center justify-center">
                <Minus className="w-4 h-4 text-grappler-300" />
              </button>
              <div className="text-3xl font-bold text-grappler-50 w-20 text-center tabular-nums">{sleepHours}h</div>
              <button onClick={() => setSleepHours(Math.min(14, sleepHours + 0.5))} className="w-9 h-9 rounded-lg bg-grappler-800 flex items-center justify-center">
                <Plus className="w-4 h-4 text-grappler-300" />
              </button>
            </div>
            <div>
              <p className="text-xs text-grappler-400 text-center mb-1.5">Quality</p>
              <div className="flex gap-1.5 justify-center">
                {([1, 2, 3, 4, 5] as const).map(q => (
                  <button key={q} onClick={() => setSleepQuality(q)} className={cn("w-10 h-8 rounded-lg text-xs font-medium transition-all", sleepQuality === q ? "bg-indigo-500/25 text-indigo-400 ring-1 ring-indigo-500/30" : "bg-grappler-800 text-grappler-400")}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'energy':
        return (
          <div className="space-y-2">
            <p className="text-xs text-grappler-400 text-center">How energized do you feel?</p>
            <div className="flex gap-2 justify-center">
              {([1, 2, 3, 4, 5] as const).map(level => (
                <button key={level} onClick={() => setEnergyLevel(level)} className={cn("w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all", energyLevel === level ? "bg-yellow-500/25 ring-2 ring-yellow-400/50" : "bg-grappler-800")}>
                  <Zap className={cn("w-4 h-4", level <= energyLevel ? "text-yellow-400" : "text-grappler-600")} />
                  <span className="text-xs text-grappler-400">{level}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'training':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setTrainingMinutes(Math.max(5, trainingMinutes - 15))} className="w-9 h-9 rounded-lg bg-grappler-800 flex items-center justify-center">
                <Minus className="w-4 h-4 text-grappler-300" />
              </button>
              <div className="text-3xl font-bold text-grappler-50 w-20 text-center tabular-nums">{trainingMinutes}<span className="text-sm text-grappler-400 ml-0.5">min</span></div>
              <button onClick={() => setTrainingMinutes(trainingMinutes + 15)} className="w-9 h-9 rounded-lg bg-grappler-800 flex items-center justify-center">
                <Plus className="w-4 h-4 text-grappler-300" />
              </button>
            </div>
            <div className="flex gap-1.5 justify-center flex-wrap">
              {(user?.combatSport === 'striking' ? [
                { v: 'muay_thai' as ActivityType, l: 'MT' },
                { v: 'kickboxing' as ActivityType, l: 'KB' },
                { v: 'boxing' as ActivityType, l: 'Box' },
                { v: 'mma' as ActivityType, l: 'MMA' },
              ] : user?.combatSport === 'mma' ? [
                { v: 'mma' as ActivityType, l: 'MMA' },
                { v: 'bjj_nogi' as ActivityType, l: 'NoGi' },
                { v: 'wrestling' as ActivityType, l: 'Wrest' },
                { v: 'muay_thai' as ActivityType, l: 'MT' },
              ] : [
                { v: 'bjj_gi' as ActivityType, l: 'Gi' },
                { v: 'bjj_nogi' as ActivityType, l: 'NoGi' },
                { v: 'wrestling' as ActivityType, l: 'Wrest' },
                { v: 'mma' as ActivityType, l: 'MMA' },
              ]).concat([
                { v: 'running' as ActivityType, l: 'Run' },
                { v: 'yoga' as ActivityType, l: 'Yoga' },
                { v: 'other' as ActivityType, l: 'Other' },
              ]).map(({ v, l }) => (
                <button key={v} onClick={() => setActivityType(v)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", activityType === v ? "bg-lime-500/20 text-lime-400 ring-1 ring-lime-500/30" : "bg-grappler-800 text-grappler-400")}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 justify-center">
              {([
                { v: 'light_flow' as TrainingIntensity, l: 'Light' },
                { v: 'moderate' as TrainingIntensity, l: 'Mod' },
                { v: 'hard_sparring' as TrainingIntensity, l: 'Hard' },
                { v: 'competition_prep' as TrainingIntensity, l: 'Comp' },
              ]).map(({ v, l }) => (
                <button key={v} onClick={() => setTrainingIntensity(v)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", trainingIntensity === v ? "bg-lime-500/20 text-lime-400 ring-1 ring-lime-500/30" : "bg-grappler-800 text-grappler-400")}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 justify-center">
              {([
                { v: 'standalone' as SessionTiming, l: 'Solo' },
                { v: 'before_lifting' as SessionTiming, l: 'Pre-lift' },
                { v: 'after_lifting' as SessionTiming, l: 'Post-lift' },
                { v: 'same_day_separate' as SessionTiming, l: 'Same day' },
              ]).map(({ v, l }) => (
                <button key={v} onClick={() => setSessionTiming(v)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", sessionTiming === v ? "bg-lime-500/20 text-lime-400 ring-1 ring-lime-500/30" : "bg-grappler-800 text-grappler-400")}>
                  {l}
                </button>
              ))}
            </div>
            <div>
              <p className="text-xs text-grappler-400 text-center mb-1">RPE</p>
              <div className="flex gap-0.5 justify-center">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                  <button key={val} onClick={() => setPerceivedExertion(val)} className={cn("w-7 h-7 rounded text-xs font-medium transition-all", perceivedExertion === val ? "bg-lime-500/25 ring-1 ring-lime-400 text-lime-300" : "bg-grappler-800 text-grappler-400")}>
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'food':
        return (
          <div className="space-y-3">
            <div className="flex gap-1 justify-center flex-wrap">
              {([
                { v: 'breakfast' as MealType, l: 'Brkfst' },
                { v: 'lunch' as MealType, l: 'Lunch' },
                { v: 'dinner' as MealType, l: 'Dinner' },
                { v: 'snack' as MealType, l: 'Snack' },
                { v: 'pre_workout' as MealType, l: 'Pre-WO' },
                { v: 'post_workout' as MealType, l: 'Post-WO' },
              ]).map(({ v, l }) => (
                <button key={v} onClick={() => setFoodMealType(v)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", foodMealType === v ? "bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30" : "bg-grappler-800 text-grappler-400")}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap">
              {QUICK_FOODS.map(food => (
                <button key={food.name} onClick={() => { setFoodName(food.name); setFoodCal(food.cal); setFoodProtein(food.p); setFoodCarbs(food.c); setFoodFat(food.f); }} className={cn("px-3 py-1.5 rounded-lg text-xs transition-all", foodName === food.name ? "bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30" : "bg-grappler-800/60 text-grappler-400")}>
                  {food.name}
                </button>
              ))}
            </div>
            <input type="text" value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="Food name" className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 border border-grappler-700 focus:border-primary-500 outline-none" />
            <div className="grid grid-cols-4 gap-1.5">
              {([
                { l: 'Cal', v: foodCal, set: setFoodCal },
                { l: 'P (g)', v: foodProtein, set: setFoodProtein },
                { l: 'C (g)', v: foodCarbs, set: setFoodCarbs },
                { l: 'F (g)', v: foodFat, set: setFoodFat },
              ] as const).map(({ l, v, set }) => (
                <div key={l}>
                  <label className="text-xs text-grappler-400">{l}</label>
                  <input type="number" inputMode="decimal" value={v || ''} onChange={(e) => set(parseFloat(e.target.value) || 0)} className="w-full bg-grappler-800 rounded px-2 py-1.5 text-xs text-center text-grappler-200 border border-grappler-700 focus:border-primary-500 outline-none" />
                </div>
              ))}
            </div>
          </div>
        );

      case 'supplements':
        return (
          <div className="space-y-2">
            {supplementStack.length === 0 ? (
              <p className="text-xs text-grappler-400 text-center py-4">
                Set up your stack in the Nutrition tab first
              </p>
            ) : (
              supplementChecklist.map(group => (
                <div key={group.slot}>
                  <p className="text-xs text-grappler-400 uppercase tracking-wide font-medium mb-1">{group.slot}</p>
                  <div className="space-y-1">
                    {group.supplements.map(({ supplement: s, taken, intakeId, macros }) => (
                      <button
                        key={s.supplementId}
                        onClick={() => {
                          if (taken && intakeId) {
                            removeSupplementIntake(intakeId);
                            flash(`${s.name.split(' ')[0]} undone`);
                          } else {
                            handleLogSupplement(s.supplementId, s.name, s.macrosPerServing, s.servingsPerDose);
                          }
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left',
                          taken ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-grappler-800/40 border border-transparent'
                        )}
                      >
                        <div className={cn('w-4 h-4 rounded flex items-center justify-center flex-shrink-0', taken ? 'bg-emerald-500 text-white' : 'border border-grappler-600')}>
                          {taken && <Check className="w-2.5 h-2.5" />}
                        </div>
                        <span className={cn('text-xs flex-1 truncate', taken ? 'text-grappler-400 line-through' : 'text-grappler-200')}>{s.name}</span>
                        {macros && macros.protein > 0 && (
                          <span className="text-xs text-primary-400">{Math.round(macros.protein * s.servingsPerDose)}g P</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 'mobility':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setMobilityMinutes(Math.max(5, mobilityMinutes - 5))} className="w-9 h-9 rounded-lg bg-grappler-800 flex items-center justify-center">
                <Minus className="w-4 h-4 text-grappler-300" />
              </button>
              <div className="text-3xl font-bold text-grappler-50 w-20 text-center tabular-nums">{mobilityMinutes}<span className="text-sm text-grappler-400 ml-0.5">min</span></div>
              <button onClick={() => setMobilityMinutes(mobilityMinutes + 5)} className="w-9 h-9 rounded-lg bg-grappler-800 flex items-center justify-center">
                <Plus className="w-4 h-4 text-grappler-300" />
              </button>
            </div>
            <div className="flex gap-1.5 justify-center">
              {[5, 10, 15, 20, 30].map(min => (
                <button key={min} onClick={() => setMobilityMinutes(min)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", mobilityMinutes === min ? "bg-teal-500/20 text-teal-400 ring-1 ring-teal-500/30" : "bg-grappler-800 text-grappler-400")}>
                  {min}m
                </button>
              ))}
            </div>
          </div>
        );

      case 'sparring':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setSparringRounds(Math.max(1, sparringRounds - 1))} className="w-9 h-9 rounded-lg bg-grappler-800 flex items-center justify-center">
                <Minus className="w-4 h-4 text-grappler-300" />
              </button>
              <div className="text-3xl font-bold text-grappler-50 w-20 text-center tabular-nums">{sparringRounds}<span className="text-sm text-grappler-400 ml-0.5">rds</span></div>
              <button onClick={() => setSparringRounds(sparringRounds + 1)} className="w-9 h-9 rounded-lg bg-grappler-800 flex items-center justify-center">
                <Plus className="w-4 h-4 text-grappler-300" />
              </button>
            </div>
            <div className="flex gap-1.5 justify-center">
              {[3, 5, 6, 8, 10].map(r => (
                <button key={r} onClick={() => setSparringRounds(r)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", sparringRounds === r ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/30" : "bg-grappler-800 text-grappler-400")}>
                  {r}
                </button>
              ))}
            </div>
            <input type="text" value={sparringNotes} onChange={e => setSparringNotes(e.target.value)} placeholder="Notes (partner, focus, etc.)" className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 border border-grappler-700 focus:border-primary-500 outline-none" />
          </div>
        );

      case 'pain':
        return (
          <div className="space-y-3">
            <p className="text-xs text-grappler-400 text-center">How bad is it?</p>
            <div className="flex gap-2 justify-center">
              {([1, 2, 3, 4, 5] as const).map(level => (
                <button key={level} onClick={() => setPainLevel(level)} className={cn("w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all", painLevel === level ? "bg-amber-500/25 ring-2 ring-amber-400/50" : "bg-grappler-800")}>
                  <span className={cn("text-lg", level <= 2 ? "text-green-400" : level <= 3 ? "text-yellow-400" : "text-red-400")}>{level}</span>
                </button>
              ))}
            </div>
            <input type="text" value={painLocation} onChange={e => setPainLocation(e.target.value)} placeholder="Body part (e.g. left knee, shoulder)" className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 border border-grappler-700 focus:border-primary-500 outline-none" />
            <div className="flex gap-1.5 justify-center flex-wrap">
              {['Shoulder', 'Knee', 'Lower Back', 'Neck', 'Elbow', 'Wrist', 'Hip', 'Ankle'].map(part => (
                <button key={part} onClick={() => setPainLocation(part)} className={cn("px-2.5 py-1 rounded-lg text-xs transition-all", painLocation === part ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30" : "bg-grappler-800/60 text-grappler-400")}>
                  {part}
                </button>
              ))}
            </div>
          </div>
        );

      case 'recovery':
        return (
          <div className="space-y-3">
            <div className="flex gap-1.5 justify-center flex-wrap">
              {([
                { v: 'ice_bath' as const, l: 'Ice Bath' },
                { v: 'sauna' as const, l: 'Sauna' },
                { v: 'massage' as const, l: 'Massage' },
                { v: 'contrast' as const, l: 'Contrast' },
                { v: 'stretching' as const, l: 'Stretch' },
              ]).map(({ v, l }) => (
                <button key={v} onClick={() => setRecoveryType(v)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", recoveryType === v ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30" : "bg-grappler-800 text-grappler-400")}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setRecoveryMinutes(Math.max(5, recoveryMinutes - 5))} className="w-9 h-9 rounded-lg bg-grappler-800 flex items-center justify-center">
                <Minus className="w-4 h-4 text-grappler-300" />
              </button>
              <div className="text-3xl font-bold text-grappler-50 w-20 text-center tabular-nums">{recoveryMinutes}<span className="text-sm text-grappler-400 ml-0.5">min</span></div>
              <button onClick={() => setRecoveryMinutes(recoveryMinutes + 5)} className="w-9 h-9 rounded-lg bg-grappler-800 flex items-center justify-center">
                <Plus className="w-4 h-4 text-grappler-300" />
              </button>
            </div>
          </div>
        );

      case 'mental':
        return (
          <div className="space-y-3">
            <p className="text-xs text-grappler-400 text-center">How&apos;s your head at?</p>
            <div className="flex gap-2 justify-center">
              {([
                { v: 1 as const, l: 'Low' },
                { v: 2 as const, l: 'Shaky' },
                { v: 3 as const, l: 'Neutral' },
                { v: 4 as const, l: 'Focused' },
                { v: 5 as const, l: 'Locked In' },
              ]).map(({ v, l }) => (
                <button key={v} onClick={() => setMentalRating(v)} className={cn("px-2.5 py-2.5 rounded-xl flex flex-col items-center justify-center transition-all", mentalRating === v ? "bg-violet-500/25 ring-2 ring-violet-400/50" : "bg-grappler-800")}>
                  <Brain className={cn("w-4 h-4 mb-0.5", v <= mentalRating ? "text-violet-400" : "text-grappler-600")} />
                  <span className="text-xs text-grappler-400">{l}</span>
                </button>
              ))}
            </div>
            <input type="text" value={mentalNotes} onChange={e => setMentalNotes(e.target.value)} placeholder="Notes (optional)" className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 border border-grappler-700 focus:border-primary-500 outline-none" />
          </div>
        );

      default:
        return null;
    }
  };

  // ── Layout ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-grappler-950">
      {/* Header */}
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
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-green-500/15 border border-green-500/40 text-green-400 px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg"
          >
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">{successMessage}</span>
            {undoAction && (
              <button
                onClick={() => { undoAction.undo(); setShowSuccess(false); setUndoAction(null); }}
                className="ml-2 px-2 py-0.5 rounded bg-green-500/20 text-green-300 text-xs font-medium hover:bg-green-500/30 transition-colors flex items-center gap-1"
              >
                <Undo2 className="w-3 h-3" /> Undo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 space-y-3">

        {/* Quick Workout — compact */}
        {!activeLog && user && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const gaps = getVolumeGaps(workoutLogs, user.equipment, user.availableEquipment);
              const session = generateQuickWorkout(
                user.equipment, 30, user.goalFocus, user.availableEquipment, user.trainingIdentity,
                gaps.length > 0 ? gaps.map(g => ({ muscle: g.muscle, deficit: g.deficit })) : undefined,
              );
              if (startWorkout(session) === false) {
                showToast('Finish your current workout first', 'warning');
                return;
              }
              onClose();
            }}
            className="w-full rounded-xl border border-primary-500/30 bg-gradient-to-r from-primary-500/10 to-accent-500/5 p-3 flex items-center gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-grappler-50">Quick 30min Workout</p>
              <p className="text-xs text-grappler-400">Auto-generated lift session</p>
            </div>
            <Play className="w-4 h-4 text-primary-400" />
          </motion.button>
        )}

        {/* Smart Prompt — single contextual nudge */}
        {!activeLog && (() => {
          const hour = new Date().getHours();
          let prompt: { text: string; action: QuickLogType; color: string } | null = null;
          if (hour < 12 && !todayWeight) prompt = { text: 'Log fasted weight', action: 'weight', color: 'text-purple-400' };
          else if (latestWhoopData && typeof latestWhoopData.recoveryScore === 'number' && latestWhoopData.recoveryScore < 33) prompt = { text: 'Recovery is low — try mobility or rest', action: 'recovery', color: 'text-cyan-400' };
          else if (todayTraining.length > 0 && todayCals < 500) prompt = { text: 'You trained — fuel up!', action: 'food', color: 'text-orange-400' };
          else if (todayWater < 1500 && hour >= 14) prompt = { text: 'Water intake is low', action: 'water', color: 'text-blue-400' };
          else if (hour >= 20 && !hasSleep) prompt = { text: 'Log last night\'s sleep', action: 'sleep', color: 'text-indigo-400' };

          if (!prompt) return null;
          return (
            <button onClick={() => setActiveLog(prompt!.action)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-grappler-800/30 border border-grappler-700/30 hover:border-grappler-600 transition-colors">
              <Sparkles className={cn('w-3.5 h-3.5', prompt.color)} />
              <span className="text-xs text-grappler-300">{prompt.text}</span>
              <TrendingUp className="w-3 h-3 text-grappler-600 ml-auto" />
            </button>
          );
        })()}

        {/* ─── Primary tiles — responsive grid ─── */}
        {!activeLog && (
          <>
            {/* Water: instant-log presets (one tap = logged) */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'relative rounded-xl border p-3 transition-all',
                todayWater >= 2000 ? 'bg-grappler-800/50 border-grappler-600/40' : 'bg-grappler-900/40 border-grappler-700/30'
              )}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <Droplets className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="text-xs font-semibold text-grappler-200">Water</span>
                {todayWater > 0 && (
                  <span className={cn('text-xs ml-auto tabular-nums', todayWater >= 2000 ? 'text-green-400/80' : 'text-grappler-400')}>
                    {todayWater >= 1000 ? `${(todayWater / 1000).toFixed(1)}L` : `${todayWater}ml`}
                  </span>
                )}
                {todayWater >= 2000 && <Check className="w-3 h-3 text-green-400" />}
              </div>
              <div className="flex gap-1.5">
                {[250, 500, 750].map(ml => (
                  <motion.button
                    key={ml}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => instantWater(ml)}
                    className="flex-1 py-2 rounded-lg bg-blue-500/10 text-xs font-medium text-blue-300 ring-1 ring-blue-500/20 active:bg-blue-500/25 transition-colors"
                  >
                    +{ml}ml
                  </motion.button>
                ))}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setActiveLog('water')}
                  className="py-2 px-3 rounded-lg bg-grappler-800/60 text-xs font-medium text-grappler-400 ring-1 ring-grappler-700/40 active:bg-grappler-700/60 transition-colors"
                >
                  Custom
                </motion.button>
              </div>
            </motion.div>

            {/* Remaining primary tiles (Food, Weight, Supps) */}
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
              {primaryActions.filter(a => a.id !== 'water').map((a, i) => (
                <motion.button
                  key={a.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setActiveLog(a.id)}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'relative p-2.5 rounded-xl border text-center transition-all',
                    a.done ? 'bg-grappler-800/50 border-grappler-600/40' : 'bg-grappler-900/40 border-grappler-700/30'
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5', a.bg)}>
                    <a.icon className={cn('w-4 h-4', a.color)} />
                  </div>
                  <p className="text-xs font-medium text-grappler-200">{a.label}</p>
                  {a.stat && (
                    <p className={cn('text-xs mt-0.5', a.done ? 'text-green-400/80' : 'text-grappler-400')}>{a.stat}</p>
                  )}
                  {a.done && <Check className="w-3 h-3 text-green-400 absolute top-1.5 right-1.5" />}
                </motion.button>
              ))}
            </div>
          </>
        )}

        {/* ─── Secondary tiles — show more ─── */}
        {!activeLog && (
          <>
            <button
              onClick={() => setShowMore(!showMore)}
              className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-grappler-400 hover:text-grappler-300 transition-colors"
            >
              {showMore ? 'Less' : 'More'} <ChevronDown className={cn('w-3 h-3 transition-transform', showMore && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {showMore && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {secondaryActions.map((a, i) => (
                      <motion.button
                        key={a.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => setActiveLog(a.id)}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          'relative p-2.5 rounded-xl border text-center transition-all',
                          a.done ? 'bg-grappler-800/50 border-grappler-600/40' : 'bg-grappler-900/40 border-grappler-700/30'
                        )}
                      >
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5', a.bg)}>
                          <a.icon className={cn('w-4 h-4', a.color)} />
                        </div>
                        <p className="text-xs font-medium text-grappler-200">{a.label}</p>
                        {a.stat && <p className={cn('text-xs mt-0.5', a.done ? 'text-green-400/80' : 'text-grappler-400')}>{a.stat}</p>}
                        {a.done && <Check className="w-3 h-3 text-green-400 absolute top-1.5 right-1.5" />}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Combat Actions ─── */}
            {showMore && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-2"
              >
                <p className="text-xs text-grappler-500 uppercase tracking-wide font-medium mb-1.5 px-1">Fighter Tools</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {combatActions.map((a, i) => (
                    <motion.button
                      key={a.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setActiveLog(a.id)}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        'relative p-2.5 rounded-xl border text-center transition-all',
                        a.done ? 'bg-grappler-800/50 border-grappler-600/40' : 'bg-grappler-900/40 border-grappler-700/30'
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5', a.bg)}>
                        <a.icon className={cn('w-4 h-4', a.color)} />
                      </div>
                      <p className="text-xs font-medium text-grappler-200">{a.label}</p>
                      {a.stat && <p className={cn('text-xs mt-0.5', a.done ? 'text-green-400/80' : 'text-grappler-400')}>{a.stat}</p>}
                      {a.done && <Check className="w-3 h-3 text-green-400 absolute top-1.5 right-1.5" />}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* ─── Active Log Input ─── */}
        <AnimatePresence mode="wait">
          {activeLog && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="bg-grappler-900/60 border border-grappler-800 rounded-xl p-4"
            >
              {/* Compact header */}
              <div className="flex items-center gap-2 mb-3">
                {(() => {
                  const a = [...primaryActions, ...secondaryActions, ...combatActions].find(x => x.id === activeLog);
                  if (!a) return null;
                  return (
                    <>
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', a.bg)}>
                        <a.icon className={cn('w-3.5 h-3.5', a.color)} />
                      </div>
                      <h3 className="text-sm font-semibold text-grappler-100">{a.label}</h3>
                    </>
                  );
                })()}
              </div>

              {renderQuickInput()}

              {/* Action buttons */}
              {activeLog !== 'supplements' ? (
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setActiveLog(null)} className="flex-1 py-2 rounded-lg bg-grappler-800 text-xs text-grappler-400 font-medium">
                    Cancel
                  </button>
                  <button onClick={() => handleSaveLog(activeLog)} className="flex-1 py-2 rounded-lg bg-primary-500 text-xs text-white font-medium flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Save
                  </button>
                </div>
              ) : (
                <button onClick={() => setActiveLog(null)} className="w-full mt-3 py-2 rounded-lg bg-grappler-800 text-xs text-grappler-400 font-medium">
                  Done
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
