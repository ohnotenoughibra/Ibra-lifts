'use client';

/**
 * Shared primitives for every tool overlay.
 *
 * Built from the audit + research-backed mobile UX spec:
 *   - Editorial brutalist header (Onboarding pattern): step indicator + display
 *     headline + hairline rule + one-line description.
 *   - Solid surfaces (no frosted glass, no backdrop-blur).
 *   - Sticky close (X) in top-left thumb-zone, NOT a floating pill.
 *   - Optional sticky bottom CTA.
 *   - Single shared `<Section>` primitive — kills the 4+ duplicate Section
 *     definitions across the codebase.
 *
 * Mobile rules baked in:
 *   1. Primary CTA in bottom 25% of viewport, full-width, sticky.
 *   2. Display title 36-44px Epilogue, tracking-tight, single line.
 *   3. Hairline rules only — no card shadows.
 *   4. One accent per viewport (passed via `accent` prop on hero use).
 *   5. Density cap: max 4 stacked cards before a divider.
 */

import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── ToolShell ──────────────────────────────────────────────────────────

interface ToolShellProps {
  onClose: () => void;
  /** Tracked uppercase slug — e.g. "IBRA / 04 · SPARRING LOAD" */
  eyebrow: string;
  /** 1-2 word display headline. Wraps with <br/> manually if needed. */
  title: ReactNode;
  /** Single sentence below the hairline rule. */
  description?: string;
  /** Sticky bottom CTA (optional). Pass <PrimaryCTA /> or any node. */
  footer?: ReactNode;
  children: ReactNode;
}

export function ToolShell({ onClose, eyebrow, title, description, footer, children }: ToolShellProps) {
  return (
    <div className="fixed inset-0 z-overlay bg-grappler-950 flex flex-col">
      {/* Top sticky chrome — close only. Title scrolls away with content. */}
      <div className="sticky top-0 z-10 bg-grappler-950 safe-area-top flex justify-start px-4 pt-3 pb-2">
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-3 -ml-2 hover:bg-grappler-800 rounded-lg active:scale-95 transition"
        >
          <X className="w-5 h-5 text-grappler-300" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pb-32 max-w-2xl mx-auto">
          {/* Editorial header — Onboarding pattern */}
          <header className="pt-2 pb-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-grappler-500 mb-3">
              {eyebrow}
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight leading-none text-white mb-3">
              {title}
            </h1>
            <div className="h-px bg-grappler-800 my-4" />
            {description && (
              <p className="text-sm text-grappler-400 leading-relaxed">{description}</p>
            )}
          </header>

          {/* Body content */}
          <div className="space-y-4">
            {children}
          </div>
        </div>
      </div>

      {/* Sticky bottom CTA — pinned, full-width, safe-area + keyboard aware */}
      {footer && (
        <div className="border-t border-grappler-800 bg-grappler-950 px-4 pt-3 sticky-footer-kb">
          <div className="max-w-2xl mx-auto pb-3">{footer}</div>
        </div>
      )}
    </div>
  );
}

// ─── Section ────────────────────────────────────────────────────────────

interface SectionProps {
  /** Uppercase tracked label (the section's "name"). */
  title?: string;
  /** Optional small right-side hint text. */
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function Section({ title, hint, className, children }: SectionProps) {
  return (
    <section className={cn('rounded-lg bg-grappler-900/60 border border-grappler-800 p-4', className)}>
      {(title || hint) && (
        <div className="flex items-baseline justify-between mb-3">
          {title && (
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-grappler-300">
              {title}
            </h2>
          )}
          {hint && (
            <span className="text-[10px] text-grappler-500">{hint}</span>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

// ─── HeroMetric ─────────────────────────────────────────────────────────
// Big tabular number + tracked label below. For tools with a primary metric.

interface HeroMetricProps {
  value: ReactNode;
  unit?: string;
  /** Tracked uppercase label below value. */
  label: string;
  /** State line — "Send it" / "Critical" / etc. */
  state?: string;
  /** Optional accent for the state line: emerald (go), amber (caution), rose (danger), sky (info). */
  accent?: 'go' | 'caution' | 'danger' | 'info';
}

const ACCENT_CLASS: Record<NonNullable<HeroMetricProps['accent']>, string> = {
  go: 'text-emerald-400',
  caution: 'text-amber-400',
  danger: 'text-rose-400',
  info: 'text-sky-400',
};

export function HeroMetric({ value, unit, label, state, accent = 'info' }: HeroMetricProps) {
  return (
    <div>
      <div className="font-mono text-6xl md:text-7xl font-bold leading-none text-white tabular-nums">
        {value}
        {unit && <span className="text-2xl text-grappler-400 ml-2 font-sans font-normal">{unit}</span>}
      </div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-grappler-500 mt-2">{label}</div>
      {state && (
        <div className={cn('text-sm font-bold mt-1', ACCENT_CLASS[accent])}>{state}</div>
      )}
    </div>
  );
}

// ─── PrimaryCTA ─────────────────────────────────────────────────────────
// One shared button style. Pass to ToolShell.footer.

interface PrimaryCTAProps {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  /** Optional override for destructive/positive CTAs. Default uses primary. */
  variant?: 'primary' | 'go' | 'danger';
}

const VARIANT_CLASS: Record<NonNullable<PrimaryCTAProps['variant']>, string> = {
  primary: 'bg-primary-500 hover:bg-primary-400 text-white',
  go: 'bg-emerald-500 hover:bg-emerald-400 text-white',
  danger: 'bg-rose-500 hover:bg-rose-400 text-white',
};

export function PrimaryCTA({ onClick, disabled, children, variant = 'primary' }: PrimaryCTAProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full py-3.5 rounded-lg font-bold text-sm transition active:scale-[0.98] disabled:opacity-50',
        VARIANT_CLASS[variant]
      )}
    >
      {children}
    </button>
  );
}

// ─── Stat ───────────────────────────────────────────────────────────────
// 3-column small-number grid item. Used for "weekly hard rounds" etc.

interface StatProps {
  value: ReactNode;
  label: string;
  sub?: string;
  accent?: 'go' | 'caution' | 'danger' | 'info' | 'neutral';
}

const STAT_ACCENT: Record<NonNullable<StatProps['accent']>, string> = {
  go: 'text-emerald-400',
  caution: 'text-amber-400',
  danger: 'text-rose-400',
  info: 'text-sky-400',
  neutral: 'text-white',
};

export function Stat({ value, label, sub, accent = 'neutral' }: StatProps) {
  return (
    <div className="rounded-lg bg-grappler-900/60 border border-grappler-800 p-3 text-center">
      <div className={cn('font-mono text-2xl font-bold tabular-nums leading-tight', STAT_ACCENT[accent])}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-grappler-500 mt-1">{label}</div>
      {sub && <div className="text-[10px] text-grappler-500">{sub}</div>}
    </div>
  );
}
