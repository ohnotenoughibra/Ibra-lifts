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
});
