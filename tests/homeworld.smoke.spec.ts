import { test, expect } from '@playwright/test';

const baseURL = process.env.URAI_SPATIAL_BASE_URL || 'http://127.0.0.1:3000';

test.describe('Home World V3 smoke', () => {
  test('home route renders tier selectors and derived-only explanation', async ({ page }) => {
    await page.goto(`${baseURL}/home`);

    const stage = page.getByTestId('urai-spatial-stage');
    await expect(stage).toHaveAttribute('data-ground-tier', /[1-5]/);
    await expect(stage).toHaveAttribute('data-orb-tier', /[1-5]/);
    await expect(stage).toHaveAttribute('data-sky-tier', /[1-5]/);
    await expect(stage).toHaveAttribute('data-homeworld-confidence', /low|medium|high/);

    await page.getByRole('button', { name: 'Why am I seeing this?' }).click();
    const panel = page.getByTestId('homeworld-explanation-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Your world responds to derived patterns, not raw private media.');
    await expect(panel).toContainText('Derived only · no raw audio stored');
    await expect(panel).not.toContainText('sourceSignals');
    await expect(panel).not.toContainText('raw signal');
  });

  test('life map navigation still works when present', async ({ page }) => {
    await page.goto(`${baseURL}/home`);
    const lifeMap = page.getByRole('button', { name: 'LifeMap' }).first();
    await expect(lifeMap).toBeVisible();
    await lifeMap.click();
    await expect(page).toHaveURL(/life-map|phase=lifemap/);
  });
});
