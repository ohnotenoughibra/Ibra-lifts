'use client';

import { cn } from '@/lib/utils';

interface CoachCueProps {
  quote: string;
  coachName?: string;
  coachTitle?: string;
  coachAvatar?: string;
  className?: string;
}

/**
 * Editorial coaching card — "The Raw Archive" design pattern.
 * Renders AI coach output as an editorial quote block with attribution.
 */
export default function CoachCue({
  quote,
  coachName = 'The Archive',
  coachTitle = 'Roots AI',
  coachAvatar,
  className,
}: CoachCueProps) {
  return (
    <div className={cn('bg-grappler-800/30 py-6 px-5', className)}>
      {/* Section label */}
      <div className="label-editorial mb-4">
        Coach&apos;s Cue
      </div>

      {/* Quote mark */}
      <div className="text-grappler-600 text-4xl font-display leading-none mb-1 select-none">&ldquo;</div>

      {/* Editorial quote */}
      <blockquote className="editorial-quote text-base leading-relaxed">
        {quote}
      </blockquote>

      {/* Attribution */}
      <div className="flex items-center gap-3 mt-4 pt-3">
        {coachAvatar ? (
          <img
            src={coachAvatar}
            alt={coachName}
            className="w-8 h-8 rounded-sm object-cover photo-archival"
          />
        ) : (
          <div className="w-8 h-8 rounded-sm bg-grappler-700 flex items-center justify-center">
            <span className="text-xs font-data font-bold text-grappler-300">
              {coachName.charAt(0)}
            </span>
          </div>
        )}
        <div>
          <div className="text-sm font-bold text-grappler-100 tracking-tight">{coachName}</div>
          <div className="text-xs text-grappler-500 uppercase tracking-widest">{coachTitle}</div>
        </div>
      </div>
    </div>
  );
}
