'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Scale, Plus, Trash2, TrendingUp, TrendingDown, Minus as TrendFlat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function BodyWeightTracker() {
  const { bodyWeightLog, addBodyWeight, deleteBodyWeight, user } = useAppStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const weightUnit = user?.weightUnit || 'lbs';

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
