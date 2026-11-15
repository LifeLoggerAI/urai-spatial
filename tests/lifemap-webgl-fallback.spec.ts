import { test, expect } from '@playwright/test'

test.use({
  launchOptions: {
    args: ['--disable-webgl'],
    ...(process.env.URAI_CHROMIUM_BIN ? { executablePath: process.env.URAI_CHROMIUM_BIN } : {}),
  },
  reducedMotion: 'reduce',
  trace: 'on',
  video: 'on',
})

test.beforeEach(async ({ baseURL }) => {
  if (!baseURL || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) {
    throw new Error('This synthetic acceptance requires an isolated local application.')
  }
})

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`without WebGL the selected sample opens Focus and returns from Replay at ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize(viewport)
    await page.goto('/life-map?demo=1&overview=1')
    await expect(page.getByTestId('urai-life-map-authored-fallback')).toBeVisible()
    await page.getByTestId('life-map-semantic-trigger').click()
    await page.getByRole('button', { name: 'The Quiet Reset', exact: true }).click()
    const focus = page.getByRole('button', { name: 'Enter Focus', exact: true })
    await expect(focus).toBeVisible()
    await expect(focus).toBeEnabled()
    const bounds = await focus.boundingBox()
    expect(bounds?.height).toBeGreaterThanOrEqual(48)
    await test.info().attach('selected-memory-actions.jpg', { body: await page.screenshot({ type: 'jpeg' }), contentType: 'image/jpeg' })
    await focus.click()
    await expect(page).toHaveURL(/\/focus\?/)
    const chamber = page.getByTestId('urai-final-focus-chamber')
    await expect(chamber).toHaveAttribute('data-memory-id', 'demo:quiet-reset')
    await page.locator('.focusControls .primary').click()
    await expect(page).toHaveURL(/\/replay\?/)
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/focus\?/)
    await expect(chamber).toHaveAttribute('data-memory-id', 'demo:quiet-reset')
    await page.locator('.focusControls .unwind').click()
    await expect(page).toHaveURL(/\/life-map\?/)
    await page.getByRole('button', { name: 'Return Home', exact: true }).click()
    await expect(page).toHaveURL(/\/(home)?(?:\?|$)/)
    await expect(page.getByRole('button', { name: 'Open URAI Orb companion', exact: true })).toBeVisible()
  })
}

test('without WebGL the protected sample keeps Focus and Replay disabled', async ({ page }) => {
  await page.goto('/life-map?demo=1&overview=1')
  await page.getByTestId('life-map-semantic-trigger').click()
  await page.getByRole('button', { name: 'Protected Chapter', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Enter Focus', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enter Focus', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toBeDisabled()
})
