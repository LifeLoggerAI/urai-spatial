import { expect, test, type Page } from '@playwright/test'

const focusDemo = '/focus?memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1'

async function disableWebGL(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
      return original.apply(this, [type, ...args] as Parameters<typeof original>)
    } as typeof HTMLCanvasElement.prototype.getContext
  })
}

test.describe('Focus exact-head accessibility and movement evidence', () => {
  test('reduced motion preserves explicit keyboard travel and truthful camera telemetry', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(focusDemo, { waitUntil: 'domcontentloaded' })

    const focus = page.getByTestId('urai-final-focus-chamber')
    await expect(focus).toBeVisible({ timeout: 15_000 })
    await expect(focus.locator('canvas')).toBeVisible({ timeout: 15_000 })
    await expect(focus).toHaveAttribute('data-focus-movement', 'walk-keyboard-orbit-touch')
    await expect(focus).toHaveAttribute('data-focus-pointer-lock', 'false')
    await expect(focus).toHaveAttribute('data-memory-id', 'demo:quiet-reset')
    await expect(focus).toHaveAttribute('data-star-id', 'quiet-reset')
    await expect(focus).toHaveAttribute('data-manifest-id', 'replay-recovery-thread')
    await expect(focus).toHaveAttribute('data-node', 'quiet-reset')

    const before = Number(await focus.getAttribute('data-focus-distance'))
    await page.keyboard.down('w')
    try {
      await expect.poll(async () => Number(await focus.getAttribute('data-focus-distance')), { timeout: 12_000 }).toBeGreaterThan(before + 0.5)
    } finally {
      await page.keyboard.up('w')
    }
    await expect(focus).toHaveAttribute('data-focus-camera-x', /-?\d+\.\d{3}/)
    await expect(focus).toHaveAttribute('data-focus-camera-y', /-?\d+\.\d{3}/)
    await expect(focus).toHaveAttribute('data-focus-camera-z', /-?\d+\.\d{3}/)
    await expect(focus).toHaveAttribute('data-focus-moving', 'false')
    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()

    const recenter = page.getByRole('button', { name: 'Recenter', exact: true }).first()
    await recenter.click()
    await expect.poll(async () => Number(await focus.getAttribute('data-focus-distance')), { timeout: 8_000 }).toBeLessThan(0.02)
  })

  test('Focus preserves authorized identity through Replay travel authority', async ({ page }) => {
    await page.goto(focusDemo, { waitUntil: 'domcontentloaded' })
    const focus = page.getByTestId('urai-final-focus-chamber')
    await expect(focus).toHaveAttribute('data-memory-id', 'demo:quiet-reset')
    await expect(page.getByText('DEMO FIXTURE · NOT PERSONAL DATA', { exact: true })).toBeVisible()

    const replay = page.getByRole('button', { name: /Open Replay for/i }).last()
    await expect(replay).toBeVisible()
    await replay.click()
    await expect.poll(() => new URL(page.url()).pathname.replace(/\/+$/, '')).toBe('/replay')
    const destination = new URL(page.url())
    expect(destination.searchParams.get('memoryId')).toBe('demo:quiet-reset')
    expect(destination.searchParams.get('manifestId')).toBe('replay-recovery-thread')
    expect(destination.searchParams.get('node')).toBe('quiet-reset')
    expect(destination.searchParams.get('demo')).toBe('1')
    expect(destination.searchParams.get('from')).toBe('focus-artifact')
  })

  test('forced colors retains visible semantic Focus controls', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
    await page.goto(focusDemo, { waitUntil: 'domcontentloaded' })
    const controls = page.getByRole('navigation', { name: 'Focus chamber controls' })
    await expect(controls).toBeVisible({ timeout: 15_000 })
    for (const name of ['Recenter', 'Life Map']) {
      const button = controls.getByRole('button', { name: new RegExp(name, 'i') }).first()
      await expect(button).toBeVisible()
      await button.focus()
      await expect(button).toBeFocused()
      const outline = await button.evaluate((element) => getComputedStyle(element).outlineStyle)
      expect(outline).not.toBe('none')
    }
  })

  test('non-WebGL Focus keeps identity, privacy copy and keyboard-operable semantic controls', async ({ page }) => {
    await disableWebGL(page)
    await page.goto(focusDemo, { waitUntil: 'domcontentloaded' })
    const focus = page.getByTestId('urai-final-focus-chamber')
    await expect(focus).toBeVisible()
    await expect(focus).toHaveAttribute('data-memory-id', 'demo:quiet-reset')
    await expect(focus.locator('[data-focus-fallback="semantic"]')).toBeVisible()
    await expect(focus.getByText('Spatial view unavailable', { exact: true })).toBeVisible()
    await expect(focus.getByText('Held in context. Nothing leaves this chamber.', { exact: true })).toBeVisible()
    const controls = page.getByRole('navigation', { name: 'Focus chamber controls' })
    await expect(controls.getByRole('button', { name: 'Recenter', exact: true })).toBeVisible()
    await expect(controls.getByRole('button', { name: /Open Replay for|Enter Replay/i })).toBeVisible()
    await expect(controls.getByRole('button', { name: /Life Map/i })).toBeVisible()
  })
})
