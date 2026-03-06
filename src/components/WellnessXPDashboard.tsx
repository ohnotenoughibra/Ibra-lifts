'use client';
import { useAppStore } from '@/lib/store';
import { defaultWellnessStats, getWellnessTitle, getBadgesByCategory } from '@/lib/gamification';
import { WellnessDomain } from '@/lib/types';

export default function WellnessXPDashboard() {
  const { gamificationStats } = useAppStore();
  const ws = gamificationStats.wellnessStats || defaultWellnessStats;

  // Get last 7 days of wellness data
  const last7Days = getLast7DaysData(ws.wellnessDays);

  // Wellness badges
  const wellnessBadges = getBadgesByCategory('wellness');
  const earnedBadgeIds = new Set(gamificationStats.badges.map(b => b.badgeId));
  const earnedWellnessBadges = wellnessBadges.filter(b => earnedBadgeIds.has(b.id));

  // Current streak data
  const streakEntries = [
    { key: 'overall' as const, label: 'Overall', value: ws.streaks.overall },
    { key: 'supplements' as const, label: 'Supps', value: ws.streaks.supplements },
    { key: 'nutrition' as const, label: 'Nutrition', value: ws.streaks.nutrition },
    { key: 'water' as const, label: 'Water', value: ws.streaks.water },
    { key: 'sleep' as const, label: 'Sleep', value: ws.streaks.sleep },
    { key: 'mobility' as const, label: 'Mobility', value: ws.streaks.mobility },
    { key: 'mental' as const, label: 'Mental', value: ws.streaks.mental },
  ];

  const today = new Date().toISOString().split('T')[0];
  const todayDomains = ws.todayCompleted[today] || [];
  const multiplier = todayDomains.length >= 6 ? 2.0
    : todayDomains.length >= 5 ? 1.75
    : todayDomains.length >= 4 ? 1.5
    : todayDomains.length >= 3 ? 1.3
    : todayDomains.length >= 2 ? 1.15
    : todayDomains.length >= 1 ? 1.05
    : 1.0;

  return (
    <div className="space-y-4">
      {/* Today's status */}
      <div className="bg-grappler-900 rounded-xl border border-grappler-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-grappler-100">Today</h3>
            <p className="text-xs text-grappler-500">
              {todayDomains.length > 0
                ? `${todayDomains.length} habit${todayDomains.length !== 1 ? 's' : ''} tracked`
                : 'Log supplements, meals, water, etc. to earn XP'}
            </p>
          </div>
          {multiplier > 1.0 && (
            <div className="text-right">
              <div className="text-sm font-bold text-grappler-200">{multiplier.toFixed(2)}x</div>
              <div className="text-[9px] text-grappler-500">training XP</div>
            </div>
          )}
        </div>

        {/* What's been logged today */}
        {todayDomains.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {todayDomains.map(d => (
              <span key={d} className="text-xs bg-grappler-800 text-grappler-400 px-2 py-0.5 rounded-full capitalize">
                {d}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 7-Day Adherence */}
      <div className="bg-grappler-900 rounded-xl border border-grappler-800 p-4">
        <div className="text-xs text-grappler-500 uppercase tracking-wider mb-2">Last 7 Days</div>
        <div className="flex gap-1.5">
          {last7Days.map((day, i) => {
            const intensity = day.domains.length;
            return (
              <div key={i} className="flex-1 text-center">
                <div
                  className={`
                    h-8 rounded-md flex items-center justify-center text-xs font-medium
                    ${intensity >= 4
                      ? 'bg-grappler-700/60 text-grappler-200 border border-grappler-600/40'
                      : intensity >= 2
                        ? 'bg-grappler-800/60 text-grappler-400 border border-grappler-700/40'
                        : intensity >= 1
                          ? 'bg-grappler-800/30 text-grappler-500 border border-grappler-800/40'
                          : 'bg-grappler-900/50 text-grappler-700 border border-grappler-800/30'
                    }
                  `}
                >
                  {intensity > 0 ? intensity : '-'}
                </div>
                <div className="text-[8px] text-grappler-600 mt-1">
                  {day.dayLabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Consistency Streaks */}
      <div className="bg-grappler-900 rounded-xl border border-grappler-800 p-4">
        <h3 className="text-sm font-semibold text-grappler-100 mb-3">Consistency</h3>
        <div className="grid grid-cols-4 gap-2">
          {streakEntries.map(({ key, label, value }) => (
            <div
              key={key}
              className={`
                text-center py-2 rounded-lg border
                ${value > 0
                  ? 'bg-grappler-800/50 border-grappler-700/50'
                  : 'bg-grappler-900/50 border-grappler-800/30'
                }
              `}
            >
              <div className={`text-sm font-bold ${value > 0 ? 'text-grappler-200' : 'text-grappler-700'}`}>
                {value}
              </div>
              <div className="text-[8px] text-grappler-500">{label}</div>
            </div>
          ))}
        </div>
        {ws.streaks.longestOverall > 0 && (
          <div className="mt-2 text-xs text-grappler-600 text-center">
            Best: {ws.streaks.longestOverall} days
          </div>
        )}
      </div>

      {/* Badges */}
      {earnedWellnessBadges.length > 0 && (
        <div className="bg-grappler-900 rounded-xl border border-grappler-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-grappler-100">Milestones</h3>
            <span className="text-xs text-grappler-500">{earnedWellnessBadges.length}/{wellnessBadges.length}</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {wellnessBadges.map((badge) => {
              const isEarned = earnedBadgeIds.has(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`text-center py-1.5 rounded-lg ${isEarned ? 'bg-grappler-800/80' : 'opacity-20'}`}
                  title={`${badge.name}: ${badge.description}`}
                >
                  <div className="text-lg">{badge.icon}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Multiplier reference */}
      <div className="bg-grappler-900 rounded-xl border border-grappler-800 p-4">
        <h3 className="text-sm font-semibold text-grappler-100 mb-1">Training XP Multiplier</h3>
        <p className="text-xs text-grappler-500 mb-3">
          Log wellness habits throughout the day. Your training XP scales with how many you hit.
        </p>
        <div className="space-y-1">
          {[
            { n: 1, mult: '1.05x' },
            { n: 2, mult: '1.15x' },
            { n: 3, mult: '1.3x' },
            { n: 4, mult: '1.5x' },
            { n: 5, mult: '1.75x' },
            { n: 6, mult: '2.0x' },
          ].map(({ n, mult }) => (
            <div key={n} className="flex items-center gap-2">
              <span className={`text-xs w-10 text-right font-medium ${
                n <= todayDomains.length ? 'text-grappler-200' : 'text-grappler-600'
              }`}>{mult}</span>
              <div className="flex-1 h-1 bg-grappler-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    n <= todayDomains.length ? 'bg-grappler-500' : 'bg-grappler-800/30'
                  }`}
                  style={{ width: `${(n / 6) * 100}%` }}
                />
              </div>
              <span className="text-[9px] text-grappler-600 w-16">{n} habit{n !== 1 ? 's' : ''}</span>
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
