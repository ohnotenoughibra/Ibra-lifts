import { defineConfig, devices } from '@playwright/test';

/**
 * Browser E2E tests for user flows that unit tests can't reach (taps, sheets,
 * toasts). Run with `npm run test:e2e` — boots the dev server automatically.
 * The app is local-first (zustand + localStorage), so every test starts from
 * a clean browser context and walks in through onboarding.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // dev-server compile is the bottleneck; serial is faster cold
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    // Mobile-first PWA — test at phone size like real users (Pixel 5 = Chromium)
    ...devices['Pixel 5'],
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
