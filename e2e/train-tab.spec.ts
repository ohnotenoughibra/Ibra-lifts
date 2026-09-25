import { test, expect, Page } from '@playwright/test';
import { onboard } from './helpers';

/**
 * Train tab E2E — the UI flows the coverage audit flagged as untestable
 * without a browser: today hero, schedule sheet, block manager lifecycle
 * (stop/undo/queue/switch), and exercise removal undo.
 *
 * The app is local-first: each test onboards a fresh profile, which also
 * auto-generates the first training block.
 */

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
    await manager.getByRole('button', { name: 'Start now' }).click();
    // Switching stops the current block — it asks first
    await expect(manager.getByTestId('confirm-switch')).toBeVisible();
    await manager.getByRole('button', { name: 'Switch now' }).click();
    await expect(manager.getByText('Stopped', { exact: true })).toBeVisible();
    // The block keeps the name it had in the queue
    await expect(manager.getByTestId('rename-block')).toContainText('Hypertrophy');
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

test.describe('Train tab — week planning', () => {
  test.beforeEach(async ({ page }) => {
    await onboard(page);
    await openTrainTab(page);
  });

  test('agenda shows Mon→Sun and a session can be moved, then undone', async ({ page }) => {
    const agenda = page.getByTestId('week-agenda');
    await agenda.scrollIntoViewIfNeeded();
    await expect(agenda.locator('[data-testid^="agenda-day-"]')).toHaveCount(7);
    const moveBtn = agenda.locator('[data-testid^="agenda-move-"]').first();
    const sid = (await moveBtn.getAttribute('data-testid'))!.replace('agenda-move-', '');
    const before = await agenda.locator('[data-testid^="agenda-day-"]', { has: page.getByTestId(`agenda-session-${sid}`) }).getAttribute('data-testid');
    await moveBtn.click();
    await page.getByTestId('move-picker').getByTestId('move-to-0').click();
    await expect(page.getByTestId('agenda-day-0').getByTestId(`agenda-session-${sid}`)).toBeVisible();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByTestId(before!).getByTestId(`agenda-session-${sid}`)).toBeVisible();
  });

  test('week layout sheet sets mat days and moves lifting onto new days', async ({ page }) => {
    await page.getByTestId('edit-layout').click();
    const sheet = page.getByTestId('week-layout-sheet');
    await expect(sheet).toBeVisible();
    // Tap cycles none → light → moderate → hard (onboarding may already have set one)
    const tue = sheet.getByTestId('mat-day-2');
    for (let i = 0; i < 4 && !(await tue.getAttribute('aria-label'))!.endsWith('hard'); i++) await tue.click();
    await expect(sheet.getByTestId('mat-day-2')).toContainText('hard');
    await sheet.getByTestId('save-layout').click();
    await expect(sheet).not.toBeVisible();
    await expect(page.getByTestId('agenda-day-2')).toContainText('hard');
  });

  test('tapping an agenda session opens it in the schedule with scope choice on swap', async ({ page }) => {
    const first = page.locator('[data-testid^="agenda-session-"]').first();
    await first.click();
    const sheet = page.getByRole('dialog', { name: 'Block schedule' });
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: 'Swap exercise' }).first().click();
    const toggle = sheet.getByTestId('scope-toggle').first();
    await expect(toggle).toBeVisible();
    await expect(toggle.getByRole('radio', { name: /Rest of block/ })).toHaveAttribute('aria-checked', 'true');
  });
});

test.describe('Train tab — organising blocks', () => {
  test.beforeEach(async ({ page }) => {
    await onboard(page);
    await openTrainTab(page);
  });

  test('rename the current block', async ({ page }) => {
    await page.getByRole('button', { name: 'Blocks', exact: true }).click();
    const manager = page.getByRole('dialog', { name: 'Manage blocks' });
    await manager.getByTestId('rename-block').click();
    const input = manager.getByTestId('block-name-input');
    await input.fill('Camp 1 — Strength');
    await input.press('Enter');
    await expect(manager.getByTestId('rename-block')).toContainText('Camp 1 — Strength');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Open full block schedule' })).toContainText('Camp 1 — Strength');
  });

  test('queued blocks can be edited and reordered', async ({ page }) => {
    for (const focus of ['Muscle', 'Endurance']) {
      await page.getByRole('button', { name: 'New Block' }).click();
      const composer = page.getByRole('dialog', { name: 'New block composer' });
      await composer.getByRole('button', { name: focus, exact: true }).click();
      await composer.getByRole('button', { name: 'Add block to queue' }).click();
      await expect(composer).not.toBeVisible();
    }
    await page.getByRole('button', { name: 'Blocks', exact: true }).click();
    const manager = page.getByRole('dialog', { name: 'Manage blocks' });
    const names = manager.getByRole('button', { name: /^Edit / });
    await expect(names).toHaveCount(2);
    const firstBefore = (await names.first().getAttribute('aria-label'))!;
    await manager.getByRole('button', { name: /later$/ }).first().click();
    await expect(names.nth(1)).toHaveAttribute('aria-label', firstBefore);
    // Edit length of the (new) first block
    await names.first().click();
    const editor = manager.getByTestId('queue-editor');
    const before = parseInt(await editor.getByTestId('queue-weeks').innerText());
    await editor.getByRole('button', { name: 'Longer' }).click();
    await expect(editor.getByTestId('queue-weeks')).toHaveText(`${before + 1} weeks`);
  });

  test('block length is changed from the schedule header', async ({ page }) => {
    await page.getByRole('button', { name: 'Open full block schedule' }).click();
    const sheet = page.getByRole('dialog', { name: 'Block schedule' });
    const len = sheet.getByTestId('block-length');
    const n = parseInt(await len.innerText());
    await sheet.getByRole('button', { name: 'Add week' }).click();
    await expect(len).toHaveText(`${n + 1} weeks`);
    await sheet.getByRole('button', { name: 'Remove week' }).click();
    await expect(len).toHaveText(`${n} weeks`);
  });
});
