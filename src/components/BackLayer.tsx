'use client';

import { useBackLayer, LAYER_RANK } from '@/lib/back-stack';

/**
 * Drop inside any conditionally-rendered sheet / modal / dialog:
 *
 *   {open && (<div className="fixed inset-0 …"><BackLayer onBack={close} />…</div>)}
 *
 * While it's mounted, the system back button (Android back, browser back,
 * Safari edge-swipe) closes that sheet instead of the whole screen or app.
 * Renders nothing.
 */
export default function BackLayer({ onBack, rank = LAYER_RANK.sheet }: { onBack: () => void; rank?: number }) {
  useBackLayer(true, onBack, rank);
  return null;
}
