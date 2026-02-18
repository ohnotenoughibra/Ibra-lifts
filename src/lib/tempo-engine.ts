/**
 * Tempo Training Engine
 *
 * Parses tempo prescriptions (e.g. "3-1-2-0") and drives a live metronome
 * through eccentric → pause → concentric → lockout phases for each rep.
 *
 * Tempo format: E-P-C-L
 *   E = Eccentric (lowering) seconds
 *   P = Pause at bottom seconds
 *   C = Concentric (lifting) seconds  — 0 means "explosive"
 *   L = Lockout / pause at top seconds
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type TempoPhase = 'eccentric' | 'pause' | 'concentric' | 'lockout';

export interface TempoPrescription {
  eccentric: number;   // seconds
  pause: number;       // seconds (bottom)
  concentric: number;  // seconds (0 = explosive)
  lockout: number;     // seconds (top)
  totalRepSeconds: number;
  label: string;       // e.g. "3-1-2-0"
}

export interface TempoState {
  /** Is the metronome running */
  active: boolean;
  /** Current phase */
  phase: TempoPhase;
  /** Seconds remaining in current phase (counts down) */
  phaseTimeLeft: number;
  /** Total seconds in current phase */
  phaseDuration: number;
  /** Current rep number (1-based) */
  currentRep: number;
  /** Total time under tension so far (seconds) */
  tut: number;
  /** Timestamp when current second started */
  tickStart: number;
}

export interface TempoTickResult {
  state: TempoState;
  /** Phase just changed — trigger haptic/visual cue */
  phaseChanged: boolean;
  /** Name of the new phase if changed */
  newPhase?: TempoPhase;
  /** A rep just completed */
  repCompleted: boolean;
}

// ─── Phase metadata ──────────────────────────────────────────────────────────

const PHASE_ORDER: TempoPhase[] = ['eccentric', 'pause', 'concentric', 'lockout'];

const PHASE_LABELS: Record<TempoPhase, string> = {
  eccentric: 'DOWN',
  pause: 'HOLD',
  concentric: 'UP',
  lockout: 'HOLD',
};

const PHASE_COLORS: Record<TempoPhase, string> = {
  eccentric: 'text-blue-400',
  pause: 'text-yellow-400',
  concentric: 'text-red-400',
  lockout: 'text-green-400',
};

const PHASE_BG_COLORS: Record<TempoPhase, string> = {
  eccentric: 'from-blue-500/20 to-blue-500/5',
  pause: 'from-yellow-500/20 to-yellow-500/5',
  concentric: 'from-red-500/20 to-red-500/5',
  lockout: 'from-green-500/20 to-green-500/5',
};

export { PHASE_LABELS, PHASE_COLORS, PHASE_BG_COLORS };

// ─── Parse ───────────────────────────────────────────────────────────────────

/**
 * Parse a tempo string like "3-1-2-0" into a TempoPrescription.
 * Returns null if the string is invalid.
 */
export function parseTempo(tempo: string | undefined | null): TempoPrescription | null {
  if (!tempo) return null;
  const parts = tempo.split('-').map(Number);
  if (parts.length !== 4 || parts.some(isNaN) || parts.some(p => p < 0)) return null;

  const [eccentric, pause, concentric, lockout] = parts;
  // At least one phase must have duration
  if (eccentric + pause + concentric + lockout === 0) return null;

  return {
    eccentric,
    pause,
    concentric,
    lockout,
    totalRepSeconds: eccentric + pause + concentric + lockout,
    label: tempo,
  };
}

// ─── State machine ───────────────────────────────────────────────────────────

/**
 * Create initial tempo state for a new set.
 */
export function initTempoState(prescription: TempoPrescription): TempoState {
  const firstPhase = getFirstActivePhase(prescription);
  const phaseDuration = getPhaseSeconds(prescription, firstPhase);
  return {
    active: true,
    phase: firstPhase,
    phaseTimeLeft: phaseDuration,
    phaseDuration,
    currentRep: 1,
    tut: 0,
    tickStart: Date.now(),
  };
}

/**
 * Advance the tempo state by one second (called by interval timer).
 * Returns the new state plus signals for phase changes and rep completions.
 */
export function tickTempo(
  state: TempoState,
  prescription: TempoPrescription
): TempoTickResult {
  if (!state.active) {
    return { state, phaseChanged: false, repCompleted: false };
  }

  const newState = { ...state };
  newState.tut += 1;
  newState.tickStart = Date.now();

  // Count down current phase
  if (newState.phaseTimeLeft > 1) {
    newState.phaseTimeLeft -= 1;
    return { state: newState, phaseChanged: false, repCompleted: false };
  }

  // Phase complete — advance to next
  const nextResult = getNextPhase(newState.phase, prescription);

  if (nextResult.repComplete) {
    // Rep finished — start next rep from first active phase
    const firstPhase = getFirstActivePhase(prescription);
    const phaseDuration = getPhaseSeconds(prescription, firstPhase);
    newState.currentRep += 1;
    newState.phase = firstPhase;
    newState.phaseTimeLeft = phaseDuration;
    newState.phaseDuration = phaseDuration;
    return {
      state: newState,
      phaseChanged: true,
      newPhase: firstPhase,
      repCompleted: true,
    };
  }

  // Move to next phase within the same rep
  const phaseDuration = getPhaseSeconds(prescription, nextResult.phase);
  newState.phase = nextResult.phase;
  newState.phaseTimeLeft = phaseDuration;
  newState.phaseDuration = phaseDuration;
  return {
    state: newState,
    phaseChanged: true,
    newPhase: nextResult.phase,
    repCompleted: false,
  };
}

/**
 * Stop the metronome.
 */
export function stopTempo(state: TempoState): TempoState {
  return { ...state, active: false };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPhaseSeconds(p: TempoPrescription, phase: TempoPhase): number {
  switch (phase) {
    case 'eccentric': return p.eccentric;
    case 'pause': return p.pause;
    case 'concentric': return p.concentric;
    case 'lockout': return p.lockout;
  }
}

/** Get the first phase that has duration > 0 */
function getFirstActivePhase(p: TempoPrescription): TempoPhase {
  for (const phase of PHASE_ORDER) {
    if (getPhaseSeconds(p, phase) > 0) return phase;
  }
  return 'eccentric'; // fallback
}

/** Get the next phase with duration > 0, or signal rep completion */
function getNextPhase(
  current: TempoPhase,
  p: TempoPrescription
): { phase: TempoPhase; repComplete: false } | { phase: TempoPhase; repComplete: true } {
  const idx = PHASE_ORDER.indexOf(current);

  // Check remaining phases in this rep
  for (let i = idx + 1; i < PHASE_ORDER.length; i++) {
    const phase = PHASE_ORDER[i];
    if (getPhaseSeconds(p, phase) > 0) {
      return { phase, repComplete: false };
    }
  }

  // No more phases — rep is done
  return { phase: getFirstActivePhase(p), repComplete: true };
}

// ─── Presets ─────────────────────────────────────────────────────────────────

export interface TempoPreset {
  label: string;
  tempo: string;
  desc: string;
}

export const TEMPO_PRESETS: TempoPreset[] = [
  { label: 'Hypertrophy',     tempo: '3-1-2-0', desc: 'Controlled eccentric, brief pause' },
  { label: 'Strength',        tempo: '2-0-1-1', desc: 'Moderate down, explosive up, hold top' },
  { label: 'Paused Reps',     tempo: '2-3-1-0', desc: 'Long pause at bottom for power' },
  { label: 'Slow Eccentric',  tempo: '5-0-1-0', desc: 'Heavy eccentric overload' },
  { label: 'Time Under Tension', tempo: '4-1-4-1', desc: 'Max TUT for hypertrophy' },
  { label: 'Explosive',       tempo: '2-1-0-0', desc: 'Controlled down, explosive up' },
  { label: 'Isometric Hold',  tempo: '2-5-1-0', desc: 'Extended pause at sticking point' },
  { label: 'Bodybuilding',    tempo: '3-0-2-1', desc: 'Classic BB tempo, squeeze at top' },
];

/**
 * Calculate estimated TUT for a full set.
 */
export function estimateTUT(tempo: TempoPrescription, reps: number): number {
  return tempo.totalRepSeconds * reps;
}

/**
 * Format seconds as M:SS.
 */
export function formatTUT(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}
