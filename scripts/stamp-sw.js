/**
 * Stamps the service worker cache name with a unique build identifier.
 * Runs as a prebuild step so every deploy produces a new SW that the
 * browser treats as an update — triggering install + cache bust.
 *
 * Uses git commit hash + build timestamp to guarantee uniqueness per deploy.
 * Falls back to timestamp-only if git is unavailable.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pkg = require(path.join(__dirname, '..', 'package.json'));
const swPath = path.join(__dirname, '..', 'public', 'sw.js');

// Build a unique stamp: short git hash + epoch seconds
let buildId;
try {
  const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  buildId = `${gitHash}-${Math.floor(Date.now() / 1000)}`;
} catch {
  // No git (e.g. clean Vercel build) — use VERCEL_GIT_COMMIT_SHA or timestamp
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  buildId = sha ? sha.slice(0, 7) + `-${Math.floor(Date.now() / 1000)}` : `${Date.now()}`;
}

const cacheName = `roots-gains-v${pkg.version}-${buildId}`;

const sw = fs.readFileSync(swPath, 'utf8');
const stamped = sw.replace(
  /const CACHE_NAME = '[^']+'/,
  `const CACHE_NAME = '${cacheName}'`
);

fs.writeFileSync(swPath, stamped);
console.log(`[stamp-sw] Cache name set to ${cacheName}`);
