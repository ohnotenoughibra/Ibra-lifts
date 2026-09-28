import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Tools against a realistic history (220 workouts over 14 months, messy
 * values): they open without crashing, and their headers don't eat the screen.
 */
const overlay = (page: Page) => page.locator('[data-overlay-container]');

async function seed(page: Page) {
  const ls = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/messy-history.json'), 'utf8'));
  await page.addInitScript((data: Record<string, string>) => {
    if (!sessionStorage.getItem('seeded')) {
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
      sessionStorage.setItem('seeded', '1');
    }
  }, ls);
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip guide' }).click({ timeout: 8000 }).catch(() => {});
  await expect(page.getByRole('tab', { name: 'Tools' })).toBeVisible({ timeout: 20_000 });
}

async function openTool(page: Page, id: string) {
  await page.evaluate((v) => sessionStorage.setItem('ui:overlay', JSON.stringify({ v, at: Date.now() })), id);
  await page.reload();
  await expect(overlay(page)).toBeVisible({ timeout: 20_000 });
}

async function swipe(page: Page, x: number, y0: number, y1: number) {
  const c = await page.context().newCDPSession(page);
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= 12; i++) {
    await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / 12 }] });
    await page.waitForTimeout(16);
  }
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await c.detach();
}

test.describe('Tools with a real history', () => {
  test.beforeEach(async ({ page }) => { await seed(page); });

  test('Deload tab opens (a malformed log date crashed it)', async ({ page }) => {
    await openTool(page, 'fatigue');
    await page.waitForTimeout(1500);
    await expect(page.getByText(/Something went wrong/)).toHaveCount(0);
    await expect(page.getByText(/Invalid time value/)).toHaveCount(0);
  });

  test('Movement Library gives the list the screen, and its header slides away', async ({ page }) => {
    await openTool(page, 'movement_library');
    const header = overlay(page).locator('.sticky').first();
    await expect(header).toBeVisible();
    const vh = page.viewportSize()!.height;
    // filters start collapsed: the pinned header is title + search, not four chip rows
    expect((await header.boundingBox())!.height).toBeLessThan(vh * 0.25);
    await page.waitForTimeout(500);
    await swipe(page, 200, 560, 200);
    await expect(header).toHaveAttribute('data-chrome-hidden', '');
    await swipe(page, 200, 300, 380);
    await expect(header).not.toHaveAttribute('data-chrome-hidden', '');
  });

  test('headers that used to scroll away for good come back on scroll-up', async ({ page }) => {
    for (const id of ['strength', 'periodization', 'sprints', 'coach']) {
      await openTool(page, id);
      await page.waitForTimeout(500);
      const header = overlay(page).getByRole('button', { name: 'Go back' }).first();
      await swipe(page, 200, 560, 200);
      await page.waitForTimeout(400);
      await swipe(page, 200, 300, 380);
      await expect.poll(async () => (await header.boundingBox())?.y ?? -999, { message: id }).toBeGreaterThanOrEqual(0);
    }
  });
});
