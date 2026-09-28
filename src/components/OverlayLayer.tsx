'use client';

/**
 * OverlayLayer — the full-screen layer every tool opens in.
 *
 * - Sits OVER the tab (the tab stays mounted underneath), so closing a tool
 *   returns to the exact scroll position and state you left.
 * - Slides in from the right when you go deeper, and out to the right when
 *   you go back (the tool under it slides back in from the left).
 * - Swipe to close, two ways:
 *     · pull down when the content is scrolled to the very top, or
 *     · drag from the left edge (iOS home-screen apps have no system back).
 *   Drag offsets live in motion values — no React render per touchmove.
 *   A gesture never starts inside a field, a slider or an open sheet/dialog,
 *   and a pull never starts while the tool's content is scrolled down (tools
 *   that scroll their own inner panel closed themselves on scroll-up before);
 *   an edge drag never starts on a sideways chip row / carousel.
 */
import { useRef, type ReactNode } from 'react';
import { motion, useMotionValue, animate, type Variants } from 'framer-motion';

export type NavDirection = 'push' | 'pop';

const EASE = [0.32, 0.72, 0, 1] as const;
const variants: Variants = {
  enter: (dir: NavDirection) => (dir === 'push'
    ? { x: '100%', opacity: 1, zIndex: 52 }
    : { x: '-18%', opacity: 0.6, zIndex: 51 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.28, ease: EASE } },
  exit: (dir: NavDirection) => (dir === 'push'
    ? { x: '-18%', opacity: 0.6, zIndex: 51, transition: { duration: 0.28, ease: EASE } }
    : { x: '100%', opacity: 1, zIndex: 52, transition: { duration: 0.24, ease: EASE } }),
};

const EDGE_PX = 24;
const START_SLOP = 10;

/** Would this touch belong to something that handles its own gestures? */
function blockedTarget(target: HTMLElement): boolean {
  return !!target.closest(
    'input, textarea, select, [contenteditable="true"], [role="slider"], [role="dialog"], [aria-modal="true"], [data-no-swipe], canvas, video, iframe',
  );
}

/** True when the touch point and every scrollable ancestor is at scroll top. */
function atScrollTop(target: HTMLElement, root: HTMLElement): boolean {
  for (let el: HTMLElement | null = target; el && el !== root.parentElement; el = el.parentElement) {
    if (el.scrollTop > 0) return false;
  }
  return true;
}

/**
 * Is any big scroll area of the tool scrolled down? Catches a pull that starts
 * on a pinned header or chip row above a scrolled list — that's "scroll up"
 * intent too. Runs once per gesture, only reads scrollTop.
 */
function mainAreaScrolled(root: HTMLElement): boolean {
  const minH = window.innerHeight * 0.3;
  const all = root.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    const el = all[i] as HTMLElement;
    if (el.scrollTop > 0 && el.clientHeight >= minH) return true;
  }
  return false;
}

/** A horizontally scrollable ancestor (chip rows, carousels) owns sideways drags. */
function inHorizontalScroller(target: HTMLElement, root: HTMLElement): boolean {
  for (let el: HTMLElement | null = target; el && el !== root; el = el.parentElement) {
    // Sideways-only scroller: wider than it is, but not taller (a vertical
    // scroller computes overflow-x: auto too).
    if (el.scrollWidth > el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
  }
  return false;
}

export default function OverlayLayer({ direction, canDrag, onDismiss, children }: {
  direction: NavDirection;
  /** False while a sheet/dialog is open above this layer. */
  canDrag: () => boolean;
  onDismiss: () => void;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const g = useRef<{ x0: number; y0: number; t0: number; mode: 'edge' | 'pull' | null; armed: boolean; decided: boolean }>(
    { x0: 0, y0: 0, t0: 0, mode: null, armed: false, decided: false },
  );

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const target = e.target as HTMLElement;
    const root = rootRef.current;
    g.current = { x0: t.clientX, y0: t.clientY, t0: performance.now(), mode: null, armed: false, decided: false };
    if (!root || e.touches.length > 1 || !canDrag() || blockedTarget(target)) return;
    g.current.armed = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const s = g.current;
    if (!s.armed) return;
    const t = e.touches[0];
    const dx = t.clientX - s.x0;
    const dy = t.clientY - s.y0;
    if (!s.decided) {
      if (Math.abs(dx) < START_SLOP && Math.abs(dy) < START_SLOP) return;
      s.decided = true;
      const root = rootRef.current!;
      const target = e.target as HTMLElement;
      if (s.x0 <= EDGE_PX && dx > 0 && Math.abs(dx) > Math.abs(dy) && !inHorizontalScroller(target, root)) {
        s.mode = 'edge';
      } else if (dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.2 && atScrollTop(target, root) && !mainAreaScrolled(root)) {
        s.mode = 'pull';
      } else {
        s.armed = false; // a normal scroll — let it be
        return;
      }
    }
    if (s.mode === 'edge') dragX.set(Math.max(0, dx));
    else if (s.mode === 'pull') dragY.set(Math.max(0, dy * 0.9));
  };

  const onTouchEnd = () => {
    const s = g.current;
    const mode = s.mode;
    g.current.armed = false;
    g.current.mode = null;
    if (!mode) return;
    const dt = Math.max(1, performance.now() - s.t0);
    const w = window.innerWidth, h = window.innerHeight;
    if (mode === 'edge') {
      const x = dragX.get();
      if (x > w * 0.35 || (x > 60 && x / dt > 0.5)) {
        void animate(dragX, w, { duration: 0.18, ease: 'easeOut' }).then(onDismiss);
      } else {
        void animate(dragX, 0, { type: 'spring', stiffness: 500, damping: 40 });
      }
    } else {
      const y = dragY.get();
      if (y > 140 || (y > 60 && y / dt > 0.6)) {
        void animate(dragY, h, { duration: 0.2, ease: 'easeOut' }).then(onDismiss);
      } else {
        void animate(dragY, 0, { type: 'spring', stiffness: 500, damping: 40 });
      }
    }
  };

  return (
    <motion.div
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      // Transform lives on this outer box, never on the scroller — so tools'
      // own position:fixed panels/sheets never end up scrolling with content.
      className="fixed inset-0 z-overlay bg-grappler-900 shadow-2xl"
      role="presentation"
    >
      <motion.div
        ref={rootRef}
        style={{ x: dragX, y: dragY }}
        className="overlay-safe h-full bg-grappler-900"
        data-overlay-container
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <div className="flex justify-center pt-2 pb-1" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-grappler-600" />
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
