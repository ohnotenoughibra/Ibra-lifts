/**
 * Tiny WebAudio beeps for interval timers. The context must be created from a
 * user gesture (iOS), so call `unlockBeeps()` in the Start button handler.
 * Every call is best-effort — no audio never breaks the timer.
 */
let ctx: AudioContext | null = null;

export function unlockBeeps() {
  try {
    if (typeof window === 'undefined') return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { /* ignore */ }
}

export function beep(kind: 'tick' | 'go' | 'stop' = 'tick') {
  try {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const freq = kind === 'go' ? 1320 : kind === 'stop' ? 520 : 880;
    const dur = kind === 'tick' ? 0.12 : 0.45;
    o.frequency.value = freq;
    o.type = 'sine';
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur + 0.02);
  } catch { /* ignore */ }
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(kind === 'tick' ? 40 : kind === 'go' ? [120, 60, 120] : 250);
    }
  } catch { /* ignore */ }
}
