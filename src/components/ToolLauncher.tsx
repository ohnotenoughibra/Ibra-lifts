'use client';

/**
 * ToolLauncher — universal bottom-sheet launcher for every tool in the app.
 *
 * The user complaint: "tools are hidden i can't access them quickly."
 * The fix: make every tool reachable in 2 taps from anywhere via the 4th nav slot.
 *
 * Sheet structure:
 *   1. Search (filters all tools)
 *   2. Recents (last 4 launched)
 *   3. Pinned (user favorites, max 4)
 *   4. All tools, grouped by their tab affinity (TRAIN / BODY)
 *
 * Quick Log lives inline at the top as a primary action (was the previous job
 * of the 4th nav slot).
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Pin, Plus, Zap, Droplets, Moon, Scale } from 'lucide-react';
import { ALL_TOOLS, TOOL_MAP, readPins, type Tool } from './ExploreTab';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { hapticMedium } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { OverlayView } from './dashboard-types';

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: OverlayView, context?: string) => void;
}

const RECENT_KEY = 'roots-tool-launcher-recents';
const MAX_RECENTS = 6;

interface RecentEntry { id: string; ts: number }

function readRecents(): RecentEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as RecentEntry[];
    return raw.filter(r => TOOL_MAP.has(r.id)).sort((a, b) => b.ts - a.ts).slice(0, MAX_RECENTS);
  } catch { return []; }
}

export function trackToolLaunch(id: string) {
  if (typeof window === 'undefined') return;
  if (!TOOL_MAP.has(id)) return;
  const existing = readRecents().filter(r => r.id !== id);
  const updated = [{ id, ts: Date.now() }, ...existing].slice(0, MAX_RECENTS);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch {}
}

export default function ToolLauncher({ open, onClose, onNavigate }: Props) {
  const [search, setSearch] = useState('');
  const [recents, setRecents] = useState<Tool[]>([]);
  const [pinned, setPinned] = useState<Tool[]>([]);

  const { addQuickLog } = useAppStore(useShallow(s => ({ addQuickLog: s.addQuickLog })));

  // Refresh on open
  useEffect(() => {
    if (!open) return;
    setRecents(readRecents().map(r => TOOL_MAP.get(r.id)).filter(Boolean) as Tool[]);
    setPinned(readPins().map(id => TOOL_MAP.get(id)).filter(Boolean) as Tool[]);
    setSearch('');
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase().trim();
    const words = q.split(/\s+/);
    return ALL_TOOLS
      .filter(t => {
        const haystack = `${t.label} ${t.desc} ${t.longDesc} ${t.keywords}`.toLowerCase();
        return words.every(w => haystack.includes(w));
      })
      .slice(0, 20);
  }, [search]);

  const trainTools = useMemo(() => ALL_TOOLS.filter(t => t.tab === 'train'), []);
  const bodyTools = useMemo(() => ALL_TOOLS.filter(t => t.tab === 'body'), []);

  const launch = (tool: Tool) => {
    hapticMedium();
    trackToolLaunch(tool.id);
    onNavigate(tool.id);
    onClose();
  };

  // Quick log shortcuts that fire inline without opening a tool
  const quickLog = (kind: 'water' | 'weight' | 'sleep' | 'energy') => {
    hapticMedium();
    if (kind === 'water') {
      addQuickLog({ type: 'water', value: 250, unit: 'ml', timestamp: new Date() });
    } else {
      // For weight/sleep/energy, fall through to the full Quick Actions overlay
      onNavigate('quick_actions', kind);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-2xl bg-grappler-950 border-t border-grappler-800 rounded-t-2xl max-h-[85vh] flex flex-col safe-area-bottom"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-grappler-700" />
            </div>

            {/* Sticky header: title + search + close */}
            <div className="px-4 pt-2 pb-3 border-b border-grappler-800">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-grappler-500">
                  Tools
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="p-2 -mr-1 hover:bg-grappler-800 rounded-lg active:scale-95 transition"
                >
                  <X className="w-5 h-5 text-grappler-300" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-500" />
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search all tools…"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-grappler-900 border border-grappler-800 text-sm text-white placeholder-grappler-500 focus:border-primary-500 outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {/* Search results — hide other sections when searching */}
              {filtered ? (
                <div>
                  <SectionHeader>Results ({filtered.length})</SectionHeader>
                  {filtered.length === 0 ? (
                    <p className="text-sm text-grappler-400 text-center py-8">
                      Nothing matches &ldquo;{search}&rdquo;.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {filtered.map(t => <Tile key={t.id} tool={t} onLaunch={launch} />)}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Quick log primary actions */}
                  <div>
                    <SectionHeader>Quick Log</SectionHeader>
                    <div className="grid grid-cols-4 gap-2">
                      <QuickAction icon={Droplets} label="+ Water" onTap={() => quickLog('water')} accent="text-sky-400" />
                      <QuickAction icon={Scale} label="Weight" onTap={() => quickLog('weight')} accent="text-amber-400" />
                      <QuickAction icon={Moon} label="Sleep" onTap={() => quickLog('sleep')} accent="text-violet-400" />
                      <QuickAction icon={Zap} label="Energy" onTap={() => quickLog('energy')} accent="text-rose-400" />
                    </div>
                  </div>

                  {/* Recents */}
                  {recents.length > 0 && (
                    <div>
                      <SectionHeader>Recent</SectionHeader>
                      <div className="grid grid-cols-3 gap-2">
                        {recents.slice(0, 6).map(t => <Tile key={t.id} tool={t} onLaunch={launch} />)}
                      </div>
                    </div>
                  )}

                  {/* Pinned */}
                  {pinned.length > 0 && (
                    <div>
                      <SectionHeader icon={Pin}>Pinned</SectionHeader>
                      <div className="grid grid-cols-3 gap-2">
                        {pinned.map(t => <Tile key={t.id} tool={t} onLaunch={launch} />)}
                      </div>
                    </div>
                  )}

                  {/* All — grouped */}
                  <div>
                    <SectionHeader>Train</SectionHeader>
                    <div className="grid grid-cols-3 gap-2">
                      {trainTools.map(t => <Tile key={t.id} tool={t} onLaunch={launch} />)}
                    </div>
                  </div>

                  <div>
                    <SectionHeader>Body</SectionHeader>
                    <div className="grid grid-cols-3 gap-2">
                      {bodyTools.map(t => <Tile key={t.id} tool={t} onLaunch={launch} />)}
                    </div>
                  </div>

                  <p className="text-[11px] text-grappler-500 text-center">
                    Pin from Train or Body tab to put tools here.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────

function SectionHeader({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-grappler-400" />}
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-grappler-400">{children}</span>
    </div>
  );
}

function Tile({ tool, onLaunch }: { tool: Tool; onLaunch: (t: Tool) => void }) {
  const Icon = tool.icon;
  return (
    <button
      onClick={() => onLaunch(tool)}
      className={cn(
        'flex flex-col items-start gap-1.5 p-2.5 rounded-lg border border-grappler-800 bg-grappler-900/40 hover:border-grappler-700 active:scale-95 transition text-left min-h-[68px]',
      )}
    >
      <Icon className="w-4 h-4 text-grappler-300 flex-shrink-0" />
      <span className="text-[11px] font-semibold text-white leading-tight line-clamp-2">{tool.label}</span>
    </button>
  );
}

function QuickAction({ icon: Icon, label, onTap, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; onTap: () => void; accent: string }) {
  return (
    <button
      onClick={onTap}
      className="flex flex-col items-center gap-1 p-3 rounded-lg border border-grappler-800 bg-grappler-900/60 hover:border-grappler-700 active:scale-95 transition"
    >
      <Icon className={cn('w-5 h-5', accent)} />
      <span className="text-[10px] font-medium text-grappler-200 uppercase tracking-wider">{label}</span>
    </button>
  );
}
