import { expect, test, type Locator, type Page } from '@playwright/test'

const homeOwnerSelector = '.urai-asset-home-world[data-home-primary-owner="asset-driven"]'
const lifeMapOwnerSelector = '[data-testid="urai-true-3d-life-map"]'

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

async function waitForHomeWorld(home: Locator) {
  await expect(home).toBeVisible({ timeout: 30_000 })
  await expect(home.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await expect(home).toHaveAttribute('data-home-assets-ready', 'true', { timeout: 45_000 })
  await expect(home).toHaveAttribute('data-home-ready', 'true', { timeout: 45_000 })
  await expect(home).toHaveAttribute('data-home-input-owner', 'window-capture-movement')
  await expect(home).toHaveAttribute('data-home-telemetry-owner', 'embodied-motion-kernel-v66')
  await expect(home).toHaveAttribute('data-home-player-z', /-?\d+\.\d+/)
  await expect(home).toHaveAttribute('data-home-distance', /\d+\.\d+/)
}

async function enableLifeMapDemo(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem('urai:lifeMapDemoMode', 'true'))
}

function normalizedPathname(url: string) {
  return new URL(url).pathname.replace(/\/+$/, '') || '/'
}

test.describe('Embodied exploration runtime evidence', () => {
  // Exact-head traces prove the asset-driven Home completed real displacement,
  // but software-rendered Actions hosts spent 3-11 seconds on individual DOM,
  // keyboard and attribute operations. Preserve every assertion while allowing
  // the complete interaction sequence to finish on that proven host envelope.
  test.describe.configure({ timeout: 180_000 })

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
    await expect.poll(async () => Number(await home.getAttribute('data-home-distance')), { timeout: 15_000 }).toBeGreaterThan(1.2)
    const afterZ = Number(await home.getAttribute('data-home-player-z'))
    expect(Math.abs(afterZ - beforeZ)).toBeGreaterThan(1.2)
    await expect.poll(async () => {
      const value = await home.evaluate((element) => element.style.getPropertyValue('--home-parallax-y'))
      return Math.abs(Number.parseFloat(value))
    }, { timeout: 12_000 }).toBeGreaterThan(0.1)

    const direct = page.getByRole('navigation', { name: 'Direct Home destinations' })
    await expect(direct.getByRole('button', { name: 'Open Orb directly' })).toBeVisible()
    await expect(direct.getByRole('button', { name: 'Open Ground directly' })).toBeVisible()
    await expect(direct.getByRole('button', { name: 'Open Life Map directly' })).toBeVisible()
    await expect(direct.getByRole('button')).toHaveCount(3)
    for (const name of [/Open Orb directly/i, /Open Ground directly/i, /Open Life Map directly/i]) {
      const target = direct.getByRole('button', { name })
      await target.evaluate((element: HTMLElement) => element.focus())
      await expect(target).toBeFocused()
    }

    const movement = page.getByRole('group', { name: 'Home movement controls' })
    await expect(movement).toBeVisible()
    const forward = movement.getByRole('button', { name: 'Move forward' })
    await forward.evaluate((element: HTMLElement) => element.focus())
    await expect(forward).toBeFocused()
    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()
    expect(errors.pageErrors).toEqual([])
    expect(errors.consoleErrors).toEqual([])
  })

  test('Ground starts at the overlook, walks toward the Nexus, and retains direct destination parity', async ({ page }) => {
    const errors = await collectRuntimeErrors(page)
    await page.goto('/ground/', { waitUntil: 'domcontentloaded' })
    const ground = page.locator('.ground-spatial-root[data-ground-exploration="walkable"]').first()
    await expect(ground).toBeVisible({ timeout: 30_000 })
    await expect(ground).toHaveAttribute('data-ground-pointer-lock', 'false')
    await expect(ground.locator('canvas')).toBeVisible()
    await expect(ground).toHaveAttribute('data-ground-ready', 'true', { timeout: 30_000 })
    await page.keyboard.down('w')
    await expect(page.getByRole('status').filter({ hasText: /Moving through Ground/i })).toBeVisible()
    await page.waitForTimeout(550)
    await page.keyboard.up('w')

    const destinations = page.getByRole('navigation', { name: 'Ground destinations' })
    const privacyCard = destinations.getByRole('button', { name: /^Privacy Sanctuary\./i })
    const privacyDirect = destinations.getByRole('button', { name: 'Go now to Privacy Sanctuary' })
    await expect(privacyCard).toBeVisible()
    await expect(privacyDirect).toBeVisible()
    await privacyDirect.focus()
    await expect(privacyDirect).toBeFocused()
    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()
    expect(errors.pageErrors).toEqual([])
    expect(errors.consoleErrors).toEqual([])
  })

  test('Life Map selects a memory, preserves identity, resets overview, and stays Orb-free', async ({ page }) => {
    await enableLifeMapDemo(page)
    const errors = await collectRuntimeErrors(page)
    await page.goto('/life-map/?demo=1', { waitUntil: 'domcontentloaded' })

    const lifeMap = page.getByTestId('urai-true-3d-life-map')
    await expect(lifeMap).toBeVisible({ timeout: 15_000 })
    await expect(lifeMap).toHaveAttribute('data-life-map-mode', 'overview')
    await expect(page.locator('.urai-world-companion')).toHaveCount(0)
    await expect(page.getByRole('complementary')).toHaveCount(0)

    const memory = page.getByRole('button', { name: /The Quiet Reset Recovery/i }).first()
    await expect(memory).toBeVisible()
    await memory.focus()
    await expect(memory).toBeFocused()
    await memory.press('Enter')

    await expect.poll(() => new URL(page.url()).searchParams.get('memoryId')).toBeTruthy()
    await expect(lifeMap).toHaveAttribute('data-life-map-mode', 'selected')
    const actions = page.getByRole('navigation', { name: 'Selected memory actions' })
    await expect(actions.getByRole('button', { name: 'Enter Focus' })).toBeVisible()
    await expect(actions.getByRole('button', { name: 'Replay' })).toBeVisible()
    const overview = actions.getByRole('button', { name: 'Overview' })
    await overview.click()
    await expect.poll(() => normalizedPathname(page.url())).toBe('/life-map')
    await expect.poll(() => new URL(page.url()).searchParams.get('overview')).toBe('1')
    await expect(lifeMap).toHaveAttribute('data-life-map-mode', 'overview')
    await expect(page.getByRole('navigation', { name: 'Selected memory actions' })).toHaveCount(0)
    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()
    expect(errors.pageErrors).toEqual([])
    expect(errors.consoleErrors).toEqual([])
  })

  test('closed mobile Life Map movement help stays compact and cannot obstruct the world', async ({ page }) => {
    await enableLifeMapDemo(page)
    await page.setViewportSize({ width: 393, height: 873 })
    await page.goto('/life-map/?demo=1', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('urai-true-3d-life-map')).toBeVisible({ timeout: 15_000 })

    const help = page.locator('details.life-map-movement-help')
    await expect(help).toBeVisible()
    await expect(help).not.toHaveAttribute('open', '')
    const rect = await help.boundingBox()
    expect(rect).not.toBeNull()
    expect(rect!.width).toBeLessThanOrEqual(250)
    expect(rect!.height).toBeGreaterThanOrEqual(48)
    expect(rect!.height).toBeLessThanOrEqual(52)
    expect(rect!.x).toBeGreaterThanOrEqual(0)
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(393)
    expect(rect!.y).toBeGreaterThanOrEqual(0)
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(873)
    expect(rect!.height / 873).toBeLessThan(0.08)

    const hiddenBody = help.locator(':scope > p')
    await expect(hiddenBody).toBeHidden()
    await help.locator('summary').press('Enter')
    await expect(help).toHaveAttribute('open', '')
    await expect(hiddenBody).toBeVisible()
  })

  test('mobile movement controls remain contained, touch-sized, and move through Home', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 873 })
    await page.goto('/home/', { waitUntil: 'domcontentloaded' })
    const home = page.locator('.urai-final-home-world')
    await waitForHomeWorld(home)
    const homePad = page.getByRole('group', { name: 'Home movement controls' })
    await expect(homePad).toBeVisible({ timeout: 30_000 })
    for (const name of ['Move forward', 'Move left', 'Move backward', 'Move right']) {
      const button = homePad.getByRole('button', { name })
      const rect = await button.boundingBox()
      expect(rect).not.toBeNull()
      expect(rect!.width).toBeGreaterThanOrEqual(48)
      expect(rect!.height).toBeGreaterThanOrEqual(48)
      expect(rect!.x).toBeGreaterThanOrEqual(0)
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(393)
      expect(rect!.y).toBeGreaterThanOrEqual(0)
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(873)
    }
    const forward = homePad.getByRole('button', { name: 'Move forward' })
    await forward.dispatchEvent('pointerdown', { pointerId: 1, button: 0, buttons: 1, pointerType: 'touch', isPrimary: true })
    await page.waitForTimeout(2_200)
    await forward.dispatchEvent('pointerup', { pointerId: 1, button: 0, buttons: 0, pointerType: 'touch', isPrimary: true })
    await expect.poll(async () => Number(await home.getAttribute('data-home-distance')), { timeout: 15_000 }).toBeGreaterThan(0.8)
    const layout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1)
  })

  test('reduced motion preserves movement access without forced animation or pointer lock', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/home/', { waitUntil: 'domcontentloaded' })
    const home = page.locator('.urai-final-home-world')
    await waitForHomeWorld(home)
    await holdKey(page, 'w', 1_800)
    await expect.poll(async () => Number(await home.getAttribute('data-home-distance')), { timeout: 15_000 }).toBeGreaterThan(0.6)
    const movement = page.getByRole('group', { name: 'Home movement controls' })
    await expect(movement).toBeVisible()
    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()
  })
})
