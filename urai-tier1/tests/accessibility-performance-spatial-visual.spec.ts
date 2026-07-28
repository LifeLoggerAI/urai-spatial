import { expect, test } from '@playwright/test'

test.describe('URAI visual ownership and containment evidence', () => {
  // The software-rendered Actions host proved the complete Orb route contract in
  // 27-30 seconds while the default 30-second test envelope clipped the first
  // attempt. Preserve every visual, accessibility and destination assertion while
  // allowing the deterministic route proof to complete without relying on retries.
  test.describe.configure({ timeout: 90_000 })

  test('Home exposes one authored Orb with a transparent operable controller', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const shell = page.locator('[data-testid="urai-persistent-world-shell"]')
    await expect(shell).toHaveAttribute('data-world-destination', 'home')
    await expect(shell).toHaveAttribute('data-companion-owned', 'true')

    const orb = page.locator('[data-urai-audit-action="orb-controls"]')
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

    expect(evidence.width).toBeGreaterThanOrEqual(96)
    expect(evidence.height).toBeGreaterThanOrEqual(96)
    expect(evidence.backgroundImage).toBe('none')
    expect(evidence.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(evidence.boxShadow).toBe('none')
    expect(evidence.beforeDisplay).toBe('none')
    expect(evidence.afterDisplay).toBe('none')

    await orb.click()
    const menu = page.locator('#urai-world-companion-menu')
    await expect(menu).toHaveAttribute('aria-hidden', 'false')
    await expect(orb).toHaveAccessibleName(/close orb travel controls/i)

    const openLayout = await page.evaluate(() => {
      const controller = document.querySelector<HTMLElement>('[data-urai-audit-action="orb-controls"]')?.getBoundingClientRect()
      const destination = [...document.querySelectorAll<HTMLButtonElement>('#urai-world-companion-menu button')]
        .find((button) => button.textContent?.trim() === 'Life Map')
        ?.getBoundingClientRect()
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

    const lifeMapDestination = menu.getByRole('button', { name: 'Life Map', exact: true })
    await expect(lifeMapDestination).toBeVisible()
    await lifeMapDestination.click()
    await expect.poll(() => new URL(page.url()).pathname.replace(/\/+$/, ''), { timeout: 15_000 }).toBe('/life-map')
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
    await page.goto('/life-map', { waitUntil: 'domcontentloaded' })

    const controls = page.locator('details.life-map-help')
    const body = controls.locator(':scope > div')
    await expect(controls).toBeVisible({ timeout: 30_000 })
    await expect(controls).not.toHaveAttribute('open', '')
    await expect(body).toBeHidden()

    await controls.locator('summary').click()
    await expect(controls).toHaveAttribute('open', '')
    await expect(body).toBeVisible()
  })
})
