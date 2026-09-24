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
});
