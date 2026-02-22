'use client';
import { ArrowLeft, Sparkles } from 'lucide-react';
import WellnessXPDashboard from './WellnessXPDashboard';
import DailyWellnessCheckin from './DailyWellnessCheckin';

export default function WellnessXPDashboardOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="min-h-screen bg-grappler-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-grappler-950/95 backdrop-blur-sm border-b border-grappler-800">
        <div className="flex items-center gap-3 p-4">
          <button onClick={onClose} className="p-2 -ml-2 hover:bg-grappler-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-grappler-300" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-grappler-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Wellness XP
            </h1>
            <p className="text-xs text-grappler-400">Track habits, earn XP, multiply training gains</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <DailyWellnessCheckin />
        <WellnessXPDashboard />
      </div>
    </div>
  );
}
