/**
 * Fight Card Renderer — generates a shareable MMA fight-poster-style
 * workout summary as a PNG Blob using Canvas 2D API.
 *
 * Supports two aspect ratios:
 *   - 'story' → 1080x1920 (Instagram story)
 *   - 'square' → 1080x1080 (Instagram post)
 */

export interface FightCardData {
  athleteName: string;
  level: number;
  grade: string;          // S | A | B | C
  verdict: string;
  totalVolume: number;
  totalSets: number;
  avgRPE: number;
  duration: number;       // minutes
  weightUnit: string;
  prs: number;
  prExercises: string[];
  streak: number;
  date: Date;
}

export type FightCardAspect = 'story' | 'square';

// ── Color helpers ──────────────────────────────────────────

function gradeColor(grade: string): string {
  switch (grade) {
    case 'S': return '#facc15'; // gold
    case 'A': return '#4ade80'; // green
    case 'B': return '#60a5fa'; // blue
    default:  return '#94a3b8'; // gray
  }
}

function gradeGlow(grade: string): string {
  switch (grade) {
    case 'S': return 'rgba(250, 204, 21, 0.15)';
    case 'A': return 'rgba(74, 222, 128, 0.12)';
    case 'B': return 'rgba(96, 165, 250, 0.10)';
    default:  return 'rgba(148, 163, 184, 0.08)';
  }
}

// ── Number formatting ──────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 100_000)   return `${Math.round(n / 1000)}K`;
  if (n >= 10_000)    return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

// ── Round‑rect helper ──────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Main renderer ──────────────────────────────────────────

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export async function renderFightCard(
  data: FightCardData,
  aspect: FightCardAspect = 'story',
): Promise<Blob> {
  const W = 1080;
  const H = aspect === 'story' ? 1920 : 1080;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Background ─────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#020617');   // grappler-950
  bg.addColorStop(0.5, '#0f172a'); // grappler-900
  bg.addColorStop(1, '#020617');   // grappler-950
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial glow behind the grade
  const glowY = aspect === 'story' ? H * 0.38 : H * 0.42;
  const glow = ctx.createRadialGradient(W / 2, glowY, 0, W / 2, glowY, 420);
  glow.addColorStop(0, gradeGlow(data.grade));
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Subtle noise-like lines for texture
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.04)';
  ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Top/bottom accent bars
  const accentGrad = ctx.createLinearGradient(0, 0, W, 0);
  accentGrad.addColorStop(0, 'rgba(100, 116, 139, 0)');
  accentGrad.addColorStop(0.5, gradeColor(data.grade));
  accentGrad.addColorStop(1, 'rgba(100, 116, 139, 0)');
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, W, 4);
  ctx.fillRect(0, H - 4, W, 4);
  ctx.globalAlpha = 1;

  // ── Layout params ──────────────────────────────────────
  const isStory = aspect === 'story';
  let cy = isStory ? 200 : 80; // cursor‑Y

  // ── App name ───────────────────────────────────────────
  ctx.fillStyle = '#475569'; // grappler-600
  ctx.font = `600 ${isStory ? 28 : 22}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '8px';
  ctx.fillText('ROOTS GAINS', W / 2, cy);
  // Reset letter spacing (not all browsers support it; fallback is fine)
  ctx.letterSpacing = '0px';
  cy += isStory ? 120 : 80;

  // ── Athlete name ───────────────────────────────────────
  ctx.fillStyle = '#f8fafc'; // grappler-50
  ctx.font = `900 ${isStory ? 72 : 56}px ${FONT}`;
  ctx.fillText(data.athleteName.toUpperCase(), W / 2, cy);
  cy += isStory ? 48 : 38;

  // ── Level ──────────────────────────────────────────────
  ctx.fillStyle = gradeColor(data.grade);
  ctx.font = `700 ${isStory ? 28 : 22}px ${FONT}`;
  ctx.fillText(`Lv. ${data.level}`, W / 2, cy);
  cy += isStory ? 100 : 60;

  // ── Grade stamp ────────────────────────────────────────
  const stampSize = isStory ? 240 : 180;
  const stampX = W / 2;
  const stampY = cy + stampSize / 2;

  // Outer ring
  ctx.strokeStyle = gradeColor(data.grade);
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.35;
  roundRect(ctx, stampX - stampSize / 2, cy, stampSize, stampSize, 32);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Inner fill
  ctx.fillStyle = `${gradeColor(data.grade)}11`; // very subtle fill
  roundRect(ctx, stampX - stampSize / 2, cy, stampSize, stampSize, 32);
  ctx.fill();

  // Grade letter
  ctx.fillStyle = gradeColor(data.grade);
  ctx.font = `900 ${isStory ? 180 : 140}px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(data.grade, stampX, stampY);
  ctx.textBaseline = 'alphabetic';

  cy += stampSize + (isStory ? 50 : 36);

  // ── Verdict ────────────────────────────────────────────
  ctx.fillStyle = '#cbd5e1'; // grappler-300
  ctx.font = `italic 600 ${isStory ? 32 : 26}px ${FONT}`;
  ctx.fillText(`"${data.verdict}"`, W / 2, cy);
  cy += isStory ? 90 : 60;

  // ── Stats row ──────────────────────────────────────────
  const statFont = isStory ? 36 : 28;
  const labelFont = isStory ? 20 : 16;
  const statRowGap = isStory ? 50 : 36;

  // Draw stats in a 2x2 grid
  const statsData = [
    { label: data.weightUnit.toUpperCase(), value: fmtNum(data.totalVolume) },
    { label: 'SETS', value: `${data.totalSets}` },
    { label: 'AVG RPE', value: data.avgRPE > 0 ? `${data.avgRPE}` : '--' },
    { label: 'MIN', value: data.duration > 0 ? `${Math.round(data.duration)}` : '--' },
  ];

  const colW = 240;
  const gridW = colW * 2 + 60;
  const gridX = (W - gridW) / 2;

  // Background for stats area
  ctx.fillStyle = 'rgba(30, 41, 59, 0.4)'; // grappler-800/40
  roundRect(ctx, gridX - 30, cy - 20, gridW + 60, (statFont + labelFont + 28) * 2 + statRowGap + 20, 24);
  ctx.fill();

  // Divider lines
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
  ctx.lineWidth = 1;
  // Vertical
  ctx.beginPath();
  ctx.moveTo(W / 2, cy);
  ctx.lineTo(W / 2, cy + (statFont + labelFont + 28) * 2 + statRowGap - 20);
  ctx.stroke();
  // Horizontal
  ctx.beginPath();
  ctx.moveTo(gridX, cy + statFont + labelFont + 28 + statRowGap / 2 - 10);
  ctx.lineTo(gridX + gridW, cy + statFont + labelFont + 28 + statRowGap / 2 - 10);
  ctx.stroke();

  statsData.forEach((stat, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = gridX + col * (colW + 60) + colW / 2;
    const sy = cy + row * (statFont + labelFont + 28 + statRowGap);

    ctx.fillStyle = '#f1f5f9'; // grappler-100
    ctx.font = `800 ${statFont}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(stat.value, sx, sy + statFont);

    ctx.fillStyle = '#64748b'; // grappler-500
    ctx.font = `600 ${labelFont}px ${FONT}`;
    ctx.fillText(stat.label, sx, sy + statFont + labelFont + 8);
  });

  cy += (statFont + labelFont + 28) * 2 + statRowGap + (isStory ? 50 : 30);

  // ── PR callout ─────────────────────────────────────────
  if (data.prs > 0) {
    const prText = data.prs === 1
      ? `PR: ${data.prExercises[0]}`
      : `${data.prs} PRs: ${data.prExercises.slice(0, 3).join(', ')}${data.prs > 3 ? ` +${data.prs - 3}` : ''}`;

    // Background pill
    ctx.fillStyle = 'rgba(250, 204, 21, 0.08)';
    const prBoxW = Math.min(W - 120, 800);
    roundRect(ctx, (W - prBoxW) / 2, cy - 8, prBoxW, isStory ? 64 : 52, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.2)';
    ctx.lineWidth = 1;
    roundRect(ctx, (W - prBoxW) / 2, cy - 8, prBoxW, isStory ? 64 : 52, 16);
    ctx.stroke();

    ctx.fillStyle = '#fde047'; // yellow-300
    ctx.font = `700 ${isStory ? 28 : 22}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`\u{1F3C6} ${prText}`, W / 2, cy + (isStory ? 35 : 28));
    cy += isStory ? 80 : 64;
  }

  // ── Streak callout ─────────────────────────────────────
  if (data.streak > 1) {
    ctx.fillStyle = '#fb923c'; // orange-400
    ctx.font = `700 ${isStory ? 28 : 22}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`\u{1F525} ${data.streak}-day streak`, W / 2, cy + (isStory ? 28 : 22));
    cy += isStory ? 60 : 48;
  }

  // ── Date ───────────────────────────────────────────────
  const dateStr = data.date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const lineW = isStory ? 120 : 80;
  const dateY = isStory ? H - 200 : H - 120;

  ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
  ctx.lineWidth = 1;
  // Left line
  ctx.beginPath();
  ctx.moveTo(W / 2 - 180, dateY);
  ctx.lineTo(W / 2 - 180 + lineW, dateY);
  ctx.stroke();
  // Right line
  ctx.beginPath();
  ctx.moveTo(W / 2 + 180 - lineW, dateY);
  ctx.lineTo(W / 2 + 180, dateY);
  ctx.stroke();

  ctx.fillStyle = '#475569'; // grappler-600
  ctx.font = `500 ${isStory ? 24 : 20}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(dateStr, W / 2, dateY + 7);

  // ── Watermark ──────────────────────────────────────────
  const wmY = isStory ? H - 120 : H - 60;
  ctx.fillStyle = '#334155'; // grappler-700
  ctx.font = `600 ${isStory ? 22 : 18}px ${FONT}`;
  ctx.fillText('rootsgains.app', W / 2, wmY);

  // ── Export as blob ─────────────────────────────────────
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      },
      'image/png',
      1.0,
    );
  });
}
