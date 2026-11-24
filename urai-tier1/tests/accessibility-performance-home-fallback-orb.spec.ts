import { expect, test, type Locator, type Page } from '@playwright/test'

test.use({ launchOptions: { args: ['--disable-webgl'] }, reducedMotion: 'reduce' })

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
