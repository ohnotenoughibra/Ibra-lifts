'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  X,
  Filter,
  Dumbbell,
  Zap,
  Target,
  Star,
  ChevronLeft,
  Swords,
  RotateCcw,
  ArrowUpDown,
  Move,
  Flame,
  CircleDot,
  Info,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { exercises } from '@/lib/exercises';
import type { Exercise, MuscleGroup, ExerciseCategory, MovementPattern } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MovementLibraryProps {
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type CategoryFilter = 'all' | ExerciseCategory;
type MuscleFilter = 'all' | 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core';
type PatternFilter = 'all' | MovementPattern;
type EquipmentFilter = 'all' | 'barbell' | 'dumbbell' | 'cable' | 'bodyweight' | 'kettlebell' | 'machine';

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'compound', label: 'Compound' },
  { value: 'isolation', label: 'Isolation' },
  { value: 'power', label: 'Power' },
  { value: 'grappling_specific', label: 'Grappling' },
  { value: 'grip', label: 'Grip' },
];

const MUSCLE_OPTIONS: { value: MuscleFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'arms', label: 'Arms' },
  { value: 'legs', label: 'Legs' },
  { value: 'core', label: 'Core' },
];

const PATTERN_OPTIONS: { value: PatternFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'push', label: 'Push' },
  { value: 'pull', label: 'Pull' },
  { value: 'squat', label: 'Squat' },
  { value: 'hinge', label: 'Hinge' },
  { value: 'carry', label: 'Carry' },
  { value: 'rotation', label: 'Rotation' },
  { value: 'explosive', label: 'Explosive' },
];

const EQUIPMENT_OPTIONS: { value: EquipmentFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'cable', label: 'Cable' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'machine', label: 'Machine' },
];

/** Map the simplified "muscle" filter to actual MuscleGroup values */
const MUSCLE_FILTER_MAP: Record<Exclude<MuscleFilter, 'all'>, MuscleGroup[]> = {
  chest: ['chest'],
  back: ['back', 'traps'],
  shoulders: ['shoulders'],
  arms: ['biceps', 'triceps', 'forearms'],
  legs: ['quadriceps', 'hamstrings', 'glutes', 'calves'],
  core: ['core'],
};

const CATEGORY_COLORS: Record<ExerciseCategory, string> = {
  compound: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  isolation: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  power: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  grappling_specific: 'bg-green-500/15 text-green-400 border-green-500/30',
  grip: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

const PATTERN_ICONS: Record<MovementPattern, typeof Dumbbell> = {
  push: ArrowUpDown,
  pull: ArrowUpDown,
  squat: ArrowUpDown,
  hinge: RotateCcw,
  carry: Move,
  rotation: RotateCcw,
  explosive: Flame,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLabel(str: string): string {
  return str
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function matchesMuscleFilter(exercise: Exercise, filter: MuscleFilter): boolean {
  if (filter === 'all') return true;
  const groups = MUSCLE_FILTER_MAP[filter];
  return exercise.primaryMuscles.some((m) => groups.includes(m));
}

function matchesEquipmentFilter(exercise: Exercise, filter: EquipmentFilter): boolean {
  if (filter === 'all') return true;
  return exercise.equipmentTypes.includes(filter);
}

function matchesSearch(exercise: Exercise, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (exercise.name.toLowerCase().includes(q)) return true;
  if (exercise.primaryMuscles.some((m) => m.toLowerCase().includes(q))) return true;
  if (exercise.secondaryMuscles.some((m) => m.toLowerCase().includes(q))) return true;
  if (exercise.cues.some((c) => c.toLowerCase().includes(q))) return true;
  if (exercise.category.toLowerCase().includes(q)) return true;
  if (exercise.movementPattern.toLowerCase().includes(q)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RatingBar({ value, max = 10 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={cn(
            'w-1.5 h-3 rounded-sm',
            i < value ? 'bg-primary-400' : 'bg-grappler-700/60'
          )}
        />
      ))}
    </div>
  );
}

function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto no-scrollbar pb-1"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
            value === opt.value
              ? 'bg-primary-500/20 text-primary-300 border-primary-500/40'
              : 'bg-grappler-800/60 text-grappler-400 border-grappler-700/40 hover:text-grappler-200 hover:border-grappler-600'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ExerciseCard({
  exercise,
  onSelect,
}: {
  exercise: Exercise;
  onSelect: (e: Exercise) => void;
}) {
  const PatternIcon = PATTERN_ICONS[exercise.movementPattern] || CircleDot;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={() => onSelect(exercise)}
      className="w-full text-left bg-grappler-800/50 hover:bg-grappler-800 border border-grappler-700/40 hover:border-grappler-600/60 rounded-xl p-3.5 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-bold text-grappler-50 leading-tight">
          {exercise.name}
        </h3>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {exercise.grapplerFriendly && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
              <Swords className="w-2.5 h-2.5" />
            </span>
          )}
          <span
            className={cn(
              'px-2 py-0.5 rounded text-xs font-semibold border',
              CATEGORY_COLORS[exercise.category]
            )}
          >
            {formatLabel(exercise.category)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {exercise.primaryMuscles.map((m) => (
          <span
            key={m}
            className="px-1.5 py-0.5 rounded text-xs font-medium bg-grappler-700/50 text-grappler-300 border border-grappler-600/30"
          >
            {formatLabel(m)}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-grappler-500">
          <PatternIcon className="w-3 h-3" />
          <span className="text-xs font-medium">{formatLabel(exercise.movementPattern)}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Dumbbell className="w-2.5 h-2.5 text-red-400/60" />
            <RatingBar value={exercise.strengthValue} max={10} />
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-purple-400/60" />
            <RatingBar value={exercise.aestheticValue} max={10} />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Exercise Detail Panel
// ---------------------------------------------------------------------------

function ExerciseDetailPanel({
  exercise,
  onBack,
  onNavigate,
}: {
  exercise: Exercise;
  onBack: () => void;
  onNavigate: (e: Exercise) => void;
}) {
  const similarExercises = useMemo(() => {
    return exercises.filter(
      (e) =>
        e.id !== exercise.id &&
        e.movementPattern === exercise.movementPattern &&
        e.primaryMuscles.some((m) => exercise.primaryMuscles.includes(m))
    ).slice(0, 12);
  }, [exercise]);

  const similarScrollRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-grappler-950 overflow-hidden safe-area-top"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
    >
      {/* Detail Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-grappler-950/95 backdrop-blur-md border-b border-grappler-700/40">
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-grappler-400 hover:text-grappler-100 hover:bg-grappler-800 transition-colors"
          aria-label="Back to list"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-grappler-50 truncate flex-1">
          {exercise.name}
        </h1>
        <span
          className={cn(
            'px-2 py-0.5 rounded text-xs font-semibold border flex-shrink-0',
            CATEGORY_COLORS[exercise.category]
          )}
        >
          {formatLabel(exercise.category)}
        </span>
      </div>

      {/* Detail Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 pb-8 space-y-5">
        {/* Muscles Section */}
        <div className="bg-grappler-900/80 border border-grappler-700/40 rounded-xl p-4">
          <div className="flex items-center gap-2 text-primary-400 mb-3">
            <Target className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Muscles Worked</span>
          </div>
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-semibold text-grappler-500 uppercase tracking-wider mb-1.5">Primary</h4>
              <div className="flex flex-wrap gap-1.5">
                {exercise.primaryMuscles.map((m) => (
                  <span
                    key={m}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-primary-500/15 text-primary-300 border border-primary-500/30"
                  >
                    {formatLabel(m)}
                  </span>
                ))}
              </div>
            </div>
            {exercise.secondaryMuscles.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-grappler-500 uppercase tracking-wider mb-1.5">Secondary</h4>
                <div className="flex flex-wrap gap-1.5">
                  {exercise.secondaryMuscles.map((m) => (
                    <span
                      key={m}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-grappler-700/50 text-grappler-400 border border-grappler-600/30"
                    >
                      {formatLabel(m)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Cues */}
        {exercise.cues.length > 0 && (
          <div className="bg-grappler-900/80 border border-grappler-700/40 rounded-xl p-4">
            <div className="flex items-center gap-2 text-primary-400 mb-3">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Form Cues</span>
            </div>
            <div className="space-y-2.5">
              {exercise.cues.map((cue, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 bg-grappler-800/50 rounded-lg p-3"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/15 text-primary-400 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <p className="text-sm text-grappler-200 leading-relaxed pt-0.5">{cue}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Info Grid */}
        <div className="bg-grappler-900/80 border border-grappler-700/40 rounded-xl p-4">
          <div className="flex items-center gap-2 text-primary-400 mb-3">
            <Info className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Key Info</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InfoCell label="Movement" value={formatLabel(exercise.movementPattern)} />
            <InfoCell
              label="Equipment"
              value={exercise.equipmentTypes.map(formatLabel).join(', ') || 'None'}
            />
            <InfoCell
              label="Unilateral"
              value={exercise.isUnilateral ? 'Yes' : 'No'}
            />
            <InfoCell
              label="Grappler-Friendly"
              value={exercise.grapplerFriendly ? 'Yes' : 'No'}
              highlight={exercise.grapplerFriendly}
            />
            <InfoCell
              label="Strength"
              value={`${exercise.strengthValue}/10`}
            />
            <InfoCell
              label="Aesthetic"
              value={`${exercise.aestheticValue}/10`}
            />
          </div>
        </div>

        {/* Description */}
        <div className="bg-grappler-900/80 border border-grappler-700/40 rounded-xl p-4">
          <div className="flex items-center gap-2 text-primary-400 mb-3">
            <Dumbbell className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Description</span>
          </div>
          <p className="text-sm text-grappler-300 leading-relaxed">
            {exercise.description}
          </p>
        </div>

        {/* Similar Exercises */}
        {similarExercises.length > 0 && (
          <div className="bg-grappler-900/80 border border-grappler-700/40 rounded-xl p-4">
            <div className="flex items-center gap-2 text-primary-400 mb-3">
              <Star className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Similar Exercises ({similarExercises.length})
              </span>
            </div>
            <div
              ref={similarScrollRef}
              className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1"
            >
              {similarExercises.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => onNavigate(ex)}
                  className="flex-shrink-0 w-44 bg-grappler-800/60 hover:bg-grappler-800 border border-grappler-700/40 hover:border-grappler-600/60 rounded-lg p-3 text-left transition-colors"
                >
                  <h4 className="text-xs font-bold text-grappler-100 mb-1 truncate">
                    {ex.name}
                  </h4>
                  <div className="flex items-center gap-1 mb-1.5">
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[9px] font-semibold border',
                        CATEGORY_COLORS[ex.category]
                      )}
                    >
                      {formatLabel(ex.category)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ex.primaryMuscles.slice(0, 2).map((m) => (
                      <span
                        key={m}
                        className="text-[9px] text-grappler-400 font-medium"
                      >
                        {formatLabel(m)}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function InfoCell({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-grappler-800/40 rounded-lg p-2.5">
      <p className="text-xs font-semibold text-grappler-500 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p
        className={cn(
          'text-sm font-semibold',
          highlight ? 'text-green-400' : 'text-grappler-200'
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function MovementLibrary({ onClose }: MovementLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [muscleFilter, setMuscleFilter] = useState<MuscleFilter>('all');
  const [patternFilter, setPatternFilter] = useState<PatternFilter>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentFilter>('all');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(value);
    }, 200);
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== 'all') count++;
    if (muscleFilter !== 'all') count++;
    if (patternFilter !== 'all') count++;
    if (equipmentFilter !== 'all') count++;
    return count;
  }, [categoryFilter, muscleFilter, patternFilter, equipmentFilter]);

  const clearAllFilters = useCallback(() => {
    setCategoryFilter('all');
    setMuscleFilter('all');
    setPatternFilter('all');
    setEquipmentFilter('all');
  }, []);

  // Filtered exercises
  const filteredExercises = useMemo(() => {
    return exercises.filter((exercise) => {
      if (categoryFilter !== 'all' && exercise.category !== categoryFilter) return false;
      if (!matchesMuscleFilter(exercise, muscleFilter)) return false;
      if (patternFilter !== 'all' && exercise.movementPattern !== patternFilter) return false;
      if (!matchesEquipmentFilter(exercise, equipmentFilter)) return false;
      if (!matchesSearch(exercise, debouncedQuery)) return false;
      return true;
    });
  }, [categoryFilter, muscleFilter, patternFilter, equipmentFilter, debouncedQuery]);

  // Navigation stack for detail view
  const handleSelectExercise = useCallback((exercise: Exercise) => {
    setSelectedExercise(exercise);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedExercise(null);
  }, []);

  const handleNavigateToExercise = useCallback((exercise: Exercise) => {
    setSelectedExercise(exercise);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-grappler-950">
      {/* Main View (List) */}
      <div className="relative flex flex-col h-full overflow-hidden">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-grappler-950/95 backdrop-blur-md border-b border-grappler-700/40">
          {/* Top Row: Back + Title */}
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-grappler-400 hover:text-grappler-100 hover:bg-grappler-800 transition-colors"
              aria-label="Close Movement Library"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-grappler-50 flex-1">Movement Library</h1>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                'relative p-2 rounded-lg transition-colors',
                showFilters
                  ? 'text-primary-400 bg-primary-500/10'
                  : 'text-grappler-400 hover:text-grappler-100 hover:bg-grappler-800'
              )}
              aria-label="Toggle filters"
            >
              <Filter className="w-5 h-5" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary-500 text-xs font-bold text-white flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search exercises, muscles, cues..."
                className="w-full pl-10 pr-9 py-2.5 bg-grappler-900 border border-grappler-700/40 rounded-xl text-sm text-grappler-50 placeholder:text-grappler-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    handleSearchChange('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-grappler-500 hover:text-grappler-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 space-y-2.5">
                  {/* Category */}
                  <div>
                    <p className="text-xs font-semibold text-grappler-500 uppercase tracking-wider mb-1">Category</p>
                    <FilterChips
                      options={CATEGORY_OPTIONS}
                      value={categoryFilter}
                      onChange={setCategoryFilter}
                    />
                  </div>
                  {/* Muscle */}
                  <div>
                    <p className="text-xs font-semibold text-grappler-500 uppercase tracking-wider mb-1">Muscle</p>
                    <FilterChips
                      options={MUSCLE_OPTIONS}
                      value={muscleFilter}
                      onChange={setMuscleFilter}
                    />
                  </div>
                  {/* Pattern */}
                  <div>
                    <p className="text-xs font-semibold text-grappler-500 uppercase tracking-wider mb-1">Pattern</p>
                    <FilterChips
                      options={PATTERN_OPTIONS}
                      value={patternFilter}
                      onChange={setPatternFilter}
                    />
                  </div>
                  {/* Equipment */}
                  <div>
                    <p className="text-xs font-semibold text-grappler-500 uppercase tracking-wider mb-1">Equipment</p>
                    <FilterChips
                      options={EQUIPMENT_OPTIONS}
                      value={equipmentFilter}
                      onChange={setEquipmentFilter}
                    />
                  </div>

                  {/* Clear all */}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results Count */}
        <div className="px-4 py-2.5 border-b border-grappler-800/60">
          <p className="text-xs text-grappler-500">
            Showing{' '}
            <span className="text-grappler-300 font-semibold">{filteredExercises.length}</span>
            {' '}of{' '}
            <span className="text-grappler-300 font-semibold">{exercises.length}</span>
            {' '}exercises
          </p>
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {filteredExercises.length > 0 ? (
            <div className="p-4 space-y-2.5">
              <AnimatePresence mode="popLayout">
                {filteredExercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onSelect={handleSelectExercise}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <Search className="w-10 h-10 text-grappler-700 mb-3" />
              <p className="text-sm font-medium text-grappler-400 text-center">
                No exercises match your search
              </p>
              <p className="text-xs text-grappler-600 text-center mt-1">
                Try adjusting your filters or search terms
              </p>
              {(activeFilterCount > 0 || debouncedQuery) && (
                <button
                  onClick={() => {
                    clearAllFilters();
                    handleSearchChange('');
                  }}
                  className="mt-4 px-4 py-2 rounded-lg text-xs font-medium text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/20 transition-colors"
                >
                  Clear all filters & search
                </button>
              )}
            </div>
          )}
        </div>

        {/* Detail Panel Overlay */}
        <AnimatePresence>
          {selectedExercise && (
            <ExerciseDetailPanel
              key={selectedExercise.id}
              exercise={selectedExercise}
              onBack={handleBackToList}
              onNavigate={handleNavigateToExercise}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
