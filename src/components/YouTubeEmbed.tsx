'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';

interface YouTubeEmbedProps {
  exerciseName: string;
  videoUrl?: string;
  onClose: () => void;
}

/**
 * Extracts a clean search query from the exercise name or an existing YouTube search URL.
 * Falls back to the exercise name + "proper form technique" for the embed search.
 */
function buildEmbedQuery(exerciseName: string, videoUrl?: string): string {
  if (videoUrl) {
    try {
      const url = new URL(videoUrl);
      const searchQuery = url.searchParams.get('search_query');
      if (searchQuery) {
        // YouTube search URLs encode spaces as +
        return searchQuery.replace(/\+/g, ' ');
      }
    } catch {
      // Not a valid URL, fall through
    }
  }
  return `${exerciseName} proper form technique`;
}

/**
 * Builds a YouTube embed URL that performs an inline search, so the user
 * never leaves the app. Uses listType=search to auto-play the top result.
 */
function buildEmbedUrl(query: string): string {
  return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1&rel=0&modestbranding=1`;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 40 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 300 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2 },
  },
};

export default function YouTubeEmbed({ exerciseName, videoUrl, onClose }: YouTubeEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);

  const query = buildEmbedQuery(exerciseName, videoUrl);
  const embedUrl = buildEmbedUrl(query);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={handleOverlayClick}
        />

        {/* Modal */}
        <motion.div
          className="relative z-10 w-full max-w-3xl rounded-2xl overflow-hidden bg-grappler-900 border border-grappler-700/50 shadow-2xl"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 bg-grappler-800/80 border-b border-grappler-700/50">
            <h3 className="text-sm font-semibold text-grappler-100 truncate pr-4">
              {exerciseName} — Form Guide
            </h3>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1.5 rounded-lg text-grappler-400 hover:text-grappler-100 hover:bg-grappler-700 transition-colors"
              aria-label="Close video"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Video container — 16:9 aspect ratio */}
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            {/* Loading state */}
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-grappler-900 gap-3">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                <p className="text-sm text-grappler-400">Loading form video...</p>
              </div>
            )}

            {/* YouTube iframe */}
            <iframe
              className="absolute inset-0 w-full h-full"
              src={embedUrl}
              title={`${exerciseName} form video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={handleIframeLoad}
            />
          </div>

          {/* Footer hint */}
          <div className="px-5 py-2.5 bg-grappler-800/60 border-t border-grappler-700/30">
            <p className="text-xs text-grappler-500 text-center">
              Showing top-rated result for &quot;{query}&quot;
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
