import { test, expect, Page } from '@playwright/test';
import { onboard } from './helpers';

/**
 * Live workout E2E — baseline smoke for the ActiveWorkout rebuild (plan
 * Phase 1 & 6). Covers the path every session takes: start → check-in →
 * log a set → rest → undo → swap → finish. Assertions are on behaviour, not
 * on which exercises the (randomised) generator picked.
 */

const pills = (page: Page) => page.getByRole('button', { name: /\d+\/\d+$/ });

async function startLiveWorkout(page: Page) {
  await page.getByRole('tab', { name: 'Train' }).click();
  await page.getByRole('button', { name: 'Start Workout' }).first().click();
  // First-run intro sheet (skippable) precedes the overview
  const intro = page.getByRole('button', { name: "Let's Go" });
  if (await intro.isVisible({ timeout: 3_000 }).catch(() => false)) await intro.click();
  // Overview + check-in
  await page.getByRole('button', { name: 'Good', exact: true }).click();
  await page.getByRole('button', { name: 'Start Workout' }).click();
  await expect(page.getByRole('button', { name: 'Complete Set' })).toBeVisible();
}

async function logSet(page: Page, weight: string, reps: string) {
  await page.getByRole('spinbutton', { name: 'Weight' }).fill(weight);
  await page.getByRole('spinbutton', { name: 'Reps' }).fill(reps);
  await page.getByRole('button', { name: 'Complete Set' }).click();
  // Rest overlay takes over the screen after every set
  await page.getByRole('button', { name: 'Skip Rest' }).click();
}

test.describe('Live workout', () => {
  test.beforeEach(async ({ page }) => {
    await onboard(page);
    await startLiveWorkout(page);
  });

  test('logging a set advances the exercise counter and shows it in history', async ({ page }) => {
    await expect(pills(page).first()).toHaveAccessibleName(/0\/\d+$/);
    await logSet(page, '60', '5');
    await expect(pills(page).first()).toHaveAccessibleName(/1\/\d+$/);
    await expect(page.getByRole('button', { name: /60kg × 5/ })).toBeVisible();
  });

  test('undo last set rolls the counter back', async ({ page }) => {
    await logSet(page, '60', '5');
    await expect(pills(page).first()).toHaveAccessibleName(/1\/\d+$/);
    await page.getByRole('button', { name: 'Undo Last Set', exact: true }).click();
    await expect(pills(page).first()).toHaveAccessibleName(/0\/\d+$/);
  });

  test('swap sheet lists alternatives and swapping replaces the exercise', async ({ page }) => {
    const second = pills(page).nth(1);
    const before = ((await second.getAttribute('aria-label')) ?? (await second.innerText())).replace(/\s*\d+\/\d+$/, '').trim();
    await page.getByRole('button', { name: 'Next exercise' }).click();
    await page.getByRole('button', { name: 'Swap exercise' }).last().click();
    const options = page.getByRole('button', { name: /\d+%/ });
    await expect(options.first()).toBeVisible();
    expect(await options.count()).toBeGreaterThan(0);
    const choice = (await options.first().innerText()).split(/\d+%/)[0].trim();
    expect(choice).not.toBe(before);
    await options.first().click();
    await expect(pills(page).nth(1)).toHaveAccessibleName(new RegExp(`^${choice.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  });

  test('finishing saves the workout and returns to the app', async ({ page }) => {
    await logSet(page, '60', '5');
    await page.getByRole('button', { name: 'Finish workout' }).click();
    // Optional "Got extra time?" volume-gap interstitial
    const skip = page.getByRole('button', { name: 'Skip & Finish' });
    if (await skip.isVisible({ timeout: 3_000 }).catch(() => false)) await skip.click();
    await page.getByRole('button', { name: 'Save Workout' }).click();
    await expect(page.getByRole('button', { name: 'Complete Set' })).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('tab', { name: 'Today' })).toBeVisible({ timeout: 10_000 });
  });

  test('pausing and resuming keeps your place and skips the overview', async ({ page }) => {
    await logSet(page, '60', '5');
    await page.getByRole('button', { name: 'Next exercise' }).click();
    const secondName = (await pills(page).nth(1).innerText()).replace(/\s*\d+\/\d+$/, '').trim();
    // Pause & Browse lives behind the cancel/leave confirm
    await page.getByRole('button', { name: 'Cancel workout' }).click();
    await page.getByRole('button', { name: /Pause & Browse/ }).click();
    await expect(page.getByRole('button', { name: 'Complete Set' })).not.toBeVisible();
    await page.getByRole('button', { name: /^Resume/ }).first().click();
    // Back in the logger — not the check-in overview — on the same exercise
    await expect(page.getByRole('button', { name: 'Complete Set' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Good', exact: true })).not.toBeVisible();
    await expect(pills(page).first()).toHaveAccessibleName(/1\/\d+$/);
    expect(secondName).not.toBe('');
    await expect(page.getByRole('heading', { name: secondName, exact: true })).toBeVisible();
  });

  test('a first-ever set is not celebrated as a PR', async ({ page }) => {
    await page.getByRole('spinbutton', { name: 'Weight' }).fill('60');
    await page.getByRole('spinbutton', { name: 'Reps' }).fill('5');
    await page.getByRole('button', { name: 'Complete Set' }).click();
    await expect(page.getByRole('button', { name: 'Skip Rest' })).toBeVisible();
    await expect(page.getByText('NEW PR!')).not.toBeVisible();
  });

  test('swapping mid-exercise keeps the logged set, and undo restores the plan', async ({ page }) => {
    const before = await pills(page).count();
    await logSet(page, '60', '5');
    await page.getByRole('button', { name: 'Swap exercise' }).last().click();
    await page.getByRole('button', { name: /\d+%/ }).first().click();
    // performed set stays on the original lift; the new lift is inserted after it
    await expect(pills(page)).toHaveCount(before + 1);
    await expect(pills(page).first()).toHaveAccessibleName(/1\/1$/);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(pills(page)).toHaveCount(before);
    await expect(pills(page).first()).toHaveAccessibleName(/1\/\d+$/);
  });
});
