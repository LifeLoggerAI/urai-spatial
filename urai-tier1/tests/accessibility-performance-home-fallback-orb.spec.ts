import { expect, test, type Locator, type Page } from '@playwright/test'

test.use({ launchOptions: { args: ['--disable-webgl'] }, contextOptions: { reducedMotion: 'reduce' } })

async function tabTo(page: Page, target: Locator) {
  const limit = await page.locator('a[href], button, input, [tabindex]').count() + 2
  for (let moves = 0; moves < limit; moves++) {
    if (await target.evaluate(element => element === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  await expect(target).toBeFocused()
}

const viewports = [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  { width: 667, height: 375 },
]

for (const viewport of viewports) {
  test(`fallback Home Orb opens Shadow and restores focus at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/home/')
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
    const home = page.locator('[data-urai-home-runtime="accessible-fallback-without-webgl"]')
    const trigger = home.locator('button[aria-controls="urai-orb-companion-panel"]')
    const panel = home.locator('#urai-orb-companion-panel')
    await expect(trigger).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(panel).toBeHidden()
    await trigger.click({ trial: true })

    await tabTo(page, trigger)
    await page.keyboard.press('Enter')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(panel).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(panel.getByRole('link', { name: 'Ground', exact: true })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(trigger).toBeFocused()

    await page.keyboard.press('o')
    const shadow = panel.getByRole('link', { name: 'Shadow', exact: true })
    await expect(shadow).toBeVisible()
    await tabTo(page, shadow)
    await expect(shadow).toBeInViewport({ ratio: 1 })
    const bounds = await shadow.boundingBox()
    expect(bounds?.height).toBeGreaterThanOrEqual(48)
    expect(bounds?.width).toBeGreaterThanOrEqual(48)
    await shadow.click({ trial: true })
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/shadow\/?(?:\?|$)/)
    const returnHome = page.getByRole('button', { name: 'Home', exact: true })
    await expect(returnHome).toBeVisible()
    await tabTo(page, returnHome)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/home\/?(?:\?|$)/)
    await expect(trigger).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
}

test.describe('touch access to the fallback Orb', () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 568 } })

  test('tapping near the lower edge of Shadow opens the realm and the Home button returns by touch', async ({ page }) => {
    await page.goto('/home/')
    const home = page.locator('[data-urai-home-runtime="accessible-fallback-without-webgl"]')
    await home.locator('button[aria-controls="urai-orb-companion-panel"]').tap()
    const shadow = home.locator('#urai-orb-companion-panel').getByRole('link', { name: 'Shadow', exact: true })
    await shadow.scrollIntoViewIfNeeded()
    await expect(shadow).toBeInViewport({ ratio: 1 })
    const bounds = await shadow.boundingBox()
    if (!bounds) throw new Error('Shadow has no visible touch target')
    expect(bounds.height).toBeGreaterThanOrEqual(48)
    expect(bounds.width).toBeGreaterThanOrEqual(48)
    await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height - 2)
    await expect(page).toHaveURL(/\/shadow\/?(?:\?|$)/)

    const destinations = page.getByRole('navigation', { name: 'Shadow Realm fallback destinations' })
    const returnHome = destinations.getByRole('button', { name: 'Home', exact: true })
    await returnHome.scrollIntoViewIfNeeded()
    await expect(returnHome).toBeInViewport({ ratio: 1 })
    expect(await returnHome.evaluate(button => {
      const { x, y, width, height } = button.getBoundingClientRect()
      return button.contains(document.elementFromPoint(x + width / 2, y + height / 2))
    })).toBe(true)
    await returnHome.tap()
    await expect(page).toHaveURL(/\/home\/?(?:\?|$)/)
    await expect(home.locator('button[aria-controls="urai-orb-companion-panel"]')).toHaveAttribute('aria-expanded', 'false')
  })
})

for (const viewport of [{ width: 390, height: 844 }, { width: 667, height: 375 }]) {
  test(`selected Weather and fallback navigation receive separate pointer targets at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/settings/')
    const settings = page.locator('[data-manual-weather-preference="session-only"]:visible')
    await settings.getByRole('checkbox').check()
    const select = settings.getByRole('combobox')
    await select.selectOption({ index: 1 })
    const choice = await select.inputValue()
    const documentStart = await page.evaluate(() => performance.timeOrigin)
    const homeLink = page.locator('nav[aria-label="Settings navigation"] a[href="/home"]:visible')
    await homeLink.press('Enter')

    const home = page.locator('[data-urai-home-runtime="accessible-fallback-without-webgl"]')
    const status = home.locator('[data-home-emotional-weather="manual"]')
    const change = status.getByRole('link', { name: 'Change or turn off' })
    await expect(status).toContainText(choice)
    await expect(change).toBeInViewport({ ratio: 1 })
    await home.getByTestId('home-semantic-life-map').click({ trial: true })

    await page.keyboard.press('o')
    const shadow = home.locator('#urai-orb-companion-panel').getByRole('link', { name: 'Shadow' })
    await shadow.click({ trial: true })
    await page.keyboard.press('Escape')
    await expect(change).toBeVisible()
    const center = await change.evaluate(link => {
      const box = link.getBoundingClientRect()
      const x = box.x + box.width / 2
      const y = box.y + box.height / 2
      return { x, y, receivesPointer: link.contains(document.elementFromPoint(x, y)) }
    })
    expect(center.receivesPointer).toBe(true)
    await page.mouse.click(center.x, center.y)
    await expect(select).toHaveValue(choice)
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentStart)

    await settings.getByRole('button', { name: 'Reset and turn off' }).click()
    await homeLink.press('Enter')
    await expect(home).toBeVisible()
    await expect(status).toHaveCount(0)
  })
}
