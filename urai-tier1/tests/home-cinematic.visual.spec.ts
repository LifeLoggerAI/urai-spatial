import { test, expect } from '@playwright/test'

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-430', width: 430, height: 932 },
]

test.describe('URAI Spatial cinematic home launch-lock', () => {
  for (const viewport of viewports) {
    test(`captures cinematic home at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/?mode=constellation', { waitUntil: 'networkidle' })
      await page.locator('canvas').waitFor({ state: 'visible', timeout: 15000 })
      await page.waitForTimeout(1800)

      await expect(page.locator('.spatial-shell__viewport')).toHaveScreenshot(`home-cinematic-${viewport.name}.png`, {
        animations: 'disabled',
        maxDiffPixelRatio: 0.08,
      })
    })
  }
})
