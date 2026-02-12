'use client';

import { cn } from '@/lib/utils';

/** Shimmer bar — basic building block */
export function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-grappler-800/60 rounded-lg animate-pulse',
        className
      )}
    />
  );
}

/** Skeleton for Home tab layout */
export function HomeTabSkeleton() {
  return (
    <div className="space-y-4">
      {/* Readiness card */}
      <div className="rounded-2xl bg-grappler-800/40 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Shimmer className="w-12 h-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-5 w-32" />
            <Shimmer className="h-3 w-48" />
          </div>
        </div>
        <Shimmer className="h-2 w-full rounded-full" />
      </div>
      {/* Today's session */}
      <Shimmer className="h-28 rounded-2xl" />
      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-2">
        <Shimmer className="h-20 rounded-xl" />
        <Shimmer className="h-20 rounded-xl" />
        <Shimmer className="h-20 rounded-xl" />
      </div>
      {/* Cards */}
      <Shimmer className="h-24 rounded-2xl" />
      <Shimmer className="h-24 rounded-2xl" />
    </div>
  );
}

/** Skeleton for Program tab layout */
export function ProgramTabSkeleton() {
  return (
    <div className="space-y-4">
      {/* Program header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer className="h-6 w-40" />
          <Shimmer className="h-3 w-28" />
        </div>
        <Shimmer className="h-9 w-9 rounded-xl" />
      </div>
      {/* Week progress bar */}
      <Shimmer className="h-2 w-full rounded-full" />
      {/* Session cards */}
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl bg-grappler-800/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Shimmer className="h-5 w-32" />
            <Shimmer className="h-8 w-16 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Shimmer className="h-3 w-full" />
            <Shimmer className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton for Explore tab layout */
export function ExploreTabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Shimmer className="h-6 w-24" />
        <Shimmer className="h-4 w-52" />
      </div>
      {/* Search bar */}
      <Shimmer className="h-10 rounded-xl" />
      {/* Category grid */}
      {[1, 2].map(cat => (
        <div key={cat} className="space-y-2.5">
          <Shimmer className="h-3 w-16" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[1, 2, 3, 4].map(i => (
              <Shimmer key={i} className="h-[5.5rem] rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton for Progress tab layout */
export function ProgressTabSkeleton() {
  return (
    <div className="space-y-4">
      {/* Tab pills */}
      <div className="flex gap-2">
        <Shimmer className="h-8 w-20 rounded-full" />
        <Shimmer className="h-8 w-20 rounded-full" />
        <Shimmer className="h-8 w-20 rounded-full" />
      </div>
      {/* Chart area */}
      <Shimmer className="h-48 rounded-2xl" />
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <Shimmer className="h-20 rounded-xl" />
        <Shimmer className="h-20 rounded-xl" />
      </div>
      {/* List items */}
      <Shimmer className="h-16 rounded-xl" />
      <Shimmer className="h-16 rounded-xl" />
      <Shimmer className="h-16 rounded-xl" />
    </div>
  );
}
