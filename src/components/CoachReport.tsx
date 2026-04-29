'use client';

/**
 * CoachReport — share a read-only summary with your coach.
 */

import { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { buildCoachReport, shareCoachReport } from '@/lib/coach-report';
import { useToast } from './Toast';
import { ToolShell, Section, PrimaryCTA } from './_ToolShell';

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
    <ToolShell
      onClose={onClose}
      eyebrow="IBRA / 06 · COACH REPORT"
      title={<>Send a<br/>snapshot.</>}
      description="Read-only summary of training, recovery, body weight, and active injuries. Send before a session or weekly."
      footer={
        <PrimaryCTA onClick={handleShare} variant="go">
          {copied ? 'Copied' : 'Share Report'}
        </PrimaryCTA>
      }
    >
      <Section title="Preview">
        <pre className="text-[11px] text-grappler-200 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-96">
{report}
        </pre>
      </Section>

      <button
        onClick={async () => {
          await navigator.clipboard.writeText(report);
          setCopied(true);
          showToast('Copied to clipboard', 'success');
          setTimeout(() => setCopied(false), 2500);
        }}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-grappler-900/60 border border-grappler-800 text-grappler-200 text-sm font-medium hover:bg-grappler-800 transition active:scale-[0.99]"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        Copy text
      </button>

      <p className="text-[10px] text-grappler-500 text-center leading-relaxed">
        v1: text export. Server-hosted shareable URLs are coming.
      </p>
    </ToolShell>
  );
}
