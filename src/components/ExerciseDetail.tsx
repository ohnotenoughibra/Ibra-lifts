'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Dumbbell,
  Target,
  Zap,
  Sparkles,
  Shield,
  Video,
  Info,
  X,
} from 'lucide-react';
import { Exercise, MuscleGroup } from '@/lib/types';

interface ExerciseDetailProps {
  exercise: Exercise;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// SVG body diagram – muscle region coordinate map
// Each entry defines the SVG path or rect used to highlight a muscle group
// on a simplified front-view human figure.
// ---------------------------------------------------------------------------

const PRIMARY_COLOR = '#38bdf8';   // bright sky-blue
const SECONDARY_COLOR = '#1e3a5f'; // dim navy-blue
const BODY_OUTLINE = '#334155';    // grappler-700
const BODY_FILL = '#1e293b';       // grappler-800

interface MuscleRegion {
  label: string;
  /** SVG path d attribute for the muscle highlight region */
  d: string;
}

/**
 * Mapping from MuscleGroup enum values to SVG path data.
 * The paths are drawn on a 200x400 viewBox with a front-facing figure.
 */
const muscleRegions: Record<string, MuscleRegion> = {
  chest: {
    label: 'Chest',
    d: 'M72,120 Q80,110 100,110 Q120,110 128,120 L130,140 Q115,148 100,150 Q85,148 70,140 Z',
  },
  shoulders: {
    label: 'Shoulders',
    d: 'M55,105 Q60,95 72,100 L72,120 L60,125 Q50,118 55,105 Z M145,105 Q140,95 128,100 L128,120 L140,125 Q150,118 145,105 Z',
  },
  biceps: {
    label: 'Biceps',
    d: 'M55,130 Q50,128 48,140 L46,165 Q50,170 56,168 L60,140 Z M145,130 Q150,128 152,140 L154,165 Q150,170 144,168 L140,140 Z',
  },
  triceps: {
    label: 'Triceps',
    d: 'M60,130 L64,128 L66,155 Q62,160 58,158 L56,140 Z M140,130 L136,128 L134,155 Q138,160 142,158 L144,140 Z',
  },
  forearms: {
    label: 'Forearms',
    d: 'M44,170 Q42,175 40,195 L38,210 Q42,213 46,210 L50,190 Q52,178 48,170 Z M156,170 Q158,175 160,195 L162,210 Q158,213 154,210 L150,190 Q148,178 152,170 Z',
  },
  core: {
    label: 'Core',
    d: 'M78,152 L122,152 L124,210 Q112,218 100,220 Q88,218 76,210 Z',
  },
  lats: {
    label: 'Lats',
    d: 'M68,130 L76,140 L76,170 Q72,175 66,168 L62,140 Z M132,130 L124,140 L124,170 Q128,175 134,168 L138,140 Z',
  },
  traps: {
    label: 'Traps',
    d: 'M78,88 Q88,82 100,80 Q112,82 122,88 L128,100 Q114,104 100,105 Q86,104 72,100 Z',
  },
  back: {
    label: 'Back',
    // Represented as a thin strip behind chest/lats on front view
    d: 'M76,120 L80,115 L120,115 L124,120 L124,145 Q112,150 100,150 Q88,150 76,145 Z',
  },
  quadriceps: {
    label: 'Quads',
    d: 'M78,225 Q82,220 90,222 L92,280 Q88,290 82,288 L76,260 Z M122,225 Q118,220 110,222 L108,280 Q112,290 118,288 L124,260 Z',
  },
  hamstrings: {
    label: 'Hamstrings',
    d: 'M82,228 L90,225 L92,275 L86,280 L80,260 Z M118,228 L110,225 L108,275 L114,280 L120,260 Z',
  },
  glutes: {
    label: 'Glutes',
    d: 'M78,210 Q88,218 100,220 Q112,218 122,210 L124,230 Q112,238 100,240 Q88,238 76,230 Z',
  },
  calves: {
    label: 'Calves',
    d: 'M80,295 Q84,290 88,292 L90,340 Q86,346 82,344 L78,320 Z M120,295 Q116,290 112,292 L110,340 Q114,346 118,344 L122,320 Z',
  },
  full_body: {
    label: 'Full Body',
    d: '',
  },
};

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function ValueBar({ value, max = 10, label, color }: { value: number; max?: number; label: string; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-grappler-400 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-grappler-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-semibold text-grappler-200 w-6 text-right">{value}</span>
    </div>
  );
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'primary' | 'accent' | 'success' }) {
  const colors: Record<string, string> = {
    default: 'bg-grappler-700/60 text-grappler-300 border-grappler-600/40',
    primary: 'bg-primary-500/15 text-primary-300 border-primary-500/30',
    accent: 'bg-accent-500/15 text-accent-300 border-accent-500/30',
    success: 'bg-green-500/15 text-green-400 border-green-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${colors[variant]}`}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// SVG Body Diagram
// ---------------------------------------------------------------------------

function BodyDiagram({
  primaryMuscles,
  secondaryMuscles,
}: {
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
}) {
  const isPrimary = (group: string) => primaryMuscles.includes(group as MuscleGroup);
  const isSecondary = (group: string) => secondaryMuscles.includes(group as MuscleGroup);

  const getFillColor = (group: string): string => {
    if (isPrimary(group)) return PRIMARY_COLOR;
    if (isSecondary(group)) return SECONDARY_COLOR;
    return 'transparent';
  };

  const getFillOpacity = (group: string): number => {
    if (isPrimary(group)) return 0.55;
    if (isSecondary(group)) return 0.4;
    return 0;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox="0 0 200 400"
        className="w-full max-w-[180px] h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Body outline */}
        {/* Head */}
        <ellipse cx="100" cy="55" rx="22" ry="26" fill={BODY_FILL} stroke={BODY_OUTLINE} strokeWidth="1.5" />
        {/* Neck */}
        <rect x="91" y="78" width="18" height="14" rx="4" fill={BODY_FILL} stroke={BODY_OUTLINE} strokeWidth="1.5" />
        {/* Torso */}
        <path
          d="M72,100 Q60,102 55,110 L48,140 L40,195 L38,215 Q42,218 50,215 L56,190 L60,170 L66,155 L70,210 Q88,222 100,224 Q112,222 130,210 L134,155 L140,170 L144,190 L150,215 Q158,218 162,215 L160,195 L152,140 L145,110 Q140,102 128,100 Z"
          fill={BODY_FILL}
          stroke={BODY_OUTLINE}
          strokeWidth="1.5"
        />
        {/* Left leg */}
        <path
          d="M78,222 L74,280 L72,340 L68,365 Q76,372 88,368 L92,340 L90,280 L90,222"
          fill={BODY_FILL}
          stroke={BODY_OUTLINE}
          strokeWidth="1.5"
        />
        {/* Right leg */}
        <path
          d="M122,222 L126,280 L128,340 L132,365 Q124,372 112,368 L108,340 L110,280 L110,222"
          fill={BODY_FILL}
          stroke={BODY_OUTLINE}
          strokeWidth="1.5"
        />

        {/* Muscle highlight layers */}
        {Object.entries(muscleRegions).map(([group, region]) => {
          if (!region.d || group === 'full_body') return null;
          const fill = getFillColor(group);
          const opacity = getFillOpacity(group);
          if (opacity === 0) return null;
          return (
            <path
              key={group}
              d={region.d}
              fill={fill}
              fillOpacity={opacity}
              stroke={fill}
              strokeWidth="0.5"
              strokeOpacity={opacity + 0.2}
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-grappler-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: PRIMARY_COLOR, opacity: 0.7 }} />
          Primary
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: SECONDARY_COLOR, opacity: 0.7 }} />
          Secondary
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelVariants = {
  hidden: { opacity: 0, x: 80 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', damping: 28, stiffness: 280 },
  },
  exit: {
    opacity: 0,
    x: 60,
    transition: { duration: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

function formatMovementPattern(pattern: string): string {
  return pattern
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatCategory(cat: string): string {
  return cat
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatEquipment(eq: string): string {
  return eq
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatMuscle(m: string): string {
  return m
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function ExerciseDetail({ exercise, onClose }: ExerciseDetailProps) {
  const [showVideo, setShowVideo] = useState(false);

  const videoQuery = `${exercise.name} proper form technique`;
  const embedUrl = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(videoQuery)}&rel=0&modestbranding=1`;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        {/* Full-screen panel */}
        <motion.div
          className="relative z-10 flex flex-col w-full h-full bg-grappler-900 overflow-y-auto no-scrollbar"
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Top bar */}
          <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-grappler-900/95 backdrop-blur-md border-b border-grappler-700/40">
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-grappler-400 hover:text-grappler-100 hover:bg-grappler-800 transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-grappler-50 truncate flex-1">
              {exercise.name}
            </h1>
            {exercise.grapplerFriendly && (
              <Badge variant="success">
                <Shield className="w-3 h-3" />
                Grappler
              </Badge>
            )}
          </div>

          {/* Content */}
          <motion.div
            className="flex-1 p-4 pb-8 space-y-6 max-w-2xl mx-auto w-full"
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.07 }}
          >
            {/* Description */}
            <motion.div variants={itemVariants} className="card p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary-400">
                <Info className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">About</span>
              </div>
              <p className="text-sm text-grappler-300 leading-relaxed">
                {exercise.description}
              </p>
            </motion.div>

            {/* Body diagram + muscle lists */}
            <motion.div variants={itemVariants} className="card p-4">
              <div className="flex items-center gap-2 text-primary-400 mb-4">
                <Target className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Muscles Worked</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* SVG diagram */}
                <BodyDiagram
                  primaryMuscles={exercise.primaryMuscles}
                  secondaryMuscles={exercise.secondaryMuscles}
                />

                {/* Muscle lists */}
                <div className="flex-1 space-y-4 w-full">
                  <div>
                    <h4 className="text-xs font-semibold text-grappler-400 uppercase mb-2">Primary</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {exercise.primaryMuscles.map((m) => (
                        <span
                          key={m}
                          className="px-2 py-0.5 rounded text-xs font-medium border"
                          style={{
                            backgroundColor: `${PRIMARY_COLOR}20`,
                            borderColor: `${PRIMARY_COLOR}40`,
                            color: PRIMARY_COLOR,
                          }}
                        >
                          {formatMuscle(m)}
                        </span>
                      ))}
                    </div>
                  </div>
                  {exercise.secondaryMuscles.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-grappler-400 uppercase mb-2">Secondary</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {exercise.secondaryMuscles.map((m) => (
                          <span
                            key={m}
                            className="px-2 py-0.5 rounded text-xs font-medium border"
                            style={{
                              backgroundColor: `${SECONDARY_COLOR}30`,
                              borderColor: `${SECONDARY_COLOR}60`,
                              color: '#7dd3fc',
                            }}
                          >
                            {formatMuscle(m)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Form cues */}
            {exercise.cues.length > 0 && (
              <motion.div variants={itemVariants} className="card p-4">
                <div className="flex items-center gap-2 text-primary-400 mb-3">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Form Cues</span>
                </div>
                <ul className="space-y-2">
                  {exercise.cues.map((cue, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-grappler-300">
                      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-primary-500/15 text-primary-400 flex items-center justify-center text-[10px] font-bold">
                        {i + 1}
                      </span>
                      {cue}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Badges row – category, pattern, equipment */}
            <motion.div variants={itemVariants} className="card p-4">
              <div className="flex items-center gap-2 text-primary-400 mb-3">
                <Dumbbell className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Details</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="primary">{formatCategory(exercise.category)}</Badge>
                <Badge variant="accent">{formatMovementPattern(exercise.movementPattern)}</Badge>
                {exercise.equipmentRequired.map((eq) => (
                  <Badge key={eq}>{formatEquipment(eq)}</Badge>
                ))}
                {exercise.grapplerFriendly && (
                  <Badge variant="success">
                    <Shield className="w-3 h-3" />
                    Grappler Friendly
                  </Badge>
                )}
              </div>
            </motion.div>

            {/* Value bars */}
            <motion.div variants={itemVariants} className="card p-4 space-y-3">
              <div className="flex items-center gap-2 text-primary-400 mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Ratings</span>
              </div>
              <ValueBar
                label="Aesthetic"
                value={exercise.aestheticValue}
                color="#d946ef"
              />
              <ValueBar
                label="Strength"
                value={exercise.strengthValue}
                color="#ef4444"
              />
            </motion.div>

            {/* Video preview */}
            <motion.div variants={itemVariants} className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2 text-primary-400">
                  <Video className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Form Video</span>
                </div>
                {showVideo && (
                  <button
                    onClick={() => setShowVideo(false)}
                    className="p-1 rounded text-grappler-400 hover:text-grappler-100 hover:bg-grappler-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!showVideo ? (
                <button
                  onClick={() => setShowVideo(true)}
                  className="w-full px-4 pb-4 group"
                >
                  <div className="relative w-full rounded-lg overflow-hidden bg-grappler-800 border border-grappler-700/50"
                    style={{ paddingBottom: '56.25%' }}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 transition-colors group-hover:bg-grappler-700/30">
                      <div className="w-14 h-14 rounded-full bg-primary-500/20 border border-primary-500/40 flex items-center justify-center group-hover:bg-primary-500/30 transition-colors">
                        <Video className="w-6 h-6 text-primary-400" />
                      </div>
                      <span className="text-sm text-grappler-400 group-hover:text-grappler-200 transition-colors">
                        Tap to watch form guide
                      </span>
                    </div>
                  </div>
                </button>
              ) : (
                <div className="px-4 pb-4">
                  <div className="relative w-full rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      className="absolute inset-0 w-full h-full rounded-lg"
                      src={embedUrl}
                      title={`${exercise.name} form video`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
