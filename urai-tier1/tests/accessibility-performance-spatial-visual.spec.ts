import { expect, test } from '@playwright/test'

test.describe('URAI visual ownership and containment evidence', () => {
  test.describe.configure({ timeout: 60_000 })

  test('Home exposes one authored Orb with a transparent operable controller', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const shell = page.locator('[data-testid="urai-persistent-world-shell"]')
    await expect(shell).toHaveAttribute('data-world-destination', 'home')
    await expect(shell).toHaveAttribute('data-companion-owned', 'true')
    await expect(page.locator('.urai-final-home-world')).toBeVisible({ timeout: 15_000 })

    const orb = page.locator('[data-urai-audit-action="orb-controls"]')
    await expect(orb).toHaveCount(1)
    await expect(orb).toBeVisible()
    await expect(orb).toBeEnabled()
    await expect(orb).toHaveAccessibleName(/open orb travel controls/i)

    const evidence = await orb.evaluate((element) => {
      const style = getComputedStyle(element)
      const before = getComputedStyle(element, '::before')
      const after = getComputedStyle(element, '::after')
      const rect = element.getBoundingClientRect()
      return {
        width: rect.width,
        height: rect.height,
        backgroundImage: style.backgroundImage,
        backgroundColor: style.backgroundColor,
        boxShadow: style.boxShadow,
        beforeDisplay: before.display,
        afterDisplay: after.display,
      }
    })

    await test.info().attach('home-singular-orb-controller.json', {
      body: JSON.stringify(evidence, null, 2),
      contentType: 'application/json',
    })

    expect(evidence.width).toBeGreaterThanOrEqual(48)
    expect(evidence.height).toBeGreaterThanOrEqual(48)
    expect(evidence.backgroundImage).toBe('none')
    expect(evidence.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(evidence.boxShadow).toBe('none')
    expect(evidence.beforeDisplay).toBe('none')
    expect(evidence.afterDisplay).toBe('none')

    await orb.dispatchEvent('click')
    const menu = page.locator('#urai-world-companion-menu')
    await expect(menu).toHaveAttribute('aria-hidden', 'false')
    await expect(orb).toHaveAccessibleName(/close orb travel controls/i)

    const openLayout = await page.evaluate(() => {
      const controller = document.querySelector<HTMLElement>('[data-urai-audit-action="orb-controls"]')?.getBoundingClientRect()
      const destination = document.querySelector<HTMLButtonElement>('#urai-world-companion-menu button[data-world-target="life-map"]')?.getBoundingClientRect()
      if (!controller || !destination) return null
      return {
        controller: { left: controller.left, top: controller.top, right: controller.right, bottom: controller.bottom },
        destination: { left: destination.left, top: destination.top, right: destination.right, bottom: destination.bottom },
      }
    })
    expect(openLayout).not.toBeNull()
    const overlaps = openLayout!.controller.left < openLayout!.destination.right
      && openLayout!.controller.right > openLayout!.destination.left
      && openLayout!.controller.top < openLayout!.destination.bottom
      && openLayout!.controller.bottom > openLayout!.destination.top
    expect(overlaps).toBe(false)

    const lifeMapDestination = menu.locator('button[data-world-target="life-map"]')
    await expect(lifeMapDestination).toBeVisible()
    await lifeMapDestination.dispatchEvent('click')
    await expect.poll(() => new URL(page.url()).pathname.replace(/\/+$/, '')).toBe('/life-map')
    await expect(page.getByTestId('urai-true-3d-life-map')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.urai-world-companion')).toHaveCount(0)
  })

  test('Ground WebGL canvas remains inside a narrow mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/ground', { waitUntil: 'domcontentloaded' })

    const canvas = page.locator('.ground-spatial-root canvas').first()
    await expect(canvas).toBeVisible({ timeout: 15_000 })
    const evidence = await canvas.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const viewport = window.visualViewport
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        viewportWidth: viewport?.width ?? window.innerWidth,
        viewportHeight: viewport?.height ?? window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }
    })

    await test.info().attach('ground-mobile-canvas-containment.json', {
      body: JSON.stringify(evidence, null, 2),
      contentType: 'application/json',
    })

    expect(evidence.left).toBeGreaterThanOrEqual(-1)
    expect(evidence.top).toBeGreaterThanOrEqual(-1)
    expect(evidence.right).toBeLessThanOrEqual(evidence.viewportWidth + 1)
    expect(evidence.bottom).toBeLessThanOrEqual(evidence.viewportHeight + 1)
    expect(evidence.width).toBeLessThanOrEqual(evidence.viewportWidth + 1)
    expect(evidence.height).toBeLessThanOrEqual(evidence.viewportHeight + 1)
    expect(evidence.documentWidth).toBeLessThanOrEqual(evidence.innerWidth + 1)
  })

  test('Life Map semantic controls stay closed until the user opens them', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 873 })
    await page.goto('/life-map?demo=1', { waitUntil: 'domcontentloaded' })

    await expect(page.getByTestId('urai-true-3d-life-map')).toBeVisible({ timeout: 15_000 })
    const controls = page.locator('details.life-map-help')
    const body = controls.locator(':scope > div')
    await expect(controls).not.toHaveAttribute('open', '')
    await expect(body).toBeHidden()

    const summary = controls.locator('summary')
    await summary.focus()
    await expect(summary).toBeFocused()
    await summary.press('Enter')
    await expect(controls).toHaveAttribute('open', '')
    await expect(body).toBeVisible()
    await expect(body.getByRole('button').first()).toBeVisible()
  })

  test('selected Life Map journey rail stays compact and contained on portrait mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/life-map?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset', { waitUntil: 'domcontentloaded' })

    const lifeMap = page.getByTestId('urai-true-3d-life-map')
    await expect(lifeMap).toBeVisible({ timeout: 15_000 })
    await expect(lifeMap).toHaveAttribute('data-life-map-mode', 'selected')
    await expect(page.getByRole('button', { name: 'Enter Focus', exact: true })).toBeVisible()

    const rail = page.getByTestId('life-map-journey-rail')
    await expect(rail).toBeVisible()
    await expect(rail).toHaveAttribute('data-selected', 'true')
    await expect(rail.getByRole('button')).toHaveCount(3)

    const evidence = await rail.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const viewport = window.visualViewport
      const buttons = [...element.querySelectorAll<HTMLElement>('button')].map((button) => {
        const buttonRect = button.getBoundingClientRect()
        return { width: buttonRect.width, height: buttonRect.height, top: buttonRect.top, bottom: buttonRect.bottom }
      })
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        viewportWidth: viewport?.width ?? window.innerWidth,
        viewportHeight: viewport?.height ?? window.innerHeight,
        buttons,
      }
    })

    await test.info().attach('life-map-selected-mobile-journey-rail.json', {
      body: JSON.stringify(evidence, null, 2),
      contentType: 'application/json',
    })

    expect(evidence.height).toBeGreaterThanOrEqual(60)
    expect(evidence.height).toBeLessThanOrEqual(66)
    expect(evidence.height / evidence.viewportHeight).toBeLessThan(0.1)
    expect(evidence.width).toBeLessThanOrEqual(evidence.viewportWidth - 20)
    expect(evidence.left).toBeGreaterThanOrEqual(0)
    expect(evidence.right).toBeLessThanOrEqual(evidence.viewportWidth + 1)
    expect(evidence.top).toBeGreaterThanOrEqual(0)
    expect(evidence.bottom).toBeLessThanOrEqual(evidence.viewportHeight + 1)
    expect(evidence.buttons).toHaveLength(3)
    for (const button of evidence.buttons) {
      expect(button.height).toBeGreaterThanOrEqual(48)
      expect(button.height).toBeLessThanOrEqual(50)
      expect(button.top).toBeGreaterThanOrEqual(evidence.top)
      expect(button.bottom).toBeLessThanOrEqual(evidence.bottom + 1)
    }
  })
})
