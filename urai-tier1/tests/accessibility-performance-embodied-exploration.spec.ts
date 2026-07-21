import { expect, test, type Locator, type Page } from '@playwright/test'

async function collectRuntimeErrors(page: Page) {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  return { pageErrors, consoleErrors }
}

async function holdKey(page: Page, key: string, duration = 450) {
  await page.keyboard.down(key)
  await page.waitForTimeout(duration)
  await page.keyboard.up(key)
}

async function dispatchMovementKey(page: Page, type: 'keydown' | 'keyup', code: 'KeyW' | 'ArrowUp') {
  await page.evaluate(({ eventType, eventCode }) => {
    const event = new KeyboardEvent(eventType, {
      code: eventCode,
      key: eventCode === 'KeyW' ? 'w' : 'ArrowUp',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)
  }, { eventType: type, eventCode: code })
}

async function waitForHomeWorld(home: Locator) {
  await expect(home).toBeVisible({ timeout: 15_000 })
  await expect(home.locator('canvas')).toBeVisible({ timeout: 15_000 })
  await expect(home).toHaveAttribute('data-home-ready', 'true', { timeout: 30_000 })
  await expect(home).toHaveAttribute('data-home-player-z', /-?\d+\.\d+/, { timeout: 15_000 })
  await expect(home).toHaveAttribute('data-home-distance', /\d+\.\d+/, { timeout: 15_000 })
}

function normalizedPathname(url: string) {
  return new URL(url).pathname.replace(/\/+$/, '') || '/'
}

test.describe('Embodied exploration runtime evidence', () => {
  test.describe.configure({ timeout: 90_000 })

  test('Home is a visible world with meaningful keyboard displacement and no pointer lock', async ({ page }) => {
    const errors = await collectRuntimeErrors(page)
    await page.goto('/home/', { waitUntil: 'domcontentloaded' })

    const home = page.locator('.urai-final-home-world')
    await waitForHomeWorld(home)
    await expect(home).toHaveAttribute('data-home-movement', 'walk-keyboard-click-touch')
    await expect(home).toHaveAttribute('data-home-pointer-lock', 'false')
    await expect(home).toHaveAttribute('data-home-visible-world', 'final-physical-sanctuary-memory-rooms')

    const beforeZ = Number(await home.getAttribute('data-home-player-z'))
    await holdKey(page, 'w', 2_400)
    await expect.poll(async () => Number(await home.getAttribute('data-home-distance')), { timeout: 12_000 }).toBeGreaterThan(1.2)
    const afterZ = Number(await home.getAttribute('data-home-player-z'))
    expect(Math.abs(afterZ - beforeZ)).toBeGreaterThan(1.2)

    const direct = page.locator('.urai-home-runtime-doorways')
    await expect(direct).toBeVisible()
    await expect(direct.getByRole('button', { name: 'Open Orb directly' })).toBeVisible()
    await expect(direct.getByRole('button', { name: 'Open Ground directly' })).toBeVisible()
    await expect(direct.getByRole('button', { name: 'Open Life Map directly' })).toBeVisible()
    await expect(direct.getByRole('button')).toHaveCount(3)

    const help = page.getByText('Move through Home', { exact: true })
    await expect(help).toBeVisible()
    await help.focus()
    await expect(help).toBeFocused()
    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()
    expect(errors.pageErrors).toEqual([])
    expect(errors.consoleErrors).toEqual([])
  })

  test('Ground walks through the arrival hall and retains keyboard-accessible direct destinations', async ({ page }) => {
    const errors = await collectRuntimeErrors(page)
    await page.goto('/ground/', { waitUntil: 'domcontentloaded' })
    const ground = page.locator('.ground-spatial-root[data-ground-exploration="walkable"]').first()
    await expect(ground).toBeVisible({ timeout: 15_000 })
    await expect(ground).toHaveAttribute('data-ground-pointer-lock', 'false')
    await expect(ground.locator('canvas')).toBeVisible()

    await dispatchMovementKey(page, 'keydown', 'KeyW')
    await expect(page.locator('.ground-movement-prompt')).toContainText(/Moving through Ground/i, { timeout: 12_000 })
    await dispatchMovementKey(page, 'keyup', 'KeyW')

    const destinations = page.getByRole('navigation', { name: 'Ground destinations' })
    await expect(destinations).toBeVisible()
    const firstDestination = destinations.locator('a,button').first()
    await expect(firstDestination).toBeVisible()
    await firstDestination.evaluate((element) => (element as HTMLElement).focus())
    await expect.poll(() => firstDestination.evaluate((element) => element === document.activeElement)).toBe(true)
    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()
    expect(errors.pageErrors).toEqual([])
    expect(errors.consoleErrors).toEqual([])
  })

  test('Life Map selects a disclosed demo memory, glides to it, and unwinds to overview without an Orb', async ({ page }) => {
    const errors = await collectRuntimeErrors(page)
    await page.goto('/life-map?demo=1', { waitUntil: 'domcontentloaded' })

    const map = page.locator('.life-map-root')
    await expect(map).toBeVisible({ timeout: 15_000 })
    await expect(map).toHaveAttribute('data-home-companion-owned', 'false')
    await expect(page.locator('.urai-world-companion')).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: 'Life Map journey controls' })).toBeVisible()

    const navigator = page.locator('details[data-life-map-navigator]')
    await expect(navigator).toBeVisible()
    await navigator.locator('summary').click()
    const firstMemory = navigator.locator('.semantic-results > button').first()
    await expect(firstMemory).toBeVisible({ timeout: 15_000 })
    await firstMemory.click()

    await expect.poll(() => new URL(page.url()).searchParams.get('memoryId')).toBeTruthy()
    await expect(map).toHaveAttribute('data-life-map-mode', 'selected')
    await expect(map).toHaveAttribute('data-life-map-phase', /departure|travel|approach|arrival/)
    await expect(page.getByRole('navigation', { name: 'Selected memory actions' })).toBeVisible()

    if (await navigator.getAttribute('open') !== null) await navigator.locator('summary').click()
    await page.keyboard.press('Escape')
    await expect.poll(() => normalizedPathname(page.url())).toBe('/life-map')
    await expect.poll(() => new URL(page.url()).searchParams.get('memoryId')).toBeNull()
    await expect(map).toHaveAttribute('data-life-map-mode', 'overview')
    await expect(page.getByRole('navigation', { name: 'Selected memory actions' })).toHaveCount(0)
    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()
    expect(errors.pageErrors).toEqual([])
    expect(errors.consoleErrors).toEqual([])
  })

  test('mobile movement controls remain contained, touch-sized, and move through Home', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 873 })
    await page.goto('/home/', { waitUntil: 'domcontentloaded' })
    const home = page.locator('.urai-final-home-world')
    await waitForHomeWorld(home)
    const homePad = page.getByRole('group', { name: 'Home movement controls' })
    await expect(homePad).toBeVisible({ timeout: 15_000 })
    for (const name of ['Move forward', 'Move left', 'Move backward', 'Move right']) {
      const button = homePad.getByRole('button', { name })
      const rect = await button.boundingBox()
      expect(rect).not.toBeNull()
      expect(rect!.width).toBeGreaterThanOrEqual(48)
      expect(rect!.height).toBeGreaterThanOrEqual(48)
    }
    const forward = homePad.getByRole('button', { name: 'Move forward' })
    await forward.dispatchEvent('pointerdown', { pointerId: 1, button: 0, buttons: 1, pointerType: 'touch', isPrimary: true })
    await page.waitForTimeout(2_200)
    await forward.dispatchEvent('pointerup', { pointerId: 1, button: 0, buttons: 0, pointerType: 'touch', isPrimary: true })
    await expect.poll(async () => Number(await home.getAttribute('data-home-distance')), { timeout: 12_000 }).toBeGreaterThan(0.8)
    const layout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1)
  })

  test('reduced motion preserves movement access without forced animation or pointer lock', async ({ page }) => {
    test.setTimeout(90_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/home/', { waitUntil: 'domcontentloaded' })
    const home = page.locator('.urai-final-home-world')
    await waitForHomeWorld(home)
    await dispatchMovementKey(page, 'keydown', 'KeyW')
    await page.waitForTimeout(1_800)
    await dispatchMovementKey(page, 'keyup', 'KeyW')
    await expect.poll(async () => Number(await home.getAttribute('data-home-distance')), { timeout: 15_000 }).toBeGreaterThan(0.6)
    await expect(page.getByText('Move through Home', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()
  })
})
