'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Dumbbell, Target, Brain, ChevronDown,
  Trophy, Flame, Clock, Filter, Calendar,
  Navigation, Crosshair, Footprints, Bike,
} from 'lucide-react';
import EmptyState from './EmptyState';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { cn, formatNumber } from '@/lib/utils';
import type { WorkoutLog, TrainingSession, MentalCheckIn } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────

type EntryType = 'strength' | 'training' | 'mental';
type FilterType = 'all' | 'strength' | 'training' | 'mental';
type TimeFilter = '7d' | '30d' | '90d' | 'all';

interface TimelineEntry {
  type: EntryType;
  id: string;
  date: Date;
  data: WorkoutLog | TrainingSession | MentalCheckIn;
}

// ─── Activity icons/colors by category ────────────────────────────────────

const TRAINING_ICONS: Record<string, React.ElementType> = {
  grappling: Navigation,
  striking: Crosshair,
  cardio: Flame,
  outdoor: Footprints,
  sport: Target,
  cycling: Bike,
};

function getTrainingColor(category: string): string {
  if (category === 'grappling') return 'text-blue-400 bg-blue-500/15';
  if (category === 'striking') return 'text-red-400 bg-red-500/15';
  if (category === 'cardio') return 'text-orange-400 bg-orange-500/15';
  return 'text-teal-400 bg-teal-500/15';
}

function mentalScore(c: { energy: number; focus: number; confidence: number; composure: number }) {
  return Math.round(((c.energy + c.focus + c.confidence + c.composure) / 20) * 100);
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function TrainingJournal({ onClose }: { onClose: () => void }) {
  const { workoutLogs, trainingSessions, mentalCheckIns } = useAppStore(useShallow(s => ({
    workoutLogs: s.workoutLogs,
    trainingSessions: s.trainingSessions,
    mentalCheckIns: s.mentalCheckIns,
  })));
  const weightUnit = useAppStore(s => s.user?.weightUnit || 'lbs');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Merge all entries into a unified timeline
  const timeline = useMemo(() => {
    const entries: TimelineEntry[] = [
      ...workoutLogs.map(log => ({
        type: 'strength' as const,
        id: `w-${log.id}`,
        date: new Date(log.date),
        data: log,
      })),
      ...trainingSessions.map(s => ({
        type: 'training' as const,
        id: `t-${s.id}`,
        date: new Date(s.date),
        data: s,
      })),
      ...mentalCheckIns.map(c => ({
        type: 'mental' as const,
        id: `m-${c.id}`,
        date: new Date(c.timestamp),
        data: c,
      })),
    ];

    // Time filter
    const now = Date.now();
    const cutoffs: Record<TimeFilter, number> = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      'all': Infinity,
    };
    const cutoff = cutoffs[timeFilter];
    let filtered = cutoff === Infinity ? entries : entries.filter(e => now - e.date.getTime() < cutoff);

    // Type filter
    if (typeFilter !== 'all') filtered = filtered.filter(e => e.type === typeFilter);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(e => {
        if (e.type === 'strength') {
          const log = e.data as WorkoutLog;
          return log.exercises?.some(ex => ex.exerciseName.toLowerCase().includes(q))
            || log.notes?.toLowerCase().includes(q);
        }
        if (e.type === 'training') {
          const s = e.data as TrainingSession;
          return s.type?.toLowerCase().includes(q) || s.techniques?.toLowerCase().includes(q)
            || s.notes?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q);
        }
        if (e.type === 'mental') {
          const c = e.data as MentalCheckIn;
          return c.word?.toLowerCase().includes(q) || c.triggers?.toLowerCase().includes(q)
            || c.flow?.toLowerCase().includes(q);
        }
        return false;
      });
    }

    // Sort newest first
    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [workoutLogs, trainingSessions, mentalCheckIns, typeFilter, timeFilter, search]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, TimelineEntry[]>();
    for (const entry of timeline) {
      const key = entry.date.toISOString().split('T')[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return Array.from(map.entries());
  }, [timeline]);

  // Stats summary
  const stats = useMemo(() => {
    const strengths = timeline.filter(e => e.type === 'strength').length;
    const trainings = timeline.filter(e => e.type === 'training').length;
    const mentals = timeline.filter(e => e.type === 'mental').length;
    return { strengths, trainings, mentals, total: timeline.length };
  }, [timeline]);

  const formatDayLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-grappler-950 z-50 overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-grappler-950 border-b border-grappler-800/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-400" />
            <h1 className="text-lg font-display font-bold text-grappler-100">Training Journal</h1>
          </div>
          <button onClick={onClose} className="p-2 text-grappler-400 hover:text-grappler-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search + filter bar */}
        <div className="px-4 pb-3 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-grappler-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search exercises, techniques, notes..."
                className="w-full bg-grappler-900 border border-grappler-700 rounded-lg pl-9 pr-3 py-2 text-sm text-grappler-200 placeholder:text-grappler-600 focus:outline-none focus:border-primary-500/50"
              />
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={cn('px-3 rounded-lg border transition-colors', showFilters ? 'bg-primary-500/15 border-primary-500/30 text-primary-400' : 'bg-grappler-900 border-grappler-700 text-grappler-400')}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="flex gap-1.5 pb-1">
                  {(['all', 'strength', 'training', 'mental'] as FilterType[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setTypeFilter(f)}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        typeFilter === f ? 'bg-primary-500/20 text-primary-300 ring-1 ring-primary-500/30' : 'bg-grappler-800 text-grappler-400'
                      )}
                    >
                      {f === 'all' ? 'All' : f === 'strength' ? 'Lifting' : f === 'training' ? 'Combat/Cardio' : 'Mental'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {(['7d', '30d', '90d', 'all'] as TimeFilter[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setTimeFilter(t)}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        timeFilter === t ? 'bg-primary-500/20 text-primary-300 ring-1 ring-primary-500/30' : 'bg-grappler-800 text-grappler-400'
                      )}
                    >
                      {t === 'all' ? 'All Time' : t}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-4 py-2.5 flex items-center gap-4 text-xs text-grappler-500 border-b border-grappler-800/30">
        <span>{stats.total} entries</span>
        {stats.strengths > 0 && <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{stats.strengths}</span>}
        {stats.trainings > 0 && <span className="flex items-center gap-1"><Target className="w-3 h-3" />{stats.trainings}</span>}
        {stats.mentals > 0 && <span className="flex items-center gap-1"><Brain className="w-3 h-3" />{stats.mentals}</span>}
      </div>

      {/* Timeline */}
      <div className="px-4 pb-24">
        {grouped.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No entries found"
            description={search ? 'Try a different search term.' : 'Start training to build your journal.'}
          />
        ) : (
          grouped.map(([dateStr, entries]) => (
            <div key={dateStr} className="mt-4">
              {/* Day header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-grappler-600" />
                <span className="text-xs font-bold text-grappler-400 uppercase tracking-wider">{formatDayLabel(dateStr)}</span>
                <div className="flex-1 h-px bg-grappler-800/50" />
                <span className="text-xs text-grappler-600">{entries.length} entr{entries.length === 1 ? 'y' : 'ies'}</span>
              </div>

              <div className="space-y-1.5 ml-3 border-l border-grappler-800/40 pl-3">
                {entries.map(entry => {
                  const isExpanded = expandedId === entry.id;

                  // ─── Strength workout card ──────────────────────────
                  if (entry.type === 'strength') {
                    const log = entry.data as WorkoutLog;
                    const hasPR = log.exercises?.some(e => e.personalRecord);
                    return (
                      <div key={entry.id} className="rounded-xl bg-grappler-900/60 border border-grappler-800/30 overflow-hidden">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                          className="w-full flex items-center gap-3 p-3 text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center flex-shrink-0">
                            <Dumbbell className="w-4 h-4 text-primary-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-grappler-200 truncate">
                                {log.exercises?.length || 0} exercises
                              </span>
                              {hasPR && <Trophy className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-grappler-500">
                              <span>{formatNumber(Math.round(log.totalVolume))} {weightUnit}</span>
                              <span>·</span>
                              <span>{log.duration}m</span>
                              <span>·</span>
                              <span className={log.overallRPE >= 9 ? 'text-red-400' : log.overallRPE >= 7 ? 'text-yellow-400' : 'text-green-400'}>
                                RPE {log.overallRPE}
                              </span>
                            </div>
                          </div>
                          <ChevronDown className={cn('w-4 h-4 text-grappler-600 transition-transform', isExpanded && 'rotate-180')} />
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="border-t border-grappler-800/30 p-3 space-y-2">
                                {log.exercises?.map((ex, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-grappler-300">{ex.exerciseName}</span>
                                      {ex.personalRecord && <span className="text-yellow-400 text-xs font-bold">PR</span>}
                                    </div>
                                    <span className="text-grappler-500">
                                      {ex.sets.filter(s => s.completed).length} sets · {ex.sets.filter(s => s.completed).map(s => `${s.weight}×${s.reps}`).join(', ')}
                                    </span>
                                  </div>
                                ))}
                                {log.notes && (
                                  <p className="text-xs text-grappler-500 italic pt-1 border-t border-grappler-800/30">{log.notes}</p>
                                )}
                                {log.postFeedback && (
                                  <div className="flex gap-2 text-xs text-grappler-500 pt-1">
                                    <span>Mood: {log.postFeedback.mood}/5</span>
                                    <span>Energy: {log.postFeedback.energy}/10</span>
                                    <span>{log.postFeedback.overallPerformance?.replace(/_/g, ' ')}</span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  // ─── Training session card ──────────────────────────
                  if (entry.type === 'training') {
                    const s = entry.data as TrainingSession;
                    const Icon = TRAINING_ICONS[s.category] || Target;
                    const colorClasses = getTrainingColor(s.category);
                    return (
                      <div key={entry.id} className="rounded-xl bg-grappler-900/60 border border-grappler-800/30 overflow-hidden">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                          className="w-full flex items-center gap-3 p-3 text-left"
                        >
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', colorClasses.split(' ')[1])}>
                            <Icon className={cn('w-4 h-4', colorClasses.split(' ')[0])} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-grappler-200 capitalize">
                              {s.type?.replace(/_/g, ' ') || s.category}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-grappler-500">
                              <span>{s.duration}m</span>
                              {s.rounds && <><span>·</span><span>{s.rounds} rds</span></>}
                              <span>·</span>
                              <span>RPE {s.perceivedExertion}</span>
                              <span>·</span>
                              <span className="capitalize">{(s.actualIntensity || s.plannedIntensity)?.replace(/_/g, ' ')}</span>
                            </div>
                          </div>
                          <ChevronDown className={cn('w-4 h-4 text-grappler-600 transition-transform', isExpanded && 'rotate-180')} />
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="border-t border-grappler-800/30 p-3 space-y-2">
                                {s.techniques && (
                                  <div>
                                    <span className="text-xs uppercase tracking-wider text-grappler-500 font-semibold">Techniques</span>
                                    <p className="text-xs text-grappler-300 mt-0.5">{s.techniques}</p>
                                  </div>
                                )}
                                {(s.submissions !== undefined || s.taps !== undefined) && (
                                  <div className="flex gap-3 text-xs">
                                    {s.submissions !== undefined && <span className="text-emerald-400">{s.submissions} subs landed</span>}
                                    {s.taps !== undefined && <span className="text-red-400">Tapped {s.taps}x</span>}
                                  </div>
                                )}
                                {s.notes && <p className="text-xs text-grappler-500 italic">{s.notes}</p>}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  // ─── Mental check-in card ──────────────────────────
                  if (entry.type === 'mental') {
                    const c = entry.data as MentalCheckIn;
                    const score = mentalScore(c);
                    return (
                      <div key={entry.id} className="rounded-xl bg-grappler-900/60 border border-grappler-800/30 overflow-hidden">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                          className="w-full flex items-center gap-3 p-3 text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                            <Brain className="w-4 h-4 text-violet-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-grappler-200">
                                Mental Check-in
                              </span>
                              <span className={cn('text-xs font-bold', score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400')}>
                                {score}%
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-grappler-500">
                              <span className="capitalize">{c.context?.replace(/_/g, ' ')}</span>
                              {c.word && <><span>·</span><span>&quot;{c.word}&quot;</span></>}
                              {c.selfTalk && <><span>·</span><span>{c.selfTalk} self-talk</span></>}
                            </div>
                          </div>
                          <ChevronDown className={cn('w-4 h-4 text-grappler-600 transition-transform', isExpanded && 'rotate-180')} />
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="border-t border-grappler-800/30 p-3 space-y-2">
                                <div className="grid grid-cols-4 gap-2 text-center">
                                  {(['energy', 'focus', 'confidence', 'composure'] as const).map(dim => (
                                    <div key={dim}>
                                      <span className="text-xs text-grappler-500 capitalize">{dim}</span>
                                      <p className={cn('text-sm font-bold', c[dim] >= 4 ? 'text-emerald-400' : c[dim] >= 3 ? 'text-yellow-400' : 'text-red-400')}>
                                        {c[dim]}/5
                                      </p>
                                    </div>
                                  ))}
                                </div>
                                {c.triggers && (
                                  <div>
                                    <span className="text-xs uppercase tracking-wider text-grappler-500 font-semibold">Triggers</span>
                                    <p className="text-xs text-grappler-300 mt-0.5">{c.triggers}</p>
                                  </div>
                                )}
                                {c.flow && (
                                  <div>
                                    <span className="text-xs uppercase tracking-wider text-grappler-500 font-semibold">Flow Moments</span>
                                    <p className="text-xs text-grappler-300 mt-0.5">{c.flow}</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
