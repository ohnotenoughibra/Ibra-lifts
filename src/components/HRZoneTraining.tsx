'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Heart,
  Activity,
  Flame,
  Timer,
  Plus,
  Save,
  TrendingUp,
  Zap,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { useAppStore } from '@/lib/store';
import { HRSession, HRZone, HRZoneConfig } from '@/lib/types';

interface HRZoneTrainingProps {
  onClose: () => void;
}

const ZONE_COLORS: Record<HRZone, string> = {
  zone1: '#94a3b8',
  zone2: '#34d399',
  zone3: '#fbbf24',
  zone4: '#f97316',
  zone5: '#ef4444',
};

const ZONE_NAMES: Record<HRZone, string> = {
  zone1: 'Recovery',
  zone2: 'Fat Burn / Base',
  zone3: 'Aerobic',
  zone4: 'Threshold',
  zone5: 'Max Effort',
};

const ZONE_DESCRIPTIONS: Record<HRZone, string> = {
  zone1: 'Walking, light warm-up',
  zone2: 'Easy cardio, active recovery',
  zone3: 'Moderate cardio, grappling flow',
  zone4: 'Hard sparring, HIIT',
  zone5: 'Competition rounds, all-out sprints',
};

const ZONE_PERCENTAGES: Record<HRZone, { min: number; max: number }> = {
  zone1: { min: 0.50, max: 0.60 },
  zone2: { min: 0.60, max: 0.70 },
  zone3: { min: 0.70, max: 0.80 },
  zone4: { min: 0.80, max: 0.90 },
  zone5: { min: 0.90, max: 1.00 },
};

const SESSION_TYPES: { value: HRSession['type']; label: string }[] = [
  { value: 'grappling_cardio', label: 'Grappling Cardio' },
  { value: 'steady_state', label: 'Steady State' },
  { value: 'intervals', label: 'Intervals' },
  { value: 'recovery', label: 'Recovery' },
];

type TabKey = 'zones' | 'log' | 'history';

function calculateKarvonenBPM(
  restingHR: number,
  maxHR: number,
  intensity: number
): number {
  return Math.round(((maxHR - restingHR) * intensity) + restingHR);
}

export default function HRZoneTraining({ onClose }: HRZoneTrainingProps) {
  const { user, hrSessions, addHRSession } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabKey>('zones');

  // --- Zones Tab state ---
  const defaultMaxHR = user?.age ? 220 - user.age : 186;
  const [maxHR, setMaxHR] = useState<number>(defaultMaxHR);
  const [restingHR, setRestingHR] = useState<number>(60);

  // --- Log Session Tab state ---
  const [sessionType, setSessionType] = useState<HRSession['type']>('grappling_cardio');
  const [duration, setDuration] = useState<string>('');
  const [avgHR, setAvgHR] = useState<string>('');
  const [sessionMaxHR, setSessionMaxHR] = useState<string>('');
  const [zoneMinutes, setZoneMinutes] = useState<Record<HRZone, string>>({
    zone1: '',
    zone2: '',
    zone3: '',
    zone4: '',
    zone5: '',
  });
  const [calories, setCalories] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // --- Computed zone config ---
  const zoneConfig: HRZoneConfig = useMemo(() => {
    const zones = {} as HRZoneConfig['zones'];
    (Object.keys(ZONE_PERCENTAGES) as HRZone[]).forEach((zone) => {
      const { min, max } = ZONE_PERCENTAGES[zone];
      zones[zone] = {
        min: calculateKarvonenBPM(restingHR, maxHR, min),
        max: calculateKarvonenBPM(restingHR, maxHR, max),
        name: ZONE_NAMES[zone],
      };
    });
    return { maxHR, restingHR, zones };
  }, [maxHR, restingHR]);

  // --- Zone bar chart data ---
  const zoneBarData = useMemo(() => {
    return (Object.keys(ZONE_PERCENTAGES) as HRZone[]).map((zone) => ({
      zone: zone.replace('zone', 'Z'),
      name: ZONE_NAMES[zone],
      bpmMin: zoneConfig.zones[zone].min,
      bpmMax: zoneConfig.zones[zone].max,
      range: zoneConfig.zones[zone].max - zoneConfig.zones[zone].min,
      color: ZONE_COLORS[zone],
      fullZone: zone as HRZone,
    }));
  }, [zoneConfig]);

  // --- Sorted sessions ---
  const sortedSessions = useMemo(() => {
    return [...hrSessions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [hrSessions]);

  // --- History summary stats ---
  const summaryStats = useMemo(() => {
    if (hrSessions.length === 0) return null;

    const totalSessions = hrSessions.length;
    const avgDuration =
      Math.round(
        hrSessions.reduce((sum, s) => sum + s.duration, 0) / totalSessions
      );

    // Find most common zone (zone with most total time across all sessions)
    const zoneTotals: Record<HRZone, number> = {
      zone1: 0,
      zone2: 0,
      zone3: 0,
      zone4: 0,
      zone5: 0,
    };
    hrSessions.forEach((s) => {
      (Object.keys(s.timeInZones) as HRZone[]).forEach((z) => {
        zoneTotals[z] += s.timeInZones[z];
      });
    });
    const mostCommonZone = (Object.keys(zoneTotals) as HRZone[]).reduce(
      (best, z) => (zoneTotals[z] > zoneTotals[best] ? z : best),
      'zone1' as HRZone
    );

    return { totalSessions, avgDuration, mostCommonZone };
  }, [hrSessions]);

  // --- Save session handler ---
  const handleSaveSession = () => {
    const dur = parseInt(duration, 10);
    const avg = parseInt(avgHR, 10);
    const sMax = parseInt(sessionMaxHR, 10);

    if (isNaN(dur) || dur <= 0 || isNaN(avg) || avg <= 0 || isNaN(sMax) || sMax <= 0) return;

    const timeInZones: Record<HRZone, number> = {
      zone1: (parseFloat(zoneMinutes.zone1) || 0) * 60,
      zone2: (parseFloat(zoneMinutes.zone2) || 0) * 60,
      zone3: (parseFloat(zoneMinutes.zone3) || 0) * 60,
      zone4: (parseFloat(zoneMinutes.zone4) || 0) * 60,
      zone5: (parseFloat(zoneMinutes.zone5) || 0) * 60,
    };

    addHRSession({
      date: new Date(),
      type: sessionType,
      duration: dur,
      avgHR: avg,
      maxHR: sMax,
      timeInZones,
      caloriesBurned: parseInt(calories, 10) || 0,
      notes: notes || undefined,
    });

    // Reset form
    setDuration('');
    setAvgHR('');
    setSessionMaxHR('');
    setZoneMinutes({ zone1: '', zone2: '', zone3: '', zone4: '', zone5: '' });
    setCalories('');
    setNotes('');
    setActiveTab('history');
  };

  // --- Zone distribution for a single session (pie data) ---
  const getZoneDistribution = (session: HRSession) => {
    const total = Object.values(session.timeInZones).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    return (Object.keys(session.timeInZones) as HRZone[])
      .filter((z) => session.timeInZones[z] > 0)
      .map((z) => ({
        name: ZONE_NAMES[z],
        value: session.timeInZones[z],
        color: ZONE_COLORS[z],
        zone: z,
      }));
  };

  // --- Get total zone seconds as bar width fraction ---
  const getZoneBarWidths = (session: HRSession) => {
    const total = Object.values(session.timeInZones).reduce((a, b) => a + b, 0);
    if (total === 0) return null;
    return (Object.keys(session.timeInZones) as HRZone[]).map((z) => ({
      zone: z,
      fraction: session.timeInZones[z] / total,
      color: ZONE_COLORS[z],
    }));
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'zones', label: 'Zones', icon: <Activity className="w-4 h-4" /> },
    { key: 'log', label: 'Log Session', icon: <Plus className="w-4 h-4" /> },
    { key: 'history', label: 'History', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="min-h-screen bg-grappler-950 pb-20"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-grappler-950/95 backdrop-blur-sm border-b border-grappler-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-grappler-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-grappler-200" />
          </button>
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-400" />
            <h1 className="text-lg font-bold text-grappler-50">
              HR Zone Training
            </h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3">
          <div className="bg-grappler-800 rounded-lg p-1 flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary-500 text-white'
                    : 'text-grappler-400 hover:text-grappler-200'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <AnimatePresence mode="wait">
          {/* ========== ZONES TAB ========== */}
          {activeTab === 'zones' && (
            <motion.div
              key="zones"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* HR Inputs */}
              <div className="bg-grappler-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <h2 className="font-semibold text-grappler-50">
                    Heart Rate Settings
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">
                      Max HR (bpm)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={maxHR}
                      onChange={(e) =>
                        setMaxHR(parseInt(e.target.value, 10) || 0)
                      }
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">
                      Resting HR (bpm)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={restingHR}
                      onChange={(e) =>
                        setRestingHR(parseInt(e.target.value, 10) || 0)
                      }
                      className="input"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-grappler-700/50 rounded-lg p-3">
                  <Info className="w-4 h-4 text-primary-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-grappler-300">
                    Using the <span className="font-semibold text-grappler-200">Karvonen formula</span>: Target HR = ((Max HR - Resting HR) x % Intensity) + Resting HR. This accounts for your fitness level via resting heart rate.
                  </p>
                </div>
              </div>

              {/* Zone Cards */}
              <div className="space-y-3">
                <h2 className="font-semibold text-grappler-50 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary-400" />
                  Your Heart Rate Zones
                </h2>

                {(Object.keys(ZONE_PERCENTAGES) as HRZone[]).map(
                  (zone, index) => {
                    const config = zoneConfig.zones[zone];
                    const pct = ZONE_PERCENTAGES[zone];
                    return (
                      <motion.div
                        key={zone}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                        className="bg-grappler-800 rounded-xl p-4 overflow-hidden relative"
                      >
                        {/* Color accent bar */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl"
                          style={{ backgroundColor: ZONE_COLORS[zone] }}
                        />

                        <div className="ml-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-xs font-bold px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: ZONE_COLORS[zone] + '25',
                                  color: ZONE_COLORS[zone],
                                }}
                              >
                                Z{index + 1}
                              </span>
                              <span className="font-semibold text-grappler-50">
                                {ZONE_NAMES[zone]}
                              </span>
                            </div>
                            <span className="text-sm font-mono font-bold text-grappler-200">
                              {config.min} - {config.max} bpm
                            </span>
                          </div>
                          <p className="text-xs text-grappler-400 mb-2">
                            {Math.round(pct.min * 100)}-{Math.round(pct.max * 100)}% intensity
                          </p>
                          <p className="text-xs text-grappler-300">
                            {ZONE_DESCRIPTIONS[zone]}
                          </p>

                          {/* Visual BPM bar */}
                          <div className="mt-3 h-2 bg-grappler-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${((config.max - config.min) / (maxHR - restingHR)) * 100}%`,
                              }}
                              transition={{ delay: index * 0.08 + 0.3, duration: 0.5 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: ZONE_COLORS[zone] }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  }
                )}
              </div>

              {/* Zone Chart */}
              <div className="bg-grappler-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-grappler-200 mb-3">
                  Zone BPM Ranges
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={zoneBarData} layout="vertical">
                    <XAxis
                      type="number"
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, maxHR]}
                    />
                    <YAxis
                      type="category"
                      dataKey="zone"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a2e',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: '#9ca3af' }}
                      formatter={(_value: number, _name: string, props: { payload: { bpmMin: number; bpmMax: number; name: string } }) => [
                        `${props.payload.bpmMin} - ${props.payload.bpmMax} bpm`,
                        props.payload.name,
                      ]}
                    />
                    <Bar dataKey="bpmMax" radius={[0, 6, 6, 0]}>
                      {zoneBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Grappling-specific tips */}
              <div className="bg-grappler-800 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-grappler-50 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  Grappling Conditioning Guide
                </h3>
                <div className="space-y-2">
                  {[
                    {
                      zone: 'zone2' as HRZone,
                      tip: 'Build your aerobic base with 30-60 min sessions at Zone 2. This is the foundation for grappling endurance -- you should be able to hold a conversation.',
                    },
                    {
                      zone: 'zone3' as HRZone,
                      tip: 'Positional drilling and flow rolls live here. Train 20-40 min to simulate mat time without burning out.',
                    },
                    {
                      zone: 'zone4' as HRZone,
                      tip: 'Hard sparring rounds push you into Zone 4. Use 5 min rounds with 1-2 min rest to mimic competition.',
                    },
                    {
                      zone: 'zone5' as HRZone,
                      tip: 'Reserve Zone 5 for competition prep. Short all-out bursts (30-60s) with full recovery build explosive cardio.',
                    },
                  ].map((item) => (
                    <div
                      key={item.zone}
                      className="flex items-start gap-2 bg-grappler-700/40 rounded-lg p-3"
                    >
                      <div
                        className="w-3 h-3 rounded-full mt-0.5 shrink-0"
                        style={{ backgroundColor: ZONE_COLORS[item.zone] }}
                      />
                      <p className="text-xs text-grappler-300">{item.tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ========== LOG SESSION TAB ========== */}
          {activeTab === 'log' && (
            <motion.div
              key="log"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="bg-grappler-800 rounded-xl p-4 space-y-4">
                <h2 className="font-semibold text-grappler-50 flex items-center gap-2">
                  <Timer className="w-4 h-4 text-primary-400" />
                  Log Cardio Session
                </h2>

                {/* Session Type */}
                <div>
                  <label className="text-xs text-grappler-400 mb-2 block">
                    Session Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SESSION_TYPES.map((st) => (
                      <button
                        key={st.value}
                        onClick={() => setSessionType(st.value)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          sessionType === st.value
                            ? 'bg-primary-500 text-white'
                            : 'bg-grappler-700 text-grappler-300 hover:bg-grappler-600'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration & HR Inputs */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">
                      Duration (min)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="30"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">
                      Avg HR (bpm)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={avgHR}
                      onChange={(e) => setAvgHR(e.target.value)}
                      placeholder="145"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">
                      Max HR (bpm)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={sessionMaxHR}
                      onChange={(e) => setSessionMaxHR(e.target.value)}
                      placeholder="175"
                      className="input"
                    />
                  </div>
                </div>

                {/* Time in each zone */}
                <div>
                  <label className="text-xs text-grappler-400 mb-2 block">
                    Time in Each Zone (minutes)
                  </label>
                  <div className="space-y-2">
                    {(Object.keys(ZONE_PERCENTAGES) as HRZone[]).map(
                      (zone, index) => (
                        <div
                          key={zone}
                          className="flex items-center gap-3"
                        >
                          <div className="flex items-center gap-2 w-28">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: ZONE_COLORS[zone] }}
                            />
                            <span className="text-xs text-grappler-300 truncate">
                              Z{index + 1} {ZONE_NAMES[zone]}
                            </span>
                          </div>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={zoneMinutes[zone]}
                            onChange={(e) =>
                              setZoneMinutes((prev) => ({
                                ...prev,
                                [zone]: e.target.value,
                              }))
                            }
                            placeholder="0"
                            className="input flex-1"
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Calories */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1 block">
                    Calories Burned (optional)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="350"
                    className="input"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1 block">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., 6 x 5 min rounds with 1 min rest..."
                    rows={3}
                    className="input resize-none"
                  />
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveSession}
                  disabled={!duration || !avgHR || !sessionMaxHR}
                  className="btn btn-primary w-full gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  Save Session
                </button>
              </div>
            </motion.div>
          )}

          {/* ========== HISTORY TAB ========== */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Summary Stats */}
              {summaryStats && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-grappler-800 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-grappler-50">
                      {summaryStats.totalSessions}
                    </p>
                    <p className="text-xs text-grappler-400">Sessions</p>
                  </div>
                  <div className="bg-grappler-800 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-grappler-50">
                      {summaryStats.avgDuration}
                      <span className="text-xs text-grappler-400 ml-0.5">
                        min
                      </span>
                    </p>
                    <p className="text-xs text-grappler-400">Avg Duration</p>
                  </div>
                  <div className="bg-grappler-800 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            ZONE_COLORS[summaryStats.mostCommonZone],
                        }}
                      />
                      <p className="text-sm font-bold text-grappler-50">
                        {ZONE_NAMES[summaryStats.mostCommonZone]
                          .split(' ')[0]}
                      </p>
                    </div>
                    <p className="text-xs text-grappler-400">Top Zone</p>
                  </div>
                </div>
              )}

              {/* Session Cards */}
              {sortedSessions.length > 0 ? (
                <div className="space-y-3">
                  {sortedSessions.map((session, idx) => {
                    const typeLabel =
                      SESSION_TYPES.find((st) => st.value === session.type)
                        ?.label || session.type;
                    const zoneWidths = getZoneBarWidths(session);

                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-grappler-800 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-grappler-50">
                              {typeLabel}
                            </p>
                            <p className="text-xs text-grappler-400">
                              {new Date(session.date).toLocaleDateString(
                                'en-US',
                                {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                }
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-sm font-mono text-grappler-200">
                              {session.avgHR} avg
                            </span>
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-4 gap-2">
                          <div className="text-center">
                            <p className="text-sm font-bold text-grappler-200">
                              {session.duration}
                            </p>
                            <p className="text-[10px] text-grappler-400">
                              min
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-grappler-200">
                              {session.avgHR}
                            </p>
                            <p className="text-[10px] text-grappler-400">
                              avg bpm
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-grappler-200">
                              {session.maxHR}
                            </p>
                            <p className="text-[10px] text-grappler-400">
                              max bpm
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-grappler-200">
                              {session.caloriesBurned > 0
                                ? session.caloriesBurned
                                : '--'}
                            </p>
                            <p className="text-[10px] text-grappler-400">
                              kcal
                            </p>
                          </div>
                        </div>

                        {/* Zone distribution bar */}
                        {zoneWidths && (
                          <div>
                            <p className="text-[10px] text-grappler-400 mb-1">
                              Zone Distribution
                            </p>
                            <div className="flex h-3 rounded-full overflow-hidden">
                              {zoneWidths
                                .filter((w) => w.fraction > 0)
                                .map((w) => (
                                  <div
                                    key={w.zone}
                                    style={{
                                      width: `${w.fraction * 100}%`,
                                      backgroundColor: w.color,
                                    }}
                                    className="h-full"
                                    title={`${ZONE_NAMES[w.zone]}: ${Math.round(w.fraction * 100)}%`}
                                  />
                                ))}
                            </div>
                            <div className="flex gap-2 mt-1.5 flex-wrap">
                              {zoneWidths
                                .filter((w) => w.fraction > 0)
                                .map((w) => (
                                  <div
                                    key={w.zone}
                                    className="flex items-center gap-1"
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: w.color }}
                                    />
                                    <span className="text-[10px] text-grappler-400">
                                      {w.zone.replace('zone', 'Z')}{' '}
                                      {Math.round(w.fraction * 100)}%
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {session.notes && (
                          <p className="text-xs text-grappler-400 italic border-t border-grappler-700 pt-2">
                            {session.notes}
                          </p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <Heart className="w-12 h-12 text-grappler-600 mx-auto" />
                  <p className="text-grappler-400 text-sm">
                    No cardio sessions logged yet.
                  </p>
                  <button
                    onClick={() => setActiveTab('log')}
                    className="btn btn-primary btn-sm gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Log Your First Session
                  </button>
                </div>
              )}

              {/* Aggregate Zone Pie Chart */}
              {hrSessions.length > 0 && (
                <div className="bg-grappler-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-grappler-200 mb-3">
                    Overall Zone Distribution
                  </h3>
                  {(() => {
                    const zoneTotals = (
                      Object.keys(ZONE_PERCENTAGES) as HRZone[]
                    ).map((z) => ({
                      name: ZONE_NAMES[z],
                      value: hrSessions.reduce(
                        (sum, s) => sum + s.timeInZones[z],
                        0
                      ),
                      color: ZONE_COLORS[z],
                    }));
                    const filtered = zoneTotals.filter((z) => z.value > 0);
                    if (filtered.length === 0) return null;

                    return (
                      <div className="flex items-center gap-4">
                        <ResponsiveContainer width="50%" height={160}>
                          <PieChart>
                            <Pie
                              data={filtered}
                              cx="50%"
                              cy="50%"
                              innerRadius={35}
                              outerRadius={65}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {filtered.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1a1a2e',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                              formatter={(value: number) => [
                                `${Math.round(value / 60)} min`,
                                '',
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-1.5">
                          {filtered.map((entry) => (
                            <div
                              key={entry.name}
                              className="flex items-center gap-2"
                            >
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-xs text-grappler-300">
                                {entry.name}:{' '}
                                <span className="text-grappler-200 font-medium">
                                  {Math.round(entry.value / 60)} min
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
