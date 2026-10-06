import { expect, test } from '@playwright/test'

test('Replay unwinds through Focus to Life Map without re-entering Replay', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/replay/?demo=1&manifestId=replay-recovery-thread', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('cinematic-replay-client')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: '← Focus', exact: true }).click()
  await expect(page.getByTestId('urai-final-focus-chamber')).toBeVisible({ timeout: 30_000 })
  await expect.poll(() => new URL(page.url()).pathname.replace(/\/+$/, '')).toBe('/focus')
  await page.getByRole('button', { name: '← Life Map', exact: true }).click()
  await expect.poll(() => new URL(page.url()).pathname.replace(/\/+$/, ''), { timeout: 30_000 }).toBe('/life-map')
  await expect(page.getByTestId('cinematic-replay-client')).toHaveCount(0)
  await expect(page.getByTestId('urai-final-focus-chamber')).toHaveCount(0)
})

for (const viewport of [{ width: 1440, height: 900 }, { width: 393, height: 873 }]) {
  test(`signed-out atlas link clears the heading at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/location-map/', { waitUntil: 'domcontentloaded' })
    const threshold = page.locator('.locationAtlas--empty').first()
    await expect(threshold).toBeVisible()
    const link = page.getByRole('link', { name: 'Open consent-gated geographic places', exact: true })
    const bridge = await page.locator('.locationMapGeographicBridge').boundingBox()
    const heading = await threshold.locator('section > p').boundingBox()
    const target = await link.boundingBox()
    expect(bridge).not.toBeNull()
    expect(heading).not.toBeNull()
    expect(target).not.toBeNull()
    expect(bridge!.y + bridge!.height).toBeLessThanOrEqual(heading!.y)
    expect(target!.height).toBeGreaterThanOrEqual(48)
    expect(bridge!.x).toBeGreaterThanOrEqual(0)
    expect(bridge!.x + bridge!.width).toBeLessThanOrEqual(viewport.width)
  })
}
