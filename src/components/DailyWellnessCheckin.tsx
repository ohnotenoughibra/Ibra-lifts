'use client';
import { useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { WellnessDomain } from '@/lib/types';
import { calculateWellnessMultiplier, getMultiplierLabel, pointRewards } from '@/lib/gamification';

interface WellnessDomainItem {
  domain: WellnessDomain;
  icon: string;
  label: string;
  description: string;
  quickAction: string;
}

const WELLNESS_DOMAINS: WellnessDomainItem[] = [
  {
    domain: 'supplements',
    icon: '💊',
    label: 'Supplements',
    description: 'Log your supplement stack',
    quickAction: 'Taken',
  },
  {
    domain: 'nutrition',
    icon: '🍱',
    label: 'Nutrition',
    description: 'Log meals & macros',
    quickAction: 'Logged',
  },
  {
    domain: 'water',
    icon: '💧',
    label: 'Water',
    description: 'Hit 2L+ water target',
    quickAction: '2L+',
  },
  {
    domain: 'sleep',
    icon: '😴',
    label: 'Sleep',
    description: 'Log sleep quality',
    quickAction: 'Logged',
  },
  {
    domain: 'mobility',
    icon: '🤸',
    label: 'Mobility',
    description: 'Stretching or mobility work',
    quickAction: 'Done',
  },
  {
    domain: 'mental',
    icon: '🧠',
    label: 'Mental',
    description: 'Check-in with yourself',
    quickAction: 'Checked in',
  },
];

interface XPPopup {
  domain: WellnessDomain;
  points: number;
  breakdown: { reason: string; points: number }[];
}

export default function DailyWellnessCheckin() {
  const { gamificationStats, awardWellnessXP, getTodayWellnessDomains } = useAppStore();
  const [xpPopup, setXPPopup] = useState<XPPopup | null>(null);
  const [animatingDomain, setAnimatingDomain] = useState<WellnessDomain | null>(null);

  const ws = gamificationStats.wellnessStats;
  const todayDomains = getTodayWellnessDomains();
  const currentMultiplier = calculateWellnessMultiplier(todayDomains);
  const multiplierLabel = getMultiplierLabel(currentMultiplier);

  // Calculate what multiplier would be with next domain
  const nextDomainMultiplier = calculateWellnessMultiplier([
    ...todayDomains,
    WELLNESS_DOMAINS.find(d => !todayDomains.includes(d.domain))?.domain || 'water',
  ]);

  const handleDomainTap = useCallback((domain: WellnessDomain) => {
    if (todayDomains.includes(domain)) return; // Already done

    setAnimatingDomain(domain);
    const result = awardWellnessXP(domain, {
      supplementCount: domain === 'supplements' ? 3 : undefined, // Quick check-in assumes you took your stack
      stackSize: domain === 'supplements' ? 3 : undefined,
      mealsLogged: domain === 'nutrition' ? 3 : undefined,
    });

    if (result.points > 0) {
      setXPPopup({ domain, points: result.points, breakdown: result.breakdown });
      setTimeout(() => setXPPopup(null), 2500);
    }

    setTimeout(() => setAnimatingDomain(null), 600);
  }, [todayDomains, awardWellnessXP]);

  const completedCount = todayDomains.length;
  const totalDomains = WELLNESS_DOMAINS.length;
  const progressPercent = (completedCount / totalDomains) * 100;

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
      {/* Header with multiplier */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Daily Wellness</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {completedCount}/{totalDomains} domains
            {completedCount < totalDomains && (
              <span className="text-amber-500"> &middot; {totalDomains - completedCount} left for {nextDomainMultiplier.toFixed(1)}x</span>
            )}
          </p>
        </div>

        {/* Multiplier badge */}
        <div className={`
          px-3 py-1.5 rounded-lg text-center min-w-[72px]
          ${currentMultiplier >= 2.0
            ? 'bg-gradient-to-r from-amber-600 to-orange-600 animate-pulse'
            : currentMultiplier >= 1.5
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600'
              : currentMultiplier > 1.0
                ? 'bg-zinc-800 border border-zinc-700'
                : 'bg-zinc-800/50 border border-zinc-800'
          }
        `}>
          <div className={`text-lg font-black leading-none ${
            currentMultiplier >= 2.0 ? 'text-white' : currentMultiplier >= 1.5 ? 'text-white' : 'text-zinc-400'
          }`}>
            {currentMultiplier.toFixed(1)}x
          </div>
          <div className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
            currentMultiplier >= 2.0 ? 'text-amber-200' : currentMultiplier >= 1.5 ? 'text-blue-200' : 'text-zinc-600'
          }`}>
            {multiplierLabel}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            progressPercent >= 100
              ? 'bg-gradient-to-r from-amber-500 to-orange-500'
              : progressPercent >= 66
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                : progressPercent >= 33
                  ? 'bg-blue-600'
                  : 'bg-zinc-600'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Domain grid */}
      <div className="grid grid-cols-3 gap-2">
        {WELLNESS_DOMAINS.map(({ domain, icon, label, quickAction }) => {
          const isDone = todayDomains.includes(domain);
          const isAnimating = animatingDomain === domain;

          return (
            <button
              key={domain}
              onClick={() => handleDomainTap(domain)}
              disabled={isDone}
              className={`
                relative flex flex-col items-center py-3 px-2 rounded-lg
                transition-all duration-200
                ${isDone
                  ? 'bg-emerald-900/30 border border-emerald-800/50'
                  : 'bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600 active:scale-95'
                }
                ${isAnimating ? 'scale-110' : ''}
              `}
            >
              <span className={`text-xl mb-1 ${isAnimating ? 'animate-bounce' : ''}`}>
                {isDone ? '✅' : icon}
              </span>
              <span className={`text-xs font-medium ${isDone ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {isDone ? quickAction : label}
              </span>

              {/* XP indicator */}
              {!isDone && (
                <span className="absolute -top-1 -right-1 bg-zinc-700 text-zinc-400 text-[8px] font-bold px-1 rounded">
                  +XP
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Wellness streaks preview */}
      {ws && ws.streaks.overall > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <span className="text-amber-500 text-sm">🔥</span>
          <span className="text-xs text-zinc-500">
            {ws.streaks.overall} day wellness streak
            {ws.streaks.longestOverall > ws.streaks.overall && (
              <span className="text-zinc-600"> (best: {ws.streaks.longestOverall})</span>
            )}
          </span>
        </div>
      )}

      {/* XP popup */}
      {xpPopup && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-emerald-900/90 border border-emerald-700 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-sm">
            <div className="text-center">
              <span className="text-emerald-400 font-black text-lg">+{xpPopup.points} XP</span>
              {xpPopup.breakdown.map((b, i) => (
                <div key={i} className="text-emerald-300/70 text-xs">{b.reason}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Beast Mode celebration */}
      {currentMultiplier >= 2.0 && completedCount === totalDomains && (
        <div className="text-center py-2 bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-lg border border-amber-800/30">
          <div className="text-amber-400 font-black text-sm">⚡ BEAST MODE ACTIVE ⚡</div>
          <div className="text-amber-500/70 text-xs mt-0.5">All training XP doubled today</div>
        </div>
      )}
    </div>
  );
}
