'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Heart,
  BarChart3,
  Battery,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const RecoveryCoachTab = dynamic(() => import('./recovery-tabs/RecoveryCoachTab'), { ssr: false });
const RecoveryAnalyticsTab = dynamic(() => import('./recovery-tabs/RecoveryAnalyticsTab'), { ssr: false });
const FatigueDeloadTab = dynamic(() => import('./recovery-tabs/FatigueDeloadTab'), { ssr: false });

interface RecoveryHubProps {
  onClose: () => void;
  initialTab?: 'readiness' | 'analytics' | 'deload';
}

const TABS = [
  { id: 'readiness' as const, label: 'Readiness', icon: Heart },
  { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  { id: 'deload' as const, label: 'Deload', icon: Battery },
];

export default function RecoveryHub({ onClose, initialTab = 'readiness' }: RecoveryHubProps) {
  const [activeTab, setActiveTab] = useState<'readiness' | 'analytics' | 'deload'>(initialTab);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="min-h-screen bg-grappler-900 bg-mesh pb-24 safe-area-top"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-grappler-900/80 backdrop-blur-xl border-b border-grappler-800">
        <div className="px-4 py-3 flex items-center gap-3">
          <button aria-label="Go back" onClick={onClose} className="btn btn-ghost btn-sm p-1">
            <ChevronLeft className="w-5 h-5 text-grappler-200" />
          </button>
          <div>
            <h1 className="font-bold text-grappler-50 text-lg leading-tight">
              Recovery Hub
            </h1>
            <p className="text-xs text-grappler-400">
              Readiness, analytics &amp; deload planning
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex px-4 gap-1 pb-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
                  isActive
                    ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                    : 'text-grappler-500 hover:text-grappler-300 hover:bg-grappler-800/50'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Tab content */}
      <div className="px-4 py-4 max-w-lg mx-auto">
        {activeTab === 'readiness' && <RecoveryCoachTab />}
        {activeTab === 'analytics' && <RecoveryAnalyticsTab />}
        {activeTab === 'deload' && <FatigueDeloadTab />}
      </div>
    </motion.div>
  );
}
