import { expect, test } from '@playwright/test'

test('Replay unwinds through Focus to Life Map without re-entering Replay', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/replay/?memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('cinematic-replay-client')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: '← Focus', exact: true }).click()
  await expect(page.getByTestId('urai-final-focus-chamber')).toBeVisible({ timeout: 30_000 })
  await expect.poll(() => new URL(page.url()).pathname.replace(/\/+$/, ''), { timeout: 30_000 }).toBe('/focus')
  await page.getByRole('button', { name: '← Life Map', exact: true }).click()
  await expect.poll(() => new URL(page.url()).pathname.replace(/\/+$/, ''), { timeout: 30_000 }).toBe('/life-map')
  expect(new URL(page.url()).searchParams.get('memoryId')).toBe('demo:quiet-reset')
  expect(new URL(page.url()).searchParams.get('manifestId')).toBe('replay-recovery-thread')
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
    const actions = await threshold.locator('section > button, section > a').evaluateAll(elements => elements.map(element => {
      const r = element.getBoundingClientRect()
      return { width: r.width, height: r.height }
    }))
    expect(actions.length).toBeGreaterThanOrEqual(2)
    for (const action of actions) {
      expect(action.width).toBeGreaterThanOrEqual(48)
      expect(action.height).toBeGreaterThanOrEqual(48)
    }
  })
}
