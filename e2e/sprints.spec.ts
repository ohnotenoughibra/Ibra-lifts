import { test, expect } from '@playwright/test';
import { onboard } from './helpers';

/**
 * Air bike / sprint intervals — timer, leave-and-return, logging into the
 * load model, and the finisher offer at the end of a lifting session.
 */
test.describe('Air bike & sprints', () => {
  test.beforeEach(async ({ page }) => { await onboard(page); });

  test('run a protocol, survive a reload mid-session, end early and log it', async ({ page }) => {
    await page.getByRole('tab', { name: 'Tools' }).click();
    await page.getByRole('button', { name: /^Air Bike & Sprints/ }).first().click();
    await page.getByRole('button', { name: 'Open Alactic Power 8 × 8 s' }).click();
    await expect(page.getByText('Why this works')).toBeVisible();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByTestId('sprint-phase')).toContainText(/warmup/i);
    // skip the warm-up → first all-out rep
    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByTestId('sprint-phase')).toContainText(/work · 1\/8/i);
    await expect(page.getByText('ALL-OUT')).toBeVisible();
    // leave and come back: still running, same rep
    await page.reload();
    await expect(page.getByTestId('sprint-phase')).toContainText(/1\/8/, { timeout: 20_000 });
    // end early → log sheet with RPE + monitor numbers
    await page.getByRole('button', { name: 'End session' }).click();
    await expect(page.getByText(/Ended early/)).toBeVisible();
    await page.getByRole('button', { name: '7', exact: true }).click();
    await page.getByRole('textbox', { name: 'Calories' }).fill('12');
    await page.getByRole('button', { name: /Save session/ }).click();
    await expect(page.getByTestId('sprint-run')).toHaveCount(0);
    const saved = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('roots-gains-storage') || '{}').state || {};
      return (st.trainingSessions || []).map((s: any) => ({ type: s.type, rpe: s.perceivedExertion, id: s.intervalData?.protocolId, cal: s.intervalData?.calories }));
    });
    expect(saved).toContainEqual({ type: 'assault_bike', rpe: 7, id: 'alactic-8x8', cal: 12 });
  });

  test('finish sheet offers a finisher that opens the timer', async ({ page }) => {
    await page.getByRole('tab', { name: 'Train' }).click();
    await page.getByRole('button', { name: 'Start Workout' }).first().click();
    await page.getByRole('button', { name: 'Good', exact: true }).click();
    await page.getByRole('button', { name: 'Start Workout' }).click();
    await page.getByRole('spinbutton', { name: 'Weight' }).fill('60');
    await page.getByRole('spinbutton', { name: 'Reps' }).fill('5');
    await page.getByRole('button', { name: 'Complete Set' }).click();
    await page.getByRole('button', { name: 'Skip Rest' }).click();
    await page.getByRole('button', { name: 'Finish workout' }).click();
    await page.getByRole('button', { name: 'Add conditioning finisher' }).click();
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
    // closing returns to the finish sheet, workout intact
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('button', { name: 'Save Workout' })).toBeVisible();
  });
});
