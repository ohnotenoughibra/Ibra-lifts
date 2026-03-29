'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { calculateReadiness } from '@/lib/performance-engine';
import ReadinessRing from './ReadinessRing';
import { hapticHeavy } from '@/lib/haptics';

// ── Types ────────────────────────────────────────────────────────────────────

interface MorningRitualProps {
  onComplete: () => void;
}

// ── Readiness word mapping (matches ReadinessRing levels) ────────────────────

const READINESS_WORDS: Record<string, { word: string; color: string }> = {
  peak:     { word: 'SEND IT',      color: 'text-green-400' },
  good:     { word: 'GREEN LIGHT',  color: 'text-green-400' },
  moderate: { word: 'TAKE IT EASY', color: 'text-yellow-400' },
  low:      { word: 'TAKE IT EASY', color: 'text-amber-500' },
  critical: { word: 'REST',         color: 'text-red-500' },
};

function getLevel(score: number): string {
  if (score >= 85) return 'peak';
  if (score >= 70) return 'good';
  if (score >= 50) return 'moderate';
  if (score >= 30) return 'low';
  return 'critical';
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Late night';
}

// ── localStorage helper ──────────────────────────────────────────────────────

const RITUAL_KEY = 'ritual-last-shown';

export function shouldShowRitual(): boolean {
  if (typeof window === 'undefined') return false;
  const lastShown = localStorage.getItem(RITUAL_KEY);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return lastShown !== today;
}

function markRitualShown(): void {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(RITUAL_KEY, today);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MorningRitual({ onComplete }: MorningRitualProps) {
  // ── Pull store data for readiness computation ──────────────────────────
  const {
    user, workoutLogs, trainingSessions, latestWhoopData, wearableHistory,
    meals, macroTargets, waterLog, injuryLog, quickLogs, illnessLogs,
  } = useAppStore(
    useShallow(s => ({
      user: s.user,
      workoutLogs: s.workoutLogs,
      trainingSessions: s.trainingSessions,
      latestWhoopData: s.latestWhoopData,
      wearableHistory: s.wearableHistory,
      meals: s.meals ?? [],
      macroTargets: s.macroTargets,
      waterLog: s.waterLog,
      injuryLog: s.injuryLog,
      quickLogs: s.quickLogs,
      illnessLogs: s.illnessLogs,
    }))
  );

  // Compute readiness score from performance engine
  const readinessScore = useMemo(() => {
    const result = calculateReadiness({
      user,
      workoutLogs,
      trainingSessions,
      wearableData: latestWhoopData,
      wearableHistory,
      meals,
      macroTargets,
      waterLog,
      injuryLog,
      illnessLogs,
      quickLogs,
    });
    return result.overall;
  }, [user, workoutLogs, trainingSessions, latestWhoopData, wearableHistory, meals, macroTargets, waterLog, injuryLog, illnessLogs, quickLogs]);

  const [animatedScore, setAnimatedScore] = useState(0);
  const [phase, setPhase] = useState<'greeting' | 'ring' | 'word' | 'tap'>('greeting');
  const hapticFired = useRef(false);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissed = useRef(false);

  // Framer motion value for smooth score interpolation
  const motionScore = useMotionValue(0);
  const displayScore = useTransform(motionScore, (v) => Math.round(v));

  // Sync motion value to React state for the ReadinessRing prop
  useEffect(() => {
    const unsubscribe = displayScore.on('change', (v) => {
      setAnimatedScore(v);
    });
    return unsubscribe;
  }, [displayScore]);

  // ── Animation timeline ─────────────────────────────────────────────────
  useEffect(() => {
    // Phase 1: greeting visible immediately
    // Phase 2: ring appears at 0.5s
    const ringTimer = setTimeout(() => setPhase('ring'), 500);

    // Phase 3: animate score from 0 to actual (0.5s to 2.5s = 2s duration)
    const fillTimer = setTimeout(() => {
      animate(motionScore, readinessScore, {
        duration: 2,
        ease: [0.25, 0.1, 0.25, 1], // smooth cubic bezier
        onComplete: () => {
          // Haptic at completion
          if (!hapticFired.current) {
            hapticFired.current = true;
            hapticHeavy();
          }
        },
      });
    }, 500);

    // Phase 4: word appears at 2.5s
    const wordTimer = setTimeout(() => setPhase('word'), 2500);

    // Phase 5: "tap to continue" at 3.0s
    const tapTimer = setTimeout(() => setPhase('tap'), 3000);

    // Auto-dismiss at 5s
    autoDismissRef.current = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => {
      clearTimeout(ringTimer);
      clearTimeout(fillTimer);
      clearTimeout(wordTimer);
      clearTimeout(tapTimer);
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, [readinessScore]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    markRitualShown();
    onComplete();
  }, [onComplete]);

  const finalLevel = getLevel(readinessScore);
  const finalConfig = READINESS_WORDS[finalLevel];
  const greeting = getGreeting();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] bg-grappler-950 flex flex-col items-center justify-center cursor-pointer select-none"
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Morning readiness ritual"
    >
      {/* Greeting */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0 }}
        className="text-sm text-grappler-400 mb-8 tracking-wide"
      >
        {greeting}
      </motion.p>

      {/* Readiness Ring */}
      <AnimatePresence>
        {(phase === 'ring' || phase === 'word' || phase === 'tap') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="relative"
          >
            <ReadinessRing
              score={animatedScore}
              size={200}
              variant="hero"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Readiness word */}
      <AnimatePresence>
        {(phase === 'word' || phase === 'tap') && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`mt-6 text-2xl font-black tracking-wider ${finalConfig.color}`}
          >
            {finalConfig.word}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Tap to continue */}
      <AnimatePresence>
        {phase === 'tap' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 0.5 }}
            className="absolute bottom-12 text-xs text-grappler-600"
          >
            tap to continue
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
