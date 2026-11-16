import { test, expect } from '@playwright/test'

// Explicitly development-only. Never use this fixture on a public deployment.
// The modeled donor must be staged using scripts/world001-v3-preview-asset.mjs
// after verify-source and cleaned immediately after the run.
const model = '/assets/urai/world001-preview/URAI_WORLD001_FOUNDER_HOME_ARCHITECTURE_v3.glb'
const query = '/?homeAssetReview=1&homePrivateFixture=1&world001ModeledV3=1'

test.describe('WORLD001 exact modeled donor — isolated local visual proof', () => {
  test.skip(!process.env.URAI_V3_DEV_BROWSER_PROOF, 'Explicit local dev proof opt-in required')

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'android-sized', width: 390, height: 844 },
  ]) {
    test(`real WebGL model render: ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      const failures: string[] = []
      page.on('pageerror', error => failures.push(error.message))
      const response = await page.goto(query, { waitUntil: 'domcontentloaded', timeout: 60000 })
      expect(response?.ok(), 'Home should respond successfully').toBeTruthy()

      const asset = await page.request.get(model)
      expect(asset.status(), 'Exact donor asset must be served locally').toBe(200)
      const buffer = await asset.body()
      expect(buffer.length).toBe(2742444)
      expect(buffer.toString('ascii', 0, 4)).toBe('glTF')

      const canvas = page.locator('canvas').first()
      await expect(canvas).toBeVisible({ timeout: 45000 })
      await expect.poll(async () => page.locator('[data-home-assets-ready="true"]').count(), {
        timeout: 45000, message: 'Scene must report assets ready after real render',
      }).toBeGreaterThan(0)

      const gl = await canvas.evaluate((node) => {
        const canvas = node as HTMLCanvasElement
        return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
      })
      expect(gl, 'Browser must have an actual WebGL context').toBe(true)
      expect(failures, 'No uncaught browser exceptions').toEqual([])
      await page.screenshot({ path: testInfo.outputPath(`world001-${viewport.name}.png`), fullPage: true })
    })
  }
})
