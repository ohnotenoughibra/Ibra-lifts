'use client';

/**
 * InjuryAwareWorkout — generate a workout that respects user-described
 * limitations *for today*. The user picks affected regions and movement
 * constraints; we filter the exercise pool and produce a usable session.
 */

import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  generateInjuryAwareWorkout,
  suggestConstraintsFromActiveInjuries,
  prettyConstraint,
  type MovementConstraint,
  type InjuryAwareWorkoutOptions,
} from '@/lib/injury-aware-workout';
import type { BodyRegion, WorkoutType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from './Toast';
import { ToolShell, Section, PrimaryCTA, Stat } from './_ToolShell';

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

  const initialRegions = activeInjuries.map(i => i.bodyRegion);
  const initialConstraints = suggestConstraintsFromActiveInjuries(initialRegions);

  const [regions, setRegions] = useState<Set<BodyRegion>>(new Set(initialRegions));
  const [constraints, setConstraints] = useState<Set<MovementConstraint>>(new Set(initialConstraints));
  const [duration, setDuration] = useState<number>(30);
  const [workoutType, setWorkoutType] = useState<WorkoutType>('hypertrophy');
  const [generated, setGenerated] = useState<ReturnType<typeof generateInjuryAwareWorkout> | null>(null);

  const equipment = activeEquipmentProfile === 'gym' ? 'full_gym' : activeEquipmentProfile === 'travel' ? 'minimal' : 'home_gym';
  const granularEquipment = activeEquipmentProfile === 'home' ? homeGymEquipment : undefined;

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

  const canStart = !!generated && generated.session.exercises.length > 0;

  return (
    <ToolShell
      onClose={onClose}
      eyebrow="IBRA / 04 · INJURY-AWARE"
      title={<>Train around<br/>your limit.</>}
      description="Pick what hurts, pick what you can&apos;t do today, get a safe session."
      footer={
        canStart
          ? <PrimaryCTA onClick={start} variant="go">Start This Workout</PrimaryCTA>
          : <PrimaryCTA onClick={generate}>Generate Workout</PrimaryCTA>
      }
    >
      {activeInjuries.length > 0 && (
        <Section title="Pre-filled" hint={`${activeInjuries.length} active`}>
          <p className="text-[11px] text-grappler-400 leading-relaxed">
            Pre-filled from your active injur{activeInjuries.length === 1 ? 'y' : 'ies'}. Adjust below if today is different.
          </p>
        </Section>
      )}

      <Section title="Affected Region(s)" hint={regions.size ? `${regions.size}` : undefined}>
        <div className="space-y-3">
          {Object.entries(regionsByGroup).map(([group, items]) => (
            <div key={group}>
              <div className="text-[10px] uppercase tracking-[0.18em] text-grappler-500 mb-1.5">{group}</div>
              <div className="flex flex-wrap gap-1.5">
                {items.map(r => (
                  <button
                    key={r.id}
                    onClick={() => toggle(regions, r.id, setRegions)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition active:scale-[0.97]',
                      regions.has(r.id)
                        ? 'bg-white border-white text-grappler-950'
                        : 'bg-transparent border-grappler-800 text-grappler-300'
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

      <Section title="What You Can't Do Today" hint={constraints.size ? `${constraints.size}` : 'pick all'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {ALL_CONSTRAINTS.map(c => (
            <button
              key={c}
              onClick={() => toggle(constraints, c, setConstraints)}
              className={cn(
                'flex items-start gap-2 px-3 py-2 rounded-lg text-sm border transition text-left active:scale-[0.99]',
                constraints.has(c)
                  ? 'bg-grappler-800/60 border-grappler-700 text-white'
                  : 'bg-transparent border-grappler-800 text-grappler-300'
              )}
            >
              <span className={cn(
                'w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center',
                constraints.has(c) ? 'bg-white border-white' : 'border-grappler-700'
              )}>
                {constraints.has(c) && <Check className="w-3 h-3 text-grappler-950" />}
              </span>
              <span className="text-xs">{prettyConstraint(c)}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Focus">
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setWorkoutType(t.id)}
              className={cn(
                'p-3 rounded-lg border text-left transition active:scale-[0.99]',
                workoutType === t.id
                  ? 'bg-white border-white text-grappler-950'
                  : 'bg-transparent border-grappler-800 text-grappler-200'
              )}
            >
              <div className="font-bold text-sm">{t.label}</div>
              <div className={cn('text-[11px]', workoutType === t.id ? 'text-grappler-700' : 'text-grappler-500')}>
                {t.desc}
              </div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Duration">
        <div className="grid grid-cols-4 gap-2">
          {DURATIONS.map(d => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={cn(
                'py-2.5 rounded-lg text-sm font-bold border transition active:scale-[0.97]',
                duration === d
                  ? 'bg-white border-white text-grappler-950'
                  : 'bg-transparent border-grappler-800 text-grappler-200'
              )}
            >
              {d}m
            </button>
          ))}
        </div>
      </Section>

      {generated && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Stat value={generated.session.exercises.length} label="Exercises" accent={generated.session.exercises.length > 0 ? 'go' : 'danger'} />
            <Stat value={`${generated.session.estimatedDuration}m`} label="Duration" />
          </div>

          {generated.notes.length > 0 && (
            <Section title="Notes">
              <ul className="space-y-1 text-xs text-grappler-300">
                {generated.notes.map((n, i) => <li key={i} className="flex gap-2"><span className="text-grappler-600">·</span>{n}</li>)}
              </ul>
            </Section>
          )}

          <Section title={generated.session.name} hint={generated.session.exercises.length === 0 ? 'no match' : undefined}>
            <div className="space-y-2">
              {generated.session.exercises.map((ep, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-grappler-800 last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{ep.exercise.name}</div>
                    <div className="text-[11px] text-grappler-500">
                      {ep.exercise.primaryMuscles.slice(0, 2).join(', ')}
                    </div>
                  </div>
                  <div className="text-xs font-mono tabular-nums text-white flex-shrink-0">
                    {ep.sets} × {ep.prescription.targetReps} · RPE {ep.prescription.rpe}
                  </div>
                </div>
              ))}
              {generated.session.exercises.length === 0 && (
                <p className="text-center text-sm text-grappler-400 py-3">
                  No safe exercises matched. Loosen one constraint or check equipment.
                </p>
              )}
            </div>
          </Section>
        </>
      )}
    </ToolShell>
  );
}
