import { test, expect } from '@playwright/test';
import { onboard } from './helpers';

/**
 * State continuity — "leave and come back" must not lose where you were or
 * what you typed (audit 2026-09-24).
 */
test.describe('State continuity', () => {
  test.beforeEach(async ({ page }) => { await onboard(page); });

  test('a reload keeps the tab you were on', async ({ page }) => {
    await page.getByRole('tab', { name: 'Progress' }).click();
    await expect(page.getByRole('tab', { name: 'Progress' })).toHaveAttribute('aria-selected', 'true');
    await page.reload();
    await expect(page.getByRole('tab', { name: 'Progress' })).toHaveAttribute('aria-selected', 'true', { timeout: 20_000 });
  });

  test('a reload keeps the open tool, and a half-typed mat session survives closing it', async ({ page }) => {
    await page.getByRole('tab', { name: 'Tools' }).click();
    await page.getByRole('button', { name: /Mat Sessions/ }).first().click();
    await page.getByRole('button', { name: 'Log', exact: true }).click();
    const techniques = page.getByPlaceholder(/Arm bars, guard passing/);
    await techniques.fill('Kimura trap from half guard');
    // leave the tool and come back
    await page.getByRole('button', { name: 'Go back' }).first().click();
    await page.getByRole('button', { name: /Mat Sessions/ }).first().click();
    await page.getByRole('button', { name: 'Log', exact: true }).click();
    await expect(page.getByPlaceholder(/Arm bars, guard passing/)).toHaveValue('Kimura trap from half guard');
    // reload while the tool is open → still in the tool, draft still there
    await page.reload();
    await page.getByRole('button', { name: 'Log', exact: true }).click({ timeout: 20_000 });
    await expect(page.getByPlaceholder(/Arm bars, guard passing/)).toHaveValue('Kimura trap from half guard');
  });

  test('holding a tool pins it (and holding again unpins)', async ({ page }) => {
    await page.getByRole('tab', { name: 'Tools' }).click();
    const tile = page.getByRole('button', { name: /^Cardio — hold to pin/ });
    const box = (await tile.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
    await expect(page.getByText('Pinned', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Cardio \(pinned\)/ }).first()).toBeVisible();
    // the hold must not also open the tool
    await expect(page.getByRole('tab', { name: 'Tools' })).toHaveAttribute('aria-selected', 'true');
    const pinnedTile = page.getByRole('button', { name: /^Cardio \(pinned\)/ }).first();
    const b2 = (await pinnedTile.boundingBox())!;
    await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2);
    await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
    await expect(page.getByRole('button', { name: /^Cardio \(pinned\)/ })).toHaveCount(0);
  });
});
