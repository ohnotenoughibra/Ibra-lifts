'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  AlertTriangle,
  Check,
  Dumbbell,
  Brain,
  RefreshCw,
  ChevronDown,
  Plus,
  ListChecks,
  Pencil,
  X,
  Clock,
  Calendar,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { suggestNextBlock } from '@/lib/block-suggestion';
import type { BlockFocus, GoalFocus, SessionsPerWeek, BlockSuggestion as BlockSuggestionType } from '@/lib/types';
import { cn } from '@/lib/utils';

// Map BlockFocus → GoalFocus for mesocycle generation
// deload/peaking/base_building map to 'balanced' as closest equivalent
const BLOCK_TO_GOAL: Record<BlockFocus, GoalFocus> = {
  strength: 'strength',
  hypertrophy: 'hypertrophy',
  power: 'power',
  deload: 'balanced',
  peaking: 'strength',
  base_building: 'balanced',
};

interface BlockSuggestionProps {
  onClose: () => void;
}

const FOCUS_CONFIG: Record<BlockFocus, { label: string; color: string; icon: string; description: string }> = {
  strength: {
    label: 'Strength',
    color: 'text-red-400 bg-red-500/20 border-red-500/40',
    icon: '💪',
    description: 'Heavy loads (85-95% 1RM), low reps (1-5), long rest. Maximize neural adaptations and force production.',
  },
  hypertrophy: {
    label: 'Hypertrophy',
    color: 'text-purple-400 bg-purple-500/20 border-purple-500/40',
    icon: '📈',
    description: 'Moderate loads (65-80% 1RM), 6-12 reps, short rest. Maximize mechanical tension and metabolic stress for growth.',
  },
  power: {
    label: 'Power',
    color: 'text-blue-400 bg-blue-500/20 border-blue-500/40',
    icon: '⚡',
    description: 'Explosive movements at 50-70% 1RM, 2-5 reps, full recovery. Develop rate of force development.',
  },
  deload: {
    label: 'Deload / Recovery',
    color: 'text-teal-400 bg-teal-500/20 border-teal-500/40',
    icon: '🌿',
    description: 'Reduced volume and intensity. Allow accumulated fatigue to dissipate for supercompensation.',
  },
  peaking: {
    label: 'Competition Peaking',
    color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40',
    icon: '🏆',
    description: 'Taper volume 30-40%, maintain intensity. Sport-specific sharpening for competition.',
  },
  base_building: {
    label: 'Base Building',
    color: 'text-blue-400 bg-blue-500/20 border-blue-500/40',
    icon: '🏗️',
    description: 'General physical preparedness (GPP). Build work capacity and aerobic base for future phases.',
  },
};

export default function BlockSuggestion({ onClose }: BlockSuggestionProps) {
  const {
    user,
    currentMesocycle,
    mesocycleHistory,
    workoutLogs,
    trainingSessions,
    injuryLog,
    wearableHistory,
    competitions,
    addToMesocycleQueue,
    updateMesocycleInQueue,
    mesocycleQueue,
  } = useAppStore();

  const [showDetails, setShowDetails] = useState(false);
  const [queued, setQueued] = useState<'main' | 'alt' | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const handleQueueBlock = (focus: BlockFocus, weeks: number, which: 'main' | 'alt') => {
    addToMesocycleQueue({
      name: `${FOCUS_CONFIG[focus].label} Block`,
      focus: BLOCK_TO_GOAL[focus],
      weeks,
      periodization: focus === 'strength' || focus === 'peaking' ? 'linear' : 'undulating',
    });
    setQueued(which);
    setTimeout(() => setQueued(null), 3000);
  };

  const suggestion = useMemo<BlockSuggestionType>(() => {
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
  }, [user, currentMesocycle, mesocycleHistory, workoutLogs, trainingSessions, injuryLog, wearableHistory, competitions]);

  const config = FOCUS_CONFIG[suggestion.recommendedFocus];
  const altConfig = suggestion.alternativeFocus ? FOCUS_CONFIG[suggestion.alternativeFocus] : null;

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
    if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
    return <Minus className="w-3.5 h-3.5 text-grappler-400" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="min-h-screen bg-grappler-900 bg-mesh pb-20"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-grappler-900/80 backdrop-blur-xl border-b border-grappler-800">
        <div className="px-4 py-4 flex items-center gap-3">
          <button aria-label="Go back" onClick={onClose} className="btn btn-ghost btn-sm p-1">
            <ChevronLeft className="w-5 h-5 text-grappler-200" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary-400" />
            </div>
            <div>
              <h1 className="font-bold text-grappler-50 text-lg leading-tight">
                Next Block
              </h1>
              <p className="text-xs text-grappler-400">
                Smart suggestion engine
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-5 max-w-lg mx-auto">
        {/* Main Recommendation Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('rounded-xl p-5 border', config.color)}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-2xl mb-1 block">{config.icon}</span>
              <h2 className="text-xl font-bold">{config.label}</h2>
              <p className="text-sm opacity-80">{suggestion.suggestedWeeks} weeks</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{suggestion.confidence}%</div>
              <p className="text-xs opacity-60">confidence</p>
            </div>
          </div>
          <p className="text-sm opacity-80 leading-relaxed mb-3">
            {config.description}
          </p>
          <button
            onClick={() => handleQueueBlock(suggestion.recommendedFocus, suggestion.suggestedWeeks, 'main')}
            disabled={queued === 'main'}
            className={cn(
              'w-full py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2',
              queued === 'main'
                ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            )}
          >
            {queued === 'main' ? (
              <>
                <Check className="w-4 h-4" />
                Added to queue{mesocycleQueue.length > 0 ? ` (${mesocycleQueue.length} in queue)` : ''}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add to Queue as Mesocycle
              </>
            )}
          </button>
        </motion.div>

        {/* Reasoning */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-grappler-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary-400" />
            Why this recommendation
          </h3>
          {suggestion.reasoning.map((reason, idx) => (
            <div key={idx} className="flex items-start gap-2 bg-grappler-800 rounded-lg p-3">
              <Check className="w-4 h-4 text-primary-400 mt-0.5 shrink-0" />
              <p className="text-sm text-grappler-200">{reason}</p>
            </div>
          ))}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-2">
          {suggestion.keyMetrics.map((metric, idx) => (
            <div key={idx} className="bg-grappler-800 rounded-lg p-3 border border-grappler-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-grappler-400">{metric.label}</span>
                {getTrendIcon(metric.trend)}
              </div>
              <span className="text-sm font-semibold text-grappler-100">{metric.value}</span>
            </div>
          ))}
        </div>

        {/* Weak/Strong Points */}
        {(suggestion.weakPoints.length > 0 || suggestion.strongPoints.length > 0) && (
          <div className="space-y-3">
            {suggestion.strongPoints.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-green-400 mb-1.5 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Strong Points
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {suggestion.strongPoints.map(m => (
                    <span key={m} className="px-2 py-0.5 bg-green-500/15 text-green-400 rounded text-xs capitalize">
                      {m.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {suggestion.weakPoints.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-yellow-400 mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Needs Attention
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {suggestion.weakPoints.map(m => (
                    <span key={m} className="px-2 py-0.5 bg-yellow-500/15 text-yellow-400 rounded text-xs capitalize">
                      {m.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alternative Suggestion */}
        {altConfig && suggestion.alternativeFocus && suggestion.alternativeReason && (
          <div className="bg-grappler-800/60 rounded-xl p-4 border border-grappler-700">
            <h3 className="text-sm font-semibold text-grappler-200 flex items-center gap-2 mb-2">
              <RefreshCw className="w-4 h-4 text-grappler-400" />
              Alternative: {altConfig.label}
            </h3>
            <p className="text-xs text-grappler-400 leading-relaxed mb-3">
              {suggestion.alternativeReason}
            </p>
            <button
              onClick={() => handleQueueBlock(suggestion.alternativeFocus!, suggestion.suggestedWeeks, 'alt')}
              disabled={queued === 'alt'}
              className={cn(
                'w-full py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
                queued === 'alt'
                  ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                  : 'bg-grappler-700 hover:bg-grappler-600 text-grappler-200 border border-grappler-600'
              )}
            >
              {queued === 'alt' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Added to queue
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Queue this instead
                </>
              )}
            </button>
          </div>
        )}

        {/* Block Queue */}
        {mesocycleQueue.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-grappler-200 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary-400" />
              Queued Mesocycles ({mesocycleQueue.length})
            </h3>
            {mesocycleQueue.map((block, idx) => {
              const isEditing = editingBlockId === block.id;
              return (
                <div key={block.id} className="bg-grappler-800 rounded-xl border border-grappler-700 overflow-hidden">
                  {/* Header row */}
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-grappler-700 flex items-center justify-center text-xs text-grappler-400 font-medium flex-shrink-0">{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm text-grappler-100 font-medium truncate">{block.name}</p>
                        <p className="text-xs text-grappler-400">
                          {block.weeks}wk · {block.focus} · {block.periodization || 'undulating'}
                          {block.sessionsPerWeek ? ` · ${block.sessionsPerWeek}x/wk` : ''}
                          {block.sessionDurationMinutes ? ` · ${block.sessionDurationMinutes}min` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setEditingBlockId(isEditing ? null : block.id)}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors',
                          isEditing ? 'bg-primary-500/20 text-primary-400' : 'text-grappler-500 hover:text-grappler-300'
                        )}
                      >
                        {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => useAppStore.getState().removeFromMesocycleQueue(block.id)}
                        className="text-grappler-500 hover:text-red-400 transition-colors p-1.5"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable editor */}
                  <AnimatePresence>
                    {isEditing && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 space-y-3 border-t border-grappler-700 pt-3">
                          {/* Name */}
                          <div>
                            <label className="text-xs text-grappler-400 mb-1 block">Block Name</label>
                            <input
                              type="text"
                              value={block.name}
                              onChange={(e) => updateMesocycleInQueue(block.id, { name: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg bg-grappler-900 border border-grappler-600 text-sm text-grappler-100 focus-visible:border-primary-500 outline-none"
                            />
                          </div>

                          {/* Focus */}
                          <div>
                            <label className="text-xs text-grappler-400 mb-1 block">Focus</label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {(['hypertrophy', 'strength', 'power', 'balanced'] as GoalFocus[]).map(f => (
                                <button
                                  key={f}
                                  onClick={() => updateMesocycleInQueue(block.id, { focus: f })}
                                  className={cn(
                                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                                    block.focus === f
                                      ? 'bg-primary-500 text-white'
                                      : 'bg-grappler-900 text-grappler-400 border border-grappler-600 hover:border-grappler-500'
                                  )}
                                >
                                  {f}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Duration + Sessions row */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-grappler-400 mb-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Weeks
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateMesocycleInQueue(block.id, { weeks: Math.max(1, block.weeks - 1) })}
                                  className="w-8 h-8 rounded-lg bg-grappler-900 border border-grappler-600 text-grappler-300 flex items-center justify-center"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-sm font-medium text-grappler-100 w-6 text-center">{block.weeks}</span>
                                <button
                                  onClick={() => updateMesocycleInQueue(block.id, { weeks: Math.min(12, block.weeks + 1) })}
                                  className="w-8 h-8 rounded-lg bg-grappler-900 border border-grappler-600 text-grappler-300 flex items-center justify-center"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-grappler-400 mb-1 flex items-center gap-1">
                                <Dumbbell className="w-3 h-3" /> Days/Week
                              </label>
                              <div className="flex items-center gap-1">
                                {([2, 3, 4, 5, 6] as SessionsPerWeek[]).map(n => (
                                  <button
                                    key={n}
                                    onClick={() => updateMesocycleInQueue(block.id, { sessionsPerWeek: n })}
                                    className={cn(
                                      'w-8 h-8 rounded-lg text-xs font-medium transition-all',
                                      (block.sessionsPerWeek || user?.sessionsPerWeek) === n
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-grappler-900 border border-grappler-600 text-grappler-400'
                                    )}
                                  >
                                    {n}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Session duration */}
                          <div>
                            <label className="text-xs text-grappler-400 mb-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Session Duration
                            </label>
                            <div className="flex items-center gap-1.5">
                              {[30, 45, 60, 75, 90].map(mins => (
                                <button
                                  key={mins}
                                  onClick={() => updateMesocycleInQueue(block.id, { sessionDurationMinutes: mins })}
                                  className={cn(
                                    'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                                    (block.sessionDurationMinutes || user?.sessionDurationMinutes || 60) === mins
                                      ? 'bg-primary-500 text-white'
                                      : 'bg-grappler-900 border border-grappler-600 text-grappler-400'
                                  )}
                                >
                                  {mins}m
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Periodization */}
                          <div>
                            <label className="text-xs text-grappler-400 mb-1 block">Periodization</label>
                            <div className="flex items-center gap-1.5">
                              {([
                                { value: 'undulating', label: 'DUP' },
                                { value: 'linear', label: 'Linear' },
                                { value: 'block', label: 'Block' },
                              ] as const).map(p => (
                                <button
                                  key={p.value}
                                  onClick={() => updateMesocycleInQueue(block.id, { periodization: p.value })}
                                  className={cn(
                                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1',
                                    (block.periodization || 'undulating') === p.value
                                      ? 'bg-primary-500 text-white'
                                      : 'bg-grappler-900 border border-grappler-600 text-grappler-400'
                                  )}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="text-xs text-grappler-400 mb-1 block">Notes</label>
                            <textarea
                              value={block.notes || ''}
                              onChange={(e) => updateMesocycleInQueue(block.id, { notes: e.target.value || undefined })}
                              placeholder="Optional notes for this block..."
                              rows={2}
                              className="w-full px-3 py-2 rounded-lg bg-grappler-900 border border-grappler-600 text-sm text-grappler-100 placeholder:text-grappler-600 focus-visible:border-primary-500 outline-none resize-none"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            <p className="text-xs text-grappler-400">
              Queued blocks auto-start when your current mesocycle completes.
            </p>
          </div>
        )}

        {/* Science Details Toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between bg-grappler-800 rounded-lg p-3 border border-grappler-700"
        >
          <span className="text-sm text-grappler-300 font-medium">How the suggestion engine works</span>
          <motion.span animate={{ rotate: showDetails ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-grappler-400" />
          </motion.span>
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-grappler-800/50 rounded-xl p-4 space-y-3 text-xs text-grappler-400 leading-relaxed">
                <p>
                  The suggestion engine analyzes <strong className="text-grappler-200">7 data streams</strong> to recommend your next training block:
                </p>
                <ul className="space-y-1.5 ml-3">
                  <li>1. <strong className="text-grappler-300">Strength trends</strong> — estimated 1RM progression per exercise (Zourdos et al. 2016)</li>
                  <li>2. <strong className="text-grappler-300">Plateau detection</strong> — exercises with stalled progress over 2+ weeks</li>
                  <li>3. <strong className="text-grappler-300">Fatigue accumulation</strong> — RPE trends, soreness, performance perception</li>
                  <li>4. <strong className="text-grappler-300">Recovery data</strong> — wearable metrics, HRV trends, sleep quality</li>
                  <li>5. <strong className="text-grappler-300">Injury status</strong> — active injuries and their severity</li>
                  <li>6. <strong className="text-grappler-300">Competition proximity</strong> — automatic peaking when comp approaches</li>
                  <li>7. <strong className="text-grappler-300">Block periodization</strong> — alternates phases to prevent accommodation (Stone et al. 2007)</li>
                </ul>
                <p className="text-grappler-500 italic">
                  Confidence increases with more training data. Log consistently for better suggestions.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
