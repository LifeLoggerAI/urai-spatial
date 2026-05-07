import { expect, test } from '@playwright/test'

const routes = [
  { name: 'home', path: '/', testId: 'urai-home-scene' },
  { name: 'home-alias', path: '/home', testId: 'urai-home-scene' },
  { name: 'ascent', path: '/ascent', testId: 'urai-ascent-scene' },
  { name: 'life-map', path: '/life-map', testId: 'urai-lifemap-scene' },
  { name: 'focus', path: '/focus?manifestId=seed-memory-bloom', testId: 'urai-focus-scene' },
  { name: 'replay', path: '/replay?manifestId=seed-memory-bloom', testId: 'urai-focus-scene' },
]

test.describe('URAI Spatial polished flow screenshots', () => {
  for (const route of routes) {
    test(`${route.name} renders polished spatial scene`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1100 })
      await page.goto(route.path, { waitUntil: 'networkidle' })

      const scene = page.getByTestId(route.testId)
      await expect(scene).toBeVisible()
      await expect(page.locator('.urai-scene-stage')).toBeVisible()

      if (route.name === 'life-map') {
        await expect(page.getByTestId('lifemap-starfield')).toBeVisible()
        await expect(page.getByTestId('lifemap-node-seed-memory-bloom')).toBeVisible()
      }

      await page.screenshot({
        path: `test-results/spatial-flow/${route.name}.png`,
        fullPage: true,
      })
    })
  }
})
