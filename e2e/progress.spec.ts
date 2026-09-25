import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Progress tab against a messy, realistic-to-hostile history: 220 workouts over
 * 14 months with library/custom/removed exercise ids, deleted logs, missing
 * totals, string and null numbers, epoch-ms dates, a malformed log, mixed
 * kg/lbs weigh-ins, unknown session categories, stopped and empty blocks.
 * The app must load, and every Progress card must render (no card fallback).
 */
test('Progress survives a messy history', async ({ page }) => {
  const ls = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/messy-history.json'), 'utf8'));
  await page.addInitScript((data: Record<string, string>) => {
    if (!sessionStorage.getItem('seeded')) {
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
      sessionStorage.setItem('seeded', '1');
    }
  }, ls);
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip guide' }).click({ timeout: 8000 }).catch(() => {});
  await page.getByRole('tab', { name: 'Progress' }).click({ timeout: 20_000 });
  await expect(page.getByText('This Week', { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/Something went wrong/)).toHaveCount(0);
  await expect(page.getByTestId('card-error')).toHaveCount(0);
  await expect(page.getByText('NaN')).toHaveCount(0);
  for (const name of [/Weight tracker/, /Workout history/]) {
    await page.getByRole('button', { name }).first().click();
    await expect(page.getByText(/Something went wrong/)).toHaveCount(0);
  }
});
