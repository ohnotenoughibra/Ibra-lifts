import { test, expect } from '@playwright/test';
import { onboard } from './helpers';

/**
 * Full-app audit 2026-09-25 — UX regressions that were measured on screen.
 */
test.describe('Audit UX', () => {
  test.beforeEach(async ({ page }) => { await onboard(page); });

  test('a fresh profile gets a check-in prompt, not a made-up readiness score', async ({ page }) => {
    await page.getByRole('tab', { name: 'Today' }).click();
    await expect(page.getByTestId('readiness-empty')).toBeVisible();
    await expect(page.getByText(/Peak\. Send it/)).toHaveCount(0);
  });

  test('Train tab no longer repeats Mission Control; Tools still has everything', async ({ page }) => {
    await page.getByRole('tab', { name: 'Train' }).click();
    await expect(page.getByRole('heading', { name: 'Mission Control' })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Tools' }).click();
    await expect(page.getByRole('button', { name: /^Air Bike & Sprints/ }).first()).toBeVisible();
  });

  test('Crews asks a signed-out athlete to sign in instead of showing "Unauthorized"', async ({ page }) => {
    await page.getByRole('tab', { name: 'Tools' }).click();
    await page.getByRole('button', { name: /^Crews/ }).first().click();
    await expect(page.getByText('Sign in to use Crews')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/unauthori[sz]ed/i)).toHaveCount(0);
  });

  test('with a workout running, Today offers Resume, not a second Start', async ({ page }) => {
    await page.getByRole('tab', { name: 'Train' }).click();
    await page.getByRole('button', { name: 'Start Workout' }).first().click();
    await page.getByRole('button', { name: 'Good', exact: true }).click();
    await page.getByRole('button', { name: 'Start Workout' }).click();
    await page.getByRole('button', { name: 'Leave workout for now' }).click();
    await page.getByRole('tab', { name: 'Today' }).click();
    await expect(page.getByRole('button', { name: 'Resume workout', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Workout' })).toHaveCount(0);
  });
});
