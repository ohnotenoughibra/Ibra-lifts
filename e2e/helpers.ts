import { expect, Page } from '@playwright/test';

/** Onboard a fresh local-first profile (also auto-generates the first block). */
export async function onboard(page: Page) {
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
