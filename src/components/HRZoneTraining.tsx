'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Watch,
  Download,
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
import { HRSession, HRZone, HRZoneConfig, WhoopWorkout, TrainingSession } from '@/lib/types';

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

// Unified entry for the history timeline
interface UnifiedHREntry {
  id: string;
  date: Date;
  source: 'manual' | 'whoop' | 'training';
  label: string;
  duration: number;
  avgHR: number;
  maxHR: number;
  timeInZones: Record<HRZone, number>;
  caloriesBurned: number;
  strain?: number;
  notes?: string;
}

/** Convert WHOOP zone array ({zone:0-5, minutes}) to HRZone record (seconds) */
function whoopZonesToHRZones(zones: { zone: number; minutes: number }[]): Record<HRZone, number> {
  const result: Record<HRZone, number> = {
    zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0,
  };
  for (const z of zones) {
    if (z.zone <= 1) result.zone1 += z.minutes * 60;
    else if (z.zone === 2) result.zone2 += z.minutes * 60;
    else if (z.zone === 3) result.zone3 += z.minutes * 60;
    else if (z.zone === 4) result.zone4 += z.minutes * 60;
    else if (z.zone >= 5) result.zone5 += z.minutes * 60;
  }
  return result;
}

/** Pretty-print an ActivityType */
function formatActivityType(type: string): string {
  const map: Record<string, string> = {
    bjj_gi: 'BJJ (Gi)',
    bjj_nogi: 'BJJ (No-Gi)',
    wrestling: 'Wrestling',
    judo: 'Judo',
    sambo: 'Sambo',
    boxing: 'Boxing',
    kickboxing: 'Kickboxing',
    muay_thai: 'Muay Thai',
    mma: 'MMA',
    running: 'Running',
    cycling: 'Cycling',
    swimming: 'Swimming',
    rowing: 'Rowing',
  };
  return map[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function calculateKarvonenBPM(
  restingHR: number,
  maxHR: number,
  intensity: number
): number {
  return Math.round(((maxHR - restingHR) * intensity) + restingHR);
}

export default function HRZoneTraining({ onClose }: HRZoneTrainingProps) {
  const {
    user,
    hrSessions,
    addHRSession,
    whoopWorkouts,
    trainingSessions,
    latestWhoopData,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabKey>('zones');

  // --- Zones Tab state ---
  const defaultMaxHR = user?.age ? 220 - user.age : 186;
  const wearableRestingHR = latestWhoopData?.restingHR;
  const [maxHR, setMaxHR] = useState<number>(defaultMaxHR);
  const [restingHR, setRestingHR] = useState<number>(wearableRestingHR || 60);
  const [rhrSynced, setRhrSynced] = useState(false);

  // Auto-populate resting HR from wearable when data arrives
  useEffect(() => {
    if (wearableRestingHR && !rhrSynced) {
      setRestingHR(wearableRestingHR);
      setRhrSynced(true);
    }
  }, [wearableRestingHR, rhrSynced]);

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

  // --- Build unified history from all sources ---
  const unifiedHistory: UnifiedHREntry[] = useMemo(() => {
    const entries: UnifiedHREntry[] = [];

    // 1. Manual HR sessions
    hrSessions.forEach((s) => {
      const typeLabel = SESSION_TYPES.find((st) => st.value === s.type)?.label || s.type;
      entries.push({
        id: s.id,
        date: new Date(s.date),
        source: 'manual',
        label: typeLabel,
        duration: s.duration,
        avgHR: s.avgHR,
        maxHR: s.maxHR,
        timeInZones: { ...s.timeInZones },
        caloriesBurned: s.caloriesBurned,
        notes: s.notes,
      });
    });

    // 2. Training sessions with WHOOP HR data
    const linkedWhoopIds = new Set<string>();
    trainingSessions.forEach((ts: TrainingSession) => {
      if (!ts.whoopHR) return;
      if (ts.whoopWorkoutId) linkedWhoopIds.add(ts.whoopWorkoutId);
      entries.push({
        id: `ts-${ts.id}`,
        date: new Date(ts.date),
        source: 'training',
        label: formatActivityType(ts.type),
        duration: ts.duration,
        avgHR: ts.whoopHR.avgHR,
        maxHR: ts.whoopHR.maxHR,
        timeInZones: ts.whoopHR.zones ? whoopZonesToHRZones(ts.whoopHR.zones) : {
          zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0,
        },
        caloriesBurned: ts.whoopHR.calories,
        strain: ts.whoopHR.strain,
        notes: ts.notes,
      });
    });

    // 3. Raw WHOOP workouts not already linked to a training session
    whoopWorkouts.forEach((w: WhoopWorkout) => {
      if (linkedWhoopIds.has(w.id)) return;
      if (!w.avgHR && !w.maxHR) return; // skip entries with no HR data
      const durationMin = Math.round(
        (new Date(w.end).getTime() - new Date(w.start).getTime()) / 60000
      );
      entries.push({
        id: `whoop-${w.id}`,
        date: new Date(w.start),
        source: 'whoop',
        label: w.sportName || 'WHOOP Workout',
        duration: durationMin,
        avgHR: w.avgHR || 0,
        maxHR: w.maxHR || 0,
        timeInZones: w.zones.length > 0 ? whoopZonesToHRZones(w.zones) : {
          zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0,
        },
        caloriesBurned: w.calories || 0,
        strain: w.strain ?? undefined,
        notes: undefined,
      });
    });

    // Sort newest first
    entries.sort((a, b) => b.date.getTime() - a.date.getTime());
    return entries;
  }, [hrSessions, trainingSessions, whoopWorkouts]);

  // --- History summary stats (uses unified data) ---
  const summaryStats = useMemo(() => {
    if (unifiedHistory.length === 0) return null;

    const totalSessions = unifiedHistory.length;
    const avgDuration = Math.round(
      unifiedHistory.reduce((sum, s) => sum + s.duration, 0) / totalSessions
    );

    const zoneTotals: Record<HRZone, number> = {
      zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0,
    };
    unifiedHistory.forEach((s) => {
      (Object.keys(zoneTotals) as HRZone[]).forEach((z) => {
        zoneTotals[z] += s.timeInZones[z];
      });
    });
    const mostCommonZone = (Object.keys(zoneTotals) as HRZone[]).reduce(
      (best, z) => (zoneTotals[z] > zoneTotals[best] ? z : best),
      'zone1' as HRZone
    );

    const wearableCount = unifiedHistory.filter(
      (e) => e.source === 'whoop' || e.source === 'training'
    ).length;

    return { totalSessions, avgDuration, mostCommonZone, wearableCount };
  }, [unifiedHistory]);

  // --- Recent WHOOP workouts available to fill from ---
  const recentWhoopFillable = useMemo(() => {
    // Combine raw whoop workouts + training sessions with whoop HR, sorted recent first
    const items: {
      id: string;
      label: string;
      date: Date;
      duration: number;
      avgHR: number;
      maxHR: number;
      calories: number;
      strain?: number;
      zones: { zone: number; minutes: number }[];
    }[] = [];

    whoopWorkouts.forEach((w) => {
      if (!w.avgHR && !w.maxHR) return;
      const dur = Math.round(
        (new Date(w.end).getTime() - new Date(w.start).getTime()) / 60000
      );
      items.push({
        id: w.id,
        label: w.sportName || 'Workout',
        date: new Date(w.start),
        duration: dur,
        avgHR: w.avgHR || 0,
        maxHR: w.maxHR || 0,
        calories: w.calories || 0,
        strain: w.strain ?? undefined,
        zones: w.zones,
      });
    });

    trainingSessions.forEach((ts) => {
      if (!ts.whoopHR) return;
      items.push({
        id: `ts-${ts.id}`,
        label: formatActivityType(ts.type),
        date: new Date(ts.date),
        duration: ts.duration,
        avgHR: ts.whoopHR.avgHR,
        maxHR: ts.whoopHR.maxHR,
        calories: ts.whoopHR.calories,
        strain: ts.whoopHR.strain,
        zones: ts.whoopHR.zones || [],
      });
    });

    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    return items.slice(0, 5);
  }, [whoopWorkouts, trainingSessions]);

  // --- Fill form from a wearable workout ---
  const fillFromWearable = (item: typeof recentWhoopFillable[0]) => {
    setDuration(String(item.duration));
    setAvgHR(String(item.avgHR));
    setSessionMaxHR(String(item.maxHR));
    setCalories(String(item.calories || ''));

    if (item.zones.length > 0) {
      const converted = whoopZonesToHRZones(item.zones);
      setZoneMinutes({
        zone1: converted.zone1 > 0 ? String(Math.round(converted.zone1 / 60)) : '',
        zone2: converted.zone2 > 0 ? String(Math.round(converted.zone2 / 60)) : '',
        zone3: converted.zone3 > 0 ? String(Math.round(converted.zone3 / 60)) : '',
        zone4: converted.zone4 > 0 ? String(Math.round(converted.zone4 / 60)) : '',
        zone5: converted.zone5 > 0 ? String(Math.round(converted.zone5 / 60)) : '',
      });
    }

    if (item.strain !== undefined) {
      setNotes(`Strain: ${item.strain.toFixed(1)} | Imported from wearable`);
    }
  };

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

  // --- Get zone bar widths from a unified entry ---
  const getUnifiedZoneBarWidths = (entry: UnifiedHREntry) => {
    const total = Object.values(entry.timeInZones).reduce((a, b) => a + b, 0);
    if (total === 0) return null;
    return (Object.keys(entry.timeInZones) as HRZone[]).map((z) => ({
      zone: z,
      fraction: entry.timeInZones[z] / total,
      color: ZONE_COLORS[z],
    }));
  };

  const sourceLabel = (source: UnifiedHREntry['source']) => {
    switch (source) {
      case 'whoop': return 'WHOOP';
      case 'training': return 'Wearable';
      case 'manual': return 'Manual';
    }
  };

  const sourceBadgeColor = (source: UnifiedHREntry['source']) => {
    switch (source) {
      case 'whoop': return 'bg-green-500/20 text-green-400';
      case 'training': return 'bg-blue-500/20 text-blue-400';
      case 'manual': return 'bg-grappler-600/40 text-grappler-300';
    }
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
      className="min-h-screen bg-grappler-950 pb-24 safe-area-top"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-grappler-950 border-b border-grappler-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button aria-label="Go back"
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
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={restingHR}
                        onChange={(e) =>
                          setRestingHR(parseInt(e.target.value, 10) || 0)
                        }
                        className="input"
                      />
                      {wearableRestingHR && (
                        <button
                          onClick={() => setRestingHR(wearableRestingHR)}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          title={`Sync from wearable: ${wearableRestingHR} bpm`}
                        >
                          <Watch className="w-3.5 h-3.5 text-green-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Wearable sync notice */}
                {wearableRestingHR && (
                  <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <Watch className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-green-300">
                      Resting HR synced from wearable: <span className="font-semibold text-green-200">{wearableRestingHR} bpm</span>. You can override manually.
                    </p>
                  </div>
                )}

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
                      tick={{ fill: '#6b7280', fontSize: 12 }}
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
                      formatter={(_value: number, _name: string, props: { payload?: { bpmMin: number; bpmMax: number; name: string } }) => {
                        if (!props.payload) return [`${_value} bpm`, _name];
                        return [
                          `${props.payload.bpmMin} - ${props.payload.bpmMax} bpm`,
                          props.payload.name,
                        ];
                      }}
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
                  <Flame className="w-4 h-4 text-blue-400" />
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
              {/* Fill from Wearable section */}
              {recentWhoopFillable.length > 0 && (
                <div className="bg-grappler-800 rounded-xl p-4 space-y-3">
                  <h2 className="font-semibold text-grappler-50 flex items-center gap-2">
                    <Watch className="w-4 h-4 text-green-400" />
                    Fill from Wearable
                  </h2>
                  <p className="text-xs text-grappler-400">
                    Tap a recent workout to auto-fill HR data, then save as an HR zone session.
                  </p>
                  <div className="space-y-2">
                    {recentWhoopFillable.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => fillFromWearable(item)}
                        className="w-full flex items-center justify-between bg-grappler-700/60 hover:bg-grappler-700 rounded-lg p-3 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Download className="w-4 h-4 text-green-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-grappler-100 truncate">
                              {item.label}
                            </p>
                            <p className="text-xs text-grappler-400">
                              {new Date(item.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                              {' · '}
                              {item.duration} min
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-xs font-mono text-grappler-200">
                              {item.avgHR} avg
                            </p>
                            <p className="text-xs text-grappler-400">
                              {item.maxHR} max
                            </p>
                          </div>
                          {item.strain !== undefined && (
                            <div className="text-center bg-blue-500/15 rounded-md px-2 py-1">
                              <p className="text-xs font-bold text-blue-400">
                                {item.strain.toFixed(1)}
                              </p>
                              <p className="text-xs text-blue-400/70">strain</p>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual log form */}
              <div className="bg-grappler-800 rounded-xl p-4 space-y-4">
                <h2 className="font-semibold text-grappler-50 flex items-center gap-2">
                  <Timer className="w-4 h-4 text-primary-400" />
                  {recentWhoopFillable.length > 0 ? 'Log Session' : 'Log Cardio Session'}
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

              {/* Wearable data count indicator */}
              {summaryStats && summaryStats.wearableCount > 0 && (
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                  <Watch className="w-3.5 h-3.5 text-green-400" />
                  <p className="text-xs text-green-300">
                    {summaryStats.wearableCount} session{summaryStats.wearableCount !== 1 ? 's' : ''} auto-imported from wearable data
                  </p>
                </div>
              )}

              {/* Session Cards (Unified) */}
              {unifiedHistory.length > 0 ? (
                <div className="space-y-3">
                  {unifiedHistory.map((entry, idx) => {
                    const zoneWidths = getUnifiedZoneBarWidths(entry);

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-grappler-800 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-semibold text-grappler-50 truncate">
                                {entry.label}
                              </p>
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ${sourceBadgeColor(entry.source)}`}>
                                {sourceLabel(entry.source)}
                              </span>
                            </div>
                            <p className="text-xs text-grappler-400">
                              {new Date(entry.date).toLocaleDateString(
                                'en-US',
                                {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                }
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {entry.strain !== undefined && (
                              <span className="text-xs font-mono text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded">
                                {entry.strain.toFixed(1)} strain
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              <Heart className="w-3.5 h-3.5 text-red-400" />
                              <span className="text-sm font-mono text-grappler-200">
                                {entry.avgHR} avg
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-4 gap-2">
                          <div className="text-center">
                            <p className="text-sm font-bold text-grappler-200">
                              {entry.duration}
                            </p>
                            <p className="text-xs text-grappler-400">
                              min
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-grappler-200">
                              {entry.avgHR}
                            </p>
                            <p className="text-xs text-grappler-400">
                              avg bpm
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-grappler-200">
                              {entry.maxHR}
                            </p>
                            <p className="text-xs text-grappler-400">
                              max bpm
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-grappler-200">
                              {entry.caloriesBurned > 0
                                ? entry.caloriesBurned
                                : '--'}
                            </p>
                            <p className="text-xs text-grappler-400">
                              kcal
                            </p>
                          </div>
                        </div>

                        {/* Zone distribution bar */}
                        {zoneWidths && (
                          <div>
                            <p className="text-xs text-grappler-400 mb-1">
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
                                    <span className="text-xs text-grappler-400">
                                      {w.zone.replace('zone', 'Z')}{' '}
                                      {Math.round(w.fraction * 100)}%
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {entry.notes && (
                          <p className="text-xs text-grappler-400 italic border-t border-grappler-700 pt-2">
                            {entry.notes}
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
                  <p className="text-grappler-400 text-xs">
                    Log sessions manually or connect a wearable to auto-import combat sport HR data.
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
              {unifiedHistory.length > 0 && (
                <div className="bg-grappler-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-grappler-200 mb-3">
                    Overall Zone Distribution
                  </h3>
                  {(() => {
                    const zoneTotals = (
                      Object.keys(ZONE_PERCENTAGES) as HRZone[]
                    ).map((z) => ({
                      name: ZONE_NAMES[z],
                      value: unifiedHistory.reduce(
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
