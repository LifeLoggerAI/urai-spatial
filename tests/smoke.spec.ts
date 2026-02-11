import { test, expect } from '@playwright/test';

test.describe('URAI-SPATIAL Smoke Tests', () => {
  test('should load the application and mount the spatial scene', async ({ page }) => {
    // 1. Navigate to the root of the application.
    await page.goto('/');

    // 2. Verify the page title.
    await expect(page).toHaveTitle(/URAI/);

    // 3. Check for the presence of the canvas element.
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveCount(1);
  });
});
