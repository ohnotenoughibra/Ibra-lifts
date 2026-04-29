'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Loader2, Image as ImageIcon } from 'lucide-react';
import { renderFightCard, type FightCardData, type FightCardAspect } from '@/lib/fight-card-renderer';

interface FightCardModalProps {
  data: FightCardData;
  open: boolean;
  onClose: () => void;
}

/**
 * Modal that previews the Fight Card and offers Share / Download.
 * Renders the card to canvas on mount, shows a preview image,
 * then uses Web Share API (with file) or falls back to download.
 */
export default function FightCardModal({ data, open, onClose }: FightCardModalProps) {
  const [aspect, setAspect] = useState<FightCardAspect>('story');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [rendering, setRendering] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  // Render the card whenever data or aspect changes
  const generate = useCallback(async () => {
    setRendering(true);
    setError(null);
    try {
      const b = await renderFightCard(data, aspect);
      setBlob(b);
      // Revoke previous object URL to avoid leaks
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
      const url = URL.createObjectURL(b);
      prevUrlRef.current = url;
      setPreviewUrl(url);
    } catch (e) {
      console.error('Fight card render failed:', e);
      setError('Failed to generate card');
    } finally {
      setRendering(false);
    }
  }, [data, aspect]);

  useEffect(() => {
    if (open) generate();
    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = null;
      }
    };
  }, [open, generate]);

  const handleShare = async () => {
    if (!blob) return;
    setSharing(true);
    try {
      const file = new File([blob], 'fight-card.png', { type: 'image/png' });

      if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Workout Complete',
          text: `${data.athleteName} just crushed a ${data.grade}-grade session`,
        });
      } else {
        // Fallback: download
        downloadBlob(blob);
      }
    } catch (e: unknown) {
      // User cancelled share — not an error
      if (e instanceof Error && e.name !== 'AbortError') {
        downloadBlob(blob);
      }
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = () => {
    if (blob) downloadBlob(blob);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="fight-card-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={onClose}
        >
          <motion.div
            key="fight-card-modal"
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-sm bg-grappler-900 border border-grappler-700/50 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-grappler-800">
              <h3 className="text-sm font-bold text-grappler-200 uppercase tracking-wider">Fight Card</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-grappler-500 hover:text-grappler-300 hover:bg-grappler-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Aspect toggle */}
            <div className="flex gap-2 px-4 pt-3">
              <button
                onClick={() => setAspect('story')}
                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors ${
                  aspect === 'story'
                    ? 'bg-grappler-700 text-grappler-100'
                    : 'text-grappler-500 hover:text-grappler-300'
                }`}
              >
                Story (9:16)
              </button>
              <button
                onClick={() => setAspect('square')}
                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors ${
                  aspect === 'square'
                    ? 'bg-grappler-700 text-grappler-100'
                    : 'text-grappler-500 hover:text-grappler-300'
                }`}
              >
                Post (1:1)
              </button>
            </div>

            {/* Preview */}
            <div className="px-4 py-3">
              <div
                className="relative w-full rounded-xl overflow-hidden bg-grappler-950 flex items-center justify-center"
                style={{ aspectRatio: aspect === 'story' ? '9/16' : '1/1' }}
              >
                {rendering && (
                  <div className="absolute inset-0 flex items-center justify-center bg-grappler-950/80 z-10">
                    <Loader2 className="w-6 h-6 text-grappler-400 animate-spin" />
                  </div>
                )}
                {error && (
                  <div className="text-sm text-red-400 text-center px-4">{error}</div>
                )}
                {previewUrl && !error && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Fight Card Preview"
                    className="w-full h-full object-contain"
                  />
                )}
                {!previewUrl && !rendering && !error && (
                  <ImageIcon className="w-8 h-8 text-grappler-700" />
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-4 pb-4">
              <button
                onClick={handleDownload}
                disabled={!blob || rendering}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl border border-grappler-600/40 text-grappler-300 bg-grappler-800/50 hover:bg-grappler-700/60 disabled:opacity-40 transition-colors"
              >
                <Download className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleShare}
                disabled={!blob || rendering || sharing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl border border-green-500/30 text-green-300 bg-green-500/10 hover:bg-green-500/20 disabled:opacity-40 transition-colors"
              >
                {sharing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                Share
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Helpers ────────────────────────────────────────────────

function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fight-card-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
