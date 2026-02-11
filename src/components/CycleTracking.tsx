'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Calendar, Activity, Droplets, Apple,
  TrendingUp, Moon, Heart, AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type {
  CycleLog, CyclePhase, CycleSymptom, CycleProfile,
  PhaseAdjustment, CycleInsights, PerformanceWindow, CycleNutritionGuidance,
} from '@/lib/female-athlete';
import {
  buildCycleProfile, getPhaseTrainingAdjustments,
  getCycleInsights, predictPerformanceWindow, getCycleNutritionGuidance,
} from '@/lib/female-athlete';

const ALL_SYMPTOMS: CycleSymptom[] = [
  'cramps', 'bloating', 'fatigue', 'headache', 'mood_changes',
  'breast_tenderness', 'back_pain', 'insomnia', 'cravings', 'nausea',
];
const SYMPTOM_LABELS: Record<CycleSymptom, string> = {
  cramps: 'Cramps', bloating: 'Bloating', fatigue: 'Fatigue',
  headache: 'Headache', mood_changes: 'Mood', breast_tenderness: 'Tenderness',
  back_pain: 'Back Pain', insomnia: 'Insomnia', cravings: 'Cravings', nausea: 'Nausea',
};
const PHASE_CONFIG: Record<CyclePhase, { label: string; color: string; bg: string; border: string }> = {
  menstrual:  { label: 'Menstrual',  color: 'text-red-400',    bg: 'bg-red-500/20',    border: 'border-red-500/40' },
  follicular: { label: 'Follicular', color: 'text-green-400',  bg: 'bg-green-500/20',  border: 'border-green-500/40' },
  ovulatory:  { label: 'Ovulatory',  color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40' },
  luteal:     { label: 'Luteal',     color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/40' },
};
const ENERGY_LABELS = ['', 'Very Low', 'Low', 'Moderate', 'High', 'Peak'];

interface CycleTrackingProps { onClose: () => void }

export default function CycleTracking({ onClose }: CycleTrackingProps) {
  const { cycleLogs, addCycleLog, deleteCycleLog, workoutLogs, macroTargets } = useAppStore();

  const [formOpen, setFormOpen] = useState(false);
  const [phase, setPhase] = useState<CyclePhase>('menstrual');
  const [symptoms, setSymptoms] = useState<CycleSymptom[]>([]);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));

  const profile = useMemo<CycleProfile>(() => buildCycleProfile(cycleLogs), [cycleLogs]);
  const adjustments = useMemo<PhaseAdjustment>(() => {
    const latest = cycleLogs.length > 0 ? cycleLogs[cycleLogs.length - 1].symptoms : [];
    return getPhaseTrainingAdjustments(profile.currentPhase, latest);
  }, [profile.currentPhase, cycleLogs]);
  const insights = useMemo<CycleInsights>(() => getCycleInsights(profile, workoutLogs), [profile, workoutLogs]);
  const perfWindows = useMemo<PerformanceWindow>(() => predictPerformanceWindow(profile), [profile]);
  const nutrition = useMemo<CycleNutritionGuidance>(
    () => getCycleNutritionGuidance(profile.currentPhase, { protein: macroTargets.protein, calories: macroTargets.calories }),
    [profile.currentPhase, macroTargets.protein, macroTargets.calories],
  );

  const toggleSymptom = useCallback((s: CycleSymptom) => {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }, []);

  const handleSave = useCallback(() => {
    const log: CycleLog = {
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      startDate, phase, symptoms, energyLevel: energy,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    addCycleLog(log);
    setSymptoms([]); setEnergy(3); setNotes('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setFormOpen(false);
  }, [startDate, phase, symptoms, energy, notes, addCycleLog]);

  const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const hasLogs = cycleLogs.length > 0;
  const pc = PHASE_CONFIG[profile.currentPhase];

  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} className="min-h-screen bg-grappler-900 bg-mesh pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-grappler-900/80 backdrop-blur-xl border-b border-grappler-800">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary-400" />
            </div>
            <h1 className="font-bold text-grappler-50 text-lg">Cycle Tracking</h1>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm p-1"><X className="w-5 h-5 text-grappler-400" /></button>
        </div>
      </header>

      <div className="px-4 py-6 space-y-5 max-w-lg mx-auto">
        {/* Log New Entry */}
        <div className="rounded-xl bg-grappler-800 border border-grappler-700 overflow-hidden">
          <button onClick={() => setFormOpen(p => !p)} className="w-full px-4 py-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-grappler-100">
              <Plus className="w-4 h-4 text-primary-400" /> Log New Entry
            </span>
            <motion.span animate={{ rotate: formOpen ? 180 : 0 }} className="text-grappler-500 text-xs">{formOpen ? 'Close' : 'Open'}</motion.span>
          </button>
          <AnimatePresence>
            {formOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-4 pb-4 space-y-4">
                  {/* Phase selector */}
                  <div>
                    <label className="text-xs text-grappler-400 mb-1.5 block">Phase</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['menstrual', 'follicular', 'ovulatory', 'luteal'] as CyclePhase[]).map(p => {
                        const c = PHASE_CONFIG[p];
                        return (
                          <button key={p} onClick={() => setPhase(p)} className={`text-xs py-2 rounded-lg border font-medium transition-all ${phase === p ? `${c.bg} ${c.border} ${c.color}` : 'bg-grappler-900/50 border-grappler-700 text-grappler-400'}`}>
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Symptoms */}
                  <div>
                    <label className="text-xs text-grappler-400 mb-1.5 block">Symptoms</label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_SYMPTOMS.map(s => (
                        <button key={s} onClick={() => toggleSymptom(s)} className={`text-xs px-2.5 py-1.5 rounded-full border transition-all ${symptoms.includes(s) ? 'bg-primary-500/20 border-primary-500/50 text-primary-300' : 'bg-grappler-900/50 border-grappler-700 text-grappler-400'}`}>
                          {SYMPTOM_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Energy level */}
                  <div>
                    <label className="text-xs text-grappler-400 mb-1.5 block">Energy Level — {ENERGY_LABELS[energy]}</label>
                    <div className="flex gap-2">
                      {([1, 2, 3, 4, 5] as const).map(lvl => (
                        <button key={lvl} onClick={() => setEnergy(lvl)} className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-all ${energy === lvl ? 'bg-primary-500/20 border-primary-500/50 text-primary-300' : 'bg-grappler-900/50 border-grappler-700 text-grappler-500'}`}>
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Date + Notes */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-grappler-400 mb-1.5 block">Start Date</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-grappler-900/50 border border-grappler-700 rounded-lg px-3 py-2 text-sm text-grappler-100" />
                    </div>
                    <div>
                      <label className="text-xs text-grappler-400 mb-1.5 block">Notes</label>
                      <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" className="w-full bg-grappler-900/50 border border-grappler-700 rounded-lg px-3 py-2 text-sm text-grappler-100 placeholder:text-grappler-600" />
                    </div>
                  </div>
                  <button onClick={handleSave} className="w-full py-2.5 rounded-lg bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 transition-colors">Save Entry</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {!hasLogs && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-grappler-800 border border-grappler-700 p-6 text-center">
            <Moon className="w-10 h-10 text-grappler-600 mx-auto mb-3" />
            <h3 className="text-grappler-200 font-semibold mb-1">No Cycle Data Yet</h3>
            <p className="text-xs text-grappler-500 max-w-xs mx-auto">
              Log your first entry above to unlock phase-based training adjustments, performance windows, and nutrition guidance.
            </p>
          </motion.div>
        )}

        {/* Current Phase */}
        {hasLogs && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-grappler-800 border border-grappler-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-primary-400" />
              <h2 className="text-sm font-semibold text-grappler-100">Current Phase</h2>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${pc.bg} ${pc.border} ${pc.color}`}>{pc.label}</span>
              <span className="text-sm text-grappler-300">Day {profile.dayInCycle} of ~{profile.averageCycleLength}</span>
            </div>
            <p className="text-xs text-grappler-400 mb-2">{insights.phaseDescription}</p>
            <div className="flex items-center gap-1.5 text-xs text-grappler-500">
              <Droplets className="w-3.5 h-3.5" />
              Next period estimate: <span className="text-grappler-300 font-medium">{fmt(profile.nextPeriodEstimate)}</span>
            </div>
          </motion.div>
        )}

        {/* Training Adjustments */}
        {hasLogs && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl bg-grappler-800 border border-grappler-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-primary-400" />
              <h2 className="text-sm font-semibold text-grappler-100">Training Adjustments</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-grappler-900/50 rounded-lg p-3 border border-grappler-700">
                <p className="text-xs text-grappler-500 mb-0.5">Volume</p>
                <p className="text-lg font-bold text-grappler-100">{Math.round(adjustments.volumeMultiplier * 100)}%</p>
              </div>
              <div className="bg-grappler-900/50 rounded-lg p-3 border border-grappler-700">
                <p className="text-xs text-grappler-500 mb-0.5">Intensity</p>
                <p className="text-lg font-bold text-grappler-100">{Math.round(adjustments.intensityMultiplier * 100)}%</p>
              </div>
            </div>
            {adjustments.focusAreas.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-grappler-500 mb-1.5">Focus Areas</p>
                <div className="flex flex-wrap gap-1.5">
                  {adjustments.focusAreas.map((f, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">{f}</span>
                  ))}
                </div>
              </div>
            )}
            {adjustments.avoidAreas.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-grappler-500 mb-1.5">Areas to Avoid</p>
                <div className="flex flex-wrap gap-1.5">
                  {adjustments.avoidAreas.map((a, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">{a}</span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs text-grappler-500 mb-1.5">Recommendations</p>
              <ul className="space-y-1.5">
                {adjustments.recommendations.map((r, i) => (
                  <li key={i} className="text-xs text-grappler-300 flex gap-2"><span className="text-primary-400 mt-0.5 shrink-0">-</span>{r}</li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}

        {/* Performance Windows */}
        {hasLogs && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl bg-grappler-800 border border-grappler-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary-400" />
              <h2 className="text-sm font-semibold text-grappler-100">Performance Windows</h2>
            </div>
            <div className="bg-green-500/10 border border-green-500/25 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs font-semibold text-green-400">Peak Window</span>
              </div>
              <p className="text-xs text-grappler-300 mb-1">{fmt(perfWindows.peakWindow.start)} – {fmt(perfWindows.peakWindow.end)}</p>
              <p className="text-xs text-grappler-500">{perfWindows.peakWindow.description}</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400">Caution Window</span>
              </div>
              <p className="text-xs text-grappler-300 mb-1">{fmt(perfWindows.cautionWindow.start)} – {fmt(perfWindows.cautionWindow.end)}</p>
              <p className="text-xs text-grappler-500">{perfWindows.cautionWindow.description}</p>
            </div>
          </motion.div>
        )}

        {/* Nutrition Guidance */}
        {hasLogs && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl bg-grappler-800 border border-grappler-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Apple className="w-4 h-4 text-primary-400" />
              <h2 className="text-sm font-semibold text-grappler-100">Nutrition Guidance</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-grappler-900/50 rounded-lg p-3 border border-grappler-700">
                <p className="text-xs text-grappler-500 mb-0.5">Calories</p>
                <p className="text-lg font-bold text-grappler-100">{nutrition.adjustedCalories}</p>
              </div>
              <div className="bg-grappler-900/50 rounded-lg p-3 border border-grappler-700">
                <p className="text-xs text-grappler-500 mb-0.5">Protein</p>
                <p className="text-lg font-bold text-grappler-100">{nutrition.adjustedProtein}g</p>
              </div>
            </div>
            <div className="mb-3">
              <p className="text-xs text-grappler-500 mb-1.5">Key Nutrients</p>
              <ul className="space-y-1">
                {nutrition.keyNutrients.map((n, i) => (
                  <li key={i} className="text-xs text-grappler-300 flex gap-2"><span className="text-green-400 shrink-0">+</span> {n}</li>
                ))}
              </ul>
            </div>
            <div className="mb-3">
              <p className="text-xs text-grappler-500 mb-1.5">Meal Suggestions</p>
              <ul className="space-y-1">
                {nutrition.mealSuggestions.map((m, i) => (
                  <li key={i} className="text-xs text-grappler-300 flex gap-2"><span className="text-primary-400 shrink-0">-</span> {m}</li>
                ))}
              </ul>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/25 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-blue-400">Hydration</span>
              </div>
              <p className="text-xs text-grappler-400">{nutrition.hydrationNote}</p>
            </div>
          </motion.div>
        )}

        {/* Cycle History */}
        {hasLogs && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl bg-grappler-800 border border-grappler-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Moon className="w-4 h-4 text-primary-400" />
              <h2 className="text-sm font-semibold text-grappler-100">Cycle History</h2>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {[...cycleLogs].reverse().map(log => {
                const lc = PHASE_CONFIG[log.phase];
                return (
                  <div key={log.id} className="bg-grappler-900/50 rounded-lg p-3 border border-grappler-700 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs text-grappler-400">{fmt(log.startDate)}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${lc.bg} ${lc.border} ${lc.color}`}>{lc.label}</span>
                        <span className="text-xs text-grappler-500">E:{log.energyLevel}/5</span>
                      </div>
                      {log.symptoms.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {log.symptoms.map(s => (
                            <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-grappler-800 text-grappler-400 border border-grappler-700">{SYMPTOM_LABELS[s]}</span>
                          ))}
                        </div>
                      )}
                      {log.notes && <p className="text-xs text-grappler-500 mt-1 truncate">{log.notes}</p>}
                    </div>
                    <button onClick={() => deleteCycleLog(log.id)} className="shrink-0 text-grappler-600 hover:text-red-400 transition-colors p-0.5" title="Delete entry">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
