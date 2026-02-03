'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  Heart,
  Moon,
  Zap,
  Battery,
  ChevronLeft,
  RefreshCw,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  Thermometer,
  Wind,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WearableData, WearableSettings, WearableProvider } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface WearableIntegrationProps {
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return a colour class string for a given Whoop-style recovery score. */
function recoveryColor(score: number): string {
  if (score >= 67) return 'text-green-400';
  if (score >= 34) return 'text-yellow-400';
  return 'text-red-400';
}

function recoveryBg(score: number): string {
  if (score >= 67) return 'bg-green-500/20';
  if (score >= 34) return 'bg-yellow-500/20';
  return 'bg-red-500/20';
}

function recoveryBorder(score: number): string {
  if (score >= 67) return 'border-green-500/40';
  if (score >= 34) return 'border-yellow-500/40';
  return 'border-red-500/40';
}

function recoveryLabel(score: number): string {
  if (score >= 67) return 'Green';
  if (score >= 34) return 'Yellow';
  return 'Red';
}

function strainColor(strain: number): string {
  if (strain >= 18) return 'text-red-400';
  if (strain >= 14) return 'text-orange-400';
  if (strain >= 10) return 'text-yellow-400';
  return 'text-blue-400';
}

function trendIcon(current: number, previous: number) {
  if (current > previous) return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
  if (current < previous) return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-grappler-500" />;
}

// ---------------------------------------------------------------------------
// Mock data generator – realistic data for a 34-year-old active grappler
// ---------------------------------------------------------------------------

function generateMockData(): WearableData[] {
  const today = new Date();
  const data: WearableData[] = [];

  // Realistic ranges for a 34-year-old who trains BJJ + lifting
  const baseHRV = 58; // ms – decent for mid-30s athlete
  const baseRHR = 54; // bpm
  const baseSleep = 7.2; // hours

  const daySeeds = [
    // day-6 (oldest) through day-0 (today)
    { hrvDelta: -4, rhrDelta: 2, sleepH: 6.8, recovery: 52, strain: 14.2, sleepScore: 68, respRate: 15.8, skinTemp: 0.2, cals: 2650 },
    { hrvDelta: 3, rhrDelta: -1, sleepH: 7.5, recovery: 71, strain: 16.8, sleepScore: 78, respRate: 15.2, skinTemp: 0.0, cals: 2820 },
    { hrvDelta: -8, rhrDelta: 4, sleepH: 5.9, recovery: 38, strain: 18.4, sleepScore: 55, respRate: 16.1, skinTemp: 0.4, cals: 3100 },
    { hrvDelta: 6, rhrDelta: -2, sleepH: 8.1, recovery: 82, strain: 10.5, sleepScore: 88, respRate: 14.9, skinTemp: -0.1, cals: 2400 },
    { hrvDelta: 2, rhrDelta: 0, sleepH: 7.3, recovery: 68, strain: 15.1, sleepScore: 75, respRate: 15.4, skinTemp: 0.1, cals: 2780 },
    { hrvDelta: -2, rhrDelta: 1, sleepH: 6.5, recovery: 45, strain: 17.3, sleepScore: 62, respRate: 15.7, skinTemp: 0.3, cals: 2950 },
    { hrvDelta: 5, rhrDelta: -1, sleepH: 7.8, recovery: 76, strain: 12.7, sleepScore: 82, respRate: 15.0, skinTemp: 0.0, cals: 2550 },
  ];

  daySeeds.forEach((seed, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - i));
    date.setHours(6, 30, 0, 0);

    data.push({
      id: `mock-${i}`,
      date,
      provider: 'whoop' as WearableProvider,
      hrv: baseHRV + seed.hrvDelta,
      restingHR: baseRHR + seed.rhrDelta,
      sleepScore: seed.sleepScore,
      sleepHours: seed.sleepH,
      recoveryScore: seed.recovery,
      strain: seed.strain,
      respiratoryRate: seed.respRate,
      skinTemp: seed.skinTemp,
      caloriesBurned: seed.cals,
    });
  });

  return data;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WearableIntegration({ onClose }: WearableIntegrationProps) {
  // -- Local state (no store wearable state yet) --
  const [wearableData] = useState<WearableData[]>(generateMockData);
  const [settings, setSettings] = useState<WearableSettings>({
    provider: 'whoop',
    connected: true,
    lastSync: new Date(),
    autoAdjustFromRecovery: true,
  });
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualRecovery, setManualRecovery] = useState('');
  const [manualHRV, setManualHRV] = useState('');
  const [manualRHR, setManualRHR] = useState('');
  const [manualSleepHours, setManualSleepHours] = useState('');
  const [manualStrain, setManualStrain] = useState('');

  // -- Derived data --
  const today = wearableData[wearableData.length - 1];
  const yesterday = wearableData.length >= 2 ? wearableData[wearableData.length - 2] : null;

  const chartData = useMemo(
    () =>
      wearableData.map((d) => ({
        day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
        recovery: d.recoveryScore,
        hrv: d.hrv,
        strain: d.strain,
      })),
    [wearableData],
  );

  const avgRecovery = useMemo(() => {
    const scores = wearableData.map((d) => d.recoveryScore).filter((s): s is number => s !== null);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }, [wearableData]);

  // -- Handlers --
  const handleConnect = () => {
    setSettings((prev) => ({
      ...prev,
      connected: !prev.connected,
      lastSync: prev.connected ? prev.lastSync : new Date(),
    }));
  };

  const handleSync = () => {
    setSettings((prev) => ({ ...prev, lastSync: new Date() }));
  };

  const handleManualSubmit = () => {
    // In a real implementation this would write to the store / API
    setShowManualEntry(false);
    setManualRecovery('');
    setManualHRV('');
    setManualRHR('');
    setManualSleepHours('');
    setManualStrain('');
  };

  // -- Readiness recommendation --
  const readiness = useMemo(() => {
    const score = today?.recoveryScore ?? 0;
    if (score >= 67) {
      return {
        zone: 'green' as const,
        title: 'Peak Readiness',
        message: 'Full send \u2014 your body is recovered. Hit it hard today.',
        accent: 'text-green-400',
        bg: 'bg-green-500/10 border-green-500/30',
        icon: <Zap className="w-5 h-5 text-green-400" />,
      };
    }
    if (score >= 34) {
      return {
        zone: 'yellow' as const,
        title: 'Moderate Readiness',
        message: 'Moderate intensity recommended. Consider lighter loads or fewer sets.',
        accent: 'text-yellow-400',
        bg: 'bg-yellow-500/10 border-yellow-500/30',
        icon: <Activity className="w-5 h-5 text-yellow-400" />,
      };
    }
    return {
      zone: 'red' as const,
      title: 'Recovery Day',
      message: 'Recovery day recommended. Consider mobility work or light cardio.',
      accent: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/30',
      icon: <Battery className="w-5 h-5 text-red-400" />,
    };
  }, [today]);

  // -- Strain gauge percentage (0-21 scale mapped to 0-100%) --
  const strainPct = today?.strain != null ? Math.min((today.strain / 21) * 100, 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="min-h-screen bg-grappler-900 bg-mesh pb-20"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-40 bg-grappler-900/80 backdrop-blur-xl border-b border-grappler-800">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn btn-ghost btn-sm p-1">
              <ChevronLeft className="w-5 h-5 text-grappler-200" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <h1 className="font-bold text-grappler-50 text-lg leading-tight">Whoop</h1>
                <p className="text-xs text-grappler-500">Wearable Integration</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {settings.connected && (
              <button onClick={handleSync} className="btn btn-ghost btn-sm p-1.5">
                <RefreshCw className="w-4 h-4 text-grappler-400" />
              </button>
            )}
            <button
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="btn btn-ghost btn-sm p-1.5"
            >
              <Settings className="w-4 h-4 text-grappler-400" />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* ---------------------------------------------------------------- */}
        {/* Connection Status                                                 */}
        {/* ---------------------------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={cn(
            'card p-4 flex items-center justify-between',
            settings.connected ? 'border-green-500/30' : 'border-red-500/30',
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-3 h-3 rounded-full',
                settings.connected ? 'bg-green-400 shadow-lg shadow-green-400/40' : 'bg-red-400',
              )}
            />
            <div>
              <p className="text-sm font-medium text-grappler-100">
                {settings.connected ? 'Connected' : 'Not Connected'}
              </p>
              {settings.connected && settings.lastSync && (
                <p className="text-xs text-grappler-500">
                  Last sync {new Date(settings.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleConnect}
            className={cn(
              'btn btn-sm',
              settings.connected ? 'btn-secondary' : 'btn-primary',
            )}
          >
            {settings.connected ? 'Disconnect' : 'Connect'}
          </button>
        </motion.div>

        {/* ---------------------------------------------------------------- */}
        {/* Today's Metrics Grid                                              */}
        {/* ---------------------------------------------------------------- */}
        {settings.connected && today && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-sm font-semibold text-grappler-400 uppercase tracking-wider mb-3">
                Today&apos;s Metrics
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {/* Recovery Score */}
                <div
                  className={cn(
                    'bg-grappler-800 rounded-xl p-4 border col-span-2',
                    recoveryBorder(today.recoveryScore ?? 0),
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-grappler-400 flex items-center gap-1.5">
                      <Battery className="w-4 h-4" />
                      Recovery
                    </span>
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        recoveryBg(today.recoveryScore ?? 0),
                        recoveryColor(today.recoveryScore ?? 0),
                      )}
                    >
                      {recoveryLabel(today.recoveryScore ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className={cn('text-4xl font-bold', recoveryColor(today.recoveryScore ?? 0))}>
                      {today.recoveryScore ?? '--'}
                    </span>
                    <span className="text-grappler-500 text-sm pb-1">/ 100</span>
                  </div>
                  {/* Recovery bar */}
                  <div className="mt-3 h-2 bg-grappler-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${today.recoveryScore ?? 0}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={cn(
                        'h-full rounded-full',
                        (today.recoveryScore ?? 0) >= 67
                          ? 'bg-gradient-to-r from-green-500 to-green-400'
                          : (today.recoveryScore ?? 0) >= 34
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                          : 'bg-gradient-to-r from-red-500 to-red-400',
                      )}
                    />
                  </div>
                </div>

                {/* Strain */}
                <div className="bg-grappler-800 rounded-xl p-4">
                  <span className="text-sm text-grappler-400 flex items-center gap-1.5 mb-2">
                    <Zap className="w-4 h-4" />
                    Strain
                  </span>
                  <p className={cn('text-2xl font-bold', strainColor(today.strain ?? 0))}>
                    {today.strain?.toFixed(1) ?? '--'}
                  </p>
                  <span className="text-xs text-grappler-500">/ 21.0</span>
                  {/* Strain gauge */}
                  <div className="mt-2 h-1.5 bg-grappler-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${strainPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500"
                    />
                  </div>
                </div>

                {/* HRV */}
                <div className="bg-grappler-800 rounded-xl p-4">
                  <span className="text-sm text-grappler-400 flex items-center gap-1.5 mb-2">
                    <Activity className="w-4 h-4" />
                    HRV
                  </span>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-grappler-50">
                      {today.hrv ?? '--'}
                    </p>
                    {yesterday?.hrv != null && today.hrv != null && trendIcon(today.hrv, yesterday.hrv)}
                  </div>
                  <span className="text-xs text-grappler-500">ms</span>
                </div>

                {/* Resting HR */}
                <div className="bg-grappler-800 rounded-xl p-4">
                  <span className="text-sm text-grappler-400 flex items-center gap-1.5 mb-2">
                    <Heart className="w-4 h-4" />
                    Resting HR
                  </span>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-grappler-50">
                      {today.restingHR ?? '--'}
                    </p>
                    {yesterday?.restingHR != null && today.restingHR != null &&
                      trendIcon(yesterday.restingHR, today.restingHR)}
                  </div>
                  <span className="text-xs text-grappler-500">bpm</span>
                </div>

                {/* Sleep */}
                <div className="bg-grappler-800 rounded-xl p-4">
                  <span className="text-sm text-grappler-400 flex items-center gap-1.5 mb-2">
                    <Moon className="w-4 h-4" />
                    Sleep
                  </span>
                  <p className="text-2xl font-bold text-grappler-50">
                    {today.sleepScore ?? '--'}
                  </p>
                  <span className="text-xs text-grappler-500">
                    {today.sleepHours != null ? `${today.sleepHours.toFixed(1)} hrs` : '-- hrs'}
                  </span>
                </div>

                {/* Respiratory Rate */}
                <div className="bg-grappler-800 rounded-xl p-4">
                  <span className="text-sm text-grappler-400 flex items-center gap-1.5 mb-2">
                    <Wind className="w-4 h-4" />
                    Resp. Rate
                  </span>
                  <p className="text-2xl font-bold text-grappler-50">
                    {today.respiratoryRate?.toFixed(1) ?? '--'}
                  </p>
                  <span className="text-xs text-grappler-500">rpm</span>
                </div>

                {/* Skin Temp */}
                <div className="bg-grappler-800 rounded-xl p-4">
                  <span className="text-sm text-grappler-400 flex items-center gap-1.5 mb-2">
                    <Thermometer className="w-4 h-4" />
                    Skin Temp
                  </span>
                  <p className="text-2xl font-bold text-grappler-50">
                    {today.skinTemp != null
                      ? `${today.skinTemp >= 0 ? '+' : ''}${today.skinTemp.toFixed(1)}`
                      : '--'}
                  </p>
                  <span className="text-xs text-grappler-500">&deg;F deviation</span>
                </div>

                {/* Calories */}
                <div className="bg-grappler-800 rounded-xl p-4">
                  <span className="text-sm text-grappler-400 flex items-center gap-1.5 mb-2">
                    <Zap className="w-4 h-4" />
                    Calories
                  </span>
                  <p className="text-2xl font-bold text-grappler-50">
                    {today.caloriesBurned?.toLocaleString() ?? '--'}
                  </p>
                  <span className="text-xs text-grappler-500">kcal</span>
                </div>
              </div>
            </motion.div>

            {/* -------------------------------------------------------------- */}
            {/* 7-Day Recovery Trend                                            */}
            {/* -------------------------------------------------------------- */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-grappler-200">7-Day Recovery Trend</h3>
                <span className="text-xs text-grappler-500">
                  Avg: <span className={cn('font-medium', recoveryColor(avgRecovery))}>{avgRecovery}%</span>
                </span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="recoveryGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: '#e2e8f0' }}
                      formatter={(value: number) => [`${value}%`, 'Recovery']}
                    />
                    <Area
                      type="monotone"
                      dataKey="recovery"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fill="url(#recoveryGradient)"
                      dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* -------------------------------------------------------------- */}
            {/* Training Readiness Recommendation                               */}
            {/* -------------------------------------------------------------- */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={cn('card p-4 border', readiness.bg)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{readiness.icon}</div>
                <div>
                  <h3 className={cn('font-semibold text-sm', readiness.accent)}>
                    {readiness.title}
                  </h3>
                  <p className="text-sm text-grappler-300 mt-1 leading-relaxed">
                    {readiness.message}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* -------------------------------------------------------------- */}
            {/* Auto-Adjust Toggle                                              */}
            {/* -------------------------------------------------------------- */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="card p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium text-grappler-100">
                    Auto-adjust workout intensity
                  </p>
                  <p className="text-xs text-grappler-500 mt-0.5">
                    Automatically scale volume and load based on your recovery score
                  </p>
                </div>
                <button
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      autoAdjustFromRecovery: !prev.autoAdjustFromRecovery,
                    }))
                  }
                  className={cn(
                    'relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0',
                    settings.autoAdjustFromRecovery ? 'bg-green-500' : 'bg-grappler-600',
                  )}
                  role="switch"
                  aria-checked={settings.autoAdjustFromRecovery}
                >
                  <motion.div
                    className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                    animate={{ x: settings.autoAdjustFromRecovery ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </motion.div>
          </>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Not Connected Prompt                                              */}
        {/* ---------------------------------------------------------------- */}
        {!settings.connected && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-8 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-grappler-700 rounded-full flex items-center justify-center">
              <Activity className="w-8 h-8 text-grappler-500" />
            </div>
            <h3 className="text-lg font-semibold text-grappler-200 mb-2">
              Connect Your Whoop
            </h3>
            <p className="text-sm text-grappler-400 mb-6 max-w-xs mx-auto">
              Link your Whoop strap to get recovery-based workout recommendations and automatic intensity adjustments.
            </p>
            <button onClick={handleConnect} className="btn btn-primary btn-md">
              Connect Whoop
            </button>
          </motion.div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Manual Entry Form                                                 */}
        {/* ---------------------------------------------------------------- */}
        <AnimatePresence>
          {showManualEntry && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-grappler-200">Manual Entry</h3>
                  <button
                    onClick={() => setShowManualEntry(false)}
                    className="text-grappler-500 hover:text-grappler-300"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-grappler-500">
                  Log your metrics manually if you prefer not to connect your device.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">Recovery (0-100)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="76"
                      value={manualRecovery}
                      onChange={(e) => setManualRecovery(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">HRV (ms)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="58"
                      value={manualHRV}
                      onChange={(e) => setManualHRV(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">Resting HR (bpm)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="54"
                      value={manualRHR}
                      onChange={(e) => setManualRHR(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">Sleep (hrs)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="7.5"
                      value={manualSleepHours}
                      onChange={(e) => setManualSleepHours(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-grappler-400 mb-1 block">Strain (0-21)</label>
                    <input
                      type="number"
                      min={0}
                      max={21}
                      step={0.1}
                      placeholder="14.5"
                      value={manualStrain}
                      onChange={(e) => setManualStrain(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={handleManualSubmit}
                  className="btn btn-primary btn-sm w-full"
                >
                  Save Entry
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
