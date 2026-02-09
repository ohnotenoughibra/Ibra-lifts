'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Scale, Plus, Trash2, TrendingUp, TrendingDown, Minus as TrendFlat, Activity, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

function getBMICategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-yellow-400' };
  if (bmi < 25) return { label: 'Normal', color: 'text-green-400' };
  if (bmi < 30) return { label: 'Overweight', color: 'text-orange-400' };
  return { label: 'Obese', color: 'text-red-400' };
}

// Navy method body fat estimation
function estimateBodyFat(waistCm: number, neckCm: number, heightCm: number, sex: 'male' | 'female', hipCm?: number): number | null {
  if (sex === 'male') {
    if (waistCm <= neckCm) return null;
    return Math.round((495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450) * 10) / 10;
  } else {
    if (!hipCm || (waistCm + hipCm) <= neckCm) return null;
    return Math.round((495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.22100 * Math.log10(heightCm)) - 450) * 10) / 10;
  }
}

function getBodyFatCategory(bf: number, sex: 'male' | 'female'): { label: string; color: string } {
  if (sex === 'male') {
    if (bf < 6) return { label: 'Essential', color: 'text-red-400' };
    if (bf < 14) return { label: 'Athletic', color: 'text-green-400' };
    if (bf < 18) return { label: 'Fit', color: 'text-blue-400' };
    if (bf < 25) return { label: 'Average', color: 'text-yellow-400' };
    return { label: 'Above Average', color: 'text-orange-400' };
  } else {
    if (bf < 14) return { label: 'Essential', color: 'text-red-400' };
    if (bf < 21) return { label: 'Athletic', color: 'text-green-400' };
    if (bf < 25) return { label: 'Fit', color: 'text-blue-400' };
    if (bf < 32) return { label: 'Average', color: 'text-yellow-400' };
    return { label: 'Above Average', color: 'text-orange-400' };
  }
}

export default function BodyWeightTracker() {
  const { bodyWeightLog, addBodyWeight, deleteBodyWeight, user } = useAppStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBFCalculator, setShowBFCalculator] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [neckCm, setNeckCm] = useState('');
  const [hipCm, setHipCm] = useState('');
  const [calculatedBF, setCalculatedBF] = useState<number | null>(null);
  const weightUnit = user?.weightUnit || 'lbs';
  const heightCm = user?.heightCm || 0;
  const sex = user?.sex || 'male';

  const sortedLog = [...bodyWeightLog].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const chartData = sortedLog.map(entry => ({
    date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: entry.weight,
    fullDate: new Date(entry.date).toLocaleDateString()
  }));

  const latestWeight = sortedLog.length > 0 ? sortedLog[sortedLog.length - 1].weight : null;
  const previousWeight = sortedLog.length > 1 ? sortedLog[sortedLog.length - 2].weight : null;
  const weightChange = latestWeight && previousWeight ? latestWeight - previousWeight : null;
  const avgWeight = sortedLog.length > 0
    ? Math.round(sortedLog.reduce((sum, e) => sum + e.weight, 0) / sortedLog.length * 10) / 10
    : null;

  // BMI calculation
  const bmi = useMemo(() => {
    if (!latestWeight || !heightCm) return null;
    const weightKg = weightUnit === 'lbs' ? latestWeight * 0.453592 : latestWeight;
    return calculateBMI(weightKg, heightCm);
  }, [latestWeight, heightCm, weightUnit]);

  const bmiCategory = bmi ? getBMICategory(bmi) : null;

  const handleCalculateBF = () => {
    const w = parseFloat(waistCm);
    const n = parseFloat(neckCm);
    const h = hipCm ? parseFloat(hipCm) : undefined;
    if (!w || !n || !heightCm) return;
    const bf = estimateBodyFat(w, n, heightCm, sex, h);
    setCalculatedBF(bf);
  };

  const handleAdd = () => {
    const w = parseFloat(newWeight);
    if (isNaN(w) || w <= 0) return;
    addBodyWeight(w, newNotes || undefined);
    setNewWeight('');
    setNewNotes('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-grappler-50 flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary-400" />
          Body Weight
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary btn-sm gap-1"
        >
          <Plus className="w-4 h-4" />
          Log
        </button>
      </div>

      {/* Quick stats */}
      {latestWeight && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-grappler-800/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-grappler-50">{latestWeight}</p>
            <p className="text-xs text-grappler-400">Current ({weightUnit})</p>
          </div>
          <div className="bg-grappler-800/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              {weightChange !== null && (
                <>
                  {weightChange > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                  ) : weightChange < 0 ? (
                    <TrendingDown className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <TrendFlat className="w-3.5 h-3.5 text-grappler-400" />
                  )}
                  <p className={cn(
                    'text-lg font-bold',
                    weightChange > 0 ? 'text-red-400' : weightChange < 0 ? 'text-green-400' : 'text-grappler-400'
                  )}>
                    {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}
                  </p>
                </>
              )}
              {weightChange === null && <p className="text-lg font-bold text-grappler-400">-</p>}
            </div>
            <p className="text-xs text-grappler-400">Change</p>
          </div>
          <div className="bg-grappler-800/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-grappler-50">{avgWeight}</p>
            <p className="text-xs text-grappler-400">Average</p>
          </div>
        </div>
      )}

      {/* BMI & Body Fat Section */}
      {latestWeight && (
        <div className="bg-grappler-800/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-grappler-300 uppercase tracking-wide flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-primary-400" />
              Body Composition
            </h4>
            <button
              onClick={() => setShowBFCalculator(!showBFCalculator)}
              className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
            >
              <Calculator className="w-3 h-3" />
              {showBFCalculator ? 'Hide' : 'Body Fat Calc'}
            </button>
          </div>

          {/* BMI display */}
          {bmi ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-grappler-700/50 rounded-lg p-2.5">
                <p className="text-xs text-grappler-500 mb-0.5">BMI</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-grappler-50">{bmi}</span>
                  <span className={cn('text-xs font-medium', bmiCategory?.color)}>{bmiCategory?.label}</span>
                </div>
              </div>
              {calculatedBF !== null && (
                <div className="flex-1 bg-grappler-700/50 rounded-lg p-2.5">
                  <p className="text-xs text-grappler-500 mb-0.5">Body Fat</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-grappler-50">{calculatedBF}%</span>
                    <span className={cn('text-xs font-medium', getBodyFatCategory(calculatedBF, sex).color)}>
                      {getBodyFatCategory(calculatedBF, sex).label}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-grappler-500">
              Add your height in settings to see BMI
            </p>
          )}

          {/* Body Fat Calculator (Navy Method) */}
          <AnimatePresence>
            {showBFCalculator && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-grappler-700/30 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-grappler-400">Navy Method Estimate</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-grappler-500 mb-0.5 block">Waist (cm)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={waistCm}
                        onChange={(e) => setWaistCm(e.target.value)}
                        placeholder="84"
                        className="input text-sm py-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-grappler-500 mb-0.5 block">Neck (cm)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={neckCm}
                        onChange={(e) => setNeckCm(e.target.value)}
                        placeholder="38"
                        className="input text-sm py-1.5"
                      />
                    </div>
                    {sex === 'female' && (
                      <div className="col-span-2">
                        <label className="text-[11px] text-grappler-500 mb-0.5 block">Hip (cm)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={hipCm}
                          onChange={(e) => setHipCm(e.target.value)}
                          placeholder="96"
                          className="input text-sm py-1.5"
                        />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleCalculateBF}
                    disabled={!waistCm || !neckCm || !heightCm}
                    className="btn btn-primary btn-sm w-full"
                  >
                    Calculate
                  </button>
                  {!heightCm && (
                    <p className="text-[11px] text-yellow-400">Add your height in settings first</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-grappler-800/50 rounded-xl p-4 space-y-3">
              <div>
                <label className="text-xs text-grappler-400 mb-1 block">Weight ({weightUnit})</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  placeholder={weightUnit === 'lbs' ? '185' : '84'}
                  className="input"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-grappler-400 mb-1 block">Notes (optional)</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g., morning weight, post-meal..."
                  className="input"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddForm(false)} className="btn btn-secondary btn-sm flex-1">
                  Cancel
                </button>
                <button onClick={handleAdd} className="btn btn-primary btn-sm flex-1">
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chart */}
      {chartData.length >= 2 && (
        <div className="bg-grappler-800/30 rounded-xl p-4">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#9ca3af' }}
              />
              {avgWeight && (
                <ReferenceLine
                  y={avgWeight}
                  stroke="#6366f1"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              )}
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 3 }}
                activeDot={{ r: 5, fill: '#a78bfa' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent entries */}
      {sortedLog.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-grappler-400 uppercase tracking-wide">Recent Entries</p>
          {[...sortedLog].reverse().slice(0, 5).map(entry => (
            <div key={entry.id} className="flex items-center justify-between py-2 border-b border-grappler-800 last:border-0">
              <div>
                <p className="text-sm text-grappler-200 font-medium">
                  {entry.weight} {entry.unit}
                </p>
                <p className="text-xs text-grappler-500">
                  {new Date(entry.date).toLocaleDateString()}
                  {entry.notes && ` — ${entry.notes}`}
                </p>
              </div>
              <button
                onClick={() => deleteBodyWeight(entry.id)}
                className="p-1.5 rounded hover:bg-grappler-700 text-grappler-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {sortedLog.length === 0 && !showAddForm && (
        <p className="text-sm text-grappler-500 text-center py-6">
          No body weight entries yet. Tap &quot;Log&quot; to start tracking.
        </p>
      )}
    </div>
  );
}
