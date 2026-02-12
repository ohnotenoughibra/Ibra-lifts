/**
 * Generate a shareable workout recap image as a Blob.
 * Creates a 1080x1080 canvas with workout stats — suitable for social sharing.
 */
export async function generateWorkoutShareCard(data: {
  exercises: number;
  volume: number;
  duration: number;
  prs: number;
  streak: number;
  xp: number;
  weightUnit: string;
}): Promise<Blob | null> {
  if (typeof window === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 1080, 1080);
  bg.addColorStop(0, '#0c1222');
  bg.addColorStop(0.5, '#111827');
  bg.addColorStop(1, '#0f172a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1080);

  // Subtle grid pattern
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 1080; i += 40) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1080); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1080, i); ctx.stroke();
  }

  // Top accent bar
  const accent = ctx.createLinearGradient(0, 0, 1080, 0);
  accent.addColorStop(0, '#22c55e');
  accent.addColorStop(0.5, '#0ea5e9');
  accent.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 1080, 6);

  // Title
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WORKOUT COMPLETE', 540, 140);

  // Decorative line
  const lineGrad = ctx.createLinearGradient(240, 0, 840, 0);
  lineGrad.addColorStop(0, 'rgba(34, 197, 94, 0)');
  lineGrad.addColorStop(0.5, 'rgba(34, 197, 94, 0.5)');
  lineGrad.addColorStop(1, 'rgba(34, 197, 94, 0)');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(240, 170); ctx.lineTo(840, 170); ctx.stroke();

  // Stats cards
  const stats = [
    { label: 'EXERCISES', value: `${data.exercises}`, color: '#0ea5e9' },
    { label: `VOLUME (${data.weightUnit.toUpperCase()})`, value: formatNum(data.volume), color: '#22c55e' },
    { label: 'DURATION', value: `${data.duration}m`, color: '#d946ef' },
  ];

  const cardW = 280;
  const cardH = 200;
  const startX = (1080 - (cardW * 3 + 40 * 2)) / 2;

  stats.forEach((stat, i) => {
    const x = startX + i * (cardW + 40);
    const y = 240;

    // Card background
    ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
    roundRect(ctx, x, y, cardW, cardH, 20);
    ctx.fill();

    // Card border
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, cardW, cardH, 20);
    ctx.stroke();

    // Value
    ctx.fillStyle = stat.color;
    ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stat.value, x + cardW / 2, y + cardH / 2 + 10);

    // Label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(stat.label, x + cardW / 2, y + cardH / 2 + 55);
  });

  // PR banner
  if (data.prs > 0) {
    const prY = 510;
    ctx.fillStyle = 'rgba(234, 179, 8, 0.1)';
    roundRect(ctx, 200, prY, 680, 80, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
    ctx.lineWidth = 1;
    roundRect(ctx, 200, prY, 680, 80, 16);
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`⭐ ${data.prs} Personal Record${data.prs > 1 ? 's' : ''} Crushed!`, 540, prY + 52);
  }

  // Bottom stats row
  const bottomY = data.prs > 0 ? 650 : 550;
  const bottomStats = [
    { label: 'STREAK', value: `${data.streak} days`, icon: '🔥' },
    { label: 'XP EARNED', value: `+${data.xp}`, icon: '⚡' },
  ];

  bottomStats.forEach((stat, i) => {
    const x = 240 + i * 320;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
    roundRect(ctx, x, bottomY, 280, 120, 16);
    ctx.fill();

    ctx.font = '48px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(stat.icon, x + 140, bottomY + 50);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(stat.value, x + 140, bottomY + 85);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 14px system-ui, -apple-system, sans-serif';
    ctx.fillText(stat.label, x + 140, bottomY + 108);
  });

  // Branding
  ctx.fillStyle = '#475569';
  ctx.font = '600 24px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Roots Gains', 540, 980);

  ctx.fillStyle = '#334155';
  ctx.font = '16px system-ui, -apple-system, sans-serif';
  ctx.fillText('Science-Based Training', 540, 1010);

  // Bottom accent bar
  ctx.fillStyle = accent;
  ctx.fillRect(0, 1074, 1080, 6);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return `${n}`;
}
