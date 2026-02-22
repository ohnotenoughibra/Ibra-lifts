'use client';
import { useAppStore } from '@/lib/store';
import { defaultWellnessStats, getWellnessTitle, calculateWellnessMultiplier, getMultiplierLabel, getBadgesByCategory } from '@/lib/gamification';
import { WellnessDomain } from '@/lib/types';

const DOMAIN_CONFIG: Record<WellnessDomain, { icon: string; label: string; color: string }> = {
  supplements: { icon: '💊', label: 'Supps', color: 'text-purple-400' },
  nutrition: { icon: '🍱', label: 'Nutrition', color: 'text-green-400' },
  water: { icon: '💧', label: 'Water', color: 'text-blue-400' },
  sleep: { icon: '😴', label: 'Sleep', color: 'text-indigo-400' },
  mobility: { icon: '🤸', label: 'Mobility', color: 'text-amber-400' },
  mental: { icon: '🧠', label: 'Mental', color: 'text-pink-400' },
  breathing: { icon: '🌬️', label: 'Breath', color: 'text-cyan-400' },
};

export default function WellnessXPDashboard() {
  const { gamificationStats } = useAppStore();
  const ws = gamificationStats.wellnessStats || defaultWellnessStats;
  const wellnessTitle = getWellnessTitle(ws.streaks.overall);

  // Get last 7 days of wellness data
  const last7Days = getLast7DaysData(ws.wellnessDays);

  // Wellness badges
  const wellnessBadges = getBadgesByCategory('wellness');
  const earnedBadgeIds = new Set(gamificationStats.badges.map(b => b.badgeId));
  const earnedWellnessBadges = wellnessBadges.filter(b => earnedBadgeIds.has(b.id));
  const nextBadge = wellnessBadges.find(b => !earnedBadgeIds.has(b.id));

  // Current streak data
  const streakEntries = [
    { key: 'overall' as const, icon: '🔥', label: 'Wellness', value: ws.streaks.overall },
    { key: 'supplements' as const, icon: '💊', label: 'Supps', value: ws.streaks.supplements },
    { key: 'nutrition' as const, icon: '🍱', label: 'Nutrition', value: ws.streaks.nutrition },
    { key: 'water' as const, icon: '💧', label: 'Water', value: ws.streaks.water },
    { key: 'sleep' as const, icon: '😴', label: 'Sleep', value: ws.streaks.sleep },
    { key: 'mobility' as const, icon: '🤸', label: 'Mobility', value: ws.streaks.mobility },
    { key: 'mental' as const, icon: '🧠', label: 'Mental', value: ws.streaks.mental },
  ];

  return (
    <div className="space-y-4">
      {/* Wellness Overview Card */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Wellness Level</h3>
            <p className="text-xs text-zinc-500">{wellnessTitle}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-amber-400">{ws.totalWellnessXP.toLocaleString()}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Wellness XP</div>
          </div>
        </div>

        {/* 7-Day Heatmap */}
        <div className="mt-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Last 7 Days</div>
          <div className="flex gap-1.5">
            {last7Days.map((day, i) => {
              const intensity = day.domains.length;
              return (
                <div key={i} className="flex-1 text-center">
                  <div
                    className={`
                      h-8 rounded-md flex items-center justify-center text-xs font-bold
                      ${intensity >= 6
                        ? 'bg-amber-600/40 text-amber-300 border border-amber-700/50'
                        : intensity >= 4
                          ? 'bg-blue-600/30 text-blue-300 border border-blue-700/50'
                          : intensity >= 2
                            ? 'bg-zinc-700/50 text-zinc-400 border border-zinc-700/50'
                            : intensity >= 1
                              ? 'bg-zinc-800/50 text-zinc-500 border border-zinc-800'
                              : 'bg-zinc-900 text-zinc-700 border border-zinc-800/50'
                      }
                    `}
                  >
                    {intensity > 0 ? intensity : '-'}
                  </div>
                  <div className="text-[8px] text-zinc-600 mt-1">
                    {day.dayLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Streak Grid */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <h3 className="text-sm font-semibold text-zinc-100 mb-3">Wellness Streaks</h3>
        <div className="grid grid-cols-4 gap-2">
          {streakEntries.map(({ key, icon, label, value }) => (
            <div
              key={key}
              className={`
                text-center py-2 rounded-lg border
                ${value > 0
                  ? key === 'overall'
                    ? 'bg-amber-900/20 border-amber-800/40'
                    : 'bg-zinc-800/50 border-zinc-700/50'
                  : 'bg-zinc-900/50 border-zinc-800/30'
                }
              `}
            >
              <div className="text-sm">{icon}</div>
              <div className={`text-sm font-bold ${value > 0 ? 'text-zinc-200' : 'text-zinc-600'}`}>
                {value}
              </div>
              <div className="text-[8px] text-zinc-500">{label}</div>
            </div>
          ))}
        </div>
        {ws.streaks.longestOverall > 0 && (
          <div className="mt-2 text-[10px] text-zinc-600 text-center">
            Personal best: {ws.streaks.longestOverall} day wellness streak
          </div>
        )}
      </div>

      {/* Wellness Badges */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-100">Wellness Badges</h3>
          <span className="text-[10px] text-zinc-500">{earnedWellnessBadges.length}/{wellnessBadges.length}</span>
        </div>

        {/* Badge grid */}
        <div className="grid grid-cols-7 gap-2">
          {wellnessBadges.map((badge) => {
            const isEarned = earnedBadgeIds.has(badge.id);
            return (
              <div
                key={badge.id}
                className={`
                  text-center py-1.5 rounded-lg
                  ${isEarned
                    ? 'bg-zinc-800/80'
                    : 'bg-zinc-900/50 opacity-30'
                  }
                `}
                title={`${badge.name}: ${badge.description}`}
              >
                <div className="text-lg">{badge.icon}</div>
              </div>
            );
          })}
        </div>

        {/* Next badge to earn */}
        {nextBadge && (
          <div className="mt-3 flex items-center gap-2 bg-zinc-800/30 rounded-lg p-2">
            <span className="text-lg opacity-50">{nextBadge.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-zinc-400 font-medium truncate">{nextBadge.name}</div>
              <div className="text-[9px] text-zinc-600 truncate">{nextBadge.description}</div>
            </div>
            <div className="text-[10px] text-amber-500 font-bold">+{nextBadge.points}</div>
          </div>
        )}
      </div>

      {/* How Multiplier Works */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <h3 className="text-sm font-semibold text-zinc-100 mb-2">Training XP Multiplier</h3>
        <p className="text-[10px] text-zinc-500 mb-3">
          Complete wellness domains to multiply ALL training XP earned today
        </p>
        <div className="space-y-1.5">
          {[
            { domains: 1, mult: '1.05x', label: 'Started', color: 'text-zinc-500' },
            { domains: 2, mult: '1.15x', label: 'Warming Up', color: 'text-zinc-400' },
            { domains: 3, mult: '1.3x', label: 'Building', color: 'text-blue-400' },
            { domains: 4, mult: '1.5x', label: 'Dialed In', color: 'text-blue-300' },
            { domains: 5, mult: '1.75x', label: 'Locked In', color: 'text-cyan-400' },
            { domains: 6, mult: '2.0x', label: 'BEAST MODE', color: 'text-amber-400' },
          ].map(({ domains, mult, label, color }) => (
            <div key={domains} className="flex items-center gap-2">
              <div className="w-12 text-right">
                <span className={`text-xs font-bold ${color}`}>{mult}</span>
              </div>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    domains <= (gamificationStats.wellnessStats?.todayCompleted[new Date().toISOString().split('T')[0]]?.length || 0)
                      ? 'bg-gradient-to-r from-blue-500 to-amber-500'
                      : 'bg-zinc-700/30'
                  }`}
                  style={{ width: `${(domains / 6) * 100}%` }}
                />
              </div>
              <span className="text-[9px] text-zinc-600 w-12">{domains} domain{domains !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper: get last 7 days data
function getLast7DaysData(wellnessDays: { date: string; domains: WellnessDomain[] }[]) {
  const days: { date: string; dayLabel: string; domains: WellnessDomain[] }[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const existing = wellnessDays.find(wd => wd.date === dateStr);
    days.push({
      date: dateStr,
      dayLabel: i === 0 ? 'Today' : dayNames[d.getDay()],
      domains: existing?.domains || [],
    });
  }

  return days;
}
