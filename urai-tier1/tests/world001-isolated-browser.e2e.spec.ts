import { test, expect } from '@playwright/test'

// Development-only, local loopback visual proof. Never expose this modeled
// interpretive donor through a public or production deployment.
const model = '/assets/urai/world001-preview/URAI_WORLD001_FOUNDER_HOME_ARCHITECTURE_v3.glb'
const query = '/?homeAssetReview=1&homePrivateFixture=1&world001ModeledV3=1'
const expectedHash = '84727ed6d335b51f736194a3850d5390a3d4ab8876f07acc8bb08593c5c33717'

test.describe('WORLD001 exact modeled donor — isolated local visual proof', () => {
  test.skip(process.env.URAI_V3_DEV_BROWSER_PROOF !== '1', 'Explicit local development proof opt-in required')

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'android-sized', width: 390, height: 844 },
  ]) {
    test(`real WebGL modeled-donor render: ${viewport.name}`, async ({ page }, testInfo) => {
      const target = new URL(process.env.URAI_BROWSER_BASE_URL || 'http://127.0.0.1:3001')
      expect(['127.0.0.1', 'localhost', '[::1]'], 'Only loopback development hosts are allowed').toContain(target.hostname)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      const failures: string[] = []
      page.on('pageerror', error => failures.push(error.message))
      const response = await page.goto(new URL(query, target).toString(), {
        waitUntil: 'domcontentloaded', timeout: 60000,
      })
      expect(response?.ok(), 'Home must respond successfully').toBeTruthy()

      const asset = await page.request.get(new URL(model, target).toString())
      expect(asset.status(), 'Exact donor asset must be served locally').toBe(200)
      const buffer = await asset.body()
      expect(buffer.length).toBe(2742444)
      expect(buffer.toString('ascii', 0, 4)).toBe('glTF')
      const { createHash } = await import('node:crypto')
      expect(createHash('sha256').update(buffer).digest('hex')).toBe(expectedHash)

      const owner = page.locator('[data-home-primary-owner="asset-driven"]').first()
      await expect(owner).toHaveAttribute('data-home-world001-preview', 'MODELED_INTERPRETIVE_NONPRODUCTION', { timeout: 45000 })
      await expect(owner).toHaveAttribute('data-home-review-fixture', 'safe-private')
      await expect(owner).toHaveAttribute('data-home-assets-ready', 'true', { timeout: 45000 })
      await expect.poll(async () => Number(await owner.getAttribute('data-home-rendered-frames') || 0), {
        timeout: 45000, message: 'The scene must have rendered actual frames',
      }).toBeGreaterThan(1)

      const canvas = owner.locator('canvas').first()
      await expect(canvas).toBeVisible({ timeout: 45000 })
      const webgl = await canvas.evaluate((node) => {
        const element = node as HTMLCanvasElement
        // Calling getContext on an existing canvas must not create a fake proof
        // if R3F already owns a different rendering context.
        return Boolean(element.getContext('webgl2') || element.getContext('webgl'))
      })
      expect(webgl, 'Real WebGL context must exist').toBe(true)
      expect(failures, 'No uncaught browser exceptions').toEqual([])
      await page.screenshot({ path: testInfo.outputPath(`world001-${viewport.name}.png`), fullPage: true })
    })
  }
})
