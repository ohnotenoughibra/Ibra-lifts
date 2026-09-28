import { test, expect, Page } from '@playwright/test';
import { onboard } from './helpers';

/**
 * Mobile navigation: tools open over the tab and close back to the same spot,
 * the system back button closes the top-most thing, tabs keep their scroll.
 */
const overlay = (page: Page) => page.locator('[data-overlay-container]');
const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));

async function swipe(page: Page, x: number, y0: number, y1: number, dx = 0) {
  const c = await page.context().newCDPSession(page);
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= 12; i++) {
    await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * i) / 12, y: y0 + ((y1 - y0) * i) / 12 }] });
    await page.waitForTimeout(16);
  }
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await c.detach();
}

test.describe('Mobile navigation', () => {
  test.beforeEach(async ({ page }) => { await onboard(page); });

  test('closing a tool (✕ or back) returns to the same scroll position', async ({ page }) => {
    await page.getByRole('tab', { name: 'Tools' }).click();
    const tile = page.getByRole('button', { name: /^Strength/ }).first();
    await tile.scrollIntoViewIfNeeded();
    const before = await scrollY(page);
    expect(before).toBeGreaterThan(100);

    await tile.click();
    await expect(overlay(page)).toBeVisible();
    await page.getByRole('button', { name: 'Go back' }).first().click();
    await expect(overlay(page)).toHaveCount(0);
    expect(Math.abs(await scrollY(page) - before)).toBeLessThan(3);

    await tile.click();
    await expect(overlay(page)).toBeVisible();
    await page.goBack();
    await expect(overlay(page)).toHaveCount(0);
    expect(Math.abs(await scrollY(page) - before)).toBeLessThan(3);
  });

  test('tabs keep their scroll; back on another tab goes to Today, not out of the app', async ({ page }) => {
    await page.getByRole('tab', { name: 'Tools' }).click();
    await swipe(page, 200, 650, 250);
    await expect.poll(() => scrollY(page)).toBeGreaterThan(200);
    await page.waitForTimeout(800); // let the fling settle
    const toolsY = await scrollY(page);
    await page.getByRole('tab', { name: 'Train' }).click();
    await page.getByRole('tab', { name: 'Tools' }).click();
    await expect.poll(async () => Math.abs(await scrollY(page) - toolsY)).toBeLessThan(3);

    // Tapping the tab you're on scrolls to the top
    await page.getByRole('tab', { name: 'Tools' }).click();
    await expect.poll(() => scrollY(page)).toBeLessThan(3);

    await page.goBack();
    await expect(page.getByRole('tab', { name: 'Today' })).toHaveAttribute('aria-selected', 'true');
    expect(new URL(page.url()).origin).toBe('http://localhost:3000');
  });

  test('back closes a sheet inside a tool first, then the tool', async ({ page }) => {
    await page.getByRole('tab', { name: 'Tools' }).click();
    await page.getByRole('button', { name: /^Nutrition/ }).first().click();
    await page.getByRole('button', { name: 'Log food' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(overlay(page)).toBeVisible();
    await page.goBack();
    await expect(overlay(page)).toHaveCount(0);
  });

  test('a tool opened from a tool returns to it on back', async ({ page }) => {
    await page.getByRole('tab', { name: 'Tools' }).click();
    await page.getByRole('button', { name: /^Fight Prep/ }).first().click();
    await page.getByRole('button', { name: /Camp timeline/ }).click();
    await expect(page.getByRole('heading', { name: /No camp/ })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Fight Prep' })).toBeVisible();
    await page.goBack();
    await expect(overlay(page)).toHaveCount(0);
  });

  test('scrolling back up inside a tool never closes it; a pull from the top does', async ({ page }) => {
    await page.getByRole('tab', { name: 'Tools' }).click();
    await page.getByRole('button', { name: /^Cardio/ }).first().click();
    await expect(overlay(page)).toBeVisible();
    await page.waitForTimeout(500); // slide-in
    await swipe(page, 200, 650, 150);
    await page.waitForTimeout(400);
    const scrolled = await page.evaluate(() => Array.from(document.querySelectorAll('[data-overlay-container] *')).some(e => e.scrollTop > 0));
    expect(scrolled).toBe(true);
    await swipe(page, 200, 250, 500);
    await page.waitForTimeout(500);
    await expect(overlay(page)).toBeVisible();
    // Back at the top, a firm pull down closes it
    for (let i = 0; i < 4 && await overlay(page).count(); i++) {
      await swipe(page, 200, 200, 700);
      await page.waitForTimeout(600);
    }
    await expect(overlay(page)).toHaveCount(0);
  });

  test('a swipe from the left edge closes the tool', async ({ page }) => {
    await page.getByRole('tab', { name: 'Tools' }).click();
    await page.getByRole('button', { name: /^Strength/ }).first().click();
    await expect(overlay(page)).toBeVisible();
    await swipe(page, 6, 400, 400, 300);
    await expect(overlay(page)).toHaveCount(0);
  });

  test('back from a running workout leaves it for now instead of quitting', async ({ page }) => {
    await page.getByRole('tab', { name: 'Train' }).click();
    await page.getByRole('button', { name: 'Start Workout' }).first().click();
    await page.getByRole('button', { name: 'Good', exact: true }).click();
    await page.getByRole('button', { name: 'Start Workout' }).click();
    await expect(page.getByRole('button', { name: 'Leave workout for now' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('tab', { name: 'Train' })).toBeVisible();
    await page.getByRole('tab', { name: 'Today' }).click();
    await expect(page.getByRole('button', { name: 'Resume workout', exact: true })).toBeVisible();
  });

  test('sprint timer: back steps back, asks before ending a run or dropping the log', async ({ page }) => {
    await page.getByRole('tab', { name: 'Tools' }).click();
    await page.getByRole('button', { name: /^Air Bike & Sprints/ }).first().click();
    await page.getByRole('button', { name: 'Open Alactic Power 8 × 8 s' }).click();
    await expect(page.getByText('Why this works')).toBeVisible();
    // preview → back → the list, tool still open
    await page.goBack();
    await expect(page.getByRole('button', { name: 'Open Alactic Power 8 × 8 s' })).toBeVisible();
    await page.getByRole('button', { name: 'Open Alactic Power 8 × 8 s' }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByTestId('sprint-run')).toBeVisible();

    // running → back → confirm; keep going keeps the run
    await page.goBack();
    const endDialog = page.getByRole('dialog', { name: 'End this session?' });
    await expect(endDialog).toBeVisible();
    await endDialog.getByRole('button', { name: 'Keep going' }).click();
    await expect(endDialog).toHaveCount(0);
    await expect(page.getByTestId('sprint-run')).toBeVisible();
    // back re-arms after the confirm closed; a pull-down on the timer does nothing
    await swipe(page, 200, 200, 700);
    await expect(page.getByTestId('sprint-run')).toBeVisible();
    await page.goBack();
    await expect(endDialog).toBeVisible();
    await endDialog.getByRole('button', { name: 'End & log' }).click();
    await expect(page.getByText(/Ended early/)).toBeVisible();

    // log → back → discard confirm
    await page.goBack();
    const discard = page.getByRole('dialog', { name: 'Discard this session?' });
    await expect(discard).toBeVisible();
    await discard.getByRole('button', { name: 'Discard' }).click();
    await expect(page.getByRole('button', { name: 'Open Alactic Power 8 × 8 s' })).toBeVisible();
    await expect(overlay(page)).toBeVisible();
  });

  test('calendar workout editor: back asks before throwing edits away', async ({ page }) => {
    // One lifting log today, straight into the persisted store
    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('roots-gains-storage') || '{}');
      const st = raw.state;
      st.workoutLogs = [...(st.workoutLogs || []), {
        id: 'e2e-log', userId: st.user?.id ?? 'u', mesocycleId: 'm', sessionId: 's', date: new Date().toISOString(),
        exercises: [{ exerciseId: 'back_squat', exerciseName: 'Back Squat', personalRecord: false,
          sets: [{ setNumber: 1, weight: 100, reps: 5, rpe: 8, completed: true }] }],
        totalVolume: 500, duration: 45, overallRPE: 8, completed: true,
      }];
      localStorage.setItem('roots-gains-storage', JSON.stringify(raw));
    });
    await page.reload();
    // a first logged workout brings up the new-user guide
    await page.getByRole('button', { name: 'Skip guide' }).click({ timeout: 8000 }).catch(() => {});
    await page.getByRole('tab', { name: 'Progress' }).click({ timeout: 20_000 });
    await page.getByRole('button', { name: /Workout history/ }).first().click();
    await page.getByRole('button', { name: 'Calendar view' }).click();
    await page.locator('.grid-cols-7 button.ring-primary-500').click();
    const openEditor = async () => {
      await page.getByRole('button', { name: 'Edit workout' }).click();
      await expect(page.getByRole('heading', { name: 'Edit Workout' })).toBeVisible();
    };
    await openEditor();
    const editor = page.getByRole('heading', { name: 'Edit Workout' });
    const discard = page.getByRole('dialog', { name: 'Discard changes?' });

    // Nothing changed → back just closes
    await page.goBack();
    await expect(editor).toHaveCount(0);
    await expect(discard).toHaveCount(0);

    // Edited → back asks; keep editing keeps the edit; back asks again; discard closes
    await page.locator('.grid-cols-7 button.ring-primary-500').click();
    await openEditor();
    await page.locator('input[type="number"]').first().fill('105');
    await page.goBack();
    await expect(discard).toBeVisible();
    await discard.getByRole('button', { name: 'Keep editing' }).click();
    await expect(discard).toHaveCount(0);
    await expect(page.locator('input[type="number"]').first()).toHaveValue('105');
    await page.goBack();
    await expect(discard).toBeVisible();
    await discard.getByRole('button', { name: 'Discard' }).click();
    await expect(editor).toHaveCount(0);
    // the overlay/tab under it is untouched and the log wasn't changed
    await expect(page.getByRole('tab', { name: 'Progress' })).toHaveAttribute('aria-selected', 'true');
    const w = await page.evaluate(() => JSON.parse(localStorage.getItem('roots-gains-storage') || '{}').state.workoutLogs.find((l: { id: string }) => l.id === 'e2e-log').exercises[0].sets[0].weight);
    expect(w).toBe(100);
  });

  test('tool headers slide away on scroll down and come back on scroll up', async ({ page }) => {
    await page.getByRole('tab', { name: 'Tools' }).click();
    await page.getByRole('button', { name: /^Programs/ }).first().click();
    await expect(overlay(page)).toBeVisible();
    await page.waitForTimeout(500);
    const header = page.locator('[data-overlay-container] .sticky').first();
    await expect(header).toBeVisible();
    await swipe(page, 80, 600, 250);
    await expect(header).toHaveAttribute('data-chrome-hidden', '');
    await expect.poll(async () => { const b = await header.boundingBox(); return b ? b.y + b.height : 0; }).toBeLessThanOrEqual(0);
    await swipe(page, 80, 300, 380);
    await expect(header).not.toHaveAttribute('data-chrome-hidden', '');
    await expect.poll(async () => (await header.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(0);
  });

  test('pop-up banners stay off the header buttons', async ({ page }) => {
    // The daily bonus pops ~0.8 s after the dashboard mounts (onboarding just did)
    const bonus = page.getByRole('button', { name: /login bonus/i });
    await expect(bonus).toBeVisible({ timeout: 5000 });
    const b = (await bonus.boundingBox())!;
    const settings = (await page.getByRole('button', { name: 'Profile & Settings' }).first().boundingBox())!;
    expect(b.y).toBeGreaterThan(settings.y + settings.height);
    const vw = page.viewportSize()!.width;
    expect(Math.abs(b.x + b.width / 2 - vw / 2)).toBeLessThan(3); // centred
  });
});
