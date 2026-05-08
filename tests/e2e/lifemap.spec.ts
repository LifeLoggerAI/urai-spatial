import { expect, test } from '@playwright/test'

test.describe('URAI Spatial LifeMap release surface', () => {
  test('loads LifeMap stage, focus, replay, and ESC unwind', async ({ page }) => {
    await page.goto('/life-map')
    await expect(page.locator('[data-testid="urai-spatial-stage"]')).toBeVisible()
    await expect(page.locator('[data-mode="lifemap"]')).toBeVisible()
    await expect(page.locator('[data-testid="lifemap-starfield"]')).toBeVisible()
    await page.locator('[data-lifemap-node="pattern-node"]').click()
    await expect(page.locator('[data-testid="urai-focus-card"]')).toBeVisible()
    await expect(page.locator('[data-mode="focus"]')).toBeVisible()
    await page.getByRole('button', { name: /Start replay/i }).click()
    await expect(page.locator('[data-testid="urai-replay-overlay"]')).toBeVisible()
    await expect(page.locator('[data-mode="replay"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-mode="focus"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-mode="lifemap"]')).toBeVisible()
  })

  test('works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/life-map')
    await expect(page.locator('[data-testid="urai-spatial-stage"]')).toBeVisible()
    await expect(page.locator('[data-testid="lifemap-starfield"]')).toBeVisible()
  })

  test('supports reduced motion media query', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/life-map')
    await expect(page.locator('[data-reduced-motion="true"]')).toBeVisible()
  })
})
