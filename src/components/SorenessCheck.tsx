'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SORENESS_AREAS,
  getMobilityRecommendations,
  getGeneralMobilityRoutine,
  estimateDuration,
  type SorenessArea,
  type SorenessSeverity,
  type MobilityDrill,
  type MobilityRecommendation,
} from '@/lib/mobility-data';

interface SorenessCheckProps {
  context: 'rest_day' | 'post_workout';
  isCombatAthlete?: boolean;
  onDismiss: () => void;
  onLog: (areas: { area: SorenessArea; severity: SorenessSeverity }[]) => void;
}

const SEVERITY_CONFIG: { id: SorenessSeverity; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { id: 'mild',     label: 'A little tight',  color: 'text-yellow-400',  bgColor: 'bg-yellow-500/15', borderColor: 'border-yellow-500/30' },
  { id: 'moderate', label: 'Pretty sore',     color: 'text-orange-400',  bgColor: 'bg-orange-500/15', borderColor: 'border-orange-500/30' },
  { id: 'severe',   label: 'Very painful',    color: 'text-red-400',     bgColor: 'bg-red-500/15',    borderColor: 'border-red-500/30' },
];

type Phase = 'ask' | 'select' | 'results';

export default function SorenessCheck({ context, isCombatAthlete = true, onDismiss, onLog }: SorenessCheckProps) {
  const [phase, setPhase] = useState<Phase>('ask');
  const [selectedAreas, setSelectedAreas] = useState<Map<SorenessArea, SorenessSeverity>>(new Map());
  const [expandedDrill, setExpandedDrill] = useState<string | null>(null);
  const [completedDrills, setCompletedDrills] = useState<Set<string>>(new Set());
  const [expandedRec, setExpandedRec] = useState<string | null>(null);

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

  const handleSubmit = useCallback(() => {
    const entries = Array.from(selectedAreas.entries()).map(([area, severity]) => ({ area, severity }));
    onLog(entries);
    setPhase('results');
  }, [selectedAreas, onLog]);

  const handleNothingSore = useCallback(() => {
    onLog([]);
    onDismiss();
  }, [onLog, onDismiss]);

  const recommendations = useMemo<MobilityRecommendation[]>(() => {
    if (selectedAreas.size === 0) return [];
    const entries = Array.from(selectedAreas.entries()).map(([area, severity]) => ({ area, severity }));
    return getMobilityRecommendations(entries, isCombatAthlete);
  }, [selectedAreas, isCombatAthlete]);

  const generalRoutine = useMemo(() => getGeneralMobilityRoutine(), []);

  const toggleDrillComplete = useCallback((name: string) => {
    setCompletedDrills(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const allDrills = useMemo(() => {
    return recommendations.flatMap(r => r.drills);
  }, [recommendations]);

  const totalDuration = useMemo(() => {
    return allDrills.length > 0 ? estimateDuration(allDrills) : estimateDuration(generalRoutine);
  }, [allDrills, generalRoutine]);

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
            <p className="text-[10px] text-grappler-500 uppercase tracking-wide">
              {context === 'rest_day' ? 'Recovery Day' : 'Post-Workout'}
            </p>
          </div>
        </div>
        <p className="text-xs text-grappler-300 mb-3">
          {context === 'rest_day'
            ? 'Anything feeling sore or tight today? I\'ll suggest targeted mobility work.'
            : 'How\'s your body feeling? Let me suggest some recovery drills.'}
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

  // ─── Phase: Select Areas ───
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
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <p className="text-sm font-bold text-grappler-100">Tap what&apos;s sore</p>
          </div>
          <button onClick={onDismiss} className="p-1 text-grappler-500 hover:text-grappler-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body region groups */}
        {[
          { label: 'Upper Body', areas: upperAreas },
          { label: 'Core & Spine', areas: coreAreas },
          { label: 'Lower Body', areas: lowerAreas },
        ].map(group => (
          <div key={group.label} className="mb-3">
            <p className="text-[10px] text-grappler-500 uppercase tracking-wider mb-1.5">{group.label}</p>
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

        {/* Severity pickers for selected areas */}
        <AnimatePresence>
          {selectedAreas.size > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-grappler-700/50 pt-3 mt-1 space-y-2">
                <p className="text-[10px] text-grappler-500 uppercase tracking-wider">How bad?</p>
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
                              'flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all',
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
                onClick={handleSubmit}
                className="w-full mt-3 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-semibold active:scale-[0.97] transition-all"
              >
                Show me recovery drills
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ─── Phase: Results ───
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-grappler-800 to-grappler-900 p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <p className="text-sm font-bold text-grappler-100">Your Recovery Plan</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-grappler-500">
            <Clock className="w-3 h-3" />{totalDuration}min
          </span>
          <button onClick={onDismiss} className="p-1 text-grappler-500 hover:text-grappler-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress */}
      {allDrills.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1 bg-grappler-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${allDrills.length > 0 ? (completedDrills.size / allDrills.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[10px] text-grappler-500">{completedDrills.size}/{allDrills.length}</span>
        </div>
      )}

      {/* Recommendations by area */}
      <div className="space-y-3">
        {recommendations.map(rec => {
          const areaInfo = SORENESS_AREAS.find(a => a.id === rec.area);
          const severityCfg = SEVERITY_CONFIG.find(s => s.id === rec.severity);
          const isExpanded = expandedRec === rec.area;

          return (
            <div key={rec.area}>
              <button
                onClick={() => setExpandedRec(isExpanded ? null : rec.area)}
                className="w-full flex items-center gap-2 mb-1"
              >
                <span className={cn('text-xs font-semibold', severityCfg?.color || 'text-grappler-300')}>
                  {areaInfo?.label}
                </span>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', severityCfg?.bgColor, severityCfg?.color)}>
                  {severityCfg?.label}
                </span>
                <span className="flex-1" />
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-grappler-500" /> : <ChevronDown className="w-3.5 h-3.5 text-grappler-500" />}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    {/* Severity-specific coaching tip */}
                    <p className="text-[11px] text-grappler-400 mb-2 italic">{rec.tip}</p>

                    {/* Drills */}
                    <div className="space-y-1.5">
                      {rec.drills.map(drill => (
                        <DrillCard
                          key={drill.name}
                          drill={drill}
                          isCompleted={completedDrills.has(drill.name)}
                          isExpanded={expandedDrill === drill.name}
                          onToggleComplete={() => toggleDrillComplete(drill.name)}
                          onToggleExpand={() => setExpandedDrill(expandedDrill === drill.name ? null : drill.name)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Completion message */}
      {allDrills.length > 0 && completedDrills.size === allDrills.length && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-center"
        >
          <p className="text-xs font-semibold text-green-400">All drills complete! Great recovery work.</p>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Drill Card Sub-Component ───

function DrillCard({
  drill,
  isCompleted,
  isExpanded,
  onToggleComplete,
  onToggleExpand,
}: {
  drill: MobilityDrill;
  isCompleted: boolean;
  isExpanded: boolean;
  onToggleComplete: () => void;
  onToggleExpand: () => void;
}) {
  return (
    <div className={cn(
      'rounded-lg border transition-colors',
      isCompleted
        ? 'bg-green-500/5 border-green-500/20'
        : 'bg-grappler-800/40 border-grappler-700/30'
    )}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={onToggleComplete}
          className={cn(
            'w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors',
            isCompleted
              ? 'bg-green-500 text-white'
              : 'bg-grappler-700/50 border border-grappler-600/50'
          )}
        >
          {isCompleted && <Check className="w-3 h-3" />}
        </button>
        <button onClick={onToggleExpand} className="flex-1 text-left min-w-0">
          <p className={cn('text-xs font-medium', isCompleted ? 'text-grappler-500 line-through' : 'text-grappler-200')}>
            {drill.name}
          </p>
          <p className="text-[10px] text-grappler-500">
            {drill.sets}×{drill.duration}s per side
          </p>
        </button>
        <button onClick={onToggleExpand} className="flex-shrink-0 p-1 text-grappler-500">
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2.5 space-y-1.5 border-t border-grappler-700/20 pt-2">
              <p className="text-[11px] text-grappler-300 leading-relaxed">{drill.description}</p>
              {drill.breathingCue && (
                <p className="text-[10px] text-blue-400/80 italic">Breathing: {drill.breathingCue}</p>
              )}
              <p className="text-[10px] text-violet-400/80">Why: {drill.combatBenefit}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
