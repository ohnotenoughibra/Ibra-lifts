'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Trophy, Plus, LogIn, Share2, Trash2, LogOut, Flame, Loader2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import {
  fetchCrews, createCrew, joinCrew, leaveCrew, deleteCrew, pushCrewMetrics, computeCrewMetrics, setCrewsActive,
  type Crew,
} from '@/lib/crews-client';
import { hapticLight, hapticMedium } from '@/lib/haptics';

function metricsFromStore() {
  const s = useAppStore.getState();
  return computeCrewMetrics({
    user: s.user,
    workoutLogs: s.workoutLogs,
    trainingSessions: s.trainingSessions,
    gamificationStats: s.gamificationStats,
  });
}

export default function CrewsLeaderboard({ onClose }: { onClose?: () => void }) {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCrewId, setActiveCrewId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | 'create' | 'join'>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      // Push our own fresh metrics first so our row is current, then read the board.
      await pushCrewMetrics(metricsFromStore());
      const data = await fetchCrews();
      setCrews(data);
      setCrewsActive(data.length > 0);
      setActiveCrewId(prev => prev && data.some(c => c.id === prev) ? prev : (data[0]?.id ?? null));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeCrew = crews.find(c => c.id === activeCrewId) ?? null;

  async function handleCreate() {
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    try {
      hapticMedium();
      await createCrew(n, metricsFromStore().displayName);
      setName(''); setSheet(null);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  }

  async function handleJoin() {
    const c = code.trim();
    if (c.length < 6 || busy) return;
    setBusy(true);
    try {
      hapticMedium();
      await joinCrew(c, metricsFromStore().displayName);
      setCode(''); setSheet(null);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  }

  async function handleLeave(crew: Crew) {
    if (!confirm(`Leave ${crew.name}?`)) return;
    setBusy(true);
    try { await leaveCrew(crew.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  }

  async function handleDelete(crew: Crew) {
    if (!confirm(`Delete ${crew.name} for everyone? This can't be undone.`)) return;
    setBusy(true);
    try { await deleteCrew(crew.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  }

  function shareCode(crew: Crew) {
    hapticLight();
    const text = `Join my crew "${crew.name}" on Ibra Lifts — code ${crew.joinCode}`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else { navigator.clipboard?.writeText(crew.joinCode).catch(() => {}); }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-grappler-950 flex flex-col overflow-y-auto overlay-safe"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-grappler-950/90 backdrop-blur-sm border-b border-grappler-800">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-400" />
          <span className="text-base font-bold text-grappler-100">Crews</span>
        </div>
        <button onClick={onClose} className="p-2 text-grappler-400 hover:text-grappler-200" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-5 max-w-md w-full mx-auto flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-grappler-500">
            <Loader2 className="w-7 h-7 animate-spin text-primary-400" />
            <p className="text-sm">Loading your crews...</p>
          </div>
        ) : crews.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center text-center py-12 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/15 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-grappler-100">Train with your gym</h2>
              <p className="text-sm text-grappler-400 mt-1 max-w-xs">
                Start a crew with your training partners and see who shows up the most each week.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
              <button onClick={() => { hapticLight(); setSheet('create'); }}
                className="w-full py-3 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Create a crew
              </button>
              <button onClick={() => { hapticLight(); setSheet('join'); }}
                className="w-full py-3 rounded-xl bg-grappler-800 text-grappler-200 text-sm font-medium hover:bg-grappler-700 transition-colors flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" /> Join with a code
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Crew tabs */}
            {crews.length > 1 && (
              <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
                {crews.map(c => (
                  <button key={c.id} onClick={() => setActiveCrewId(c.id)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                      c.id === activeCrewId ? 'bg-primary-500 text-white' : 'bg-grappler-800 text-grappler-400')}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {activeCrew && (
              <>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-bold text-grappler-100">{activeCrew.name}</h2>
                  <span className="text-xs text-grappler-500">{activeCrew.memberCount} member{activeCrew.memberCount === 1 ? '' : 's'}</span>
                </div>
                <p className="text-xs text-grappler-500 mb-3">Sessions completed this week · resets Monday</p>

                {/* Last week's winner */}
                {activeCrew.lastWinner && (
                  <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/25">
                    <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <p className="text-xs text-grappler-200">
                      <span className="font-bold text-yellow-300">{activeCrew.lastWinner.name}</span> won last week
                      <span className="text-grappler-500"> · {activeCrew.lastWinner.sessions} sessions</span>
                    </p>
                  </div>
                )}

                {/* Standings */}
                <div className="space-y-1.5">
                  {activeCrew.members.map(m => (
                    <div key={`${activeCrew.id}-${m.rank}`}
                      className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl border',
                        m.isYou ? 'bg-primary-500/10 border-primary-500/30' : 'bg-grappler-900/60 border-grappler-800',
                        m.stale && 'opacity-50')}>
                      <span className={cn('w-6 text-center text-sm font-black tabular-nums',
                        m.rank === 1 ? 'text-yellow-400' : m.rank === 2 ? 'text-grappler-300' : m.rank === 3 ? 'text-amber-600' : 'text-grappler-500')}>
                        {m.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-grappler-100 truncate flex items-center gap-1.5">
                          {m.rank === 1 && <Crown className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
                          {m.displayName}{m.isYou && <span className="text-[10px] text-primary-400">(you)</span>}
                        </p>
                        {m.currentStreak > 0 && (
                          <p className="text-[11px] text-grappler-500 flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-400" /> {m.currentStreak}d streak
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-grappler-100 tabular-nums leading-none">{m.sessionsThisWeek}</p>
                        <p className="text-[10px] text-grappler-600">sessions</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer actions */}
                <div className="mt-5 flex flex-wrap gap-2">
                  <button onClick={() => shareCode(activeCrew)}
                    className="flex-1 py-2.5 rounded-xl bg-grappler-800 text-grappler-200 text-xs font-medium hover:bg-grappler-700 transition-colors flex items-center justify-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5" /> Invite (code {activeCrew.joinCode})
                  </button>
                  {activeCrew.isOwner ? (
                    <button onClick={() => handleDelete(activeCrew)} disabled={busy}
                      className="px-3 py-2.5 rounded-xl bg-grappler-800 text-red-400 text-xs font-medium hover:bg-grappler-700 transition-colors flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  ) : (
                    <button onClick={() => handleLeave(activeCrew)} disabled={busy}
                      className="px-3 py-2.5 rounded-xl bg-grappler-800 text-grappler-300 text-xs font-medium hover:bg-grappler-700 transition-colors flex items-center gap-1.5">
                      <LogOut className="w-3.5 h-3.5" /> Leave
                    </button>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <button onClick={() => setSheet('create')} className="flex-1 py-2 rounded-lg text-xs text-grappler-400 hover:text-grappler-200">+ New crew</button>
                  <button onClick={() => setSheet('join')} className="flex-1 py-2 rounded-lg text-xs text-grappler-400 hover:text-grappler-200">Join another</button>
                </div>
              </>
            )}
          </>
        )}

        {error && <p className="text-xs text-red-400 mt-4 text-center">{error}</p>}
      </div>

      {/* Create / Join sheet */}
      <AnimatePresence>
        {sheet && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setSheet(null)}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full sm:max-w-sm bg-grappler-900 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 overlay-safe">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-grappler-100">{sheet === 'create' ? 'Create a crew' : 'Join a crew'}</h3>
                <button onClick={() => setSheet(null)} className="p-1 text-grappler-500"><X className="w-5 h-5" /></button>
              </div>
              {sheet === 'create' ? (
                <>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Crew name (e.g. 10th Planet AM)" maxLength={40}
                    className="w-full bg-grappler-800 rounded-xl px-3 py-2.5 text-sm text-grappler-100 placeholder-grappler-600 outline-none focus:ring-1 focus:ring-primary-500/50" />
                  <button onClick={handleCreate} disabled={busy || !name.trim()}
                    className="w-full py-3 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
                  </button>
                </>
              ) : (
                <>
                  <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="6-character code" maxLength={6}
                    className="w-full bg-grappler-800 rounded-xl px-3 py-2.5 text-sm text-grappler-100 placeholder-grappler-600 outline-none focus:ring-1 focus:ring-primary-500/50 tracking-widest font-mono uppercase" />
                  <button onClick={handleJoin} disabled={busy || code.trim().length < 6}
                    className="w-full py-3 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} Join
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
