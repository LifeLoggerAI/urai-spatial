import { test, expect } from '@playwright/test'

const routes = [
  { name: 'home', path: '/home', marker: '[data-scene-mode="home"]' },
  { name: 'ascent', path: '/ascent', marker: '[data-scene-mode="ascent"]' },
  { name: 'demo-lifemap', path: '/demo/life-map', marker: '[data-scene-mode="demo"]' },
  { name: 'focus-empty', path: '/focus', marker: '[data-scene-mode="focus"]' },
  { name: 'replay-empty', path: '/replay', marker: '[data-scene-mode="replay"]' },
  { name: 'mirror', path: '/mirror', marker: '[data-scene-mode="mirror"]' },
]

test.describe('URAI Spatial visual route locks', () => {
  for (const route of routes) {
    test(`${route.name} renders stable spatial frame`, async ({ page }) => {
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text())
      })
      page.on('pageerror', (err) => errors.push(err.message))

      await page.goto(route.path)
      await expect(page.locator(route.marker)).toBeVisible()
      await expect(page.locator('canvas')).toBeVisible()
      await expect(page.getByTestId('urai-camera-reset')).toBeVisible()

      const sceneBox = await page.locator(route.marker).boundingBox()
      expect(sceneBox).not.toBeNull()
      expect(sceneBox?.width).toBeGreaterThan(300)
      expect(sceneBox?.height).toBeGreaterThan(300)

      await expect(page).toHaveScreenshot(`urai-spatial-${route.name}.png`, {
        fullPage: true,
        animations: 'disabled',
        maxDiffPixelRatio: 0.08,
      })

      expect(errors).toEqual([])
    })
  }
})
