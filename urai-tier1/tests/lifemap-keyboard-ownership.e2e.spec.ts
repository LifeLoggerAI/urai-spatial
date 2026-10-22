import { expect, test } from '@playwright/test';

test.describe('Life Map in-world keyboard ownership', () => {
  test('Chalk closes on Escape without unwinding the Life Map', async ({ page }) => {
    await page.goto('/life-map/?demo=1', { waitUntil: 'domcontentloaded' });
    const world = page.getByTestId('urai-true-3d-life-map');
    await expect(world).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Open Chalk engineering presence' }).click();
    const chalk = page.locator('[data-urai-chalk-presence]');
    await expect(chalk).toBeVisible();
    await expect(chalk.getByRole('button', { name: 'Close' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(chalk).toHaveCount(0);
    await expect(world).toBeVisible();
    expect(new URL(page.url()).pathname.replace(/\/+$/, '')).toBe('/life-map');
  });

  test('A/D move the camera without selecting an unrelated Memory Star', async ({ page }) => {
    await page.goto('/life-map/?demo=1', { waitUntil: 'domcontentloaded' });
    const world = page.getByTestId('urai-true-3d-life-map');
    await expect(world).toBeVisible({ timeout: 30000 });
    await expect(world).toHaveAttribute('data-life-map-phase', 'overview');
    await expect(world).toHaveAttribute('data-life-map-camera-x', /^-?\d+\.\d+$/, { timeout: 15000 });
    const before = Number(await world.getAttribute('data-life-map-camera-x'));
    await page.keyboard.down('d');
    try {
      await expect.poll(async () => Number(await world.getAttribute('data-life-map-camera-x')),
        { timeout: 12000 }).toBeGreaterThan(before + 0.12);
    } finally {
      await page.keyboard.up('d');
    }
    await expect(world).toHaveAttribute('data-life-map-phase', 'overview');
    expect(new URL(page.url()).searchParams.get('node')).toBeNull();
  });
});
