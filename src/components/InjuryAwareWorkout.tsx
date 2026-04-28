'use client';

/**
 * InjuryAwareWorkout — generate a workout that respects user-described
 * limitations *for today*. The user picks affected regions and movement
 * constraints; we filter the exercise pool and produce a usable session.
 *
 * Mental model: "I want to train, but I have this thing I can't do today."
 * (Rehab is the opposite: "I want to heal, train second.")
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Activity,
  ArrowRight,
  Check,
  AlertTriangle,
  Dumbbell,
  Clock,
  Filter,
  Sparkles,
  PlayCircle,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  generateInjuryAwareWorkout,
  suggestConstraintsFromActiveInjuries,
  prettyConstraint,
  prettyRegion,
  type MovementConstraint,
  type InjuryAwareWorkoutOptions,
} from '@/lib/injury-aware-workout';
import type { BodyRegion, WorkoutType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from './Toast';

interface Props { onClose: () => void }

const REGIONS: { id: BodyRegion; label: string; group: string }[] = [
  { id: 'neck',           label: 'Neck',          group: 'Upper' },
  { id: 'left_shoulder',  label: 'L Shoulder',    group: 'Upper' },
  { id: 'right_shoulder', label: 'R Shoulder',    group: 'Upper' },
  { id: 'left_elbow',     label: 'L Elbow',       group: 'Upper' },
  { id: 'right_elbow',    label: 'R Elbow',       group: 'Upper' },
  { id: 'left_wrist',     label: 'L Wrist',       group: 'Upper' },
  { id: 'right_wrist',    label: 'R Wrist',       group: 'Upper' },
  { id: 'chest',          label: 'Chest',         group: 'Trunk' },
  { id: 'upper_back',     label: 'Upper Back',    group: 'Trunk' },
  { id: 'lower_back',     label: 'Lower Back',    group: 'Trunk' },
  { id: 'core',           label: 'Core',          group: 'Trunk' },
  { id: 'left_hip',       label: 'L Hip',         group: 'Lower' },
  { id: 'right_hip',      label: 'R Hip',         group: 'Lower' },
  { id: 'left_knee',      label: 'L Knee',        group: 'Lower' },
  { id: 'right_knee',     label: 'R Knee',        group: 'Lower' },
  { id: 'left_ankle',     label: 'L Ankle',       group: 'Lower' },
  { id: 'right_ankle',    label: 'R Ankle',       group: 'Lower' },
];

const ALL_CONSTRAINTS: MovementConstraint[] = [
  'no_deep_knee_flexion',
  'no_knee_loading',
  'no_overhead',
  'no_horizontal_press',
  'no_pulling_load',
  'no_hinging',
  'no_spinal_loading',
  'no_rotation',
  'no_impact',
  'no_grip_intensive',
  'no_static_holds',
  'no_neck_loading',
  'no_wrist_extension',
];

const DURATIONS = [20, 30, 45, 60];
const TYPES: { id: WorkoutType; label: string; desc: string }[] = [
  { id: 'strength',          label: 'Strength',     desc: 'Heavy, low reps, long rest' },
  { id: 'hypertrophy',       label: 'Hypertrophy',  desc: 'Moderate, 8-12 reps' },
  { id: 'power',             label: 'Power',        desc: 'Explosive, low reps' },
  { id: 'strength_endurance',label: 'Endurance',    desc: 'Higher reps, short rest' },
];

export default function InjuryAwareWorkout({ onClose }: Props) {
  const { showToast } = useToast();
  const startWorkout = useAppStore(s => s.startWorkout);
  const activeEquipmentProfile = useAppStore(s => s.activeEquipmentProfile);
  const homeGymEquipment = useAppStore(s => s.homeGymEquipment);
  const injuryLog = useAppStore(s => s.injuryLog ?? []);

  const activeInjuries = useMemo(
    () => injuryLog.filter(i => !i.resolved && !i._deleted),
    [injuryLog]
  );

  // Pre-fill from active injuries if any
  const initialRegions = activeInjuries.map(i => i.bodyRegion);
  const initialConstraints = suggestConstraintsFromActiveInjuries(initialRegions);

  const [regions, setRegions] = useState<Set<BodyRegion>>(new Set(initialRegions));
  const [constraints, setConstraints] = useState<Set<MovementConstraint>>(new Set(initialConstraints));
  const [duration, setDuration] = useState<number>(30);
  const [workoutType, setWorkoutType] = useState<WorkoutType>('hypertrophy');
  const [generated, setGenerated] = useState<ReturnType<typeof generateInjuryAwareWorkout> | null>(null);

  const equipment = activeEquipmentProfile === 'gym' ? 'full_gym' : activeEquipmentProfile === 'travel' ? 'minimal' : 'home_gym';
  const granularEquipment = (homeGymEquipment as any) || undefined;

  const regionsByGroup = useMemo(() => {
    const groups: Record<string, typeof REGIONS> = {};
    for (const r of REGIONS) {
      if (!groups[r.group]) groups[r.group] = [];
      groups[r.group].push(r);
    }
    return groups;
  }, []);

  const toggle = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setter(next);
  };

  const generate = () => {
    const opts: InjuryAwareWorkoutOptions = {
      bodyRegions: Array.from(regions),
      constraints: Array.from(constraints),
      durationMinutes: duration,
      workoutType,
      equipment,
      availableEquipment: granularEquipment,
      trainingIdentity: 'combat',
    };
    const result = generateInjuryAwareWorkout(opts);
    setGenerated(result);
    if (result.session.exercises.length === 0) {
      showToast('No safe exercises matched. Loosen constraints.', 'error');
    }
  };

  const start = () => {
    if (!generated) return;
    const ok = startWorkout(generated.session);
    if (ok === false) {
      showToast('A workout is already active', 'error');
      return;
    }
    showToast('Workout started', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-grappler-950 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-grappler-950/95 backdrop-blur border-b border-grappler-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <h1 className="text-lg font-bold text-white">Injury-Aware Workout</h1>
            <p className="text-xs text-grappler-400">Train around your limitation</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-grappler-800 rounded-lg flex-shrink-0">
          <X className="w-5 h-5 text-grappler-300" />
        </button>
      </div>

      <div className="px-4 py-5 max-w-xl mx-auto space-y-5 pb-32">
        {/* Pre-fill notice */}
        {activeInjuries.length > 0 && (
          <div className="rounded-xl bg-sky-500/10 border border-sky-500/30 p-3 flex gap-3">
            <Sparkles className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-sky-200 leading-relaxed">
              Pre-filled from your <strong>{activeInjuries.length}</strong> active injur{activeInjuries.length === 1 ? 'y' : 'ies'}.
              Adjust below if today\'s situation is different.
            </p>
          </div>
        )}

        {/* Body regions */}
        <Section title="Affected Body Region(s)" icon={AlertTriangle}>
          <div className="space-y-3">
            {Object.entries(regionsByGroup).map(([group, items]) => (
              <div key={group}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-grappler-500 mb-1.5">{group}</div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map(r => (
                    <button
                      key={r.id}
                      onClick={() => toggle(regions, r.id, setRegions)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition',
                        regions.has(r.id)
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                          : 'bg-grappler-800/40 border-grappler-800 text-grappler-300 hover:border-grappler-700'
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Movement constraints */}
        <Section title="What You Can't Do Today" icon={Filter} hint="Pick all that apply">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {ALL_CONSTRAINTS.map(c => (
              <button
                key={c}
                onClick={() => toggle(constraints, c, setConstraints)}
                className={cn(
                  'flex items-start gap-2 px-3 py-2 rounded-lg text-sm border transition text-left',
                  constraints.has(c)
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-100'
                    : 'bg-grappler-800/40 border-grappler-800 text-grappler-300 hover:border-grappler-700'
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center',
                  constraints.has(c) ? 'bg-amber-500 border-amber-500' : 'border-grappler-600'
                )}>
                  {constraints.has(c) && <Check className="w-3 h-3 text-grappler-950" />}
                </div>
                <span className="text-xs">{prettyConstraint(c)}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Workout type */}
        <Section title="Focus" icon={Dumbbell}>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setWorkoutType(t.id)}
                className={cn(
                  'p-3 rounded-lg border text-left transition',
                  workoutType === t.id
                    ? 'bg-grappler-100 border-grappler-100 text-grappler-950'
                    : 'bg-grappler-800/40 border-grappler-800 text-grappler-200 hover:border-grappler-700'
                )}
              >
                <div className="font-bold text-sm">{t.label}</div>
                <div className={cn('text-[11px]', workoutType === t.id ? 'text-grappler-700' : 'text-grappler-400')}>
                  {t.desc}
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* Duration */}
        <Section title="Duration" icon={Clock}>
          <div className="grid grid-cols-4 gap-2">
            {DURATIONS.map(d => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={cn(
                  'py-2.5 rounded-lg text-sm font-bold border transition',
                  duration === d
                    ? 'bg-amber-500 border-amber-500 text-grappler-950'
                    : 'bg-grappler-800/40 border-grappler-800 text-grappler-200 hover:border-grappler-700'
                )}
              >
                {d}m
              </button>
            ))}
          </div>
        </Section>

        {/* Generate */}
        <button
          onClick={generate}
          className="w-full px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-grappler-950 font-bold transition flex items-center justify-center gap-2"
        >
          Generate Workout
          <Sparkles className="w-5 h-5" />
        </button>

        {/* Preview */}
        <AnimatePresence>
          {generated && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
                <h3 className="text-base font-bold text-white mb-1">{generated.session.name}</h3>
                <p className="text-xs text-emerald-200">
                  {generated.session.exercises.length} exercises · ~{generated.session.estimatedDuration} min
                </p>
                {generated.notes.map((n, i) => (
                  <p key={i} className="text-[11px] text-grappler-300 mt-2">• {n}</p>
                ))}
              </div>

              <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4 space-y-2">
                {generated.session.exercises.map((ep, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-grappler-800 last:border-0">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{ep.exercise.name}</div>
                      <div className="text-[11px] text-grappler-400">
                        {ep.exercise.primaryMuscles.slice(0, 2).join(', ')}
                      </div>
                    </div>
                    <div className="text-xs font-mono text-amber-300 flex-shrink-0">
                      {ep.sets} × {ep.prescription.targetReps} @ RPE {ep.prescription.rpe}
                    </div>
                  </div>
                ))}
                {generated.session.exercises.length === 0 && (
                  <div className="text-center text-sm text-grappler-400 py-3">
                    No safe exercises matched. Loosen one constraint or check equipment availability.
                  </div>
                )}
              </div>

              {generated.session.exercises.length > 0 && (
                <button
                  onClick={start}
                  className="w-full px-5 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold transition flex items-center justify-center gap-2"
                >
                  <PlayCircle className="w-5 h-5" />
                  Start This Workout
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, hint, children }: { title: string; icon: React.ComponentType<{ className?: string }>; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-grappler-100 uppercase tracking-wider flex items-center gap-2">
          <Icon className="w-4 h-4 text-amber-400" />
          {title}
        </h3>
        {hint && <span className="text-[10px] text-grappler-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
