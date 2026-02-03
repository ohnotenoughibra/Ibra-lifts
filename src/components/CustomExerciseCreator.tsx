'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Save,
  Dumbbell,
  X,
  Check,
  Search
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type {
  MuscleGroup,
  ExerciseCategory,
  MovementPattern,
  Equipment,
  CustomExercise
} from '@/lib/types';

interface CustomExerciseCreatorProps {
  onClose: () => void;
}

const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quadriceps', 'hamstrings', 'glutes', 'calves',
  'core', 'forearms', 'traps', 'lats', 'full_body'
];

const CATEGORIES: { value: ExerciseCategory; label: string }[] = [
  { value: 'compound', label: 'Compound' },
  { value: 'isolation', label: 'Isolation' },
  { value: 'power', label: 'Power' },
  { value: 'grappling_specific', label: 'Grappling' },
  { value: 'grip', label: 'Grip' }
];

const MOVEMENT_PATTERNS: { value: MovementPattern; label: string }[] = [
  { value: 'push', label: 'Push' },
  { value: 'pull', label: 'Pull' },
  { value: 'squat', label: 'Squat' },
  { value: 'hinge', label: 'Hinge' },
  { value: 'carry', label: 'Carry' },
  { value: 'rotation', label: 'Rotation' },
  { value: 'explosive', label: 'Explosive' }
];

const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'full_gym', label: 'Full Gym' },
  { value: 'home_gym', label: 'Home Gym' },
  { value: 'minimal', label: 'Minimal' }
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatMuscle(muscle: string): string {
  return muscle.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface FormState {
  name: string;
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  movementPattern: MovementPattern;
  equipmentRequired: Equipment[];
  grapplerFriendly: boolean;
  aestheticValue: number;
  strengthValue: number;
  description: string;
  cues: string[];
  videoUrl: string;
}

const initialForm: FormState = {
  name: '',
  category: 'compound',
  primaryMuscles: [],
  secondaryMuscles: [],
  movementPattern: 'push',
  equipmentRequired: [],
  grapplerFriendly: false,
  aestheticValue: 5,
  strengthValue: 5,
  description: '',
  cues: [],
  videoUrl: ''
};

export default function CustomExerciseCreator({ onClose }: CustomExerciseCreatorProps) {
  const { customExercises, addCustomExercise, deleteCustomExercise } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState<FormState>(initialForm);
  const [newCue, setNewCue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredExercises = customExercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleInArray = <T,>(arr: T[], item: T): T[] => {
    return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
  };

  const handleAddCue = () => {
    if (newCue.trim()) {
      setForm((prev) => ({ ...prev, cues: [...prev.cues, newCue.trim()] }));
      setNewCue('');
    }
  };

  const handleRemoveCue = (index: number) => {
    setForm((prev) => ({
      ...prev,
      cues: prev.cues.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    if (!form.name.trim()) return;

    const exercise: Omit<CustomExercise, 'isCustom' | 'createdAt'> = {
      id: generateId(),
      name: form.name.trim(),
      category: form.category,
      primaryMuscles: form.primaryMuscles,
      secondaryMuscles: form.secondaryMuscles,
      movementPattern: form.movementPattern,
      equipmentRequired: form.equipmentRequired,
      equipmentTypes: [],
      grapplerFriendly: form.grapplerFriendly,
      aestheticValue: form.aestheticValue,
      strengthValue: form.strengthValue,
      description: form.description.trim(),
      cues: form.cues,
      ...(form.videoUrl.trim() ? { videoUrl: form.videoUrl.trim() } : {})
    };

    addCustomExercise(exercise);
    setForm(initialForm);
    setNewCue('');
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    deleteCustomExercise(id);
    setConfirmDeleteId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-grappler-950 pb-24"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-grappler-950/95 backdrop-blur-sm border-b border-grappler-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-grappler-800 text-grappler-300 hover:text-grappler-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-grappler-50">Custom Exercises</h1>
              <p className="text-xs text-grappler-400">
                {customExercises.length} exercise{customExercises.length !== 1 ? 's' : ''} created
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`p-2.5 rounded-xl transition-all ${
              showForm
                ? 'bg-red-500/20 text-red-400'
                : 'bg-primary-500/20 text-primary-400'
            }`}
          >
            {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Create New Exercise Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-grappler-900 rounded-xl border border-grappler-700 p-4 space-y-5">
                <h2 className="text-base font-semibold text-grappler-50 flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-primary-400" />
                  Create New Exercise
                </h2>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-grappler-200 mb-1.5">
                    Exercise Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Gi Pull-Ups"
                    className="w-full bg-grappler-800 border border-grappler-700 rounded-lg p-3 text-grappler-100 focus:border-primary-500 focus:outline-none placeholder:text-grappler-600"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-grappler-200 mb-1.5">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setForm((prev) => ({ ...prev, category: cat.value }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          form.category === cat.value
                            ? 'bg-primary-500/20 text-primary-400 border-primary-500/50'
                            : 'bg-grappler-800 text-grappler-400 border-grappler-700'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Muscles */}
                <div>
                  <label className="block text-sm font-medium text-grappler-200 mb-1.5">
                    Primary Muscles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MUSCLE_GROUPS.map((muscle) => (
                      <button
                        key={muscle}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            primaryMuscles: toggleInArray(prev.primaryMuscles, muscle)
                          }))
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          form.primaryMuscles.includes(muscle)
                            ? 'bg-primary-500/20 text-primary-400 border-primary-500/50'
                            : 'bg-grappler-800 text-grappler-400 border-grappler-700'
                        }`}
                      >
                        {formatMuscle(muscle)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Secondary Muscles */}
                <div>
                  <label className="block text-sm font-medium text-grappler-200 mb-1.5">
                    Secondary Muscles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MUSCLE_GROUPS.map((muscle) => (
                      <button
                        key={muscle}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            secondaryMuscles: toggleInArray(prev.secondaryMuscles, muscle)
                          }))
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          form.secondaryMuscles.includes(muscle)
                            ? 'bg-primary-500/20 text-primary-400 border-primary-500/50'
                            : 'bg-grappler-800 text-grappler-400 border-grappler-700'
                        }`}
                      >
                        {formatMuscle(muscle)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Movement Pattern */}
                <div>
                  <label className="block text-sm font-medium text-grappler-200 mb-1.5">
                    Movement Pattern
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MOVEMENT_PATTERNS.map((mp) => (
                      <button
                        key={mp.value}
                        onClick={() => setForm((prev) => ({ ...prev, movementPattern: mp.value }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          form.movementPattern === mp.value
                            ? 'bg-primary-500/20 text-primary-400 border-primary-500/50'
                            : 'bg-grappler-800 text-grappler-400 border-grappler-700'
                        }`}
                      >
                        {mp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Equipment Required */}
                <div>
                  <label className="block text-sm font-medium text-grappler-200 mb-1.5">
                    Equipment Required
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_OPTIONS.map((eq) => (
                      <button
                        key={eq.value}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            equipmentRequired: toggleInArray(prev.equipmentRequired, eq.value)
                          }))
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          form.equipmentRequired.includes(eq.value)
                            ? 'bg-primary-500/20 text-primary-400 border-primary-500/50'
                            : 'bg-grappler-800 text-grappler-400 border-grappler-700'
                        }`}
                      >
                        {eq.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grappler Friendly Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-grappler-200">
                    Grappler Friendly
                  </label>
                  <button
                    onClick={() =>
                      setForm((prev) => ({ ...prev, grapplerFriendly: !prev.grapplerFriendly }))
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      form.grapplerFriendly ? 'bg-primary-500' : 'bg-grappler-700'
                    }`}
                  >
                    <motion.div
                      animate={{ x: form.grapplerFriendly ? 24 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full"
                    />
                  </button>
                </div>

                {/* Aesthetic Value Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-grappler-200">
                      Aesthetic Value
                    </label>
                    <span className="text-sm font-semibold text-primary-400">
                      {form.aestheticValue}/10
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={form.aestheticValue}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, aestheticValue: Number(e.target.value) }))
                    }
                    className="w-full accent-primary-500"
                  />
                  <div className="flex justify-between text-xs text-grappler-500 mt-0.5">
                    <span>1</span>
                    <span>10</span>
                  </div>
                </div>

                {/* Strength Value Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-grappler-200">
                      Strength Value
                    </label>
                    <span className="text-sm font-semibold text-primary-400">
                      {form.strengthValue}/10
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={form.strengthValue}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, strengthValue: Number(e.target.value) }))
                    }
                    className="w-full accent-primary-500"
                  />
                  <div className="flex justify-between text-xs text-grappler-500 mt-0.5">
                    <span>1</span>
                    <span>10</span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-grappler-200 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe how to perform this exercise..."
                    rows={3}
                    className="w-full bg-grappler-800 border border-grappler-700 rounded-lg p-3 text-grappler-100 focus:border-primary-500 focus:outline-none placeholder:text-grappler-600 resize-none"
                  />
                </div>

                {/* Cues */}
                <div>
                  <label className="block text-sm font-medium text-grappler-200 mb-1.5">
                    Coaching Cues
                  </label>
                  {form.cues.length > 0 && (
                    <div className="space-y-2 mb-2">
                      {form.cues.map((cue, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2 bg-grappler-800 rounded-lg px-3 py-2"
                        >
                          <span className="text-xs text-primary-400 font-semibold min-w-[20px]">
                            {index + 1}.
                          </span>
                          <span className="text-sm text-grappler-200 flex-1">{cue}</span>
                          <button
                            onClick={() => handleRemoveCue(index)}
                            className="text-grappler-500 hover:text-red-400 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCue}
                      onChange={(e) => setNewCue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCue();
                        }
                      }}
                      placeholder="Add a coaching cue..."
                      className="flex-1 bg-grappler-800 border border-grappler-700 rounded-lg p-3 text-grappler-100 focus:border-primary-500 focus:outline-none placeholder:text-grappler-600 text-sm"
                    />
                    <button
                      onClick={handleAddCue}
                      disabled={!newCue.trim()}
                      className="p-3 rounded-lg bg-primary-500/20 text-primary-400 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Video URL */}
                <div>
                  <label className="block text-sm font-medium text-grappler-200 mb-1.5">
                    Video URL <span className="text-grappler-500">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={form.videoUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, videoUrl: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full bg-grappler-800 border border-grappler-700 rounded-lg p-3 text-grappler-100 focus:border-primary-500 focus:outline-none placeholder:text-grappler-600"
                  />
                </div>

                {/* Save Button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={!form.name.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  <Save className="w-4 h-4" />
                  Save Exercise
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search (only show when there are exercises and form is hidden) */}
        {customExercises.length > 0 && !showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your exercises..."
              className="w-full bg-grappler-800 border border-grappler-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-grappler-100 focus:border-primary-500 focus:outline-none placeholder:text-grappler-600"
            />
          </motion.div>
        )}

        {/* My Exercises List */}
        {filteredExercises.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredExercises.map((exercise, index) => (
                <motion.div
                  key={exercise.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-grappler-800 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-grappler-50">
                          {exercise.name}
                        </h3>
                        {exercise.grapplerFriendly && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent-500/20 text-accent-400">
                            GRAPPLER
                          </span>
                        )}
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-500/20 text-primary-400 border border-primary-500/30 capitalize">
                        {exercise.category.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {confirmDeleteId === exercise.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDelete(exercise.id)}
                          className="p-1.5 rounded-lg bg-red-500/20 text-red-400"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="p-1.5 rounded-lg bg-grappler-700 text-grappler-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(exercise.id)}
                        className="p-1.5 rounded-lg text-grappler-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Primary Muscles */}
                  {exercise.primaryMuscles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {exercise.primaryMuscles.map((muscle) => (
                        <span
                          key={muscle}
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-grappler-700 text-grappler-300"
                        >
                          {formatMuscle(muscle)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Equipment Tags */}
                  {exercise.equipmentRequired.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {exercise.equipmentRequired.map((eq) => (
                        <span
                          key={eq}
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-grappler-700/60 text-grappler-400"
                        >
                          {eq.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Strength / Aesthetic badges */}
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-grappler-700/50">
                    <span className="text-[10px] text-grappler-400">
                      Strength: <span className="text-grappler-200 font-medium">{exercise.strengthValue}/10</span>
                    </span>
                    <span className="text-[10px] text-grappler-400">
                      Aesthetic: <span className="text-grappler-200 font-medium">{exercise.aestheticValue}/10</span>
                    </span>
                    <span className="text-[10px] text-grappler-400 capitalize">
                      {exercise.movementPattern}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          !showForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-grappler-800 flex items-center justify-center mb-4">
                <Dumbbell className="w-8 h-8 text-grappler-600" />
              </div>
              <p className="text-grappler-400 text-sm mb-1">
                No custom exercises yet.
              </p>
              <p className="text-grappler-500 text-xs">
                Tap <span className="text-primary-400">+</span> to create one.
              </p>
            </motion.div>
          )
        )}
      </div>
    </motion.div>
  );
}
