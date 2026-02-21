'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Pause,
  Play,
  SkipForward,
  Sparkles,
  X,
  Video,
} from 'lucide-react';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import { cn } from '@/lib/utils';
import {
  SORENESS_AREAS,
  getMobilityRecommendations,
  buildTimedPlan,
  drillSeconds,
  type SorenessArea,
  type SorenessSeverity,
  type MobilityDrill,
} from '@/lib/mobility-data';

interface SorenessCheckProps {
  context: 'rest_day' | 'post_workout' | 'pre_workout';
  isCombatAthlete?: boolean;
  onDismiss: () => void;
  onLog: (areas: { area: SorenessArea; severity: SorenessSeverity }[]) => void;
}

const SEVERITY_CONFIG: { id: SorenessSeverity; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { id: 'mild',     label: 'A little tight',  color: 'text-yellow-400',  bgColor: 'bg-yellow-500/15', borderColor: 'border-yellow-500/30' },
  { id: 'moderate', label: 'Pretty sore',     color: 'text-orange-400',  bgColor: 'bg-orange-500/15', borderColor: 'border-orange-500/30' },
  { id: 'severe',   label: 'Very painful',    color: 'text-red-400',     bgColor: 'bg-red-500/15',    borderColor: 'border-red-500/30' },
];

const TIME_OPTIONS = [
  { minutes: 5,  label: '5 min',  desc: 'Quick stretch' },
  { minutes: 10, label: '10 min', desc: 'Solid session' },
  { minutes: 15, label: '15 min', desc: 'Full mobility' },
  { minutes: 20, label: '20+',    desc: 'Deep work' },
];

type Phase = 'ask' | 'select' | 'time' | 'session';

export default function SorenessCheck({ context, isCombatAthlete = true, onDismiss, onLog }: SorenessCheckProps) {
  const [phase, setPhase] = useState<Phase>('ask');
  const [selectedAreas, setSelectedAreas] = useState<Map<SorenessArea, SorenessSeverity>>(new Map());
  const [hasLogged, setHasLogged] = useState(false);

  // Session state
  const [sessionPlan, setSessionPlan] = useState<MobilityDrill[]>([]);
  const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [currentSide, setCurrentSide] = useState<'left' | 'right'>('left');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [completedDrills, setCompletedDrills] = useState<Set<number>>(new Set());
  const [sessionDone, setSessionDone] = useState(false);
  const [formCheckDrill, setFormCheckDrill] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleArea = useCallback((area: SorenessArea) => {
    setSelectedAreas(prev => {
      const next = new Map(prev);
      if (next.has(area)) {
        next.delete(area);
      } else {
        next.set(area, 'mild');
      }
      return next;
    });
  }, []);

  const setSeverity = useCallback((area: SorenessArea, severity: SorenessSeverity) => {
    setSelectedAreas(prev => {
      const next = new Map(prev);
      next.set(area, severity);
      return next;
    });
  }, []);

  const recommendations = useMemo(() => {
    if (selectedAreas.size === 0) return [];
    const entries = Array.from(selectedAreas.entries()).map(([area, severity]) => ({ area, severity }));
    return getMobilityRecommendations(entries, isCombatAthlete);
  }, [selectedAreas, isCombatAthlete]);

  const handleNothingSore = useCallback(() => {
    onLog([]);
    onDismiss();
  }, [onLog, onDismiss]);

  // Log soreness when session finishes or component unmounts — NOT when picking time
  // (calling onLog early triggers addQuickLog which sets alreadyLoggedSorenessToday=true,
  //  which unmounts this component before the session phase ever renders)
  const logSoreness = useCallback(() => {
    if (hasLogged) return;
    const entries = Array.from(selectedAreas.entries()).map(([area, severity]) => ({ area, severity }));
    onLog(entries);
    setHasLogged(true);
  }, [selectedAreas, onLog, hasLogged]);

  const handlePickTime = useCallback((minutes: number) => {
    const plan = buildTimedPlan(recommendations, minutes);
    setSessionPlan(plan);
    if (plan.length > 0) {
      setCurrentDrillIndex(0);
      setCurrentSet(1);
      setCurrentSide('left');
      setTimeLeft(plan[0].duration);
      setIsRunning(false);
      setCompletedDrills(new Set());
      setSessionDone(false);
      setPhase('session');
    }
  }, [recommendations]);

  // ─── Timer logic ───
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            // Haptic buzz
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate([100, 50, 100]);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft]);

  const currentDrill = sessionPlan[currentDrillIndex] as MobilityDrill | undefined;

  const advanceToNext = useCallback(() => {
    if (!currentDrill) return;
    const drill = currentDrill;
    const isBilateral = drill.bilateral !== false;

    // Bilateral drills: Side 1 → Side 2
    if (isBilateral && currentSide === 'left') {
      setCurrentSide('right');
      setTimeLeft(drill.duration);
      setIsRunning(false);
      return;
    }

    // Next set
    if (currentSet < drill.sets) {
      setCurrentSet(s => s + 1);
      if (isBilateral) setCurrentSide('left');
      setTimeLeft(drill.duration);
      setIsRunning(false);
      return;
    }

    // Mark drill done, move to next
    setCompletedDrills(prev => new Set(prev).add(currentDrillIndex));
    const nextIdx = currentDrillIndex + 1;
    if (nextIdx < sessionPlan.length) {
      setCurrentDrillIndex(nextIdx);
      setCurrentSet(1);
      setCurrentSide('left');
      setTimeLeft(sessionPlan[nextIdx].duration);
      setIsRunning(false);
    } else {
      setSessionDone(true);
      setIsRunning(false);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([80, 40, 80, 40, 150]);
      }
    }
  }, [currentDrill, currentSide, currentSet, currentDrillIndex, sessionPlan]);

  // Auto-advance when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && phase === 'session' && !sessionDone && currentDrill) {
      // Short pause then advance
      const t = setTimeout(advanceToNext, 800);
      return () => clearTimeout(t);
    }
  }, [timeLeft, phase, sessionDone, currentDrill, advanceToNext]);

  const skipDrill = useCallback(() => {
    setCompletedDrills(prev => new Set(prev).add(currentDrillIndex));
    const nextIdx = currentDrillIndex + 1;
    if (nextIdx < sessionPlan.length) {
      setCurrentDrillIndex(nextIdx);
      setCurrentSet(1);
      setCurrentSide('left');
      setTimeLeft(sessionPlan[nextIdx].duration);
      setIsRunning(false);
    } else {
      setSessionDone(true);
      setIsRunning(false);
    }
  }, [currentDrillIndex, sessionPlan]);

  const totalSessionSeconds = useMemo(() => {
    return sessionPlan.reduce((sum, d) => sum + drillSeconds(d), 0);
  }, [sessionPlan]);

  const completedSeconds = useMemo(() => {
    return sessionPlan
      .filter((_, i) => completedDrills.has(i))
      .reduce((sum, d) => sum + drillSeconds(d), 0);
  }, [sessionPlan, completedDrills]);

  // ─── Phase: Initial Ask ───
  if (phase === 'ask') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-grappler-800 to-grappler-900 p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-grappler-100">Body Check-In</p>
            <p className="text-xs text-grappler-400 uppercase tracking-wide">
              {context === 'rest_day' ? 'Recovery Day' : context === 'post_workout' ? 'Post-Workout' : 'Pre-Workout'}
            </p>
          </div>
        </div>
        <p className="text-xs text-grappler-300 mb-3">
          {context === 'rest_day'
            ? 'Anything feeling sore or tight today? I\'ll build you a mobility session.'
            : context === 'pre_workout'
            ? 'Anything sore before training? Quick mobility work can prevent injury.'
            : 'How\'s your body feeling? Let me put together some recovery work.'}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPhase('select')}
            className="flex-1 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-sm font-semibold text-violet-300 active:scale-[0.97] transition-all"
          >
            Yeah, something&apos;s sore
          </button>
          <button
            onClick={handleNothingSore}
            className="flex-1 py-2.5 rounded-xl bg-grappler-800 border border-grappler-700 text-sm font-medium text-grappler-400 active:scale-[0.97] transition-all"
          >
            Feeling good
          </button>
        </div>
      </motion.div>
    );
  }

  // ─── Phase: Select Areas + Severity ───
  if (phase === 'select') {
    const upperAreas = SORENESS_AREAS.filter(a => a.group === 'upper');
    const coreAreas = SORENESS_AREAS.filter(a => a.group === 'core');
    const lowerAreas = SORENESS_AREAS.filter(a => a.group === 'lower');

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-grappler-800 to-grappler-900 p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <p className="text-sm font-bold text-grappler-100">Tap what&apos;s sore</p>
          </div>
          <button onClick={onDismiss} className="p-1 text-grappler-500 hover:text-grappler-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {[
          { label: 'Upper Body', areas: upperAreas },
          { label: 'Core & Spine', areas: coreAreas },
          { label: 'Lower Body', areas: lowerAreas },
        ].map(group => (
          <div key={group.label} className="mb-3">
            <p className="text-xs text-grappler-400 uppercase tracking-wider mb-1.5">{group.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.areas.map(area => {
                const isSelected = selectedAreas.has(area.id);
                const severity = selectedAreas.get(area.id);
                const severityCfg = SEVERITY_CONFIG.find(s => s.id === severity);
                return (
                  <button
                    key={area.id}
                    onClick={() => toggleArea(area.id)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.95]',
                      isSelected
                        ? `${severityCfg?.bgColor || 'bg-violet-500/20'} ${severityCfg?.borderColor || 'border-violet-500/30'} border ${severityCfg?.color || 'text-violet-300'}`
                        : 'bg-grappler-800/80 border border-grappler-700/50 text-grappler-400 hover:text-grappler-200'
                    )}
                  >
                    {area.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <AnimatePresence>
          {selectedAreas.size > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-grappler-700/50 pt-3 mt-1 space-y-2">
                <p className="text-xs text-grappler-400 uppercase tracking-wider">How bad?</p>
                {Array.from(selectedAreas.entries()).map(([area, severity]) => {
                  const areaInfo = SORENESS_AREAS.find(a => a.id === area);
                  return (
                    <div key={area} className="flex items-center gap-2">
                      <span className="text-xs text-grappler-300 w-20 truncate">{areaInfo?.label}</span>
                      <div className="flex gap-1 flex-1">
                        {SEVERITY_CONFIG.map(sev => (
                          <button
                            key={sev.id}
                            onClick={() => setSeverity(area, sev.id)}
                            className={cn(
                              'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                              severity === sev.id
                                ? `${sev.bgColor} ${sev.borderColor} border ${sev.color}`
                                : 'bg-grappler-800/60 border border-grappler-700/30 text-grappler-500'
                            )}
                          >
                            {sev.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setPhase('time')}
                className="w-full mt-3 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-semibold active:scale-[0.97] transition-all"
              >
                Next
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ─── Phase: Time Picker ───
  if (phase === 'time') {
    const areaLabels = Array.from(selectedAreas.keys())
      .map(a => SORENESS_AREAS.find(s => s.id === a)?.label)
      .filter(Boolean);

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-grappler-800 to-grappler-900 p-4"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-400" />
            <p className="text-sm font-bold text-grappler-100">How much time do you have?</p>
          </div>
          <button onClick={onDismiss} className="p-1 text-grappler-500 hover:text-grappler-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-grappler-400 mb-3">
          Targeting: <span className="text-grappler-200">{areaLabels.join(', ')}</span>
        </p>

        <div className="grid grid-cols-2 gap-2">
          {TIME_OPTIONS.map(opt => (
            <button
              key={opt.minutes}
              onClick={() => handlePickTime(opt.minutes)}
              className="py-3 rounded-xl bg-grappler-800/80 border border-grappler-700/50 hover:border-violet-500/40 active:scale-[0.96] transition-all text-center group"
            >
              <p className="text-lg font-black text-grappler-100 group-hover:text-violet-300 transition-colors">{opt.label}</p>
              <p className="text-xs text-grappler-400">{opt.desc}</p>
            </button>
          ))}
        </div>

        <button
          onClick={() => setPhase('select')}
          className="w-full mt-2 py-2 text-xs text-grappler-400 hover:text-grappler-300 transition-colors"
        >
          Back
        </button>
      </motion.div>
    );
  }

  // ─── Phase: Active Session ───
  if (sessionDone) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 via-grappler-800 to-grappler-900 p-5 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
          <Check className="w-6 h-6 text-green-400" />
        </div>
        <h3 className="text-lg font-black text-grappler-100 mb-1">Mobility Done!</h3>
        <p className="text-xs text-grappler-400 mb-1">
          {sessionPlan.length} drills &middot; {Math.ceil(totalSessionSeconds / 60)} min
        </p>
        <p className="text-xs text-green-400/80 mb-4">Your body will thank you tomorrow.</p>
        <button
          onClick={() => { logSoreness(); onDismiss(); }}
          className="px-6 py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-sm font-semibold text-green-300 active:scale-[0.97] transition-all"
        >
          Done
        </button>
      </motion.div>
    );
  }

  if (!currentDrill) return null;

  const progress = totalSessionSeconds > 0
    ? (completedSeconds / totalSessionSeconds) * 100
    : 0;

  const circumference = 2 * Math.PI * 44;
  const timerProgress = currentDrill.duration > 0
    ? ((currentDrill.duration - timeLeft) / currentDrill.duration) * circumference
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-grappler-800 to-grappler-900 p-4"
    >
      {/* Session progress bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1 bg-grappler-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-violet-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-xs text-grappler-400 font-medium">
          {completedDrills.size}/{sessionPlan.length}
        </span>
        <button onClick={() => { logSoreness(); onDismiss(); }} className="p-0.5 text-grappler-600 hover:text-grappler-300">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Current drill display */}
      <div className="text-center mb-3">
        <p className="text-xs text-grappler-400 uppercase tracking-wider mb-1">
          Set {currentSet}/{currentDrill.sets}{currentDrill.bilateral !== false && (<> &middot; {currentSide === 'left' ? 'Left side' : 'Right side'}</>)}
        </p>
        <h3 className="text-base font-black text-grappler-100 leading-tight">{currentDrill.name}</h3>
      </div>

      {/* Circular timer */}
      <div className="flex justify-center mb-3">
        <div className="relative w-28 h-28">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgb(55 65 81 / 0.4)" strokeWidth="4" />
            <circle
              cx="50" cy="50" r="44"
              fill="none"
              stroke={timeLeft === 0 ? '#22c55e' : '#8b5cf6'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - timerProgress}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn(
              'text-3xl font-black tabular-nums',
              timeLeft === 0 ? 'text-green-400' : 'text-grappler-100'
            )}>
              {timeLeft}
            </span>
            <span className="text-xs text-grappler-400">sec</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-3">
        <button
          onClick={skipDrill}
          className="w-10 h-10 rounded-full bg-grappler-800 border border-grappler-700 flex items-center justify-center text-grappler-400 hover:text-grappler-200 active:scale-[0.93] transition-all"
          title="Skip drill"
        >
          <SkipForward className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (timeLeft === 0) {
              advanceToNext();
            } else {
              setIsRunning(r => !r);
            }
          }}
          className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center active:scale-[0.93] transition-all',
            timeLeft === 0
              ? 'bg-green-500 text-white'
              : isRunning
                ? 'bg-violet-500/30 border-2 border-violet-500 text-violet-300'
                : 'bg-violet-500 text-white'
          )}
        >
          {timeLeft === 0 ? (
            <Check className="w-6 h-6" />
          ) : isRunning ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </button>
        <div className="w-10 h-10" /> {/* Spacer for symmetry */}
      </div>

      {/* Drill instructions (expandable) */}
      <DrillDetails drill={currentDrill} onFormCheck={(name) => { setIsRunning(false); setFormCheckDrill(name); }} />

      {/* Upcoming queue */}
      {sessionPlan.length > 1 && (
        <div className="mt-3 border-t border-grappler-700/30 pt-2">
          <p className="text-xs text-grappler-400 uppercase tracking-wider mb-1.5">Up next</p>
          <div className="space-y-1">
            {sessionPlan.slice(currentDrillIndex + 1, currentDrillIndex + 3).map((d, i) => (
              <div key={d.name + i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-grappler-800/30">
                <div className="w-4 h-4 rounded bg-grappler-700/50 flex items-center justify-center text-[9px] text-grappler-500 font-bold">
                  {currentDrillIndex + i + 2}
                </div>
                <p className="text-xs text-grappler-400 flex-1 truncate">{d.name}</p>
                <span className="text-xs text-grappler-600">{d.sets}&times;{d.duration}s</span>
              </div>
            ))}
            {sessionPlan.length - currentDrillIndex - 1 > 2 && (
              <p className="text-xs text-grappler-600 text-center">
                +{sessionPlan.length - currentDrillIndex - 3} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* YouTube form video modal */}
      {formCheckDrill && (
        <YouTubeEmbed
          exerciseName={formCheckDrill}
          onClose={() => setFormCheckDrill(null)}
        />
      )}
    </motion.div>
  );
}

// ─── Drill Details Sub-Component ───

function DrillDetails({ drill, onFormCheck }: { drill: MobilityDrill; onFormCheck: (name: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl bg-grappler-800/40 border border-grappler-700/30">
      <div className="flex items-center">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex-1 flex items-center justify-between px-3 py-2"
        >
          <span className="text-xs text-grappler-400">How to do this</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-grappler-500" /> : <ChevronDown className="w-3.5 h-3.5 text-grappler-500" />}
        </button>
        <button
          onClick={() => onFormCheck(drill.name)}
          className="flex items-center gap-1 px-2.5 py-1.5 mr-2 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25 active:scale-[0.95] transition-all"
          title="Watch form video"
        >
          <Video className="w-3 h-3" />
          <span className="text-xs font-medium">Form</span>
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2.5 space-y-1.5">
              <p className="text-xs text-grappler-300 leading-relaxed">{drill.description}</p>
              {drill.breathingCue && (
                <p className="text-xs text-blue-400/80 italic">Breathing: {drill.breathingCue}</p>
              )}
              <p className="text-xs text-violet-400/80">Why: {drill.combatBenefit}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
