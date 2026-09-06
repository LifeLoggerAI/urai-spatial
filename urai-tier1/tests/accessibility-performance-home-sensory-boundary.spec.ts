import { expect, test } from '@playwright/test'

const homeOwnerSelector = '.urai-asset-home-world[data-home-primary-owner="asset-driven"]'
const homeAmbiencePattern = /\/assets\/urai\/generated\/audio\/home-ambient-v1\.opus(?:[?#]|$)/

test.describe('Home sensory consent boundary evidence', () => {
  // The exact-head software-rendered Actions host can spend more than a minute
  // forming Home before the consent transition and evidence attachment complete.
  // Keep the assertions unchanged and allow the proven host envelope to finish.
  test.describe.configure({ timeout: 150_000 })

  test('production ambience remains silent before consent and activates only after explicit consent', async ({ page }) => {
    const ambienceRequests: string[] = []
    page.on('request', (request) => {
      if (homeAmbiencePattern.test(request.url())) ambienceRequests.push(request.url())
    })

    await page.goto('/home/', { waitUntil: 'domcontentloaded' })

    const home = page.locator(homeOwnerSelector)
    const audioRuntime = page.locator('[data-urai-spatial-audio-runtime="production-opus-v1"]')
    await expect(home).toBeVisible({ timeout: 30_000 })
    await expect(home.locator('canvas')).toBeVisible({ timeout: 30_000 })
    await expect(home).toHaveAttribute('data-home-assets-ready', 'true', { timeout: 45_000 })
    await expect(home).toHaveAttribute('data-home-ready', 'true', { timeout: 45_000 })
    await expect(home).toHaveAttribute('data-home-audio', 'production-opus-consent-controlled')
    await expect(audioRuntime).toHaveAttribute('data-audio-consent', 'not-granted')
    await expect(audioRuntime).toHaveAttribute('data-audio-muted', 'true')
    await expect(audioRuntime).toHaveAttribute('data-audio-phase', 'HOME')

    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    expect(ambienceRequests).toEqual([])

    await page.evaluate(() => window.dispatchEvent(new CustomEvent('urai:audio-consent', { detail: { enabled: true } })))
    await expect(audioRuntime).toHaveAttribute('data-audio-consent', 'granted')
    await expect(audioRuntime).toHaveAttribute('data-audio-muted', 'false')
    await expect.poll(() => ambienceRequests.length, { timeout: 10_000 }).toBeGreaterThan(0)

    await page.evaluate(() => window.dispatchEvent(new CustomEvent('urai:audio-consent', { detail: { enabled: false } })))
    await expect(audioRuntime).toHaveAttribute('data-audio-consent', 'not-granted')
    await expect(audioRuntime).toHaveAttribute('data-audio-muted', 'true')

    await test.info().attach('home-sensory-consent-boundary.json', {
      body: JSON.stringify({
        exactRuntimeState: await home.getAttribute('data-home-audio'),
        consent: await audioRuntime.getAttribute('data-audio-consent'),
        muted: await audioRuntime.getAttribute('data-audio-muted'),
        phase: await audioRuntime.getAttribute('data-audio-phase'),
        ambienceRequests,
      }, null, 2),
      contentType: 'application/json',
    })
  })
})
