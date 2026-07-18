import { expect, test } from '@playwright/test'

test.describe('URAI visual ownership and containment evidence', () => {
  test('Home exposes one authored Orb with a transparent operable controller', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

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
        borderColor: style.borderColor,
        beforeDisplay: before.display,
        beforeContent: before.content,
        afterDisplay: after.display,
        afterContent: after.content,
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
    await expect(page.locator('#urai-world-companion-menu')).toHaveAttribute('aria-hidden', 'false')
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

    const controls = page.locator('details.life-map-accessibility-menu')
    const body = controls.locator(':scope > div')
    await expect(controls).not.toHaveAttribute('open', '')
    await expect(body).toBeHidden()

    await controls.locator('summary').click()
    await expect(controls).toHaveAttribute('open', '')
    await expect(body).toBeVisible()
  })
})
