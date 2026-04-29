'use client';

/**
 * CoachReport — share a read-only summary with your coach.
 *
 * v1: text-based summary, native share API on mobile, clipboard fallback.
 * v2 (later): server-hosted URL the coach can bookmark.
 */

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Share2, Copy, Check, Users } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { buildCoachReport, shareCoachReport } from '@/lib/coach-report';
import { useToast } from './Toast';

interface Props { onClose: () => void }

export default function CoachReport({ onClose }: Props) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const data = useAppStore(useShallow(s => ({
    user: s.user,
    workoutLogs: s.workoutLogs,
    trainingSessions: s.trainingSessions,
    injuryLog: s.injuryLog,
    illnessLogs: s.illnessLogs,
    bodyWeightLog: s.bodyWeightLog,
    competitions: s.competitions,
    gamificationStats: s.gamificationStats,
    latestWhoopData: s.latestWhoopData,
  })));

  const report = useMemo(() => {
    const upcoming = (data.competitions ?? [])
      .filter(c => new Date(c.date).getTime() >= Date.now() - 24 * 60 * 60 * 1000)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    const daysToCompetition = upcoming
      ? Math.ceil((new Date(upcoming.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return buildCoachReport({
      user: data.user,
      workoutLogs: data.workoutLogs ?? [],
      trainingSessions: data.trainingSessions ?? [],
      injuryLog: data.injuryLog ?? [],
      illnessLogs: data.illnessLogs ?? [],
      bodyWeightLog: data.bodyWeightLog ?? [],
      currentStreak: data.gamificationStats?.currentStreak ?? 0,
      recoveryScore: data.latestWhoopData?.recoveryScore ?? null,
      daysToCompetition,
      competitionType: upcoming?.type,
      weightCutTarget: upcoming?.weightClass,
    });
  }, [data]);

  const handleShare = async () => {
    const result = await shareCoachReport(report, data.user?.name ?? 'Athlete');
    if (result === 'shared') {
      showToast('Shared', 'success');
    } else if (result === 'clipboard') {
      setCopied(true);
      showToast('Copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2500);
    } else {
      showToast('Could not share — copy manually below', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-grappler-950 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-grappler-950/95 backdrop-blur border-b border-grappler-800 px-4 py-3 safe-area-top flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" />
          <div>
            <h1 className="text-lg font-bold text-white">Coach Report</h1>
            <p className="text-[11px] text-grappler-400">Share with your coach</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="p-3 -mr-1 hover:bg-grappler-800 rounded-lg active:scale-95 transition">
          <X className="w-5 h-5 text-grappler-300" />
        </button>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto pb-24 space-y-4">
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
          <p className="text-sm text-emerald-100">
            A read-only snapshot of your training, recovery, body weight, and any active injuries.
            Send it before a session, before a fight, or weekly to keep your coach in the loop.
          </p>
        </div>

        <motion.button
          onClick={handleShare}
          whileTap={{ scale: 0.98 }}
          className="w-full px-5 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold transition flex items-center justify-center gap-2"
        >
          {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
          {copied ? 'Copied' : 'Share Report'}
        </motion.button>

        <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4">
          <pre className="text-[11px] text-grappler-200 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
{report}
          </pre>
        </div>

        <button
          onClick={async () => {
            await navigator.clipboard.writeText(report);
            setCopied(true);
            showToast('Copied to clipboard', 'success');
            setTimeout(() => setCopied(false), 2500);
          }}
          className="w-full px-4 py-2.5 rounded-xl bg-grappler-800/60 hover:bg-grappler-800 text-grappler-200 text-sm font-medium transition flex items-center justify-center gap-2"
        >
          <Copy className="w-4 h-4" />
          Copy text
        </button>

        <p className="text-[11px] text-grappler-500 text-center px-4">
          v1: text export. Server-hosted shareable URLs are coming.
        </p>
      </div>
    </div>
  );
}
