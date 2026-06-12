'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HeartPulse, Plus, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { ACTIVITY_LABELS } from '@/lib/types';
import type { ActivityType, CardioIntensity, ScheduledCardioDay } from '@/lib/types';
import WeeklyCalendar from './WeeklyCalendar';
import { hapticLight, hapticMedium } from '@/lib/haptics';

const CARDIO_MODALITIES: ActivityType[] = ['running', 'cycling', 'swimming', 'rowing', 'jump_rope', 'elliptical', 'assault_bike'];
const INTENSITIES: { value: CardioIntensity; label: string }[] = [
  { value: 'easy', label: 'Easy (Z2)' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'hard', label: 'Hard' },
];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// RPE by intensity, used when a scheduled cardio session is logged as done.
const INTENSITY_RPE: Record<CardioIntensity, number> = { easy: 3, moderate: 6, hard: 8 };

export default function CardioPlanner({ onClose }: { onClose?: () => void }) {
  const { user, currentMesocycle, workoutLogs, updateUserFields, addTrainingSession } = useAppStore(
    useShallow(s => ({
      user: s.user,
      currentMesocycle: s.currentMesocycle,
      workoutLogs: s.workoutLogs,
      updateUserFields: s.updateUserFields,
      addTrainingSession: s.addTrainingSession,
    }))
  );

  const scheduledCardio = user?.scheduledCardio ?? [];
  const trainingDays = user?.trainingDays ?? [];
  const combatTrainingDays = user?.combatTrainingDays ?? [];

  // Day editor state (which weekday is being edited, and its draft)
  const [editDay, setEditDay] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ modality: ActivityType; intensity: CardioIntensity; durationMin: string; label: string }>(
    { modality: 'running', intensity: 'easy', durationMin: '40', label: '' }
  );

  // Log-now state
  const [logModality, setLogModality] = useState<ActivityType>('running');
  const [logDuration, setLogDuration] = useState('40');
  const [logDistance, setLogDistance] = useState('');
  const [logIntensity, setLogIntensity] = useState<CardioIntensity>('moderate');
  const [logged, setLogged] = useState(false);

  function openDayEditor(day: number) {
    hapticLight();
    const existing = scheduledCardio.find(c => c.day === day);
    setDraft(existing
      ? { modality: existing.modality, intensity: existing.intensity, durationMin: String(existing.durationMin ?? 40), label: existing.label ?? '' }
      : { modality: 'running', intensity: 'easy', durationMin: '40', label: '' });
    setEditDay(day);
  }

  function saveDay() {
    if (editDay === null) return;
    hapticMedium();
    const entry: ScheduledCardioDay = {
      day: editDay,
      modality: draft.modality,
      intensity: draft.intensity,
      durationMin: parseInt(draft.durationMin, 10) || undefined,
      label: draft.label.trim() || undefined,
    };
    const next = [...scheduledCardio.filter(c => c.day !== editDay), entry].sort((a, b) => a.day - b.day);
    updateUserFields({ scheduledCardio: next });
    setEditDay(null);
  }

  function removeDay() {
    if (editDay === null) return;
    hapticMedium();
    updateUserFields({ scheduledCardio: scheduledCardio.filter(c => c.day !== editDay) });
    setEditDay(null);
  }

  function logNow() {
    hapticMedium();
    addTrainingSession({
      date: new Date(),
      category: 'cardio',
      type: logModality,
      plannedIntensity: logIntensity === 'easy' ? 'light_flow' : logIntensity === 'hard' ? 'hard_sparring' : 'moderate',
      duration: parseInt(logDuration, 10) || 0,
      distance: logDistance ? parseFloat(logDistance.replace(',', '.')) : undefined,
      perceivedExertion: INTENSITY_RPE[logIntensity],
      notes: `Cardio · ${ACTIVITY_LABELS[logModality]}`,
    });
    setLogged(true);
    setTimeout(() => setLogged(false), 1800);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-grappler-950 flex flex-col overflow-y-auto overlay-safe"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-grappler-950/90 backdrop-blur-sm border-b border-grappler-800">
        <div className="flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-sky-400" />
          <span className="text-base font-bold text-grappler-100">Cardio</span>
        </div>
        <button onClick={onClose} className="p-2 text-grappler-400 hover:text-grappler-200" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-5 space-y-6 max-w-md w-full mx-auto">
        {/* ── Weekly plan ── */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-grappler-400 mb-1">Your week</h2>
          <p className="text-xs text-grappler-500 mb-3">Tap a day to add or change a cardio session. It shows up on your training plan in sky blue.</p>
          <WeeklyCalendar
            trainingDays={trainingDays}
            combatTrainingDays={combatTrainingDays}
            currentMesocycle={currentMesocycle}
            workoutLogs={workoutLogs}
            scheduledCardio={scheduledCardio}
            onDayTap={openDayEditor}
          />
          {scheduledCardio.length === 0 && (
            <p className="text-xs text-grappler-600 mt-3 text-center">No cardio scheduled yet — tap a day above to plan one.</p>
          )}
        </section>

        {/* ── Log a session now ── */}
        <section className="rounded-2xl bg-grappler-900/60 border border-grappler-800 p-4 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-grappler-100">Log a session now</h2>
            <p className="text-xs text-grappler-500 mt-0.5">Already done one? Add it to your training history.</p>
          </div>

          <div>
            <p className="text-xs text-grappler-400 mb-1.5">Type</p>
            <div className="grid grid-cols-3 gap-1.5">
              {CARDIO_MODALITIES.map(m => (
                <button key={m} onClick={() => { hapticLight(); setLogModality(m); }}
                  className={cn('py-2 rounded-lg text-xs font-medium transition-colors',
                    logModality === m ? 'bg-sky-500 text-white' : 'bg-grappler-800 text-grappler-400')}>
                  {ACTIVITY_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-grappler-400 mb-1.5">Duration (min)</p>
              <input value={logDuration} onChange={e => setLogDuration(e.target.value)} inputMode="numeric"
                className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 outline-none focus:ring-1 focus:ring-sky-500/50" />
            </div>
            <div>
              <p className="text-xs text-grappler-400 mb-1.5">Distance (opt.)</p>
              <input value={logDistance} onChange={e => setLogDistance(e.target.value)} inputMode="decimal" placeholder="km / mi"
                className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 placeholder-grappler-600 outline-none focus:ring-1 focus:ring-sky-500/50" />
            </div>
          </div>

          <div>
            <p className="text-xs text-grappler-400 mb-1.5">Intensity</p>
            <div className="grid grid-cols-3 gap-1.5">
              {INTENSITIES.map(i => (
                <button key={i.value} onClick={() => { hapticLight(); setLogIntensity(i.value); }}
                  className={cn('py-2 rounded-lg text-xs font-medium transition-colors',
                    logIntensity === i.value ? 'bg-sky-500 text-white' : 'bg-grappler-800 text-grappler-400')}>
                  {i.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={logNow} disabled={logged}
            className="w-full py-3 rounded-xl bg-sky-500 text-white text-sm font-bold hover:bg-sky-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
            {logged ? <><Check className="w-4 h-4" /> Logged</> : <><Plus className="w-4 h-4" /> Add to log</>}
          </button>
        </section>
      </div>

      {/* ── Day editor sheet ── */}
      <AnimatePresence>
        {editDay !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center"
            onClick={() => setEditDay(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full sm:max-w-md bg-grappler-900 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 overlay-safe"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-grappler-100">{DAY_NAMES[editDay]} cardio</h3>
                <button onClick={() => setEditDay(null)} className="p-1 text-grappler-500"><X className="w-5 h-5" /></button>
              </div>

              <div>
                <p className="text-xs text-grappler-400 mb-1.5">Type</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {CARDIO_MODALITIES.map(m => (
                    <button key={m} onClick={() => setDraft(d => ({ ...d, modality: m }))}
                      className={cn('py-2 rounded-lg text-xs font-medium transition-colors',
                        draft.modality === m ? 'bg-sky-500 text-white' : 'bg-grappler-800 text-grappler-400')}>
                      {ACTIVITY_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-grappler-400 mb-1.5">Intensity</p>
                  <div className="flex gap-1.5">
                    {INTENSITIES.map(i => (
                      <button key={i.value} onClick={() => setDraft(d => ({ ...d, intensity: i.value }))}
                        className={cn('flex-1 py-2 rounded-lg text-[11px] font-medium transition-colors',
                          draft.intensity === i.value ? 'bg-sky-500 text-white' : 'bg-grappler-800 text-grappler-400')}>
                        {i.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-grappler-400 mb-1.5">Duration (min)</p>
                  <input value={draft.durationMin} onChange={e => setDraft(d => ({ ...d, durationMin: e.target.value }))} inputMode="numeric"
                    className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 outline-none focus:ring-1 focus:ring-sky-500/50" />
                </div>
              </div>

              <div>
                <p className="text-xs text-grappler-400 mb-1.5">Label (optional)</p>
                <input value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} placeholder="Zone 2 base, Intervals, Long ride..."
                  className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 placeholder-grappler-600 outline-none focus:ring-1 focus:ring-sky-500/50" />
              </div>

              <div className="flex gap-2 pt-1">
                {scheduledCardio.some(c => c.day === editDay) && (
                  <button onClick={removeDay}
                    className="px-4 py-3 rounded-xl bg-grappler-800 text-red-400 text-sm font-medium hover:bg-grappler-700 transition-colors flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                )}
                <button onClick={saveDay}
                  className="flex-1 py-3 rounded-xl bg-sky-500 text-white text-sm font-bold hover:bg-sky-400 transition-colors">
                  Save to plan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
