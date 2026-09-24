'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { syncWhoop } from '@/lib/whoop-sync';
import { cn } from '@/lib/utils';

function ago(iso: string, now: number): string {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

/**
 * "Whoop · updated 3 min ago" under the readiness ring. Renders nothing when
 * Whoop has never synced on this device. Tap = sync now. Errors are shown
 * instead of swallowed (the old background sync failed silently).
 */
export default function WhoopFreshness({ onReconnect }: { onReconnect?: () => void }) {
  const status = useAppStore(s => s.whoopSync);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);

  if (!status?.lastSuccessAt && !status?.lastError) return null;
  const failing = !!status.lastError && (!status.lastSuccessAt || Date.parse(status.lastAttemptAt ?? '') >= Date.parse(status.lastSuccessAt));
  const needsReconnect = failing && /reconnect/i.test(status.lastError ?? '');

  return (
    <button
      onClick={async () => {
        if (needsReconnect) { onReconnect?.(); return; }
        setBusy(true);
        try { await syncWhoop({ force: true }); } finally { setBusy(false); }
      }}
      className={cn('mt-1 inline-flex items-center gap-1.5 text-xs min-h-[32px] px-2 rounded-md',
        failing ? 'text-amber-400' : 'text-grappler-400 hover:text-grappler-200')}
      aria-label={needsReconnect ? 'Reconnect Whoop' : 'Sync Whoop now'}
    >
      {failing ? <AlertCircle className="w-3.5 h-3.5" /> : <RefreshCw className={cn('w-3.5 h-3.5', busy && 'animate-spin')} />}
      {failing
        ? (needsReconnect ? 'Whoop disconnected — tap to reconnect' : `Whoop sync failed · tap to retry`)
        : `Whoop · updated ${ago(status.lastSuccessAt!, now)}`}
    </button>
  );
}
