'use client';

import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { suggestNextBlock } from '@/lib/block-suggestion';
import {
  Plus,
  X,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layers,
  Zap,
  Dumbbell,
  Flame,
  Shield,
  Calendar,
  Download,
  Upload,
  Sparkles,
  Wrench,
  Check,
  Brain,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  RefreshCw,
  Target,
} from 'lucide-react';
import { cn, toLocalDateStr} from '@/lib/utils';
import type { GoalFocus, BlockFocus } from '@/lib/types';

const FOCUS_OPTIONS: { value: GoalFocus; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  { value: 'strength', label: 'Strength', icon: <Dumbbell className="w-4 h-4" />, color: 'text-red-400 bg-red-500/20', desc: 'Heavy loads, low reps' },
  { value: 'hypertrophy', label: 'Hypertrophy', icon: <Flame className="w-4 h-4" />, color: 'text-blue-400 bg-blue-500/20', desc: 'Moderate loads, higher volume' },
  { value: 'power', label: 'Power', icon: <Zap className="w-4 h-4" />, color: 'text-yellow-400 bg-yellow-500/20', desc: 'Explosive, speed-strength' },
  { value: 'balanced', label: 'Balanced', icon: <Shield className="w-4 h-4" />, color: 'text-blue-400 bg-blue-500/20', desc: 'Mix of strength & hypertrophy' },
  { value: 'strength_endurance', label: 'Endurance', icon: <Target className="w-4 h-4" />, color: 'text-amber-400 bg-amber-500/20', desc: 'High reps, short rest — round simulation' },
];

const PERIODIZATION_OPTIONS: { value: 'linear' | 'undulating' | 'block' | 'conjugate'; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'undulating', label: 'Undulating (DUP)' },
  { value: 'block', label: 'Block' },
  { value: 'conjugate', label: 'Conjugate (ME/DE/RE)' },
];

// Map BlockFocus → GoalFocus for mesocycle queue
const BLOCK_TO_GOAL: Record<BlockFocus, GoalFocus> = {
  strength: 'strength',
  hypertrophy: 'hypertrophy',
  power: 'power',
  deload: 'balanced',
  peaking: 'strength',
  base_building: 'balanced',
};

const AI_FOCUS_LABELS: Record<BlockFocus, { label: string; color: string; icon: React.ReactNode }> = {
  strength: { label: 'Strength', color: 'text-red-400 bg-red-500/20 border-red-500/40', icon: <Dumbbell className="w-4 h-4" /> },
  hypertrophy: { label: 'Hypertrophy', color: 'text-purple-400 bg-purple-500/20 border-purple-500/40', icon: <Flame className="w-4 h-4" /> },
  power: { label: 'Power', color: 'text-blue-400 bg-blue-500/20 border-blue-500/40', icon: <Zap className="w-4 h-4" /> },
  deload: { label: 'Deload', color: 'text-teal-400 bg-teal-500/20 border-teal-500/40', icon: <Shield className="w-4 h-4" /> },
  peaking: { label: 'Peaking', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40', icon: <TrendingUp className="w-4 h-4" /> },
  base_building: { label: 'Base Building', color: 'text-sky-400 bg-sky-500/20 border-sky-500/40', icon: <Layers className="w-4 h-4" /> },
};

function getFocusMeta(focus: GoalFocus) {
  return FOCUS_OPTIONS.find(f => f.value === focus) || FOCUS_OPTIONS[0];
}

type AddMode = null | 'pick' | 'manual' | 'ai';

export default function BlockQueue() {
  const {
    mesocycleQueue: rawMesocycleQueue, addToMesocycleQueue, removeFromMesocycleQueue, reorderMesocycleQueue,
    currentMesocycle,
    // AI suggestion data
    user, mesocycleHistory, workoutLogs, trainingSessions, injuryLog, wearableHistory, competitions,
  } = useAppStore();
  const mesocycleQueue = (rawMesocycleQueue ?? []).filter((b: any) => !b._deleted);

  const [addMode, setAddMode] = useState<AddMode>(null);
  const [formFocus, setFormFocus] = useState<GoalFocus>('strength');
  const [formWeeks, setFormWeeks] = useState(5);
  const [formPeriodization, setFormPeriodization] = useState<'linear' | 'undulating' | 'block' | 'conjugate'>('undulating');
  const [formNotes, setFormNotes] = useState('');
  const [aiQueued, setAiQueued] = useState<'main' | 'alt' | null>(null);

  // AI suggestion — only compute when AI panel is open
  const suggestion = useMemo(() => {
    if (addMode !== 'ai') return null;
    return suggestNextBlock({
      user,
      currentMesocycle,
      mesocycleHistory,
      workoutLogs,
      trainingSessions,
      injuryLog,
      wearableHistory,
      competitions: competitions.map((c: { date: Date; type: string }) => ({ date: new Date(c.date), type: c.type })),
    });
  }, [addMode, user, currentMesocycle, mesocycleHistory, workoutLogs, trainingSessions, injuryLog, wearableHistory, competitions]);

  const handleAdd = () => {
    const meta = getFocusMeta(formFocus);
    addToMesocycleQueue({
      name: `${meta.label} Block`,
      focus: formFocus,
      weeks: formWeeks,
      periodization: formPeriodization,
      notes: formNotes.trim() || undefined,
    });
    setAddMode(null);
    setFormNotes('');
  };

  const handleAiQueue = (focus: BlockFocus, weeks: number, which: 'main' | 'alt') => {
    const meta = AI_FOCUS_LABELS[focus];
    addToMesocycleQueue({
      name: `${meta.label} Block`,
      focus: BLOCK_TO_GOAL[focus],
      weeks,
      periodization: focus === 'strength' || focus === 'peaking' ? 'linear' : 'undulating',
    });
    setAiQueued(which);
    setTimeout(() => {
      setAiQueued(null);
      setAddMode(null);
    }, 1500);
  };

  const toggleAddMode = () => {
    if (addMode !== null) {
      setAddMode(null);
      setAiQueued(null);
    } else {
      setAddMode('pick');
    }
  };

  const moveUp = (i: number) => { if (i > 0) reorderMesocycleQueue(i, i - 1); };
  const moveDown = (i: number) => { if (i < mesocycleQueue.length - 1) reorderMesocycleQueue(i, i + 1); };

  // Export / Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const handleExport = () => {
    if (mesocycleQueue.length === 0) return;
    const data = JSON.stringify(mesocycleQueue, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mesocycle-queue-${toLocalDateStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const blocks = Array.isArray(parsed) ? parsed : [parsed];
        let added = 0;
        for (const b of blocks) {
          if (b.name && b.focus && b.weeks) {
            addToMesocycleQueue({
              name: b.name,
              focus: b.focus,
              weeks: b.weeks,
              periodization: b.periodization,
              notes: b.notes,
            });
            added++;
          }
        }
        setImportMsg(`Imported ${added} mesocycle${added !== 1 ? 's' : ''}`);
        setTimeout(() => setImportMsg(null), 3000);
      } catch {
        setImportMsg('Invalid file format');
        setTimeout(() => setImportMsg(null), 3000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getEstimatedStart = (index: number): string => {
    let baseDate: Date;
    if (currentMesocycle?.endDate) {
      baseDate = new Date(currentMesocycle.endDate);
    } else {
      baseDate = new Date();
    }
    let weeksOffset = 0;
    for (let i = 0; i < index; i++) {
      weeksOffset += mesocycleQueue[i].weeks;
    }
    const startDate = new Date(baseDate);
    startDate.setDate(startDate.getDate() + weeksOffset * 7);
    return startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getEstimatedEnd = (index: number): string => {
    let baseDate: Date;
    if (currentMesocycle?.endDate) {
      baseDate = new Date(currentMesocycle.endDate);
    } else {
      baseDate = new Date();
    }
    let weeksOffset = 0;
    for (let i = 0; i <= index; i++) {
      weeksOffset += mesocycleQueue[i].weeks;
    }
    const endDate = new Date(baseDate);
    endDate.setDate(endDate.getDate() + weeksOffset * 7);
    return endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-green-400" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-400" />;
    return <Minus className="w-3 h-3 text-grappler-400" />;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary-400" />
          Mesocycle Queue
        </h3>
        <div className="flex items-center gap-1">
          {mesocycleQueue.length > 0 && (
            <button
              onClick={handleExport}
              className="p-1.5 rounded-lg text-grappler-500 hover:text-primary-400 hover:bg-grappler-800 transition-colors"
              title="Export queue"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg text-grappler-500 hover:text-primary-400 hover:bg-grappler-800 transition-colors"
            title="Import queue"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={toggleAddMode}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              addMode !== null ? 'bg-grappler-700 text-grappler-200' : 'text-grappler-500 hover:text-primary-400 hover:bg-grappler-800'
            )}
          >
            {addMode !== null ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Import feedback */}
      <AnimatePresence>
        {importMsg && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-primary-400 text-center"
          >
            {importMsg}
          </motion.p>
        )}
      </AnimatePresence>

      {/* ─── Mode Picker ─── */}
      <AnimatePresence mode="wait">
        {addMode === 'pick' && (
          <motion.div
            key="pick"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAddMode('ai')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-b from-primary-500/15 to-primary-500/5 border border-primary-500/30 hover:border-primary-400 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5 text-primary-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-grappler-100">AI Suggest</p>
                  <p className="text-xs text-grappler-400 mt-0.5">Based on your data</p>
                </div>
              </button>
              <button
                onClick={() => setAddMode('manual')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-b from-grappler-700/50 to-grappler-800/50 border border-grappler-600/50 hover:border-grappler-500 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-grappler-700/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Wrench className="w-5 h-5 text-grappler-300" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-grappler-100">Build Manual</p>
                  <p className="text-xs text-grappler-400 mt-0.5">Custom block setup</p>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Manual Form ─── */}
        {addMode === 'manual' && (
          <motion.div
            key="manual"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-grappler-800/60 rounded-xl p-3 space-y-3 border border-grappler-700/50">
              {/* Back to picker */}
              <button
                onClick={() => setAddMode('pick')}
                className="flex items-center gap-1 text-xs text-grappler-400 hover:text-primary-400 transition-colors -mb-1"
              >
                <ChevronRight className="w-3 h-3 rotate-180" />
                Back
              </button>

              {/* Focus selector */}
              <div>
                <label className="text-xs text-grappler-400 uppercase tracking-wide font-medium mb-1.5 block">Focus</label>
                <div className="grid grid-cols-2 gap-2">
                  {FOCUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFormFocus(opt.value)}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg text-left transition-all border',
                        formFocus === opt.value
                          ? `${opt.color} border-current`
                          : 'bg-grappler-800/50 text-grappler-400 border-transparent hover:border-grappler-600'
                      )}
                    >
                      {opt.icon}
                      <div>
                        <p className="text-xs font-semibold">{opt.label}</p>
                        <p className="text-xs opacity-70">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Weeks + periodization row */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-grappler-400 uppercase tracking-wide font-medium mb-1 block">Weeks</label>
                  <div className="flex items-center gap-1">
                    {[3, 4, 5, 6].map(w => (
                      <button
                        key={w}
                        onClick={() => setFormWeeks(w)}
                        className={cn(
                          'flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors',
                          formWeeks === w
                            ? 'bg-primary-600 text-white'
                            : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
                        )}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-grappler-400 uppercase tracking-wide font-medium mb-1 block">Style</label>
                  <select
                    value={formPeriodization}
                    onChange={e => setFormPeriodization(e.target.value as typeof formPeriodization)}
                    className="w-full bg-grappler-800 border border-grappler-600 rounded-lg px-2 py-1.5 text-xs text-grappler-200 outline-none focus-visible:border-primary-500"
                  >
                    {PERIODIZATION_OPTIONS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-grappler-400 uppercase tracking-wide font-medium mb-1 block">Notes (optional)</label>
                <input
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="e.g. Focus on squat, prep for comp..."
                  className="w-full bg-grappler-900 border border-grappler-600 rounded-lg px-2 py-1.5 text-xs text-grappler-100 placeholder:text-grappler-600 focus-visible:border-primary-500 outline-none"
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                />
              </div>

              <button
                onClick={handleAdd}
                className="w-full btn btn-primary btn-sm gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add to Queue
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── AI Suggestion Panel ─── */}
        {addMode === 'ai' && suggestion && (
          <motion.div
            key="ai"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-grappler-800/60 rounded-xl border border-grappler-700/50 overflow-hidden">
              {/* Back + header */}
              <div className="p-3 pb-0 flex items-center justify-between">
                <button
                  onClick={() => setAddMode('pick')}
                  className="flex items-center gap-1 text-xs text-grappler-400 hover:text-primary-400 transition-colors"
                >
                  <ChevronRight className="w-3 h-3 rotate-180" />
                  Back
                </button>
                <div className="flex items-center gap-1.5 text-xs text-primary-400">
                  <Brain className="w-3.5 h-3.5" />
                  <span className="font-medium">Smart Suggestion</span>
                </div>
              </div>

              {/* Main recommendation */}
              {(() => {
                const focusMeta = AI_FOCUS_LABELS[suggestion.recommendedFocus];
                return (
                  <div className="p-3 space-y-3">
                    {/* Recommendation header */}
                    <div className={cn('rounded-lg p-3 border', focusMeta.color)}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={cn('p-1.5 rounded-lg', focusMeta.color)}>
                            {focusMeta.icon}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{focusMeta.label} Block</p>
                            <p className="text-xs opacity-70">{suggestion.suggestedWeeks} weeks</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{suggestion.confidence}%</p>
                          <p className="text-xs opacity-50">confidence</p>
                        </div>
                      </div>

                      {/* Queue button */}
                      <button
                        onClick={() => handleAiQueue(suggestion.recommendedFocus, suggestion.suggestedWeeks, 'main')}
                        disabled={aiQueued === 'main'}
                        className={cn(
                          'w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 mt-2',
                          aiQueued === 'main'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                        )}
                      >
                        {aiQueued === 'main' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Added to queue
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Add to Queue
                          </>
                        )}
                      </button>
                    </div>

                    {/* Reasoning — show top 3 */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-grappler-300 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-primary-400" />
                        Why
                      </p>
                      {suggestion.reasoning.slice(0, 3).map((reason, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-xs text-grappler-300">
                          <Check className="w-3 h-3 text-primary-400 mt-0.5 shrink-0" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>

                    {/* Key metrics — compact 2-col */}
                    {suggestion.keyMetrics.length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5">
                        {suggestion.keyMetrics.slice(0, 4).map((metric, idx) => (
                          <div key={idx} className="bg-grappler-900/60 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                            <span className="text-xs text-grappler-400 truncate">{metric.label}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-grappler-200">{metric.value}</span>
                              {getTrendIcon(metric.trend)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Weak/strong points */}
                    {(suggestion.weakPoints.length > 0 || suggestion.strongPoints.length > 0) && (
                      <div className="flex flex-wrap gap-1">
                        {suggestion.strongPoints.slice(0, 3).map(m => (
                          <span key={m} className="px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded text-xs capitalize">
                            {m.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {suggestion.weakPoints.slice(0, 3).map(m => (
                          <span key={m} className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 rounded text-xs capitalize">
                            {m.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Alternative */}
                    {suggestion.alternativeFocus && suggestion.alternativeReason && (() => {
                      const altMeta = AI_FOCUS_LABELS[suggestion.alternativeFocus];
                      return (
                        <div className="bg-grappler-900/40 rounded-lg p-2.5 border border-grappler-700/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <RefreshCw className="w-3 h-3 text-grappler-400 shrink-0" />
                              <span className="text-xs text-grappler-300 truncate">
                                Alt: <strong>{altMeta.label}</strong> — {suggestion.alternativeReason}
                              </span>
                            </div>
                            <button
                              onClick={() => handleAiQueue(suggestion.alternativeFocus!, suggestion.suggestedWeeks, 'alt')}
                              disabled={aiQueued === 'alt'}
                              className={cn(
                                'ml-2 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0',
                                aiQueued === 'alt'
                                  ? 'bg-green-500/15 text-green-400'
                                  : 'bg-grappler-700 hover:bg-grappler-600 text-grappler-200'
                              )}
                            >
                              {aiQueued === 'alt' ? <Check className="w-3 h-3" /> : 'Queue'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue list */}
      {mesocycleQueue.length === 0 && addMode === null ? (
        <div className="text-center py-4">
          <Calendar className="w-8 h-8 text-grappler-700 mx-auto mb-2" />
          <p className="text-xs text-grappler-400">No mesocycles queued yet</p>
          <p className="text-xs text-grappler-600 mt-0.5">Plan your next training mesocycles ahead</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mesocycleQueue.map((block, i) => {
            const meta = getFocusMeta(block.focus);
            return (
              <motion.div
                key={block.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="flex items-center gap-2 bg-grappler-800/50 rounded-xl p-3 border border-grappler-700/40"
              >
                {/* Position number */}
                <div className="flex flex-col items-center gap-0.5 mr-1">
                  <button
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    className="text-grappler-600 hover:text-grappler-300 disabled:opacity-20 transition-colors"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-black text-grappler-400 w-5 text-center">{i + 1}</span>
                  <button
                    onClick={() => moveDown(i)}
                    disabled={i === mesocycleQueue.length - 1}
                    className="text-grappler-600 hover:text-grappler-300 disabled:opacity-20 transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Icon */}
                <div className={cn('p-2 rounded-lg', meta.color)}>
                  {meta.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-grappler-200 truncate">{block.name}</p>
                    <span className="text-xs text-grappler-400 shrink-0">{block.weeks}wk</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {block.periodization && (
                      <span className="text-xs text-grappler-400 capitalize">{block.periodization}</span>
                    )}
                    <span className="text-xs text-grappler-600">{getEstimatedStart(i)} — {getEstimatedEnd(i)}</span>
                  </div>
                  {block.notes && (
                    <p className="text-xs text-grappler-400 mt-0.5 truncate">{block.notes}</p>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => removeFromMesocycleQueue(block.id)}
                  className="p-1.5 rounded hover:bg-grappler-700 text-grappler-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}

          {/* Timeline summary */}
          {mesocycleQueue.length > 0 && (
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-xs text-grappler-600">
                {mesocycleQueue.length} mesocycle{mesocycleQueue.length > 1 ? 's' : ''} · {mesocycleQueue.reduce((s, b) => s + b.weeks, 0)} weeks
              </span>
              <span className="text-xs text-grappler-600">
                Planned through {getEstimatedEnd(mesocycleQueue.length - 1)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
