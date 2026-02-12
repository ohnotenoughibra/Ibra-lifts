/**
 * Lightweight canvas confetti burst — no dependencies.
 * Spawns a temporary canvas overlay, runs ~80 particles for 1.5s, auto-cleans up.
 */
export function fireConfetti() {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }

  const colors = ['#facc15', '#22c55e', '#0ea5e9', '#d946ef', '#ef4444', '#f59e0b', '#8b5cf6'];
  const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string; rotation: number; rotationSpeed: number; life: number }[] = [];

  for (let i = 0; i < 80; i++) {
    particles.push({
      x: canvas.width * 0.5 + (Math.random() - 0.5) * 100,
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 14 - 4,
      size: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      life: 1,
    });
  }

  const gravity = 0.25;
  const friction = 0.99;
  const start = performance.now();
  const duration = 1500;

  function animate(now: number) {
    const elapsed = now - start;
    if (elapsed > duration) { canvas.remove(); return; }

    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    const progress = elapsed / duration;

    for (const p of particles) {
      p.vy += gravity;
      p.vx *= friction;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.life = Math.max(0, 1 - progress * 1.2);

      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rotation);
      ctx!.globalAlpha = p.life;
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx!.restore();
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
