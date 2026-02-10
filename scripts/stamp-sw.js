/**
 * Stamps the service worker cache name with the current app version.
 * Runs as a prebuild step so every deploy produces a new SW that the
 * browser treats as an update — triggering install + cache bust.
 */
const fs = require('fs');
const path = require('path');

const pkg = require(path.join(__dirname, '..', 'package.json'));
const swPath = path.join(__dirname, '..', 'public', 'sw.js');

const sw = fs.readFileSync(swPath, 'utf8');
const stamped = sw.replace(
  /const CACHE_NAME = '[^']+'/,
  `const CACHE_NAME = 'roots-gains-v${pkg.version}'`
);

fs.writeFileSync(swPath, stamped);
console.log(`[stamp-sw] Cache name set to roots-gains-v${pkg.version}`);
