'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Timer } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';

/**
 * Shown on every tab while a workout is paused: where you are (exercise,
 * set, rest left) and one tap back in. Replaces a generic "Resume" pill that
 * only showed wall-clock time (incl. pauses).
 */
export default function ResumeWorkoutBar() {
  const { activeWorkout, resumeWorkout } = useAppStore(useShallow(s => ({ activeWorkout: s.activeWorkout, resumeWorkout: s.resumeWorkout })));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!activeWorkout) return null;

  const pos = activeWorkout.position ?? { exerciseIndex: 0, setIndex: 0 };
  const ex = activeWorkout.session.exercises[pos.exerciseIndex];
  const log = activeWorkout.exerciseLogs[pos.exerciseIndex];
  let restLeft = 0;
  try {
    const raw = localStorage.getItem('live:rest');
    const end = raw ? (JSON.parse(raw).v?.end as number | undefined) : undefined;
    if (end && end > now) restLeft = Math.ceil((end - now) / 1000);
  } catch { /* ignore */ }
  const pausedMs = (activeWorkout.totalPausedMs ?? 0) + (activeWorkout.pausedAt ? now - new Date(activeWorkout.pausedAt).getTime() : 0);
  const mins = Math.max(0, Math.floor((now - new Date(activeWorkout.startTime).getTime() - pausedMs) / 60000));

  return (
    <button onClick={resumeWorkout} className="fixed bottom-[68px] lg:bottom-4 lg:left-[272px] left-3 right-3 z-30 safe-area-bottom" aria-label="Resume workout">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between bg-primary-500 active:scale-[0.98] transition-all rounded-lg px-4 py-3 shadow-lg shadow-primary-500/30"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {ex ? `${ex.exercise.name} · set ${Math.min(pos.setIndex + 1, log?.sets.length ?? 1)}/${log?.sets.length ?? ex.sets}` : activeWorkout.session.name}
            </p>
            <p className="text-xs text-white/75 flex items-center gap-1">
              <Timer className="w-3 h-3" />
              {restLeft > 0 ? `Rest ${Math.floor(restLeft / 60)}:${String(restLeft % 60).padStart(2, '0')} left · ` : ''}{mins} min training
            </p>
          </div>
        </div>
        <span className="text-sm font-semibold text-white/90 flex-shrink-0">Resume</span>
      </motion.div>
    </button>
  );
}
