import { expect, test, type Page } from '@playwright/test'

const focusDemo = '/focus?memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1'
const activeFocusOwner = (page: Page) => page.locator('[data-testid="urai-final-focus-chamber"]:visible')

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
  test('focused semantic controls keep arrow keys without moving the camera', async ({ page }) => {
    await page.goto(focusDemo, { waitUntil: 'domcontentloaded' })
    const focus = activeFocusOwner(page)
    await expect(focus).toHaveCount(1)
    await expect(focus).toHaveAttribute('data-focus-input-ready', 'true', { timeout: 20_000 })
    const recenter = page.getByRole('navigation', { name: 'Focus memory controls' }).getByRole('button', { name: 'Recenter', exact: true })
    await recenter.click()
    await expect.poll(async () => Number(await focus.getAttribute('data-focus-distance'))).toBeLessThan(0.02)
    await recenter.focus()
    await page.keyboard.down('ArrowDown')
    try {
      await page.waitForTimeout(350)
      await expect(recenter).toBeFocused()
      await expect(focus).toHaveAttribute('data-focus-moving', 'false')
      expect(Number(await focus.getAttribute('data-focus-distance'))).toBeLessThan(0.02)
    } finally {
      await page.keyboard.up('ArrowDown')
    }
  })

  test('reduced motion preserves explicit keyboard travel and truthful camera telemetry', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(focusDemo, { waitUntil: 'domcontentloaded' })

    const focus = activeFocusOwner(page)
    await expect(focus).toHaveCount(1)
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
    const focus = activeFocusOwner(page)
    await expect(focus).toHaveCount(1)
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
    const controls = page.getByRole('navigation', { name: 'Focus memory controls' })
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
    const focus = activeFocusOwner(page)
    await expect(focus).toHaveCount(1)
    await expect(focus).toBeVisible()
    await expect(focus).toHaveAttribute('data-memory-id', 'demo:quiet-reset')
    await expect(focus.locator('[data-focus-fallback="semantic"]')).toBeVisible()
    await expect(focus.getByText('Spatial view unavailable', { exact: true })).toBeVisible()
    await expect(focus.getByText('Held in context. Nothing leaves this memory field.', { exact: true })).toBeVisible()
    const controls = page.getByRole('navigation', { name: 'Focus memory controls' })
    await expect(controls.getByRole('button', { name: 'Recenter', exact: true })).toBeVisible()
    await expect(controls.getByRole('button', { name: /Open Replay for|Enter Replay/i })).toBeVisible()
    await expect(controls.getByRole('button', { name: /Life Map/i })).toBeVisible()
  })
})

for (const viewport of [{ width: 844, height: 390 }, { width: 568, height: 320 }]) {
  test(`Focus landscape controls stay clear of heading and context at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(focusDemo, { waitUntil: 'domcontentloaded' })
    const focus = activeFocusOwner(page)
    await expect(focus).toHaveAttribute('data-memory-id', 'demo:quiet-reset')
    const heading = await focus.locator('.focusHeading').boundingBox()
    const meaning = await focus.locator('.memoryMeaning').boundingBox()
    const controls = await focus.locator('.focusControls').boundingBox()
    expect(heading).not.toBeNull()
    expect(meaning).not.toBeNull()
    expect(controls).not.toBeNull()
    expect(heading!.x + heading!.width).toBeLessThanOrEqual(controls!.x)
    expect(meaning!.x + meaning!.width).toBeLessThanOrEqual(controls!.x)
    expect(heading!.y + heading!.height).toBeLessThanOrEqual(meaning!.y)
    for (const rect of [heading!, meaning!, controls!]) {
      expect(rect.x).toBeGreaterThanOrEqual(0)
      expect(rect.y).toBeGreaterThanOrEqual(0)
      expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width)
      expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height)
    }
    // A scrollable disclosure need not show all of its copy simultaneously.
    // Exercise the real scroll path rather than altering its DOM or styles.
    const disclosure = focus.locator('.focusNarration > summary')
    const details = focus.locator('.focusNarration')
    await expect(disclosure).toBeVisible()
    await expect(details).not.toHaveAttribute('open', '')
    await disclosure.click()
    await expect(details).toHaveAttribute('open', '')
    const description = focus.locator('.focusNarration strong')
    await expect(description).toBeVisible()
    await focus.locator('.focusHeading').hover()
    await page.mouse.wheel(0, 1000)
    const descriptionReachability = () => description.evaluate(element => {
      const region = element.closest('.focusHeading') as HTMLElement
      const regionBox = region.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(element)
      const lines = [...range.getClientRects()].filter(line => line.width > 0 && line.height > 0)
      const last = lines[lines.length - 1]
      const textHeight = lines.length ? last.bottom - lines[0].top : 0
      const horizontallyVisible = lines.length > 0 && lines.every(line =>
        line.left >= regionBox.left && line.right <= regionBox.right)
      const endVisible = !!last && last.top >= regionBox.top && last.bottom <= regionBox.bottom
      const allVisible = lines.length > 0 && lines.every(line =>
        line.top >= regionBox.top && line.bottom <= regionBox.bottom)
      const scrollEndReached = Math.abs(region.scrollTop + region.clientHeight - region.scrollHeight) <= 1
      return {
        text: element.textContent, lineCount: lines.length, textHeight,
        regionHeight: regionBox.height, scrollTop: region.scrollTop,
        clientHeight: region.clientHeight, scrollHeight: region.scrollHeight,
        horizontallyVisible, endVisible, allVisible, scrollEndReached,
        reachable: horizontallyVisible && endVisible && scrollEndReached &&
          (textHeight > regionBox.height || allVisible),
      }
    })
    await expect.poll(async () => (await descriptionReachability()).reachable).toBe(true)
    await test.info().attach('focus-landscape-description-geometry.json', {
      body: JSON.stringify(await descriptionReachability()), contentType: 'application/json',
    })
    await test.info().attach(`focus-landscape-description-${viewport.width}x${viewport.height}.png`, {
      body: await page.screenshot(), contentType: 'image/png',
    })
    await page.mouse.wheel(0, -1000)

    const aperture = focus.locator('.focus-spatial-aperture-button')
    await expect(aperture).toBeVisible()
    const apertureGeometry = await aperture.evaluate(element => {
      const box = element.getBoundingClientRect()
      const point = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
      return {
        x: box.x, y: box.y, right: box.right, bottom: box.bottom,
        width: box.width, height: box.height,
        pointerReachable: point === element || (point !== null && element.contains(point)),
      }
    })
    expect(apertureGeometry.width).toBeGreaterThanOrEqual(48)
    expect(apertureGeometry.height).toBeGreaterThanOrEqual(48)
    expect(apertureGeometry.x).toBeGreaterThanOrEqual(0)
    expect(apertureGeometry.y).toBeGreaterThanOrEqual(0)
    expect(apertureGeometry.right).toBeLessThanOrEqual(viewport.width)
    expect(apertureGeometry.bottom).toBeLessThanOrEqual(viewport.height)
    expect(apertureGeometry.pointerReachable).toBe(true)
    await test.info().attach('focus-landscape-aperture-geometry.json', {
      body: JSON.stringify(apertureGeometry), contentType: 'application/json',
    })
    await focus.locator('.focusControls').getByRole('button', { name: 'Recenter', exact: true }).click()
    await focus.locator('.focusControls').getByRole('button', { name: /Open Replay for/ }).click()
    await expect.poll(() => new URL(page.url()).pathname.split('/').filter(Boolean).join('/')).toBe('replay')
    expect(new URL(page.url()).searchParams.get('memoryId')).toBe('demo:quiet-reset')
  })
}
