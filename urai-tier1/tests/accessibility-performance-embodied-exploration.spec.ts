import { expect, test, type Locator, type Page } from '@playwright/test'

const homeOwnerSelector = '.urai-asset-home-world[data-home-primary-owner="asset-driven"]'

async function collectRuntimeErrors(page: Page) {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  return { pageErrors, consoleErrors }
}

async function waitForHomeWorld(home: Locator) {
  await expect(home).toBeVisible({ timeout: 30_000 })
  await expect(home.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await expect(home).toHaveAttribute('data-home-assets-ready', 'true', { timeout: 45_000 })
  await expect(home).toHaveAttribute('data-home-ready', 'true', { timeout: 45_000 })
  await expect(home).toHaveAttribute('data-home-interaction-ready', 'true', { timeout: 45_000 })
  await expect(home).toHaveAttribute('data-home-stable-state', 'AVATAR_HOME_FIRST_PERSON')
  await expect(home).toHaveAttribute('data-home-embodied-self', 'camera-only-first-person-home')
  await expect(home).toHaveAttribute('data-home-presence-presentation', 'camera-only-first-person-home')
  await expect(home).toHaveAttribute('data-home-movement', 'shared-keyboard-touch-walk-look-interact')
  await expect(home).toHaveAttribute('data-home-ground-entry', 'physical-world-surface')
  await expect(home).toHaveAttribute('data-home-life-map-entry', 'visible-sky-broad-interaction')
  await expect(home).toHaveAttribute('data-home-camera-mode', 'home-first-person')
  await expect(home).toHaveAttribute('data-home-non-xr-body-policy', 'camera-only-no-hands-body-rig')
}

async function assertBodylessFirstPersonHome(page: Page) {
  const home = page.locator(homeOwnerSelector)
  await expect(page.getByRole('button', { name: 'Enter first-person Home' })).toHaveCount(0)
  await expect(home).toHaveAttribute('data-home-stable-state', 'AVATAR_HOME_FIRST_PERSON', { timeout: 20_000 })
  await expect(home).toHaveAttribute('data-home-embodied-self', 'camera-only-first-person-home')
  await expect(home).toHaveAttribute('data-home-presence-presentation', 'camera-only-first-person-home')
  await expect(home).toHaveAttribute('data-home-movement', 'shared-keyboard-touch-walk-look-interact')
  await expect(home).toHaveAttribute('data-home-non-xr-body-policy', 'camera-only-no-hands-body-rig')
  await expect(page.getByRole('button', { name: 'Open Avatar Self View' })).toBeVisible()
  return home
}

async function enableLifeMapDemo(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem('urai:lifeMapDemoMode', 'true'))
}

function normalizedPathname(url: string) {
  return new URL(url).pathname.replace(/\/+$/, '') || '/'
}

test.describe('Home and Ground embodied accessibility evidence', () => {
  test.describe.configure({ timeout: 300_000 })

  test('Home opens directly into persistent bodyless first-person Home with shared keyboard controls', async ({ page }) => {
    const errors = await collectRuntimeErrors(page)
    await page.goto('/home/', { waitUntil: 'domcontentloaded' })
    const home = page.locator(homeOwnerSelector)
    await waitForHomeWorld(home)

    const direct = page.getByRole('navigation', { name: 'Accessible Home destinations' })
    for (const target of [
      direct.getByRole('button', { name: 'Open URAI Orb companion' }),
      direct.getByRole('link', { name: 'Open Ground directly' }),
      direct.getByRole('link', { name: 'Open Life Map directly' }),
    ]) {
      await target.evaluate((element: HTMLElement) => element.focus())
      await expect(target).toBeFocused()
    }

    await assertBodylessFirstPersonHome(page)
    await page.keyboard.down('w')
    await page.waitForTimeout(500)
    await page.keyboard.up('w')
    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()
    expect(errors.pageErrors).toEqual([])
    expect(errors.consoleErrors).toEqual([])
  })

  test('mobile first-person Home exposes touch-sized Move through Home controls without synthetic body UI', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 873 })
    await page.goto('/home/', { waitUntil: 'domcontentloaded' })
    await waitForHomeWorld(page.locator(homeOwnerSelector))
    await assertBodylessFirstPersonHome(page)

    const movement = page.getByRole('group', { name: 'Move through Home' })
    await expect(movement).toBeVisible()
    for (const name of ['Move forward', 'Move left', 'Move backward', 'Move right']) {
      const button = movement.getByRole('button', { name })
      const rect = await button.boundingBox()
      expect(rect).not.toBeNull()
      expect(rect!.width).toBeGreaterThanOrEqual(48)
      expect(rect!.height).toBeGreaterThanOrEqual(48)
      expect(rect!.x).toBeGreaterThanOrEqual(0)
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(393)
      expect(rect!.y).toBeGreaterThanOrEqual(0)
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(873)
    }

    const forward = movement.getByRole('button', { name: 'Move forward' })
    await forward.dispatchEvent('pointerdown', { pointerId: 1, button: 0, buttons: 1, pointerType: 'touch', isPrimary: true })
    await page.waitForTimeout(500)
    await forward.dispatchEvent('pointerup', { pointerId: 1, button: 0, buttons: 0, pointerType: 'touch', isPrimary: true })
    const layout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1)
  })

  test('Ground is bodyless first-person, keyboard/touch navigable, privacy-safe, and semantically returns Home', async ({ page }) => {
    const errors = await collectRuntimeErrors(page)
    await page.goto('/ground/', { waitUntil: 'domcontentloaded' })
    const ground = page.locator('.ground-spatial-root[data-ground-exploration="first-person-no-visible-body"]').first()
    await expect(ground).toBeVisible({ timeout: 30_000 })
    await expect(ground).toHaveAttribute('data-ground-pointer-lock', 'false')
    await expect(ground).toHaveAttribute('data-ground-ready', 'true', { timeout: 45_000 })
    await expect(ground).toHaveAttribute('data-ground-camera', 'eye-level-terrain-following-no-authored-bob')
    await expect(ground).toHaveAttribute('data-ground-collision', 'terrain-plus-authored-obstacle-field')
    await expect(ground).toHaveAttribute('data-ground-place-layer', 'consent-aware-empty-by-default')
    await expect(ground).toHaveAttribute('data-ground-private-location-mounted', 'false')
    await expect(ground).toHaveAttribute('data-ground-visible-avatar', 'false')
    await expect(ground).toHaveAttribute('data-ground-visible-hands', 'false')
    await expect(ground.locator('canvas')).toBeVisible({ timeout: 30_000 })

    await page.keyboard.down('w')
    await page.waitForTimeout(500)
    await page.keyboard.up('w')

    const home = page.getByRole('button', { name: 'Return Home' })
    await home.focus()
    await expect(home).toBeFocused()
    const placeNav = page.getByRole('navigation', { name: 'Ground place and privacy tools' })
    for (const link of [placeNav.getByRole('link', { name: 'Places' }), placeNav.getByRole('link', { name: 'Privacy' })]) {
      await link.focus()
      await expect(link).toBeFocused()
    }
    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()
    expect(errors.pageErrors).toEqual([])
    expect(errors.consoleErrors).toEqual([])
  })

  test('mobile Ground movement controls are touch-sized and contained', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 873 })
    await page.goto('/ground/', { waitUntil: 'domcontentloaded' })
    const ground = page.locator('.ground-spatial-root[data-ground-exploration="first-person-no-visible-body"]').first()
    await expect(ground).toHaveAttribute('data-ground-ready', 'true', { timeout: 45_000 })

    const details = page.locator('.ground-accessible-movement')
    await details.locator('summary').click()
    const pad = page.getByRole('group', { name: 'Ground first-person movement controls' })
    await expect(pad).toBeVisible()
    for (const name of ['Move forward', 'Move left', 'Move backward', 'Move right']) {
      const button = pad.getByRole('button', { name })
      const rect = await button.boundingBox()
      expect(rect).not.toBeNull()
      expect(rect!.width).toBeGreaterThanOrEqual(48)
      expect(rect!.height).toBeGreaterThanOrEqual(48)
      expect(rect!.x).toBeGreaterThanOrEqual(0)
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(393)
      expect(rect!.y).toBeGreaterThanOrEqual(0)
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(873)
    }
  })

  test('reduced motion preserves bodyless first-person Home and Ground controls without pointer lock', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/home/', { waitUntil: 'domcontentloaded' })
    await waitForHomeWorld(page.locator(homeOwnerSelector))
    await assertBodylessFirstPersonHome(page)
    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()

    await page.goto('/ground/', { waitUntil: 'domcontentloaded' })
    const ground = page.locator('.ground-spatial-root[data-ground-exploration="first-person-no-visible-body"]').first()
    await expect(ground).toHaveAttribute('data-ground-ready', 'true', { timeout: 45_000 })
    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()
  })

  test('Life Map selects a memory, preserves identity, resets overview, and stays Orb-free', async ({ page }) => {
    await enableLifeMapDemo(page)
    const errors = await collectRuntimeErrors(page)
    await page.goto('/life-map/?demo=1', { waitUntil: 'domcontentloaded' })
    const lifeMap = page.getByTestId('urai-true-3d-life-map')
    await expect(lifeMap).toBeVisible({ timeout: 15_000 })
    await expect(lifeMap).toHaveAttribute('data-life-map-mode', 'overview')
    await expect(page.locator('.urai-world-companion')).toHaveCount(0)
    const searchTrigger = page.locator('.life-map-search-trigger').first()
    await expect(searchTrigger).toHaveAccessibleName('Search and navigate Life Map')
    await searchTrigger.click()
    const navigator = page.locator('section.life-map-navigator[aria-label="Search and filter Life Map"]').first()
    const memory = navigator.locator('button[data-life-map-semantic-result][data-life-map-node-id="quiet-reset"]').first()
    await expect(memory).toHaveAccessibleName(/The Quiet Reset/i)
    await memory.focus()
    await memory.press('Enter')
    await expect.poll(() => new URL(page.url()).searchParams.get('memoryId')).toBeTruthy()
    await expect(lifeMap).toHaveAttribute('data-life-map-mode', 'selected')
    const actions = page.getByRole('navigation', { name: 'Selected memory actions' })
    await expect(actions.getByRole('button', { name: 'Enter Focus' })).toBeVisible()
    await actions.getByRole('button', { name: 'Overview' }).click()
    await expect.poll(() => normalizedPathname(page.url())).toBe('/life-map')
    await expect(lifeMap).toHaveAttribute('data-life-map-mode', 'overview')
    expect(errors.pageErrors).toEqual([])
    expect(errors.consoleErrors).toEqual([])
  })

  test('closed mobile Life Map search trigger stays compact and inside the viewport', async ({ page }) => {
    await enableLifeMapDemo(page)
    await page.setViewportSize({ width: 393, height: 873 })
    await page.goto('/life-map/?demo=1', { waitUntil: 'domcontentloaded' })
    const trigger = page.locator('.life-map-search-trigger').first()
    await expect(trigger).toHaveAccessibleName('Search and navigate Life Map')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    const rect = await trigger.boundingBox()
    expect(rect).not.toBeNull()
    expect(rect!.width).toBeGreaterThanOrEqual(48)
    expect(rect!.width).toBeLessThanOrEqual(52)
    expect(rect!.height).toBeGreaterThanOrEqual(48)
    expect(rect!.height).toBeLessThanOrEqual(52)
    expect(rect!.x).toBeGreaterThanOrEqual(0)
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(393)
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(873)
  })
})
