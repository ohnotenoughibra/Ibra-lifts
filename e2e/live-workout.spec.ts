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
  // Two-tap start: straight to the overview (no "Ready for this?" intro)
  await expect(page.getByRole('button', { name: 'Skip next time' })).toHaveCount(0);
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
    const before = (await second.innerText()).replace(/\s*\d+\/\d+$/, '').trim();
    await page.getByRole('button', { name: 'Next exercise' }).click();
    await page.getByRole('button', { name: 'Swap exercise' }).last().click();
    const options = page.getByRole('button', { name: /^Swap to / });
    await expect(options.first()).toBeVisible();
    const choice = ((await options.first().getAttribute('aria-label')) ?? '').replace(/^Swap to /, '');
    expect(choice).not.toBe(before);
    await options.first().click();
    await expect(pills(page).nth(1)).toHaveAccessibleName(new RegExp(`^${choice.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  });

  test('swap search covers the whole library and hidden exercises stay out of suggestions', async ({ page }) => {
    await page.getByRole('button', { name: 'Swap exercise' }).last().click();
    const search = page.getByRole('searchbox', { name: 'Search exercises' });
    await search.fill('farmer');
    await expect(page.getByRole('button', { name: /^Swap to Farmer/ }).first()).toBeVisible();
    await search.fill('');
    // Hide the top suggestion — it must disappear from suggestions
    const top = page.getByRole('button', { name: /^Swap to / }).first();
    const topName = ((await top.getAttribute('aria-label')) ?? '').replace(/^Swap to /, '');
    await page.getByRole('button', { name: `Don't recommend ${topName}` }).click();
    await expect(page.getByRole('button', { name: `Swap to ${topName}`, exact: true })).toHaveCount(0);
    // ...but a deliberate search still finds it, marked hidden, with unhide
    await search.fill(topName);
    await expect(page.getByRole('button', { name: `Unhide ${topName}` })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(search).not.toBeVisible();
  });

  test('finishing saves the workout and returns to the app', async ({ page }) => {
    await logSet(page, '60', '5');
    await page.getByRole('button', { name: 'Finish workout' }).click();
    // Straight to the finish sheet — no "Got extra time?" interstitial
    await expect(page.getByRole('heading', { name: 'Add a finisher' })).toHaveCount(0);
    await expect(page.getByTestId('finish-deltas')).toContainText('first time');
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
    await expect(page.getByText(/New PR ·/)).not.toBeVisible();
  });

  test('swapping mid-exercise keeps the logged set, and undo restores the plan', async ({ page }) => {
    const before = await pills(page).count();
    await logSet(page, '60', '5');
    await page.getByRole('button', { name: 'Swap exercise' }).last().click();
    await page.getByRole('button', { name: /^Swap to / }).first().click();
    // performed set stays on the original lift; the new lift is inserted after it
    await expect(pills(page)).toHaveCount(before + 1);
    await expect(pills(page).first()).toHaveAccessibleName(/1\/1$/);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(pills(page)).toHaveCount(before);
    await expect(pills(page).first()).toHaveAccessibleName(/1\/\d+$/);
  });

  test('jumping to another exercise and back resumes at the next open set', async ({ page }) => {
    await logSet(page, '60', '5');
    await expect(pills(page).first()).toHaveAccessibleName(/1\/\d+$/);
    await page.getByRole('button', { name: 'Next exercise' }).click();
    await pills(page).first().click();
    // Completing now must log set 2 — not overwrite set 1
    await page.getByRole('button', { name: 'Complete Set' }).click();
    await expect(pills(page).first()).toHaveAccessibleName(/2\/\d+$/);
  });

  test('power primer can be added in one tap and undone', async ({ page }) => {
    const before = await pills(page).count();
    const firstBefore = await pills(page).first().innerText();
    await page.getByRole('button', { name: 'Add power primer' }).first().click();
    await expect(page.getByText(/Power primer added/)).toBeVisible();
    const after = await pills(page).count();
    expect(after).toBeGreaterThan(before);
    // primer goes first (the old first exercise moved down)
    expect(await pills(page).first().innerText()).not.toBe(firstBefore);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(pills(page)).toHaveCount(before);
  });

  test('the rest timer survives pausing mid-rest and can be adjusted', async ({ page }) => {
    await page.getByRole('spinbutton', { name: 'Weight' }).fill('60');
    await page.getByRole('spinbutton', { name: 'Reps' }).fill('5');
    await page.getByRole('button', { name: 'Complete Set' }).click();
    await expect(page.getByRole('button', { name: 'Skip Rest' })).toBeVisible();
    await page.getByRole('button', { name: 'Rest 15 seconds more' }).click();
    // rest is a slim bottom bar now — the logger header stays reachable
    await page.getByRole('button', { name: 'Cancel workout' }).click();
    await page.getByRole('button', { name: /Pause & Browse/ }).click();
    await page.getByRole('button', { name: /^Resume/ }).first().click();
    // still resting after coming back
    await expect(page.getByRole('button', { name: /Skip Rest/i }).first()).toBeVisible();
  });

  test('Leave keeps everything and the resume bar shows exactly where you are', async ({ page }) => {
    await logSet(page, '60', '5');
    const name = (await pills(page).first().innerText()).replace(/\s*\d+\/\d+$/, '').trim();
    await page.getByRole('button', { name: 'Leave workout for now' }).click();
    const bar = page.getByRole('button', { name: 'Resume workout', exact: true });
    await expect(bar).toBeVisible();
    await expect(bar).toContainText(name);
    await expect(bar).toContainText('set 2/');
    await page.getByRole('tab', { name: 'Progress' }).click();
    await bar.click();
    await expect(page.getByRole('button', { name: 'Complete Set' })).toBeVisible();
    await expect(pills(page).first()).toHaveAccessibleName(/1\/\d+$/);
  });

  test('correcting a logged set saves immediately, to that set', async ({ page }) => {
    await logSet(page, '60', '5');
    // go back to set 1 and fix the weight — no blur, no extra taps (iOS-like)
    await page.getByRole('button', { name: /^Set 1 \(done/ }).click();
    await expect(page.getByText(/Set logged · edits save instantly/)).toBeVisible();
    await page.getByRole('spinbutton', { name: 'Weight' }).fill('70');
    // the set button reflects the saved value right away
    await expect(page.getByRole('button', { name: /^Set 1 \(done: 70 × 5\)/ })).toBeVisible();
    // moving to set 2 must not carry the edit over; coming back shows it saved
    await page.getByRole('button', { name: /^Set 2/ }).click();
    await expect(page.getByRole('spinbutton', { name: 'Weight' })).not.toHaveValue('70');
    await page.getByRole('button', { name: /^Set 1 \(done/ }).click();
    await expect(page.getByRole('spinbutton', { name: 'Weight' })).toHaveValue('70');
  });

  test('header shows time left; quick-adjust uses real steps; a set can be removed', async ({ page }) => {
    await expect(page.getByTestId('session-eta')).toContainText(/min left/);
    await expect(page.getByTestId('set-compare')).toContainText('Today:');
    await expect(page.getByRole('button', { name: '+25' })).toHaveCount(0);
    const before = await pills(page).first().getAttribute('aria-label') ?? (await pills(page).first().innerText());
    const total = Number((before.trim().match(/\/(\d+)$/) ?? [])[1]);
    await page.getByRole('button', { name: /^Remove set 1$/ }).click();
    await expect(pills(page).first()).toHaveAccessibleName(new RegExp(`0/${total - 1}$`));
    await page.getByRole('button', { name: 'Add set', exact: true }).click();
    await expect(pills(page).first()).toHaveAccessibleName(new RegExp(`0/${total}$`));
  });

  test('a setup note sticks to the exercise across reloads', async ({ page }) => {
    await page.getByRole('button', { name: 'Add setup note' }).click();
    await page.getByRole('textbox', { name: 'Exercise setup note' }).fill('Seat 4, neutral grip');
    await page.getByRole('textbox', { name: 'Exercise setup note' }).press('Enter');
    await expect(page.getByRole('button', { name: 'Edit setup note' })).toContainText('Seat 4, neutral grip');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Edit setup note' })).toContainText('Seat 4, neutral grip', { timeout: 20_000 });
  });

  test('swap search reaches the imported library (~770 exercises)', async ({ page }) => {
    await page.getByRole('button', { name: 'Swap exercise' }).last().click();
    await page.getByRole('searchbox', { name: 'Search exercises' }).fill('guillotine');
    await expect(page.getByRole('button', { name: /^Swap to Barbell Guillotine Bench Press/ })).toBeVisible({ timeout: 10_000 });
  });
});
