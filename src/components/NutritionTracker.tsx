'use client';

import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  Apple,
  Droplets,
  Plus,
  X,
  ChevronLeft,
  Flame,
  Beef,
  Wheat,
  Droplet,
  Zap,
  Cookie,
  Egg,
  Fish,
  Milk,
  Salad,
  Trash2,
  Camera,
  Loader2,
  ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { MealType, MealEntry, MacroTargets, DailyNutrition } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// ── Austrian & European preset foods with metric portions ──────────────────
const PRESET_FOODS: Omit<MealEntry, 'id' | 'date' | 'mealType'>[] = [
  // Austrian classics
  { name: 'Wiener Schnitzel (200g)', calories: 530, protein: 32, carbs: 28, fat: 32 },
  { name: 'Kaiserschmarrn (250g)', calories: 420, protein: 12, carbs: 52, fat: 18 },
  { name: 'Semmel (1 Stk, 60g)', calories: 160, protein: 5, carbs: 30, fat: 2 },
  { name: 'Topfenknödel (3 Stk)', calories: 380, protein: 16, carbs: 48, fat: 14 },
  { name: 'Kasnocken (300g)', calories: 520, protein: 22, carbs: 45, fat: 28 },
  { name: 'Tiroler Gröstl (350g)', calories: 480, protein: 28, carbs: 38, fat: 24 },
  // Protein sources (metric)
  { name: 'Hühnerbrust (170g)', calories: 280, protein: 53, carbs: 0, fat: 6 },
  { name: 'Lachs (170g)', calories: 350, protein: 38, carbs: 0, fat: 22 },
  { name: 'Eier (3 Stk)', calories: 234, protein: 18, carbs: 2, fat: 16 },
  { name: 'Rindfleisch mager (200g)', calories: 320, protein: 44, carbs: 0, fat: 16 },
  { name: 'Skyr Natur (200g)', calories: 130, protein: 22, carbs: 8, fat: 0 },
  { name: 'Proteinshake (300ml)', calories: 160, protein: 30, carbs: 5, fat: 2 },
  // Carb sources
  { name: 'Haferflocken (80g)', calories: 307, protein: 11, carbs: 55, fat: 5 },
  { name: 'Vollkornbrot (2 Scheiben)', calories: 200, protein: 8, carbs: 36, fat: 3 },
  { name: 'Reis (150g gekocht)', calories: 195, protein: 4, carbs: 42, fat: 1 },
  { name: 'Kartoffeln (250g)', calories: 178, protein: 5, carbs: 38, fat: 0 },
  { name: 'Banane (1 Stk)', calories: 105, protein: 1, carbs: 27, fat: 0 },
  // Fats & snacks
  { name: 'Erdnussbutter (30g)', calories: 190, protein: 7, carbs: 7, fat: 16 },
  { name: 'Avocado (halbe)', calories: 160, protein: 2, carbs: 9, fat: 15 },
  { name: 'Mandeln (30g)', calories: 175, protein: 6, carbs: 6, fat: 15 },
  // Drinks
  { name: 'Milchkaffee (250ml)', calories: 80, protein: 4, carbs: 6, fat: 4 },
  { name: 'Apfelschorle (330ml)', calories: 66, protein: 0, carbs: 16, fat: 0 },
];

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snack',
  pre_workout: 'Pre-Workout',
  post_workout: 'Post-Workout',
};

const MEAL_TYPE_ICONS: Record<MealType, React.ReactNode> = {
  breakfast: <Egg className="w-4 h-4" />,
  lunch: <Salad className="w-4 h-4" />,
  dinner: <Beef className="w-4 h-4" />,
  snack: <Cookie className="w-4 h-4" />,
  pre_workout: <Zap className="w-4 h-4" />,
  post_workout: <Milk className="w-4 h-4" />,
};

const MEAL_TYPE_ORDER: MealType[] = [
  'breakfast',
  'pre_workout',
  'lunch',
  'snack',
  'post_workout',
  'dinner',
];

const DEFAULT_TARGETS: MacroTargets = {
  calories: 2500,
  protein: 200,
  carbs: 280,
  fat: 80,
};

// ── Circular progress ring ──────────────────────────────────────────────────
function MacroRing({
  label,
  current,
  target,
  unit,
  color,
  size = 80,
  strokeWidth = 6,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / target, 1);
  const offset = circumference - progress * circumference;
  const isOver = current > target;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-grappler-700/50"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isOver ? '#ef4444' : color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-sm font-bold ${isOver ? 'text-red-400' : 'text-grappler-50'}`}
          >
            {current}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-grappler-200">{label}</p>
        <p className="text-[10px] text-grappler-500">
          / {target}
          {unit}
        </p>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
interface NutritionTrackerProps {
  onClose: () => void;
}

export default function NutritionTracker({ onClose }: NutritionTrackerProps) {
  const { user } = useAppStore();

  // ── Local state (nutrition not yet in zustand) ──
  const [macroTargets] = useState<MacroTargets>(DEFAULT_TARGETS);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [waterGlasses, setWaterGlasses] = useState(0);

  // ── Form state ──
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [formMealType, setFormMealType] = useState<MealType>('lunch');
  const [formName, setFormName] = useState('');
  const [formCalories, setFormCalories] = useState('');
  const [formProtein, setFormProtein] = useState('');
  const [formCarbs, setFormCarbs] = useState('');
  const [formFat, setFormFat] = useState('');

  // ── Camera/photo state ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence: string;
    notes: string;
  } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // ── Preset search ──
  const [presetSearch, setPresetSearch] = useState('');

  const filteredPresets = useMemo(() => {
    if (!presetSearch.trim()) return PRESET_FOODS;
    const q = presetSearch.toLowerCase();
    return PRESET_FOODS.filter((p) => p.name.toLowerCase().includes(q));
  }, [presetSearch]);

  // ── Computed totals ──
  const todayStr = new Date().toISOString().split('T')[0];

  const todayMeals = useMemo(
    () =>
      meals.filter(
        (m) => new Date(m.date).toISOString().split('T')[0] === todayStr
      ),
    [meals, todayStr]
  );

  const totals = useMemo(() => {
    return todayMeals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [todayMeals]);

  const mealsByType = useMemo(() => {
    const grouped: Partial<Record<MealType, MealEntry[]>> = {};
    todayMeals.forEach((m) => {
      if (!grouped[m.mealType]) grouped[m.mealType] = [];
      grouped[m.mealType]!.push(m);
    });
    return grouped;
  }, [todayMeals]);

  // ── Water tracking ──
  const WATER_GOAL = 8; // glasses (250ml each = 2L)
  const waterLiters = +(waterGlasses * 0.25).toFixed(2);

  // ── Macro bar percentages ──
  const totalMacroGrams = totals.protein + totals.carbs + totals.fat;
  const proteinPct = totalMacroGrams > 0 ? (totals.protein / totalMacroGrams) * 100 : 0;
  const carbsPct = totalMacroGrams > 0 ? (totals.carbs / totalMacroGrams) * 100 : 0;
  const fatPct = totalMacroGrams > 0 ? (totals.fat / totalMacroGrams) * 100 : 0;

  // ── Handlers ──
  const resetForm = () => {
    setFormName('');
    setFormCalories('');
    setFormProtein('');
    setFormCarbs('');
    setFormFat('');
    setAnalysisResult(null);
    setAnalysisError(null);
    setPreviewImage(null);
  };

  const handleAddMeal = () => {
    const cal = parseInt(formCalories) || 0;
    const pro = parseInt(formProtein) || 0;
    const carb = parseInt(formCarbs) || 0;
    const fat = parseInt(formFat) || 0;
    if (!formName.trim() || cal === 0) return;

    const entry: MealEntry = {
      id: uuidv4(),
      date: new Date(),
      mealType: formMealType,
      name: formName.trim(),
      calories: cal,
      protein: pro,
      carbs: carb,
      fat: fat,
    };

    setMeals((prev) => [...prev, entry]);
    resetForm();
    setShowAddForm(false);
  };

  const handlePresetAdd = (preset: (typeof PRESET_FOODS)[number]) => {
    const entry: MealEntry = {
      id: uuidv4(),
      date: new Date(),
      mealType: formMealType,
      name: preset.name,
      calories: preset.calories,
      protein: preset.protein,
      carbs: preset.carbs,
      fat: preset.fat,
    };
    setMeals((prev) => [...prev, entry]);
    setShowPresets(false);
    setPresetSearch('');
  };

  const handleDeleteMeal = (id: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== id));
  };

  // ── Camera / Photo analysis ──
  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show form with loading state
    setShowAddForm(true);
    setShowPresets(false);
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreviewImage(dataUrl);

      try {
        const res = await fetch('/api/nutrition/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl }),
        });

        const data = await res.json();

        if (!res.ok) {
          setAnalysisError(data.error || 'Analysis failed');
          setIsAnalyzing(false);
          return;
        }

        if (!data.name || data.calories === 0) {
          setAnalysisError(data.notes || 'Could not identify food in this image');
          setIsAnalyzing(false);
          return;
        }

        // Pre-fill form with results
        setAnalysisResult(data);
        setFormName(data.name);
        setFormCalories(String(data.calories));
        setFormProtein(String(data.protein));
        setFormCarbs(String(data.carbs));
        setFormFat(String(data.fat));
        setIsAnalyzing(false);
      } catch (err: any) {
        setAnalysisError(err.message || 'Network error during analysis');
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);

    // Reset file input so same file can be selected again
    e.target.value = '';
  };

  // ── European date formatting ──
  const todayFormatted = new Date().toLocaleDateString('de-AT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-grappler-900 pb-24"
    >
      {/* Hidden file input for camera/gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageCapture}
        className="hidden"
      />

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-grappler-900/95 backdrop-blur-sm border-b border-grappler-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-grappler-400 hover:text-grappler-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <h1 className="text-lg font-bold text-grappler-50 flex items-center gap-2">
            <Apple className="w-5 h-5 text-primary-400" />
            Nutrition
          </h1>
          <div className="w-16" /> {/* spacer */}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* ── Macro Rings ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="card p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide">
              Tagesziele
            </h2>
            <p className="text-xs text-grappler-500">{todayFormatted}</p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <MacroRing
              label="kcal"
              current={totals.calories}
              target={macroTargets.calories}
              unit=""
              color="#f97316"
              size={76}
            />
            <MacroRing
              label="Protein"
              current={totals.protein}
              target={macroTargets.protein}
              unit="g"
              color="#ef4444"
              size={76}
            />
            <MacroRing
              label="Carbs"
              current={totals.carbs}
              target={macroTargets.carbs}
              unit="g"
              color="#3b82f6"
              size={76}
            />
            <MacroRing
              label="Fett"
              current={totals.fat}
              target={macroTargets.fat}
              unit="g"
              color="#eab308"
              size={76}
            />
          </div>

          {/* ── Macro breakdown bar ── */}
          {totalMacroGrams > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-grappler-400 uppercase tracking-wide">
                Makro-Verteilung
              </p>
              <div className="h-3 rounded-full overflow-hidden flex bg-grappler-700/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${proteinPct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="bg-red-500 h-full"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${carbsPct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                  className="bg-blue-500 h-full"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${fatPct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                  className="bg-yellow-500 h-full"
                />
              </div>
              <div className="flex justify-between text-[10px] text-grappler-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  Protein {Math.round(proteinPct)}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  Carbs {Math.round(carbsPct)}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                  Fett {Math.round(fatPct)}%
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Water Tracker ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="card p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-400" />
              Wasser
            </h2>
            <span className="text-xs text-grappler-400">
              {waterLiters} L / {(WATER_GOAL * 0.25).toFixed(1)} L
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {Array.from({ length: WATER_GOAL }, (_, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.85 }}
                onClick={() => setWaterGlasses(i < waterGlasses ? i : i + 1)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  i < waterGlasses
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'bg-grappler-700/40 text-grappler-600 border border-grappler-700/60'
                }`}
              >
                <Droplet
                  className={`w-4 h-4 ${
                    i < waterGlasses ? 'fill-blue-400' : ''
                  }`}
                />
              </motion.button>
            ))}
          </div>

          <p className="text-xs text-grappler-500 mt-2">
            {waterGlasses}/{WATER_GOAL} Gläser (je 250 ml)
            {waterGlasses >= WATER_GOAL && (
              <span className="text-blue-400 ml-1 font-medium">
                {' '}
                -- Ziel erreicht!
              </span>
            )}
          </p>
        </motion.div>

        {/* ── Quick Add / Camera / Custom ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="card p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide">
              Essen erfassen
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleCameraClick}
                className="btn btn-secondary btn-sm gap-1"
                title="Foto aufnehmen"
              >
                <Camera className="w-3.5 h-3.5" />
                Foto
              </button>
              <button
                onClick={() => {
                  setShowPresets(!showPresets);
                  setShowAddForm(false);
                }}
                className="btn btn-secondary btn-sm gap-1"
              >
                <Zap className="w-3.5 h-3.5" />
                Schnell
              </button>
              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setShowPresets(false);
                  setAnalysisResult(null);
                  setAnalysisError(null);
                  setPreviewImage(null);
                }}
                className="btn btn-primary btn-sm gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Manuell
              </button>
            </div>
          </div>

          {/* Meal type selector (shared) */}
          {(showAddForm || showPresets) && (
            <div className="mb-3">
              <label className="text-xs text-grappler-400 mb-1.5 block">
                Mahlzeit
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {MEAL_TYPE_ORDER.map((type) => (
                  <button
                    key={type}
                    onClick={() => setFormMealType(type)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                      formMealType === type
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/40'
                        : 'bg-grappler-700/40 text-grappler-400 border border-grappler-700/60 hover:border-grappler-600'
                    }`}
                  >
                    {MEAL_TYPE_ICONS[type]}
                    {MEAL_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Preset foods grid with search ── */}
          <AnimatePresence>
            {showPresets && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {/* Search bar */}
                <div className="mb-2">
                  <input
                    type="text"
                    value={presetSearch}
                    onChange={(e) => setPresetSearch(e.target.value)}
                    placeholder="Suchen... (z.B. Schnitzel, Reis)"
                    className="input text-sm"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 pb-1 max-h-72 overflow-y-auto">
                  {filteredPresets.map((preset, idx) => (
                    <motion.button
                      key={preset.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => handlePresetAdd(preset)}
                      className="bg-grappler-700/30 hover:bg-grappler-700/60 border border-grappler-700/50 rounded-lg p-2.5 text-left transition-all group"
                    >
                      <p className="text-xs font-medium text-grappler-200 group-hover:text-grappler-50 truncate">
                        {preset.name}
                      </p>
                      <div className="flex gap-2 mt-1 text-[10px] text-grappler-500">
                        <span className="text-orange-400/80">
                          {preset.calories} kcal
                        </span>
                        <span className="text-red-400/80">
                          {preset.protein}p
                        </span>
                        <span className="text-blue-400/80">
                          {preset.carbs}c
                        </span>
                        <span className="text-yellow-400/80">
                          {preset.fat}f
                        </span>
                      </div>
                    </motion.button>
                  ))}
                  {filteredPresets.length === 0 && (
                    <p className="col-span-2 text-xs text-grappler-500 text-center py-4">
                      Keine Ergebnisse. Versuche &quot;Manuell&quot; oder &quot;Foto&quot;.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Custom meal form (also used for camera results) ── */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 pb-1">
                  {/* Photo preview + analysis status */}
                  {(previewImage || isAnalyzing) && (
                    <div className="relative">
                      {previewImage && (
                        <div className="relative rounded-lg overflow-hidden border border-grappler-700/50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewImage}
                            alt="Food photo"
                            className="w-full h-40 object-cover"
                          />
                          {isAnalyzing && (
                            <div className="absolute inset-0 bg-grappler-900/70 flex items-center justify-center">
                              <div className="text-center">
                                <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-2" />
                                <p className="text-xs text-grappler-300">Essen wird erkannt...</p>
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setPreviewImage(null);
                              setAnalysisResult(null);
                              setAnalysisError(null);
                            }}
                            className="absolute top-2 right-2 p-1 rounded-full bg-grappler-900/80 text-grappler-400 hover:text-grappler-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Analysis result badge */}
                  {analysisResult && (
                    <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                      analysisResult.confidence === 'high'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                        : analysisResult.confidence === 'medium'
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                    }`}>
                      <ImageIcon className="w-4 h-4 flex-shrink-0" />
                      <span>
                        AI-Erkennung ({analysisResult.confidence === 'high' ? 'sicher' : analysisResult.confidence === 'medium' ? 'wahrscheinlich' : 'unsicher'})
                        {analysisResult.notes && ` — ${analysisResult.notes}`}
                      </span>
                    </div>
                  )}

                  {/* Analysis error */}
                  {analysisError && (
                    <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{analysisError}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="z.B. Tiroler Gröstl, Semmelknödel"
                      className="input"
                      autoFocus={!previewImage}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-grappler-400 mb-1 block flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-400" />
                        kcal
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={formCalories}
                        onChange={(e) => setFormCalories(e.target.value)}
                        placeholder="0"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-grappler-400 mb-1 block flex items-center gap-1">
                        <Beef className="w-3 h-3 text-red-400" />
                        Protein (g)
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={formProtein}
                        onChange={(e) => setFormProtein(e.target.value)}
                        placeholder="0"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-grappler-400 mb-1 block flex items-center gap-1">
                        <Wheat className="w-3 h-3 text-blue-400" />
                        Kohlenhydrate (g)
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={formCarbs}
                        onChange={(e) => setFormCarbs(e.target.value)}
                        placeholder="0"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-grappler-400 mb-1 block flex items-center gap-1">
                        <Droplet className="w-3 h-3 text-yellow-400" />
                        Fett (g)
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={formFat}
                        onChange={(e) => setFormFat(e.target.value)}
                        placeholder="0"
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        resetForm();
                      }}
                      className="btn btn-secondary btn-sm flex-1"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleAddMeal}
                      disabled={isAnalyzing}
                      className="btn btn-primary btn-sm flex-1 disabled:opacity-50"
                    >
                      Hinzufügen
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Meal Log ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="card p-4"
        >
          <h2 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide mb-3">
            Heutige Mahlzeiten
          </h2>

          {todayMeals.length === 0 ? (
            <div className="text-center py-8">
              <Apple className="w-10 h-10 text-grappler-700 mx-auto mb-2" />
              <p className="text-sm text-grappler-500">
                Noch keine Mahlzeiten erfasst.
              </p>
              <p className="text-xs text-grappler-600 mt-1">
                Nutze Foto, Schnell oder Manuell um loszulegen.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {MEAL_TYPE_ORDER.map((type) => {
                const typeMeals = mealsByType[type];
                if (!typeMeals || typeMeals.length === 0) return null;

                const typeCalories = typeMeals.reduce(
                  (sum, m) => sum + m.calories,
                  0
                );

                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-grappler-300">
                        {MEAL_TYPE_ICONS[type]}
                        <span className="text-xs font-semibold uppercase tracking-wide">
                          {MEAL_TYPE_LABELS[type]}
                        </span>
                      </div>
                      <span className="text-xs text-grappler-500">
                        {typeCalories} kcal
                      </span>
                    </div>

                    <div className="space-y-1">
                      {typeMeals.map((meal, idx) => (
                        <motion.div
                          key={meal.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center justify-between py-2 px-3 bg-grappler-800/40 rounded-lg group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-grappler-200 font-medium truncate">
                              {meal.name}
                            </p>
                            <div className="flex gap-3 mt-0.5 text-[10px]">
                              <span className="text-orange-400">
                                {meal.calories} kcal
                              </span>
                              <span className="text-red-400">
                                {meal.protein}g P
                              </span>
                              <span className="text-blue-400">
                                {meal.carbs}g K
                              </span>
                              <span className="text-yellow-400">
                                {meal.fat}g F
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteMeal(meal.id)}
                            className="p-1.5 rounded hover:bg-grappler-700 text-grappler-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── Summary Footer ── */}
        {todayMeals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-grappler-800 rounded-xl p-4"
          >
            <h2 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide mb-3">
              Tagesbilanz
            </h2>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-orange-400">
                  {totals.calories}
                </p>
                <p className="text-[10px] text-grappler-500">
                  / {macroTargets.calories} kcal
                </p>
                <p className="text-[10px] text-grappler-400 mt-0.5">
                  {Math.max(macroTargets.calories - totals.calories, 0)} übrig
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-400">
                  {totals.protein}g
                </p>
                <p className="text-[10px] text-grappler-500">
                  / {macroTargets.protein}g Pro
                </p>
                <p className="text-[10px] text-grappler-400 mt-0.5">
                  {Math.max(macroTargets.protein - totals.protein, 0)}g übrig
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-400">
                  {totals.carbs}g
                </p>
                <p className="text-[10px] text-grappler-500">
                  / {macroTargets.carbs}g KH
                </p>
                <p className="text-[10px] text-grappler-400 mt-0.5">
                  {Math.max(macroTargets.carbs - totals.carbs, 0)}g übrig
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-yellow-400">
                  {totals.fat}g
                </p>
                <p className="text-[10px] text-grappler-500">
                  / {macroTargets.fat}g Fett
                </p>
                <p className="text-[10px] text-grappler-400 mt-0.5">
                  {Math.max(macroTargets.fat - totals.fat, 0)}g übrig
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
