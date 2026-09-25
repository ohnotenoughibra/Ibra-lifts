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
  // The disclaimer sits in a section that animates open after sex + weight;
  // a click during that animation can miss — confirm it actually ticked.
  const disclaimer = page.getByRole('checkbox', { name: /I train at my own risk/ });
  await disclaimer.click();
  try {
    await expect(disclaimer).toHaveAttribute('aria-checked', 'true', { timeout: 2_000 });
  } catch {
    await disclaimer.click();
    await expect(disclaimer).toHaveAttribute('aria-checked', 'true');
  }
  await page.getByRole('button', { name: "Let's Go" }).click();
  // Dashboard mounts when the bottom tab bar appears
  await expect(page.getByRole('tab', { name: 'Train' })).toBeVisible({ timeout: 20_000 });
}
