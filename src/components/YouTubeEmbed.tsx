'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ExternalLink } from 'lucide-react';

interface YouTubeEmbedProps {
  exerciseName: string;
  videoUrl?: string;
  onClose: () => void;
}

/**
 * Extracts a YouTube video ID from various URL formats.
 * Returns null if the URL is not a direct video link.
 */
function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    // youtube.com/watch?v=ID
    if (parsed.hostname.includes('youtube.com') && parsed.searchParams.get('v')) {
      return parsed.searchParams.get('v');
    }
    // youtu.be/ID
    if (parsed.hostname === 'youtu.be' && parsed.pathname.length > 1) {
      return parsed.pathname.slice(1).split('/')[0];
    }
    // youtube.com/embed/ID
    if (parsed.pathname.startsWith('/embed/')) {
      return parsed.pathname.split('/')[2];
    }
  } catch {
    // Not a valid URL
  }
  return null;
}

/**
 * Builds a clean search query from exercise name.
 */
function buildSearchQuery(exerciseName: string, videoUrl?: string): string {
  if (videoUrl) {
    try {
      const url = new URL(videoUrl);
      const searchQuery = url.searchParams.get('search_query');
      if (searchQuery) return searchQuery.replace(/\+/g, ' ');
    } catch { /* not a URL */ }
  }
  return `${exerciseName} proper form technique`;
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
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [searchUrl, setSearchUrl] = useState<string>('');

  const query = buildSearchQuery(exerciseName, videoUrl);

  useEffect(() => {
    // If we have a direct video URL with an ID, embed it directly
    const videoId = videoUrl ? extractVideoId(videoUrl) : null;
    if (videoId) {
      setEmbedUrl(`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`);
      setSearchUrl(`https://www.youtube.com/watch?v=${videoId}`);
      return;
    }

    // Otherwise, try to find a video via YouTube oEmbed (no API key needed)
    // We search by building a YouTube search URL and let the user tap through
    const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    setSearchUrl(ytSearchUrl);

    // Try to get a video via oembed for the search query
    // Use a well-known form video channel approach
    const fetchVideo = async () => {
      try {
        // Use YouTube's oembed to test if a constructed URL works
        // For common exercises, try the exercise name directly
        const testUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        setSearchUrl(testUrl);

        // Use the piped.video or invidious API as a free search proxy
        // Fallback: just show the search link
        const res = await fetch(
          `https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}&filter=videos`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (res.ok) {
          const data = await res.json();
          const items = data.items || data;
          if (Array.isArray(items) && items.length > 0) {
            const firstVideo = items[0];
            const id = firstVideo.url?.replace('/watch?v=', '') || firstVideo.videoId;
            if (id) {
              setEmbedUrl(`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`);
              setSearchUrl(`https://www.youtube.com/watch?v=${id}`);
              return;
            }
          }
        }
      } catch {
        // API not available — fall through to search link
      }

      // Fallback: no embed, just show search link
      setEmbedUrl(null);
      setIsLoading(false);
    };

    fetchVideo();
  }, [exerciseName, videoUrl, query]);

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
          className="relative z-10 w-full max-w-3xl rounded-lg overflow-hidden bg-grappler-900 border border-grappler-700/50 shadow-2xl"
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
            {isLoading && embedUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-grappler-900 gap-3">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                <p className="text-sm text-grappler-400">Loading form video...</p>
              </div>
            )}

            {/* YouTube iframe — only when we have a direct video ID */}
            {embedUrl ? (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={embedUrl}
                title={`${exerciseName} form video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={handleIframeLoad}
              />
            ) : (
              /* Fallback: prompt user to open YouTube search */
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-grappler-900 gap-4 px-6">
                <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-red-500" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
                <p className="text-sm text-grappler-300 text-center">
                  Search YouTube for <span className="text-grappler-100 font-medium">{exerciseName}</span> form
                </p>
                <a
                  href={searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 text-white font-medium text-sm active:bg-red-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open on YouTube
                </a>
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-5 py-2.5 bg-grappler-800/60 border-t border-grappler-700/30">
            <div className="flex items-center justify-between">
              <p className="text-xs text-grappler-400">
                {embedUrl ? `Showing: "${query}"` : `Search: "${query}"`}
              </p>
              <a
                href={searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-400 flex items-center gap-1"
              >
                Open in YouTube <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
