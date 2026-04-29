'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  Plus,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Image,
  GitCompareArrows,
  Clock,
  Scale,
  StickyNote,
  Check,
  AlertTriangle,
} from 'lucide-react';
import EmptyState from './EmptyState';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProgressPhoto {
  id: string;
  date: string; // ISO date
  dataUrl: string; // base64
  pose: 'front' | 'side' | 'back' | 'custom';
  bodyweight?: number;
  notes?: string;
}

type Tab = 'gallery' | 'compare' | 'timeline';
type PoseFilter = 'all' | 'front' | 'side' | 'back' | 'custom';

const STORAGE_KEY = 'roots-progress-photos';
const MAX_IMAGE_WIDTH = 800;

const POSE_LABELS: Record<ProgressPhoto['pose'], string> = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
  custom: 'Custom',
};

const POSE_COLORS: Record<ProgressPhoto['pose'], string> = {
  front: 'bg-blue-500/20 text-blue-400',
  side: 'bg-amber-500/20 text-amber-400',
  back: 'bg-emerald-500/20 text-emerald-400',
  custom: 'bg-purple-500/20 text-purple-400',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function loadPhotos(): ProgressPhoto[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePhotos(photos: ProgressPhoto[]): { success: boolean; error?: string } {
  if (typeof window === 'undefined') return { success: false, error: 'SSR' };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
    return { success: true };
  } catch {
    return { success: false, error: 'Storage full. Delete some photos to free up space.' };
  }
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > MAX_IMAGE_WIDTH) {
          height = Math.round((height * MAX_IMAGE_WIDTH) / width);
          width = MAX_IMAGE_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function timeGapLabel(olderIso: string, newerIso: string): string {
  const diffMs = new Date(newerIso).getTime() - new Date(olderIso).getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Same day';
  if (days === 1) return '1 day later';
  if (days < 7) return `${days} days later`;
  if (days < 14) return '1 week later';
  const weeks = Math.round(days / 7);
  if (days < 30) return `${weeks} weeks later`;
  if (days < 60) return '1 month later';
  const months = Math.round(days / 30);
  if (days < 365) return `${months} months later`;
  const years = Math.round(days / 365);
  return years === 1 ? '1 year later' : `${years} years later`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PhotoProgress({ onClose }: { onClose: () => void }) {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('gallery');
  const [poseFilter, setPoseFilter] = useState<PoseFilter>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<ProgressPhoto | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Compare tab state
  const [compareLeft, setCompareLeft] = useState<ProgressPhoto | null>(null);
  const [compareRight, setCompareRight] = useState<ProgressPhoto | null>(null);
  const [pickingSlot, setPickingSlot] = useState<'left' | 'right' | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    setPhotos(loadPhotos());
  }, []);

  // Sorted collections
  const newestFirst = useMemo(
    () => [...photos].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [photos]
  );

  const oldestFirst = useMemo(
    () => [...photos].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [photos]
  );

  const filteredPhotos = useMemo(
    () => (poseFilter === 'all' ? newestFirst : newestFirst.filter((p) => p.pose === poseFilter)),
    [newestFirst, poseFilter]
  );

  // Add photo handler
  const handleAddPhoto = useCallback(
    (photo: Omit<ProgressPhoto, 'id'>) => {
      const newPhoto: ProgressPhoto = { ...photo, id: generateId() };
      const updated = [...photos, newPhoto];
      const result = savePhotos(updated);
      if (result.success) {
        setPhotos(updated);
        setShowAddModal(false);
        setStorageError(null);
      } else {
        setStorageError(result.error || 'Failed to save photo.');
      }
    },
    [photos]
  );

  // Delete photo handler
  const handleDeletePhoto = useCallback(
    (id: string) => {
      const updated = photos.filter((p) => p.id !== id);
      savePhotos(updated);
      setPhotos(updated);
      setViewingPhoto(null);
      setDeleteConfirmId(null);
      // Clear compare slots if deleted
      if (compareLeft?.id === id) setCompareLeft(null);
      if (compareRight?.id === id) setCompareRight(null);
    },
    [photos, compareLeft, compareRight]
  );

  // Compare navigation
  const handleCompareNav = useCallback(
    (slot: 'left' | 'right', direction: -1 | 1) => {
      const current = slot === 'left' ? compareLeft : compareRight;
      if (!current) return;
      const sorted = newestFirst;
      const idx = sorted.findIndex((p) => p.id === current.id);
      const nextIdx = idx + direction;
      if (nextIdx >= 0 && nextIdx < sorted.length) {
        const next = sorted[nextIdx];
        if (slot === 'left') setCompareLeft(next);
        else setCompareRight(next);
      }
    },
    [compareLeft, compareRight, newestFirst]
  );

  // Tabs config
  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'gallery', label: 'Gallery', icon: <Image className="w-4 h-4" /> },
    { id: 'compare', label: 'Compare', icon: <GitCompareArrows className="w-4 h-4" /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-grappler-950 pb-24 safe-area-top">
      {/* ----------------------------------------------------------------- */}
      {/* Sticky Header                                                      */}
      {/* ----------------------------------------------------------------- */}
      <div className="sticky top-0 z-20 bg-grappler-950 border-b border-grappler-800">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={onClose}
            className="p-2 -ml-2 hover:bg-grappler-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-grappler-300" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-grappler-100 flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary-400" />
              Photo Progress
            </h1>
            <p className="text-xs text-grappler-400">
              {photos.length} photo{photos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Photo
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex px-4 pb-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-grappler-400 hover:text-grappler-200'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Storage error banner */}
      <AnimatePresence>
        {storageError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-300 flex-1">{storageError}</p>
            <button onClick={() => setStorageError(null)} className="text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------------------- */}
      {/* Tab Content                                                        */}
      {/* ----------------------------------------------------------------- */}
      <div className="p-4">
        {activeTab === 'gallery' && (
          <GalleryTab
            photos={filteredPhotos}
            poseFilter={poseFilter}
            onFilterChange={setPoseFilter}
            onViewPhoto={setViewingPhoto}
            onAddPhoto={() => setShowAddModal(true)}
          />
        )}
        {activeTab === 'compare' && (
          <CompareTab
            photos={newestFirst}
            left={compareLeft}
            right={compareRight}
            onPickSlot={setPickingSlot}
            onNavigate={handleCompareNav}
          />
        )}
        {activeTab === 'timeline' && (
          <TimelineTab photos={oldestFirst} onViewPhoto={setViewingPhoto} />
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Modals                                                             */}
      {/* ----------------------------------------------------------------- */}

      {/* Add Photo Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddPhotoModal
            onSave={handleAddPhoto}
            onClose={() => {
              setShowAddModal(false);
              setStorageError(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* View Photo Modal */}
      <AnimatePresence>
        {viewingPhoto && (
          <ViewPhotoModal
            photo={viewingPhoto}
            onClose={() => {
              setViewingPhoto(null);
              setDeleteConfirmId(null);
            }}
            onDelete={handleDeletePhoto}
            deleteConfirmId={deleteConfirmId}
            setDeleteConfirmId={setDeleteConfirmId}
          />
        )}
      </AnimatePresence>

      {/* Gallery Picker (for Compare tab) */}
      <AnimatePresence>
        {pickingSlot && (
          <GalleryPickerModal
            photos={newestFirst}
            onSelect={(photo) => {
              if (pickingSlot === 'left') setCompareLeft(photo);
              else setCompareRight(photo);
              setPickingSlot(null);
            }}
            onClose={() => setPickingSlot(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ===========================================================================
// Gallery Tab
// ===========================================================================

function GalleryTab({
  photos,
  poseFilter,
  onFilterChange,
  onViewPhoto,
  onAddPhoto,
}: {
  photos: ProgressPhoto[];
  poseFilter: PoseFilter;
  onFilterChange: (f: PoseFilter) => void;
  onViewPhoto: (p: ProgressPhoto) => void;
  onAddPhoto: () => void;
}) {
  const filters: { id: PoseFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'front', label: 'Front' },
    { id: 'side', label: 'Side' },
    { id: 'back', label: 'Back' },
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <div>
      {/* Pose filter pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
              poseFilter === f.id
                ? 'bg-primary-500 text-white'
                : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {photos.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="No progress photos yet"
          description={poseFilter !== 'all'
            ? `No ${poseFilter} photos found. Try a different filter or add a new photo.`
            : 'Capture your first progress photo to start tracking visual changes.'}
          action={{ label: 'Add Photo', onClick: onAddPhoto }}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <motion.button
              key={photo.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => onViewPhoto(photo)}
              className="group relative bg-grappler-900 rounded-xl overflow-hidden border border-grappler-800 hover:border-grappler-700 transition-colors text-left"
            >
              {/* Thumbnail */}
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={photo.dataUrl}
                  alt={`Progress photo - ${POSE_LABELS[photo.pose]}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Pose badge */}
                <span
                  className={cn(
                    'absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide',
                    POSE_COLORS[photo.pose]
                  )}
                >
                  {POSE_LABELS[photo.pose]}
                </span>
              </div>

              {/* Info below thumbnail */}
              <div className="p-2.5">
                <p className="text-xs text-grappler-300 font-medium">
                  {formatShortDate(photo.date)}
                </p>
                {photo.bodyweight != null && (
                  <p className="text-xs text-grappler-500 mt-0.5 flex items-center gap-1">
                    <Scale className="w-3 h-3" />
                    {photo.bodyweight} lbs
                  </p>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Compare Tab
// ===========================================================================

function CompareTab({
  photos,
  left,
  right,
  onPickSlot,
  onNavigate,
}: {
  photos: ProgressPhoto[];
  left: ProgressPhoto | null;
  right: ProgressPhoto | null;
  onPickSlot: (slot: 'left' | 'right') => void;
  onNavigate: (slot: 'left' | 'right', dir: -1 | 1) => void;
}) {
  if (photos.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-grappler-800 flex items-center justify-center mb-4">
          <GitCompareArrows className="w-8 h-8 text-grappler-500" />
        </div>
        <p className="text-grappler-300 font-medium mb-1">Need at least 2 photos</p>
        <p className="text-sm text-grappler-500 max-w-xs">
          Add more progress photos to compare them side by side.
        </p>
      </div>
    );
  }

  const weightDiff =
    left?.bodyweight != null && right?.bodyweight != null
      ? right.bodyweight - left.bodyweight
      : null;

  return (
    <div>
      {/* Side-by-side slots */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Left slot */}
        <CompareSlot
          photo={left}
          label="Before"
          onSelect={() => onPickSlot('left')}
          onPrev={() => onNavigate('left', 1)}
          onNext={() => onNavigate('left', -1)}
        />
        {/* Right slot */}
        <CompareSlot
          photo={right}
          label="After"
          onSelect={() => onPickSlot('right')}
          onPrev={() => onNavigate('right', 1)}
          onNext={() => onNavigate('right', -1)}
        />
      </div>

      {/* Diff info */}
      {left && right && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-grappler-900 border border-grappler-800 rounded-xl p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-grappler-400">Before</span>
            <span className="text-xs text-grappler-400">After</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-grappler-200">{formatShortDate(left.date)}</span>
            <span className="text-grappler-500 text-xs">
              {timeGapLabel(left.date, right.date)}
            </span>
            <span className="text-grappler-200">{formatShortDate(right.date)}</span>
          </div>
          {weightDiff !== null && (
            <div className="flex items-center justify-between text-sm pt-1 border-t border-grappler-800">
              <span className="text-grappler-300">
                <Scale className="w-3.5 h-3.5 inline mr-1" />
                {left.bodyweight} lbs
              </span>
              <span
                className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  weightDiff > 0
                    ? 'bg-red-500/20 text-red-400'
                    : weightDiff < 0
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-grappler-800 text-grappler-400'
                )}
              >
                {weightDiff > 0 ? '+' : ''}
                {weightDiff.toFixed(1)} lbs
              </span>
              <span className="text-grappler-300">
                {right.bodyweight} lbs
                <Scale className="w-3.5 h-3.5 inline ml-1" />
              </span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function CompareSlot({
  photo,
  label,
  onSelect,
  onPrev,
  onNext,
}: {
  photo: ProgressPhoto | null;
  label: string;
  onSelect: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-grappler-500 uppercase tracking-wider font-semibold mb-1.5 text-center">
        {label}
      </span>
      {photo ? (
        <div className="relative bg-grappler-900 rounded-xl overflow-hidden border border-grappler-800">
          <div className="aspect-[3/4] relative">
            <img
              src={photo.dataUrl}
              alt={`${label} photo`}
              className="w-full h-full object-cover"
            />
            {/* Nav arrows */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="absolute left-1 top-1/2 -translate-y-1/2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="p-2 text-center">
            <p className="text-xs text-grappler-300">{formatShortDate(photo.date)}</p>
            {photo.bodyweight != null && (
              <p className="text-xs text-grappler-500">{photo.bodyweight} lbs</p>
            )}
          </div>
          <button
            onClick={onSelect}
            className="absolute top-2 right-2 px-2 py-1 bg-black/60 hover:bg-black/80 rounded-md text-xs text-white font-medium transition-colors"
          >
            Change
          </button>
        </div>
      ) : (
        <button
          onClick={onSelect}
          className="aspect-[3/4] bg-grappler-900 border-2 border-dashed border-grappler-700 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-grappler-600 hover:bg-grappler-900/80 transition-colors"
        >
          <Plus className="w-6 h-6 text-grappler-500" />
          <span className="text-xs text-grappler-500 font-medium">Select</span>
        </button>
      )}
    </div>
  );
}

// ===========================================================================
// Timeline Tab
// ===========================================================================

function TimelineTab({
  photos,
  onViewPhoto,
}: {
  photos: ProgressPhoto[]; // oldest first
  onViewPhoto: (p: ProgressPhoto) => void;
}) {
  // Display newest at top
  const reversed = useMemo(() => [...photos].reverse(), [photos]);

  if (reversed.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No timeline yet"
        description="Add photos to see your progress over time."
      />
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-grappler-800" />

      {reversed.map((photo, idx) => {
        // Time gap between this entry and the next one below (which is older)
        const olderPhoto = idx < reversed.length - 1 ? reversed[idx + 1] : null;
        const showGap = olderPhoto !== null;
        const gapText = olderPhoto ? timeGapLabel(olderPhoto.date, photo.date) : '';

        return (
          <div key={photo.id}>
            {/* Entry */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="relative flex gap-3 pb-2"
            >
              {/* Dot on line */}
              <div className="relative z-10 mt-1 w-12 flex items-start justify-center shrink-0">
                <div className="w-3 h-3 rounded-full bg-primary-500 border-2 border-grappler-950" />
              </div>

              {/* Content card */}
              <button
                onClick={() => onViewPhoto(photo)}
                className="flex-1 bg-grappler-900 border border-grappler-800 rounded-xl p-3 flex gap-3 hover:border-grappler-700 transition-colors text-left"
              >
                {/* Small thumbnail */}
                <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0">
                  <img
                    src={photo.dataUrl}
                    alt="Progress"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-grappler-200 font-medium">
                      {formatShortDate(photo.date)}
                    </p>
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-xs font-semibold uppercase',
                        POSE_COLORS[photo.pose]
                      )}
                    >
                      {POSE_LABELS[photo.pose]}
                    </span>
                  </div>
                  {photo.bodyweight != null && (
                    <p className="text-xs text-grappler-400 flex items-center gap-1">
                      <Scale className="w-3 h-3" />
                      {photo.bodyweight} lbs
                    </p>
                  )}
                  {photo.notes && (
                    <p className="text-xs text-grappler-500 mt-1 truncate">
                      <StickyNote className="w-3 h-3 inline mr-1" />
                      {photo.notes}
                    </p>
                  )}
                </div>
              </button>
            </motion.div>

            {/* Time gap label */}
            {showGap && gapText !== 'Same day' && (
              <div className="relative flex items-center gap-3 pb-2">
                <div className="w-12 flex justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-grappler-700" />
                </div>
                <span className="text-xs text-grappler-600 italic">{gapText}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===========================================================================
// Add Photo Modal
// ===========================================================================

function AddPhotoModal({
  onSave,
  onClose,
}: {
  onSave: (photo: Omit<ProgressPhoto, 'id'>) => void;
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pose, setPose] = useState<ProgressPhoto['pose']>('front');
  const [bodyweight, setBodyweight] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const dataUrl = await compressImage(file);
      setPreview(dataUrl);
    } catch {
      setError('Failed to process image. Try a different file.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSave = useCallback(() => {
    if (!preview) {
      setError('Please select a photo first.');
      return;
    }
    onSave({
      date: new Date(date).toISOString(),
      dataUrl: preview,
      pose,
      bodyweight: bodyweight ? parseFloat(bodyweight) : undefined,
      notes: notes.trim() || undefined,
    });
  }, [preview, date, pose, bodyweight, notes, onSave]);

  const poses: ProgressPhoto['pose'][] = ['front', 'side', 'back', 'custom'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] bg-grappler-900 rounded-t-2xl sm:rounded-lg overflow-y-auto"
      >
        {/* Modal header */}
        <div className="sticky top-0 z-10 bg-grappler-900 border-b border-grappler-800 p-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-grappler-100">Add Progress Photo</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-grappler-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-grappler-400" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* File input / preview */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full max-h-64 object-contain rounded-xl bg-grappler-950"
                />
                <button
                  onClick={() => {
                    setPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className={cn(
                  'w-full aspect-[4/3] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-colors',
                  loading
                    ? 'border-grappler-700 bg-grappler-950/50 cursor-wait'
                    : 'border-grappler-700 hover:border-grappler-600 bg-grappler-950/50 hover:bg-grappler-950'
                )}
              >
                {loading ? (
                  <div className="w-8 h-8 border-2 border-grappler-600 border-t-primary-400 rounded-full animate-spin" />
                ) : (
                  <>
                    <Camera className="w-10 h-10 text-grappler-500" />
                    <span className="text-sm text-grappler-400 font-medium">
                      Tap to take or choose a photo
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Date input */}
          <div>
            <label className="text-xs text-grappler-400 font-medium mb-1.5 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-grappler-800 border border-grappler-700 rounded-lg px-3 py-2 text-sm text-grappler-100 focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>

          {/* Pose selector */}
          <div>
            <label className="text-xs text-grappler-400 font-medium mb-1.5 block">Pose</label>
            <div className="flex gap-2">
              {poses.map((p) => (
                <button
                  key={p}
                  onClick={() => setPose(p)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all',
                    pose === p
                      ? 'bg-primary-500 text-white'
                      : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
                  )}
                >
                  {POSE_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Body weight */}
          <div>
            <label className="text-xs text-grappler-400 font-medium mb-1.5 block">
              Body Weight (optional)
            </label>
            <div className="relative">
              <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-500" />
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="e.g. 175"
                value={bodyweight}
                onChange={(e) => setBodyweight(e.target.value)}
                className="w-full bg-grappler-800 border border-grappler-700 rounded-lg pl-9 pr-12 py-2 text-sm text-grappler-100 placeholder:text-grappler-600 focus:outline-none focus:border-primary-500 transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-grappler-500">
                lbs
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-grappler-400 font-medium mb-1.5 block">
              Notes (optional)
            </label>
            <textarea
              rows={2}
              placeholder="How are you feeling? Any visible changes?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-grappler-800 border border-grappler-700 rounded-lg px-3 py-2 text-sm text-grappler-100 placeholder:text-grappler-600 focus:outline-none focus:border-primary-500 transition-colors resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!preview || loading}
            className={cn(
              'w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2',
              preview && !loading
                ? 'bg-primary-500 hover:bg-primary-600 text-white'
                : 'bg-grappler-800 text-grappler-600 cursor-not-allowed'
            )}
          >
            <Check className="w-4 h-4" />
            Save Photo
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ===========================================================================
// View Photo Modal (full-screen)
// ===========================================================================

function ViewPhotoModal({
  photo,
  onClose,
  onDelete,
  deleteConfirmId,
  setDeleteConfirmId,
}: {
  photo: ProgressPhoto;
  onClose: () => void;
  onDelete: (id: string) => void;
  deleteConfirmId: string | null;
  setDeleteConfirmId: (id: string | null) => void;
}) {
  const isConfirming = deleteConfirmId === photo.id;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex flex-col"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-2">
          {isConfirming ? (
            <>
              <span className="text-xs text-red-400 mr-1">Delete?</span>
              <button
                onClick={() => onDelete(photo.id)}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setDeleteConfirmId(photo.id)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5 text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Photo */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <motion.img
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          src={photo.dataUrl}
          alt="Progress photo"
          className="max-w-full max-h-full object-contain rounded-lg"
        />
      </div>

      {/* Details footer */}
      <div
        className="p-4 bg-gradient-to-t from-black/80 to-transparent shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-white font-medium">{formatFullDate(photo.date)}</span>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-semibold uppercase',
              POSE_COLORS[photo.pose]
            )}
          >
            {POSE_LABELS[photo.pose]}
          </span>
        </div>
        {photo.bodyweight != null && (
          <p className="text-xs text-gray-300 flex items-center gap-1 mb-1">
            <Scale className="w-3.5 h-3.5" />
            {photo.bodyweight} lbs
          </p>
        )}
        {photo.notes && (
          <p className="text-xs text-grappler-400 mt-1">{photo.notes}</p>
        )}
      </div>
    </motion.div>
  );
}

// ===========================================================================
// Gallery Picker Modal (for Compare tab)
// ===========================================================================

function GalleryPickerModal({
  photos,
  onSelect,
  onClose,
}: {
  photos: ProgressPhoto[];
  onSelect: (p: ProgressPhoto) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[80vh] bg-grappler-900 rounded-t-2xl sm:rounded-lg overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-grappler-800 flex items-center justify-between shrink-0">
          <h3 className="text-base font-bold text-grappler-100">Select a Photo</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-grappler-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-grappler-400" />
          </button>
        </div>

        {/* Scrollable grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {photos.length === 0 ? (
            <p className="text-center text-grappler-500 text-sm py-8">No photos available.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => onSelect(photo)}
                  className="group relative bg-grappler-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all"
                >
                  <div className="aspect-square">
                    <img
                      src={photo.dataUrl}
                      alt="Select"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                    <p className="text-xs text-white font-medium text-center">
                      {formatShortDate(photo.date)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
