import { expect, test } from '@playwright/test';

test.describe('URAI Spatial production lock flow', () => {
  test('Home -> Ascent -> LifeMap -> Focus -> Replay -> ESC unwind -> Home', async ({ page }) => {
    await page.goto('/home');

    const stage = page.getByTestId('urai-spatial-stage');
    await expect(stage).toHaveAttribute('data-mode', 'home');
    await expect(page.getByTestId('urai-home-scene')).toBeVisible();
    await expect(page.getByTestId('urai-orb-button')).toBeVisible();
    await expect(page.getByTestId('urai-home-body')).toBeVisible();

    await page.getByTestId('urai-orb-button').click();
    await expect(stage).toHaveAttribute('data-mode', 'ascent');
    await expect(page.getByTestId('urai-ascent-cover')).toBeVisible();
    await expect(stage).toHaveAttribute('data-mode', 'lifemap', { timeout: 2500 });
    await expect(page.getByTestId('urai-lifemap-scene')).toBeVisible();

    await page.getByTestId('lifemap-node-pattern-01').click();
    await expect(stage).toHaveAttribute('data-mode', 'focus');
    await expect(page.getByTestId('urai-focus-card')).toContainText('PATTERN NODE');

    await page.getByRole('button', { name: 'Replay' }).first().click();
    await expect(stage).toHaveAttribute('data-mode', 'replay');
    await expect(page.getByTestId('urai-replay-overlay')).toContainText('REPLAY STREAM');

    await page.keyboard.press('Escape');
    await expect(stage).toHaveAttribute('data-mode', 'focus');
    await page.keyboard.press('Escape');
    await expect(stage).toHaveAttribute('data-mode', 'lifemap');
    await page.keyboard.press('Escape');
    await expect(stage).toHaveAttribute('data-mode', 'home');
  });

  test('deep links restore valid spatial state and mobile LifeMap fills viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/life-map?node=recovery');

    const stage = page.getByTestId('urai-spatial-stage');
    await expect(stage).toHaveAttribute('data-mode', 'lifemap');

    const box = await page.getByTestId('urai-lifemap-scene').boundingBox();
    expect(Math.round(box?.width ?? 0)).toBe(390);
    expect(Math.round(box?.height ?? 0)).toBe(844);

    await page.goto('/focus?node=threshold');
    await expect(stage).toHaveAttribute('data-mode', 'focus');
    await expect(page.getByTestId('urai-focus-card')).toContainText('THRESHOLD NODE');

    await page.goto('/replay?node=signal');
    await expect(stage).toHaveAttribute('data-mode', 'replay');
    await expect(page.getByTestId('urai-replay-overlay')).toContainText('Signal Replay');
  });
});
