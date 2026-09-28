import { test, expect } from '@playwright/test';
import { onboard } from './helpers';

/**
 * Rebuilt nutrition (2026-09): open it, log by search with grams, undo,
 * plan + coach tabs render. Screenshots land in test-results/ for review.
 */
test.describe('nutrition', () => {
  test('log a food by search, then undo; plan and coach render', async ({ page }) => {
    await onboard(page);
    await page.getByRole('tab', { name: 'Tools' }).click();
    await page.getByRole('button', { name: /^Nutrition/ }).first().click();

    await expect(page.getByText('protein to go')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Your day')).toBeVisible();
    await page.screenshot({ path: 'test-results/nutrition-today.png', fullPage: true });

    // Log 250 g Magertopfen by search
    await page.getByRole('button', { name: 'Log food' }).click();
    await page.getByLabel('Search food').fill('magertopfen');
    await page.getByRole('button', { name: /^Magertopfen/ }).first().click();
    const grams = page.getByLabel('Amount in grams');
    await grams.fill('250');
    await page.screenshot({ path: 'test-results/nutrition-amount.png' });
    await page.getByRole('button', { name: /^Log 250 g/ }).click();
    await expect(page.getByText(/Logged Magertopfen/)).toBeVisible();
    const row = page.getByRole('button', { name: /^Magertopfen 250 g 168/ });
    await expect(row).toBeVisible();
    await page.screenshot({ path: 'test-results/nutrition-logged.png', fullPage: true });

    // Undo removes it again
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(row).toHaveCount(0);

    await page.getByRole('tab', { name: 'Plan' }).click();
    await expect(page.getByText(/kcal per day/)).toBeVisible();
    await page.screenshot({ path: 'test-results/nutrition-plan.png', fullPage: true });
    await page.getByRole('button', { name: /Shopping/ }).click();
    await page.screenshot({ path: 'test-results/nutrition-shopping.png', fullPage: true });

    await page.getByRole('tab', { name: 'Coach' }).click();
    await expect(page.getByText('Your expenditure')).toBeVisible();
    await page.screenshot({ path: 'test-results/nutrition-coach.png', fullPage: true });
  });
});

test.describe('nutrition — setup, recipes, AI', () => {
  test('profile → adaptive targets; log a suggested recipe; describe a meal', async ({ page }) => {
    await onboard(page);
    await page.getByRole('tab', { name: 'Tools' }).click();
    await page.getByRole('button', { name: /^Nutrition/ }).first().click();
    await expect(page.getByText(/Add your height/)).toBeVisible({ timeout: 20_000 });

    // Coach: add height → setup card disappears, a real base is built
    await page.getByRole('tab', { name: 'Coach' }).click();
    await page.getByLabel('Height cm').fill('180');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText(/estimated from your profile|kcal\/day estimated/).first()).toBeVisible();
    await page.getByRole('button', { name: 'Lose' }).click();
    await expect(page.getByRole('button', { name: /-0,5 kg\/week/ })).toBeVisible();
    await page.screenshot({ path: 'test-results/nutrition-coach-cut.png', fullPage: true });

    await page.getByRole('tab', { name: 'Today' }).click();
    await expect(page.getByText(/Add your height/)).toHaveCount(0);

    // One-tap log of the first suggestion
    const firstLog = page.getByRole('button', { name: 'Log', exact: true }).first();
    await firstLog.click();
    await expect(page.getByText(/^Logged /)).toBeVisible();

    // Describe → mocked Claude answer → review → log all
    await page.route('**/api/nutrition/ai', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ mealType: 'lunch', clarification: '', items: [
        { name: 'Kaisersemmel', grams: 100, calories: 280, protein: 9, carbs: 55, fat: 1.5, fiber: 3, confidence: 'high', note: '2 Semmeln' },
        { name: 'Beinschinken', grams: 60, calories: 66, protein: 11.4, carbs: 0.6, fat: 2.1, fiber: 0, confidence: 'medium', note: '' },
      ] }),
    }));
    await page.getByRole('button', { name: 'Log food' }).click();
    await page.getByRole('tab', { name: 'Describe' }).click();
    await page.getByLabel('Describe your meal').fill('2 Semmeln mit Schinken');
    await page.getByRole('button', { name: 'Estimate' }).click();
    await expect(page.getByText('Beinschinken')).toBeVisible();
    await page.screenshot({ path: 'test-results/nutrition-ai-review.png' });
    await page.getByRole('button', { name: /^Log all/ }).click();
    await expect(page.getByText(/Logged 2 items/)).toBeVisible();
    await page.screenshot({ path: 'test-results/nutrition-today-filled.png', fullPage: true });
  });
});
