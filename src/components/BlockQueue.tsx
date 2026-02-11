'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  Plus,
  X,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layers,
  Target,
  Zap,
  Dumbbell,
  Flame,
  Shield,
  Calendar,
  Download,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GoalFocus, PlannedMesocycle } from '@/lib/types';

const FOCUS_OPTIONS: { value: GoalFocus; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  { value: 'strength', label: 'Strength', icon: <Dumbbell className="w-4 h-4" />, color: 'text-red-400 bg-red-500/20', desc: 'Heavy loads, low reps' },
  { value: 'hypertrophy', label: 'Hypertrophy', icon: <Flame className="w-4 h-4" />, color: 'text-orange-400 bg-orange-500/20', desc: 'Moderate loads, higher volume' },
  { value: 'power', label: 'Power', icon: <Zap className="w-4 h-4" />, color: 'text-yellow-400 bg-yellow-500/20', desc: 'Explosive, speed-strength' },
  { value: 'balanced', label: 'Balanced', icon: <Shield className="w-4 h-4" />, color: 'text-blue-400 bg-blue-500/20', desc: 'Mix of strength & hypertrophy' },
];

const PERIODIZATION_OPTIONS: { value: 'linear' | 'undulating' | 'block'; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'undulating', label: 'Undulating (DUP)' },
  { value: 'block', label: 'Block' },
];

function getFocusMeta(focus: GoalFocus) {
  return FOCUS_OPTIONS.find(f => f.value === focus) || FOCUS_OPTIONS[0];
}

export default function BlockQueue() {
  const { mesocycleQueue, addToMesocycleQueue, removeFromMesocycleQueue, reorderMesocycleQueue, currentMesocycle } = useAppStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formFocus, setFormFocus] = useState<GoalFocus>('strength');
  const [formWeeks, setFormWeeks] = useState(5);
  const [formPeriodization, setFormPeriodization] = useState<'linear' | 'undulating' | 'block'>('undulating');
  const [formNotes, setFormNotes] = useState('');

  const handleAdd = () => {
    const meta = getFocusMeta(formFocus);
    addToMesocycleQueue({
      name: `${meta.label} Block`,
      focus: formFocus,
      weeks: formWeeks,
      periodization: formPeriodization,
      notes: formNotes.trim() || undefined,
    });
    setShowAddForm(false);
    setFormNotes('');
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
    a.download = `mesocycle-queue-${new Date().toISOString().split('T')[0]}.json`;
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
    // Reset so the same file can be imported again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Estimate timeline — first queued mesocycle starts after current one ends,
  // each subsequent one starts after the previous queued one ends
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
            onClick={() => setShowAddForm(!showAddForm)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              showAddForm ? 'bg-grappler-700 text-grappler-200' : 'text-grappler-500 hover:text-primary-400 hover:bg-grappler-800'
            )}
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
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

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-grappler-800/60 rounded-xl p-3 space-y-3 border border-grappler-700/50">
              {/* Focus selector */}
              <div>
                <label className="text-xs text-grappler-500 uppercase tracking-wide font-medium mb-1.5 block">Focus</label>
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
                  <label className="text-xs text-grappler-500 uppercase tracking-wide font-medium mb-1 block">Weeks</label>
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
                  <label className="text-xs text-grappler-500 uppercase tracking-wide font-medium mb-1 block">Style</label>
                  <select
                    value={formPeriodization}
                    onChange={e => setFormPeriodization(e.target.value as typeof formPeriodization)}
                    className="w-full bg-grappler-800 border border-grappler-600 rounded-lg px-2 py-1.5 text-xs text-grappler-200 outline-none focus:border-primary-500"
                  >
                    {PERIODIZATION_OPTIONS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-grappler-500 uppercase tracking-wide font-medium mb-1 block">Notes (optional)</label>
                <input
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="e.g. Focus on squat, prep for comp..."
                  className="w-full bg-grappler-900 border border-grappler-600 rounded-lg px-2 py-1.5 text-xs text-grappler-100 placeholder:text-grappler-600 focus:border-primary-500 outline-none"
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
      </AnimatePresence>

      {/* Queue list */}
      {mesocycleQueue.length === 0 && !showAddForm ? (
        <div className="text-center py-4">
          <Calendar className="w-8 h-8 text-grappler-700 mx-auto mb-2" />
          <p className="text-xs text-grappler-500">No mesocycles queued yet</p>
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
                  <span className="text-xs font-black text-grappler-500 w-5 text-center">{i + 1}</span>
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
                    <span className="text-xs text-grappler-500 shrink-0">{block.weeks}wk</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {block.periodization && (
                      <span className="text-xs text-grappler-500 capitalize">{block.periodization}</span>
                    )}
                    <span className="text-xs text-grappler-600">{getEstimatedStart(i)} — {getEstimatedEnd(i)}</span>
                  </div>
                  {block.notes && (
                    <p className="text-xs text-grappler-500 mt-0.5 truncate">{block.notes}</p>
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
