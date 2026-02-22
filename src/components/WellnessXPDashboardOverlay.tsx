'use client';
import { ArrowLeft, Activity } from 'lucide-react';
import WellnessXPDashboard from './WellnessXPDashboard';

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
              <Activity className="w-5 h-5 text-grappler-300" />
              Wellness Tracking
            </h1>
            <p className="text-xs text-grappler-400">Supplements, nutrition, sleep, mobility &mdash; your off-mat habits</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <WellnessXPDashboard />
      </div>
    </div>
  );
}
