import { expect, test } from '@playwright/test'

const homeOwnerSelector = '.urai-asset-home-world[data-home-primary-owner="asset-driven"]'
const candidateAmbiencePattern = /urai-ambient-bed-v1\.opus(?:[?#]|$)/

test.describe('Home sensory promotion boundary evidence', () => {
  test.describe.configure({ timeout: 90_000 })

  test('unpromoted ambience remains unmounted, silent, and truthfully unavailable', async ({ page }) => {
    const candidateRequests: string[] = []
    page.on('request', (request) => {
      if (candidateAmbiencePattern.test(request.url())) candidateRequests.push(request.url())
    })

    await page.goto('/home/', { waitUntil: 'domcontentloaded' })

    const home = page.locator(homeOwnerSelector)
    await expect(home).toBeVisible({ timeout: 30_000 })
    await expect(home.locator('canvas')).toBeVisible({ timeout: 30_000 })
    await expect(home).toHaveAttribute('data-home-assets-ready', 'true', { timeout: 45_000 })
    await expect(home).toHaveAttribute('data-home-ready', 'true', { timeout: 45_000 })
    await expect(home).toHaveAttribute('data-home-audio', 'silent-fallback')

    const control = page.getByRole('button', { name: 'Ambience unavailable', exact: true })
    await expect(control).toBeVisible()
    await expect(control).toBeDisabled()
    await expect(control).toHaveAttribute('aria-disabled', 'true')
    await expect(control).toHaveAttribute('aria-pressed', 'false')

    await expect(home.locator('audio')).toHaveCount(0)
    await expect(page.locator('audio[src*="urai-ambient-bed-v1.opus"]')).toHaveCount(0)

    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    }))
    expect(candidateRequests).toEqual([])

    await test.info().attach('home-sensory-promotion-boundary.json', {
      body: JSON.stringify({
        exactRuntimeState: await home.getAttribute('data-home-audio'),
        audioElements: await home.locator('audio').count(),
        controlLabel: await control.textContent(),
        controlDisabled: await control.isDisabled(),
        candidateRequests,
      }, null, 2),
      contentType: 'application/json',
    })
  })
})
