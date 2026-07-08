import { test, expect } from '@playwright/test'

const routes = [
  { name: 'home-root', path: '/?audit=launch-loop' },
  { name: 'home-route', path: '/home?audit=launch-loop' },
  { name: 'spatial-ar-vr', path: '/spatial/ar-vr?audit=launch-loop' },
  { name: 'life-map', path: '/life-map?audit=launch-loop' },
  { name: 'ground', path: '/ground?audit=launch-loop' },
  { name: 'focus', path: '/focus?manifestId=seed-memory-bloom&v=launch-loop' },
  { name: 'replay', path: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&v=launch-loop' },
  { name: 'passport', path: '/passport?audit=launch-loop' },
  { name: 'status', path: '/status?audit=launch-loop' },
] as const

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
] as const

test.describe('URAI launch spatial routes visual audit', () => {
  for (const viewport of viewports) {
    for (const route of routes) {
      test(`${viewport.name} ${route.name}`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto(route.path, { waitUntil: 'networkidle' })
        await page.waitForTimeout(1800)

        await expect(page.locator('body')).toBeVisible()
        await expect(page.locator('body')).not.toContainText('Runtime Error')
        await expect(page.locator('body')).not.toContainText('Application error')
        await expect(page.locator('body')).not.toContainText('Could not load /assets')

        await page.screenshot({
          path: testInfo.outputPath(`${viewport.name}-${route.name}.png`),
          fullPage: true,
        })
      })
    }
  }
})
