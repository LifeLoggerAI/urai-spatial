import { expect, test, type Page } from '@playwright/test'

async function collectRuntimeErrors(page: Page) {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  return { pageErrors, consoleErrors }
}

async function holdKey(page: Page, key: string, duration = 450) {
  await page.keyboard.down(key)
  await page.waitForTimeout(duration)
  await page.keyboard.up(key)
}

async function enableLifeMapDemo(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem('urai:lifeMapDemoMode', 'true'))
}

test.describe('Embodied exploration runtime evidence', () => {
  test('Home walks and exposes one physical Orb with an accessible travel menu', async ({ page }) => {
    const errors = await collectRuntimeErrors(page)
    await page.goto('/home/', { waitUntil: 'domcontentloaded' })

    const home = page.locator('.urai-home-embodied-shell')
    await expect(home).toBeVisible({ timeout: 15_000 })
    await expect(home).toHaveAttribute('data-home-movement', 'walk-keyboard-click-touch')
    await expect(home).toHaveAttribute('data-home-pointer-lock', 'false')
    await expect(page.locator('[data-testid="urai-home-walkable-surface"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="urai-home-webgl-orb"]')).toHaveCount(1)

    const companion = page.locator('.urai-world-companion')
    await expect(companion).toHaveAttribute('data-home-physical-orb-anchor', 'true')
    const orbMenuTrigger = page.getByRole('button', { name: 'Open Orb travel controls', exact: true })
    await expect(orbMenuTrigger).toBeVisible()
    await expect(orbMenuTrigger).toHaveAttribute('data-visual-orb-owner', 'physical-home-orb')
    const visualStyle = await orbMenuTrigger.evaluate((element) => {
      const style = window.getComputedStyle(element)
      return { backgroundImage: style.backgroundImage, boxShadow: style.boxShadow, borderColor: style.borderColor }
    })
    expect(visualStyle.backgroundImage).toBe('none')
    expect(visualStyle.boxShadow).toBe('none')
    expect(visualStyle.borderColor).toMatch(/rgba\(0, 0, 0, 0\)|transparent/)

    await orbMenuTrigger.click()
    const menu = page.locator('#urai-world-companion-menu')
    await expect(menu).toHaveAttribute('aria-hidden', 'false')
    await expect(menu.getByRole('button', { name: 'Life Map', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')

    const before = await home.evaluate((element) => element.style.getPropertyValue('--home-walk-z'))
    await holdKey(page, 'w', 650)
    await expect.poll(() => home.evaluate((element) => element.style.getPropertyValue('--home-walk-z'))).not.toBe(before)

    const direct = page.getByRole('navigation', { name: 'Direct Home destinations' })
    await expect(direct.getByRole('button', { name: 'Open Orb directly', exact: true })).toBeVisible()
    await expect(direct.getByRole('button', { name: 'Open Ground directly', exact: true })).toBeVisible()
    await expect(direct.getByRole('button', { name: 'Open Life Map directly', exact: true })).toBeVisible()

    const help = page.getByText('Move through Home', { exact: true })
    await expect(help).toBeVisible()
    await help.focus()
    await expect(help).toBeFocused()
    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()
    expect(errors.pageErrors).toEqual([])
    expect(errors.consoleErrors).toEqual([])
  })

  test('Ground starts at the overlook, walks toward the Nexus, and retains direct destination parity', async ({ page }) => {
    const errors = await collectRuntimeErrors(page)
    await page.goto('/ground/', { waitUntil: 'domcontentloaded' })

    const ground = page.locator('.ground-spatial-root')
    await expect(ground).toBeVisible({ timeout: 15_000 })
    await expect(ground).toHaveAttribute('data-ground-exploration', 'walkable')
    await expect(ground).toHaveAttribute('data-ground-pointer-lock', 'false')
    await expect(page.locator('[data-testid="urai-ground-walkable-surface"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="urai-ground-central-nexus"]')).toHaveCount(1)

    await holdKey(page, 'w', 550)
    await expect(page.getByRole('status').filter({ hasText: /Moving through Ground/i })).toBeVisible()

    const rail = page.getByRole('navigation', { name: 'Ground destinations' })
    const privacy = rail.getByRole('link', { name: /Privacy Sanctuary/i })
    await expect(privacy).toBeVisible()
    await expect(privacy).toHaveAttribute('data-workforce-state', 'awaiting-owner-approval')
    await expect(privacy).toHaveAttribute('data-service-availability', 'available')
    await privacy.focus()
    await expect(privacy).toBeFocused()

    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()
    expect(errors.pageErrors).toEqual([])
    expect(errors.consoleErrors).toEqual([])
  })

  test('Life Map keyboard navigation glides through depth, selects constellations, resets overview, and stays Orb-free', async ({ page }) => {
    await enableLifeMapDemo(page)
    const errors = await collectRuntimeErrors(page)
    await page.goto('/life-map/', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('.life-map-independent-realm')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.urai-world-companion')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /orb travel controls/i })).toHaveCount(0)
    await expect(page.getByRole('group', { name: 'Life Map spatial movement controls' })).toBeVisible()

    await page.keyboard.press('w')
    await expect(page.getByRole('status').filter({ hasText: /Gliding deeper into the memory field/i })).toBeVisible()

    await page.keyboard.press('d')
    await expect.poll(() => new URL(page.url()).searchParams.get('memoryId')).toBeTruthy()
    await expect(page.locator('.life-map-memory-portals')).toBeVisible()

    await page.keyboard.press('r')
    await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).search).toBe('/life-map')
    await expect(page.getByRole('status').filter({ hasText: /whole private constellation/i })).toBeVisible()

    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()
    expect(errors.pageErrors).toEqual([])
    expect(errors.consoleErrors).toEqual([])
  })

  test('mobile movement controls remain contained, touch-sized, and semantically named', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 873 })
    await page.goto('/home/', { waitUntil: 'domcontentloaded' })

    const homePad = page.getByRole('group', { name: 'Home movement controls' })
    await expect(homePad).toBeVisible({ timeout: 15_000 })
    for (const name of ['Move forward', 'Move left', 'Move backward', 'Move right']) {
      const button = homePad.getByRole('button', { name })
      await expect(button).toBeVisible()
      const rect = await button.boundingBox()
      expect(rect).not.toBeNull()
      expect(rect!.width).toBeGreaterThanOrEqual(48)
      expect(rect!.height).toBeGreaterThanOrEqual(48)
    }

    const homeLayout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))
    expect(homeLayout.scrollWidth).toBeLessThanOrEqual(homeLayout.innerWidth + 1)

    await enableLifeMapDemo(page)
    await page.goto('/life-map/', { waitUntil: 'domcontentloaded' })
    const mapControls = page.getByRole('group', { name: 'Life Map spatial movement controls' })
    await expect(mapControls).toBeVisible({ timeout: 15_000 })
    for (const name of ['Glide to previous memory', 'Glide deeper into the memory field', 'Retreat toward overview', 'Glide to next memory', 'Return to Life Map overview']) {
      const button = mapControls.getByRole('button', { name })
      const rect = await button.boundingBox()
      expect(rect).not.toBeNull()
      expect(rect!.height).toBeGreaterThanOrEqual(48)
    }
    const mapLayout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))
    expect(mapLayout.scrollWidth).toBeLessThanOrEqual(mapLayout.innerWidth + 1)
  })

  test('reduced motion preserves movement access without forced animation or pointer lock', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/home/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.urai-home-embodied-shell')).toBeVisible({ timeout: 15_000 })
    await holdKey(page, 'w', 350)
    await expect(page.getByText(/WASD \/ arrows/i)).toBeVisible()
    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()

    await page.goto('/ground/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.ground-spatial-root')).toHaveAttribute('data-ground-exploration', 'walkable')
    await expect(page.getByText('Move through Ground', { exact: true })).toBeVisible()
  })
})
