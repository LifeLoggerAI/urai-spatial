import { test, expect } from '@playwright/test'

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-430', width: 430, height: 932 },
]

const routes = [
  { name: 'home', path: '/?mode=constellation' },
  { name: 'life-map', path: '/life-map' },
  { name: 'demo', path: '/demo' },
  { name: 'demo-life-map', path: '/demo/life-map' },
  { name: 'replay', path: '/replay' },
  { name: 'focus', path: '/focus' },
]

test.describe('URAI Spatial Tier-1 launch-lock visuals', () => {
  for (const route of routes) {
    for (const viewport of viewports) {
      test(`captures ${route.name} at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto(route.path, { waitUntil: 'networkidle' })
        await page.locator('canvas').waitFor({ state: 'visible', timeout: 15000 })
        await page.waitForTimeout(1800)

        await expect(page.locator('.spatial-shell__viewport')).toHaveScreenshot(`${route.name}-${viewport.name}.png`, {
          animations: 'disabled',
          maxDiffPixelRatio: 0.08,
        })
      })
    }
  }
})
