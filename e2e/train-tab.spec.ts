import { test, expect, Page } from '@playwright/test';

/**
 * Train tab E2E — the UI flows the coverage audit flagged as untestable
 * without a browser: today hero, schedule sheet, block manager lifecycle
 * (stop/undo/queue/switch), and exercise removal undo.
 *
 * The app is local-first: each test onboards a fresh profile, which also
 * auto-generates the first training block.
 */

async function onboard(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Combat Athlete/ }).click();
  await page.getByRole('button', { name: /^MMA/ }).click();
  await page.getByRole('button', { name: 'Get Stronger' }).click();
  await page.getByPlaceholder('Your name').fill('E2E');
  await page.getByRole('spinbutton').fill('80');
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: '1-3y' }).click();
  await page.getByRole('button', { name: /I train at my own risk/ }).click();
  await page.getByRole('button', { name: "Let's Go" }).click();
  // Dashboard mounts when the bottom tab bar appears
  await expect(page.getByRole('tab', { name: 'Train' })).toBeVisible({ timeout: 20_000 });
}

async function openTrainTab(page: Page) {
  await page.getByRole('tab', { name: 'Train' }).click();
  // The block strip is unique to the Train tab (Home has its own Start button)
  await expect(page.getByRole('button', { name: 'Open full block schedule' })).toBeVisible({ timeout: 10_000 });
}

test.describe('Train tab', () => {
  test.beforeEach(async ({ page }) => {
    await onboard(page);
    await openTrainTab(page);
  });

  test('today hero shows the next session with one Start button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Start Workout' })).toBeVisible();
    // Block strip is present with week position
    await expect(page.getByText(/Week 1 of \d/)).toBeVisible();
  });

  test('block strip opens the schedule sheet with the current week expanded', async ({ page }) => {
    await page.getByRole('button', { name: 'Open full block schedule' }).click();
    const sheet = page.getByRole('dialog', { name: 'Block schedule' });
    await expect(sheet).toBeVisible();
    // Current week auto-open: session rows with Start buttons are visible
    await expect(sheet.getByRole('button', { name: 'Start' }).first()).toBeVisible();
    // Escape closes (document-level listener)
    await page.keyboard.press('Escape');
    await expect(sheet).not.toBeVisible();
  });

  test('stop early archives the block and undo restores it', async ({ page }) => {
    await page.getByRole('button', { name: 'Blocks', exact: true }).click();
    const manager = page.getByRole('dialog', { name: 'Manage blocks' });
    await expect(manager).toBeVisible();

    await manager.getByRole('button', { name: 'Stop early' }).click();
    // Current section flips to empty; the block lands in past blocks as Stopped
    await expect(manager.getByText('No active block')).toBeVisible();
    await expect(manager.getByText('Stopped', { exact: true })).toBeVisible();

    // Undo toast is bound to this exact action
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(manager.getByRole('button', { name: 'Stop early' })).toBeVisible();
    await expect(manager.getByText('No active block')).not.toBeVisible();
  });

  test('queueing a block shows the up-next row and switch starts it', async ({ page }) => {
    // Queue a Muscle-focus block via the composer
    await page.getByRole('button', { name: 'New Block' }).click();
    const composer = page.getByRole('dialog', { name: 'New block composer' });
    await expect(composer).toBeVisible();
    await composer.getByRole('button', { name: 'Muscle', exact: true }).click();
    await composer.getByRole('button', { name: 'Add block to queue' }).click();

    // Up-next row appears on the main screen (role-scoped: the success toast
    // also contains the words "after this block")
    const upNextRow = page.getByRole('button', { name: /After this block.*Hypertrophy/ });
    await expect(upNextRow).toBeVisible();

    // Switch via the manager — old block becomes Stopped, queue empties
    await upNextRow.click();
    const manager = page.getByRole('dialog', { name: 'Manage blocks' });
    await manager.getByRole('button', { name: 'Switch' }).click();
    await expect(manager.getByText('Stopped', { exact: true })).toBeVisible();
    await expect(manager.getByText('Nothing queued', { exact: false })).toBeVisible();
  });

  test('removing an exercise from the schedule is undoable', async ({ page }) => {
    await page.getByRole('button', { name: 'Open full block schedule' }).click();
    const sheet = page.getByRole('dialog', { name: 'Block schedule' });

    // Expand the first session to reveal its exercises
    await sheet.getByRole('button', { name: /W1\/D1/ }).first().click();
    await expect(sheet.getByRole('button', { name: 'Remove exercise' }).first()).toBeVisible();

    await sheet.getByRole('button', { name: 'Remove exercise' }).first().click();
    // The toast names what was removed — read it rather than guessing the DOM
    const toastLabel = page.locator('[role="status"]', { hasText: 'Removed' }).locator('span').first();
    await expect(toastLabel).toBeVisible();
    const removedName = (await toastLabel.textContent())!.replace(/^Removed\s*/, '').trim();

    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(sheet.getByText(removedName, { exact: true }).first()).toBeVisible();
  });

  test('complete with zero logged workouts archives as Stopped (no XP farm)', async ({ page }) => {
    await page.getByRole('button', { name: 'Blocks', exact: true }).click();
    const manager = page.getByRole('dialog', { name: 'Manage blocks' });
    await manager.getByRole('button', { name: 'Complete', exact: true }).click();

    // Zero-work completion is abandonment: badge shows Stopped, never Completed
    await expect(manager.getByText('Stopped', { exact: true })).toBeVisible();
    await expect(manager.getByText('Completed', { exact: true })).not.toBeVisible();
  });
});
