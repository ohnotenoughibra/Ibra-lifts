'use client';

import { useEffect, useState } from 'react';
import { Trophy, ChevronRight, Crown } from 'lucide-react';
import { fetchCrews, getCrewsActive, type Crew } from '@/lib/crews-client';
import type { OverlayView } from './dashboard-types';

// Compact Home-tab nudge: "Your crew — you're #2 this week". Only renders for
// users who are in a crew (gated on crews_active so it costs nothing for
// everyone else). Picks the crew where the user is ranked highest.
export default function CrewNudge({ onNavigate }: { onNavigate: (v: OverlayView) => void }) {
  const [crew, setCrew] = useState<Crew | null>(null);

  useEffect(() => {
    if (!getCrewsActive()) return;
    let alive = true;
    fetchCrews()
      .then(crews => {
        if (!alive) return;
        const mine = crews.filter(c => c.members.some(m => m.isYou));
        mine.sort((a, b) => (myRank(a) - myRank(b)));
        setCrew(mine[0] ?? null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!crew) return null;
  const me = crew.members.find(m => m.isYou);
  if (!me) return null;

  const leading = me.rank === 1 && crew.memberCount > 1;

  return (
    <button
      onClick={() => onNavigate('crews')}
      className="card p-3 w-full flex items-center gap-3 text-left hover:bg-grappler-800/70 transition-colors"
    >
      <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
        {leading ? <Crown className="w-4 h-4 text-yellow-400" /> : <Trophy className="w-4 h-4 text-yellow-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-grappler-500">{crew.name}</p>
        <p className="text-sm font-semibold text-grappler-200 truncate">
          {crew.memberCount <= 1
            ? 'Invite your training partners'
            : leading
              ? `You're leading your crew this week 👑`
              : `You're #${me.rank} of ${crew.memberCount} this week`}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-grappler-500 flex-shrink-0" />
    </button>
  );
}

function myRank(c: Crew): number {
  return c.members.find(m => m.isYou)?.rank ?? 99;
}
