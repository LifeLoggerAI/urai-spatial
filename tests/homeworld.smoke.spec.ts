import { test, expect } from '@playwright/test';

const baseURL = process.env.URAI_SPATIAL_BASE_URL || 'http://127.0.0.1:3000';

test.describe('Home World V3 smoke', () => {
  test('home route mounts required layers and derived-only explanation', async ({ page }) => {
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



  test('home chrome remains interactive during transition entry and controls are not duplicated', async ({ page }) => {
    await page.goto(`${baseURL}/home`);

    const lifeMapButtons = page.getByRole('button', { name: 'LifeMap' });
    await expect(lifeMapButtons).toHaveCount(1);

    const lifeMap = lifeMapButtons.first();
    await expect(lifeMap).toBeVisible();
    await expect(lifeMap).toBeEnabled();

    await page.getByRole('button', { name: 'Why am I seeing this?' }).click();
    await expect(page.getByTestId('homeworld-explanation-panel')).toBeVisible();

    await lifeMap.click();
    await expect(page).toHaveURL(/life-map|phase=lifemap/);

    await expect(page.getByRole('button', { name: 'Home' }).first()).toBeVisible();
  });

  test('home required layers remain mounted when reduced-motion is preferred', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${baseURL}/home`);

    const stage = page.getByTestId('urai-spatial-stage');
    await expect(stage).toHaveAttribute('data-ground-tier', /[1-5]/);
    await expect(stage).toHaveAttribute('data-orb-tier', /[1-5]/);
    await expect(stage).toHaveAttribute('data-sky-tier', /[1-5]/);
    await expect(stage).toHaveAttribute('data-homeworld-confidence', /low|medium|high/);
  });
});
