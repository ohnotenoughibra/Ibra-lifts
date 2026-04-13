'use client';

import { useMemo, useState, useCallback } from 'react';
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
  Eye,
  Sparkles,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { suggestNextBlock } from '@/lib/block-suggestion';
import { generateMesocycle } from '@/lib/workout-generator';
import type {
  BlockFocus, GoalFocus, SessionsPerWeek,
  BlockSuggestion as BlockSuggestionType,
  Mesocycle,
} from '@/lib/types';
import { cn } from '@/lib/utils';

// ── Block Focus → Goal Focus mapping ──────────────────────────────────────
const BLOCK_TO_GOAL: Record<BlockFocus, GoalFocus> = {
  strength: 'strength',
  hypertrophy: 'hypertrophy',
  power: 'power',
  deload: 'balanced',
  peaking: 'strength',
  base_building: 'balanced',
};

// ── Enriched program catalog ──────────────────────────────────────────────
interface ProgramInfo {
  label: string;
  color: string;
  icon: string;
  description: string;
  whoItsFor: string;
  trainingProfile: string;
  typicalDuration: string;
  defaultWeeks: number;
  defaultPeriodization: 'linear' | 'undulating' | 'block';
}

const PROGRAM_CATALOG: Record<BlockFocus, ProgramInfo> = {
  strength: {
    label: 'Strength',
    color: 'text-red-400 bg-red-500/20 border-red-500/40',
    icon: '\u{1F4AA}',
    description: 'Heavy loads (85-95% 1RM), low reps (1-5), long rest. Maximize neural adaptations and force production.',
    whoItsFor: 'Athletes with a solid base who want to move heavier weight. Best after a hypertrophy block to express newly built muscle.',
    trainingProfile: '3-6 sets \u00d7 3-5 reps at RPE 8-9.5, 3-5 min rest between sets',
    typicalDuration: '4-6 weeks',
    defaultWeeks: 5,
    defaultPeriodization: 'linear',
  },
  hypertrophy: {
    label: 'Hypertrophy',
    color: 'text-purple-400 bg-purple-500/20 border-purple-500/40',
    icon: '\u{1F4C8}',
    description: 'Moderate loads (65-80% 1RM), 6-12 reps, short rest. Maximize mechanical tension and metabolic stress for muscle growth.',
    whoItsFor: 'Anyone wanting to build muscle mass. Great as a first block or after a strength phase to build your base.',
    trainingProfile: '3-5 sets \u00d7 6-12 reps at RPE 7-9, 90-150s rest between sets',
    typicalDuration: '4-8 weeks',
    defaultWeeks: 6,
    defaultPeriodization: 'undulating',
  },
  power: {
    label: 'Power',
    color: 'text-blue-400 bg-blue-500/20 border-blue-500/40',
    icon: '\u26A1',
    description: 'Explosive movements at 50-70% 1RM, low reps, full recovery. Develop rate of force development for athletic performance.',
    whoItsFor: 'Combat athletes, those with a strength base who want to convert it to explosive speed. Best after a strength block.',
    trainingProfile: '3-5 sets \u00d7 2-5 reps at RPE 6-8, 2-3 min rest, explosive intent',
    typicalDuration: '3-5 weeks',
    defaultWeeks: 4,
    defaultPeriodization: 'undulating',
  },
  deload: {
    label: 'Deload / Recovery',
    color: 'text-teal-400 bg-teal-500/20 border-teal-500/40',
    icon: '\u{1F33F}',
    description: 'Reduced volume and intensity. Allow accumulated fatigue to dissipate for supercompensation.',
    whoItsFor: 'After 3+ hard training blocks, when fatigue is high, soreness won\'t go away, or performance is declining.',
    trainingProfile: '2-3 sets \u00d7 8-10 reps at RPE 5-7, light loads, focus on movement quality',
    typicalDuration: '1-2 weeks',
    defaultWeeks: 1,
    defaultPeriodization: 'linear',
  },
  peaking: {
    label: 'Competition Peaking',
    color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40',
    icon: '\u{1F3C6}',
    description: 'Taper volume 30-40%, maintain intensity. Sport-specific sharpening for competition day.',
    whoItsFor: 'Athletes 2-4 weeks out from competition. Requires a solid strength base already built.',
    trainingProfile: 'Reduced volume, high intensity singles/doubles, sport-specific skills prioritized',
    typicalDuration: '2-4 weeks',
    defaultWeeks: 3,
    defaultPeriodization: 'linear',
  },
  base_building: {
    label: 'Base Building',
    color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
    icon: '\u{1F3D7}\uFE0F',
    description: 'General physical preparedness (GPP). Build work capacity and aerobic base for future phases.',
    whoItsFor: 'Beginners, athletes returning from time off, or anyone starting a new training year. Builds the foundation.',
    trainingProfile: '3-4 sets \u00d7 10-15 reps at RPE 6-8, moderate rest, variety of movements',
    typicalDuration: '4-6 weeks',
    defaultWeeks: 5,
    defaultPeriodization: 'undulating',
  },
};

const BLOCK_TYPES: BlockFocus[] = ['hypertrophy', 'strength', 'power', 'base_building', 'peaking', 'deload'];

interface ProgramBrowserProps {
  onClose: () => void;
}

export default function ProgramBrowser({ onClose }: ProgramBrowserProps) {
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
    removeFromMesocycleQueue,
    mesocycleQueue,
    baselineLifts,
    muscleEmphasis,
  } = useAppStore();

  const [expandedCard, setExpandedCard] = useState<BlockFocus | null>(null);
  const [previewingBlock, setPreviewingBlock] = useState<BlockFocus | null>(null);
  const [previewMesocycle, setPreviewMesocycle] = useState<Mesocycle | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [queued, setQueued] = useState<BlockFocus | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [showScience, setShowScience] = useState(false);

  // ── AI Suggestion ──────────────────────────────────────────────────────
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
      mesocycleQueue,
    });
  }, [user, currentMesocycle, mesocycleHistory, workoutLogs, trainingSessions, injuryLog, wearableHistory, competitions, mesocycleQueue]);

  const recommendedFocus = suggestion.recommendedFocus;

  // ── Queue a block ──────────────────────────────────────────────────────
  const handleQueueBlock = useCallback((focus: BlockFocus) => {
    const program = PROGRAM_CATALOG[focus];
    addToMesocycleQueue({
      name: `${program.label} Block`,
      focus: BLOCK_TO_GOAL[focus],
      weeks: program.defaultWeeks,
      periodization: program.defaultPeriodization,
    });
    setQueued(focus);
    setTimeout(() => setQueued(null), 3000);
  }, [addToMesocycleQueue]);

  // ── Generate preview ───────────────────────────────────────────────────
  const handlePreview = useCallback((focus: BlockFocus) => {
    if (!user) return;
    if (previewingBlock === focus) {
      // Toggle off
      setPreviewingBlock(null);
      setPreviewMesocycle(null);
      return;
    }

    setPreviewingBlock(focus);
    setPreviewLoading(true);
    setPreviewMesocycle(null);

    // Generate on next tick to allow loading state to render
    requestAnimationFrame(() => {
      const program = PROGRAM_CATALOG[focus];
      const preview = generateMesocycle({
        userId: 'preview',
        goalFocus: BLOCK_TO_GOAL[focus],
        equipment: user.equipment,
        availableEquipment: user.availableEquipment,
        sessionsPerWeek: user.sessionsPerWeek,
        weeks: program.defaultWeeks,
        baselineLifts: baselineLifts || undefined,
        muscleEmphasis: muscleEmphasis || undefined,
        sessionDurationMinutes: user.sessionDurationMinutes ?? 60,
        trainingIdentity: user.trainingIdentity,
        combatSport: user.combatSport,
        experienceLevel: user.experienceLevel,
        sex: user.sex,
        periodizationType: program.defaultPeriodization,
        includeDeload: focus !== 'deload',
      });
      setPreviewMesocycle(preview);
      setPreviewLoading(false);
    });
  }, [user, previewingBlock, baselineLifts, muscleEmphasis]);

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
      className="min-h-screen bg-grappler-900 bg-mesh pb-24 safe-area-top"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-grappler-900/80 backdrop-blur-xl border-b border-grappler-800">
        <div className="px-4 py-4 flex items-center gap-3">
          <button aria-label="Go back" onClick={onClose} className="btn btn-ghost btn-sm p-1">
            <ChevronLeft className="w-5 h-5 text-grappler-200" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-primary-400" />
            </div>
            <div>
              <h1 className="font-bold text-grappler-50 text-lg leading-tight">
                Browse Programs
              </h1>
              <p className="text-xs text-grappler-400">
                Find your next training block
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-5 max-w-lg mx-auto">

        {/* ── AI Recommendation ──────────────────────────────────────── */}
        {!suggestion.isFromQueue && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-grappler-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary-400" />
              Recommended for you
            </h3>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('rounded-xl p-4 border', PROGRAM_CATALOG[recommendedFocus].color)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{PROGRAM_CATALOG[recommendedFocus].icon}</span>
                  <div>
                    <h2 className="text-lg font-bold">{PROGRAM_CATALOG[recommendedFocus].label}</h2>
                    <p className="text-xs opacity-70">{suggestion.suggestedWeeks} weeks &middot; {suggestion.confidence}% confidence</p>
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              <div className="space-y-1 mb-3">
                {suggestion.reasoning.slice(0, 2).map((reason, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <Check className="w-3 h-3 mt-0.5 opacity-60 shrink-0" />
                    <p className="text-xs opacity-80">{reason}</p>
                  </div>
                ))}
              </div>

              {/* Key Metrics */}
              {suggestion.keyMetrics.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {suggestion.keyMetrics.slice(0, 4).map((metric, idx) => (
                    <div key={idx} className="bg-black/20 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                      <span className="text-xs opacity-60">{metric.label}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium">{metric.value}</span>
                        {getTrendIcon(metric.trend)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview(recommendedFocus)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/15 text-white border border-white/10 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </button>
                <button
                  onClick={() => handleQueueBlock(recommendedFocus)}
                  disabled={queued === recommendedFocus}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
                    queued === recommendedFocus
                      ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                      : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                  )}
                >
                  {queued === recommendedFocus ? (
                    <><Check className="w-3.5 h-3.5" />Queued</>
                  ) : (
                    <><Plus className="w-3.5 h-3.5" />Queue This</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Preview for AI recommendation */}
        <AnimatePresence>
          {previewingBlock === recommendedFocus && (
            <WorkoutPreviewPanel
              mesocycle={previewMesocycle}
              loading={previewLoading}
              focus={recommendedFocus}
              onQueue={() => handleQueueBlock(recommendedFocus)}
              queued={queued === recommendedFocus}
            />
          )}
        </AnimatePresence>

        {/* Alternative if present */}
        {suggestion.alternativeFocus && suggestion.alternativeReason && !suggestion.isFromQueue && (
          <div className="flex items-start gap-2 bg-grappler-800/60 rounded-lg p-3 border border-grappler-700">
            <RefreshCw className="w-3.5 h-3.5 text-grappler-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-grappler-300">
                <span className="font-medium">{PROGRAM_CATALOG[suggestion.alternativeFocus].label}</span> is also a solid choice: {suggestion.alternativeReason}
              </p>
            </div>
          </div>
        )}

        {/* ── All Programs Catalog ───────────────────────────────────── */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-grappler-400">
            All Programs
          </h3>

          {BLOCK_TYPES.map((focus) => {
            const program = PROGRAM_CATALOG[focus];
            const isExpanded = expandedCard === focus;
            const isRecommended = focus === recommendedFocus && !suggestion.isFromQueue;

            return (
              <div key={focus}>
                <motion.div
                  layout
                  className={cn(
                    'rounded-xl border overflow-hidden transition-colors',
                    isExpanded ? program.color : 'bg-grappler-800 border-grappler-700',
                    isRecommended && !isExpanded && 'ring-1 ring-primary-500/30'
                  )}
                >
                  {/* Card header — always visible */}
                  <button
                    onClick={() => setExpandedCard(isExpanded ? null : focus)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left"
                  >
                    <span className="text-lg">{program.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={cn('text-sm font-bold', isExpanded ? '' : 'text-grappler-100')}>
                          {program.label}
                        </h4>
                        {isRecommended && (
                          <span className="px-1.5 py-0.5 bg-primary-500/20 text-primary-400 rounded text-[10px] font-bold uppercase">
                            Suggested
                          </span>
                        )}
                      </div>
                      <p className={cn('text-xs truncate', isExpanded ? 'opacity-70' : 'text-grappler-400')}>
                        {program.typicalDuration} &middot; {program.trainingProfile.split(',')[0]}
                      </p>
                    </div>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className={cn('w-4 h-4', isExpanded ? '' : 'text-grappler-500')} />
                    </motion.div>
                  </button>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3">
                          {/* Description */}
                          <p className="text-sm opacity-80 leading-relaxed">
                            {program.description}
                          </p>

                          {/* Who it's for */}
                          <div className="bg-black/15 rounded-lg p-3">
                            <p className="text-xs font-semibold opacity-60 mb-1">Who it&apos;s for</p>
                            <p className="text-xs opacity-80 leading-relaxed">{program.whoItsFor}</p>
                          </div>

                          {/* Training profile */}
                          <div className="bg-black/15 rounded-lg p-3">
                            <p className="text-xs font-semibold opacity-60 mb-1">Training profile</p>
                            <p className="text-xs opacity-80">{program.trainingProfile}</p>
                          </div>

                          {/* Defaults */}
                          <div className="flex gap-2">
                            <div className="flex-1 bg-black/15 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold">{program.defaultWeeks}</p>
                              <p className="text-[10px] opacity-50 uppercase">Weeks</p>
                            </div>
                            <div className="flex-1 bg-black/15 rounded-lg p-2 text-center">
                              <p className="text-sm font-bold capitalize">{program.defaultPeriodization}</p>
                              <p className="text-[10px] opacity-50 uppercase">Periodization</p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePreview(focus); }}
                              className="flex-1 py-2.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center gap-1.5 transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Preview Workouts
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleQueueBlock(focus); }}
                              disabled={queued === focus}
                              className={cn(
                                'flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
                                queued === focus
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                                  : 'bg-white/10 hover:bg-white/20 border border-white/20'
                              )}
                            >
                              {queued === focus ? (
                                <><Check className="w-3.5 h-3.5" />Queued</>
                              ) : (
                                <><Plus className="w-3.5 h-3.5" />Queue This</>
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Inline workout preview */}
                <AnimatePresence>
                  {previewingBlock === focus && expandedCard === focus && (
                    <WorkoutPreviewPanel
                      mesocycle={previewMesocycle}
                      loading={previewLoading}
                      focus={focus}
                      onQueue={() => handleQueueBlock(focus)}
                      queued={queued === focus}
                    />
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* ── Queued Mesocycles ──────────────────────────────────────── */}
        {mesocycleQueue.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-grappler-400 flex items-center gap-2">
              <ListChecks className="w-3.5 h-3.5 text-primary-400" />
              Queued ({mesocycleQueue.length})
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
                          {block.weeks}wk &middot; {block.focus} &middot; {block.periodization || 'undulating'}
                          {block.sessionsPerWeek ? ` \u00b7 ${block.sessionsPerWeek}x/wk` : ''}
                          {block.sessionDurationMinutes ? ` \u00b7 ${block.sessionDurationMinutes}min` : ''}
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
                        onClick={() => removeFromMesocycleQueue(block.id)}
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
                              {(['hypertrophy', 'strength', 'power', 'balanced', 'strength_endurance'] as GoalFocus[]).map(f => (
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
                                  {f.replace('_', ' ')}
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

        {/* ── Science Details ────────────────────────────────────────── */}
        <button
          onClick={() => setShowScience(!showScience)}
          className="w-full flex items-center justify-between bg-grappler-800 rounded-lg p-3 border border-grappler-700"
        >
          <span className="text-sm text-grappler-300 font-medium">How the suggestion engine works</span>
          <motion.span animate={{ rotate: showScience ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-grappler-400" />
          </motion.span>
        </button>

        <AnimatePresence>
          {showScience && (
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
                  <li>1. <strong className="text-grappler-300">Strength trends</strong> &mdash; estimated 1RM progression per exercise (Zourdos et al. 2016)</li>
                  <li>2. <strong className="text-grappler-300">Plateau detection</strong> &mdash; exercises with stalled progress over 2+ weeks</li>
                  <li>3. <strong className="text-grappler-300">Fatigue accumulation</strong> &mdash; RPE trends, soreness, performance perception</li>
                  <li>4. <strong className="text-grappler-300">Recovery data</strong> &mdash; wearable metrics, HRV trends, sleep quality</li>
                  <li>5. <strong className="text-grappler-300">Injury status</strong> &mdash; active injuries and their severity</li>
                  <li>6. <strong className="text-grappler-300">Competition proximity</strong> &mdash; automatic peaking when comp approaches</li>
                  <li>7. <strong className="text-grappler-300">Block periodization</strong> &mdash; alternates phases to prevent accommodation (Stone et al. 2007)</li>
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

// ── Workout Preview Panel ─────────────────────────────────────────────────

function WorkoutPreviewPanel({
  mesocycle,
  loading,
  focus,
  onQueue,
  queued,
}: {
  mesocycle: Mesocycle | null;
  loading: boolean;
  focus: BlockFocus;
  onQueue: () => void;
  queued: boolean;
}) {
  const program = PROGRAM_CATALOG[focus];
  const week1 = mesocycle?.weeks[0];

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="bg-grappler-800/80 rounded-xl border border-grappler-700 p-4 space-y-3 mt-2">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary-400" />
          <h4 className="text-sm font-bold text-grappler-100">Week 1 Preview</h4>
          {loading && <Loader2 className="w-3.5 h-3.5 text-grappler-400 animate-spin" />}
        </div>

        {loading && !week1 && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-grappler-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {week1 && week1.sessions.map((session, sIdx) => (
          <div key={session.id} className="bg-grappler-900/60 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-grappler-700 flex items-center justify-center text-[10px] text-grappler-400 font-bold">
                  {sIdx + 1}
                </span>
                <h5 className="text-sm font-semibold text-grappler-100">{session.name}</h5>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 bg-grappler-700 text-grappler-400 rounded capitalize">
                {session.type}
              </span>
            </div>
            <div className="space-y-1">
              {session.exercises.slice(0, 5).map((ex, eIdx) => (
                <div key={eIdx} className="flex items-center justify-between text-xs">
                  <span className="text-grappler-300 truncate flex-1">{ex.exercise.name}</span>
                  <span className="text-grappler-500 ml-2 flex-shrink-0">
                    {ex.sets}&times;{ex.prescription.targetReps}
                  </span>
                </div>
              ))}
              {session.exercises.length > 5 && (
                <p className="text-[10px] text-grappler-500">+{session.exercises.length - 5} more exercises</p>
              )}
            </div>
          </div>
        ))}

        {week1 && (
          <button
            onClick={onQueue}
            disabled={queued}
            className={cn(
              'w-full py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
              queued
                ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                : 'bg-primary-500 hover:bg-primary-600 text-white'
            )}
          >
            {queued ? (
              <><Check className="w-3.5 h-3.5" />Added to Queue</>
            ) : (
              <><Plus className="w-3.5 h-3.5" />Queue {program.label} Block</>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
