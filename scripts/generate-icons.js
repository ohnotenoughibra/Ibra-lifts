#!/usr/bin/env node
/**
 * Roots Gains — Icon Generation Script
 *
 * Design: "The Peak"
 * A single bold upward chevron — thick, luminous, unmistakable.
 * No text. No clutter. Just raw upward energy on deep slate.
 *
 * The chevron represents:
 *   - Ascent (gains, progress, leveling up)
 *   - Rank insignia (combat heritage)
 *   - A roof / shelter (roots, foundation)
 *   - Victory
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public');

// ─── Design tokens ───────────────────────────────────────────
const BG_DARK   = '#0f172a';  // grappler-900
const BG_MID    = '#1e293b';  // grappler-800 (radial center)
const BLUE_700  = '#1d4ed8';
const BLUE_500  = '#3b82f6';
const BLUE_400  = '#60a5fa';
const CYAN_400  = '#22d3ee';
const CYAN_300  = '#67e8f9';
const SLATE_100 = '#f1f5f9';

// ─── SVG generators ──────────────────────────────────────────

/**
 * The main app icon.
 * Canvas is always 512×512; we scale down from there.
 *
 * Geometry:  A thick chevron (inverted V) centered in frame.
 *   Peak:       (256, 128)
 *   Left foot:  (96,  352)
 *   Right foot: (416, 352)
 *   Stroke:     56px, round caps & join
 *
 * All points fit within the maskable safe zone (inner 80% circle, r≈205).
 */
function iconSVG({ size = 512, maskable = false } = {}) {
  // For maskable icons, add 10% padding on each side (Android safe zone)
  const pad = maskable ? size * 0.10 : 0;
  const inner = size - pad * 2;
  const scale = inner / 512;

  // Chevron points in 512-space
  const peakX = 256, peakY = 128;
  const leftX = 96,  leftY = 352;
  const rightX = 416, rightY = 352;
  const sw = 56; // stroke width

  // Transform to actual coords
  const tx = (x) => (pad + x * scale).toFixed(1);
  const ty = (y) => (pad + y * scale).toFixed(1);
  const sw2 = (sw * scale).toFixed(1);

  // Glow blur radius scales with icon
  const blur = Math.max(8, Math.round(12 * scale));

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="65%" fx="50%" fy="42%">
      <stop offset="0%" stop-color="${BG_MID}"/>
      <stop offset="100%" stop-color="${BG_DARK}"/>
    </radialGradient>

    <linearGradient id="mark" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${BLUE_700}"/>
      <stop offset="40%" stop-color="${BLUE_500}"/>
      <stop offset="100%" stop-color="${CYAN_400}"/>
    </linearGradient>

    <linearGradient id="sheen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${CYAN_300}" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="${BLUE_400}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${BLUE_400}" stop-opacity="0"/>
    </linearGradient>

    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="0 0 0 0 0.231
                0 0 0 0 0.510
                0 0 0 0 0.965
                0 0 0 0.5 0" result="colorBlur"/>
      <feMerge>
        <feMergeNode in="colorBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bg)"/>

  <!-- Ambient glow (larger, softer) -->
  <polyline
    points="${tx(leftX)},${ty(leftY)} ${tx(peakX)},${ty(peakY)} ${tx(rightX)},${ty(rightY)}"
    fill="none"
    stroke="${BLUE_500}"
    stroke-width="${(sw * scale * 2.5).toFixed(1)}"
    stroke-linecap="round"
    stroke-linejoin="round"
    opacity="0.12"
    filter="url(#glow)"
  />

  <!-- Core chevron -->
  <polyline
    points="${tx(leftX)},${ty(leftY)} ${tx(peakX)},${ty(peakY)} ${tx(rightX)},${ty(rightY)}"
    fill="none"
    stroke="url(#mark)"
    stroke-width="${sw2}"
    stroke-linecap="round"
    stroke-linejoin="round"
    filter="url(#glow)"
  />

  <!-- Top sheen (subtle light catch on the peak) -->
  <polyline
    points="${tx(leftX)},${ty(leftY)} ${tx(peakX)},${ty(peakY)} ${tx(rightX)},${ty(rightY)}"
    fill="none"
    stroke="url(#sheen)"
    stroke-width="${(sw * scale * 0.5).toFixed(1)}"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>`;
}

/**
 * OG image (1200×630) — icon mark on left, text on right.
 */
function ogImageSVG() {
  const w = 1200, h = 630;
  // Chevron mark scaled and positioned on the left
  const markScale = 0.35;
  const markOffX = 160;
  const markOffY = 160;

  const peakX = markOffX + 256 * markScale;
  const peakY = markOffY + 128 * markScale;
  const leftX = markOffX + 96 * markScale;
  const leftY = markOffY + 352 * markScale;
  const rightX = markOffX + 416 * markScale;
  const rightY = markOffY + 352 * markScale;
  const sw = 56 * markScale;

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ogBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${BG_DARK}"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>

    <linearGradient id="ogMark" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${BLUE_700}"/>
      <stop offset="40%" stop-color="${BLUE_500}"/>
      <stop offset="100%" stop-color="${CYAN_400}"/>
    </linearGradient>

    <linearGradient id="ogText" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${SLATE_100}"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>

    <filter id="ogGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="0 0 0 0 0.231
                0 0 0 0 0.510
                0 0 0 0 0.965
                0 0 0 0.4 0"/>
    </filter>

    <!-- Subtle grid pattern for texture -->
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" stroke-width="0.5" opacity="0.3"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="${w}" height="${h}" fill="url(#ogBg)"/>
  <rect width="${w}" height="${h}" fill="url(#grid)"/>

  <!-- Chevron glow -->
  <polyline
    points="${leftX},${leftY} ${peakX},${peakY} ${rightX},${rightY}"
    fill="none" stroke="${BLUE_500}" stroke-width="${sw * 2.5}"
    stroke-linecap="round" stroke-linejoin="round"
    opacity="0.15" filter="url(#ogGlow)"/>

  <!-- Chevron -->
  <polyline
    points="${leftX},${leftY} ${peakX},${peakY} ${rightX},${rightY}"
    fill="none" stroke="url(#ogMark)" stroke-width="${sw}"
    stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Brand text -->
  <text x="420" y="265" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
    font-size="72" font-weight="700" letter-spacing="-2" fill="url(#ogText)">
    Roots Gains
  </text>

  <!-- Tagline -->
  <text x="420" y="320" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
    font-size="24" font-weight="400" fill="#64748b" letter-spacing="0.5">
    Performance system for combat athletes
  </text>

  <!-- Feature pills -->
  <text x="420" y="380" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
    font-size="16" font-weight="500" fill="#94a3b8" letter-spacing="2">
    PERIODIZATION · NUTRITION · RECOVERY · FIGHT CAMP
  </text>

  <!-- Bottom accent line -->
  <rect x="0" y="${h - 4}" width="${w}" height="4" fill="url(#ogMark)"/>
</svg>`;
}

/**
 * Favicon — simplified for 32×32.
 * Even thicker relative stroke, no glow (too small).
 */
function faviconSVG() {
  const size = 32;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fm" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${BLUE_500}"/>
      <stop offset="100%" stop-color="${CYAN_400}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="${BG_DARK}"/>
  <polyline
    points="6,22 16,8 26,22"
    fill="none" stroke="url(#fm)" stroke-width="4.5"
    stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

// ─── Build pipeline ──────────────────────────────────────────

async function generateIcon(svgString, filename, outputSize) {
  const buf = Buffer.from(svgString);
  await sharp(buf)
    .resize(outputSize, outputSize)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(OUT, filename));
  console.log(`  ✓ ${filename} (${outputSize}×${outputSize})`);
}

async function main() {
  console.log('\n  Roots Gains — Icon Forge\n');

  // ── Standard icons ──
  const standardSizes = [48, 72, 96, 128, 144, 192, 384, 512];
  console.log('  Standard icons:');
  for (const size of standardSizes) {
    const svg = iconSVG({ size: 512 }); // render at 512, downscale
    await generateIcon(svg, `icon-${size}.png`, size);
  }

  // ── Maskable icons (extra padding for Android adaptive) ──
  console.log('\n  Maskable icons:');
  for (const size of [192, 512]) {
    const svg = iconSVG({ size: 512, maskable: true });
    await generateIcon(svg, `icon-${size}-maskable.png`, size);
  }

  // ── Apple touch icon (180×180) ──
  console.log('\n  Apple touch icon:');
  const appleSvg = iconSVG({ size: 512 });
  await generateIcon(appleSvg, 'apple-touch-icon.png', 180);

  // ── Favicon ──
  console.log('\n  Favicon:');
  const favBuf = Buffer.from(faviconSVG());
  await sharp(favBuf)
    .resize(32, 32)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, 'favicon.png'));
  console.log('  ✓ favicon.png (32×32)');

  // Also create a 16x16 variant
  await sharp(favBuf)
    .resize(16, 16)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, 'favicon-16.png'));
  console.log('  ✓ favicon-16.png (16×16)');

  // ── OG Image ──
  console.log('\n  Social image:');
  const ogBuf = Buffer.from(ogImageSVG());
  await sharp(ogBuf)
    .resize(1200, 630)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, 'og-image.png'));
  console.log('  ✓ og-image.png (1200×630)');

  console.log('\n  Done. All assets in /public/\n');
}

main().catch(err => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
