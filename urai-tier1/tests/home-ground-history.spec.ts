import { expect, test, type Locator, type Page } from '@playwright/test'

const homeSelector = '.urai-asset-home-world[data-home-primary-owner="asset-driven"]'
const groundSelector = '.ground-spatial-root[data-ground-exploration="first-person"]'

function normalizedPathname(url: string) {
  return new URL(url).pathname.replace(/\/+$/, '') || '/'
}

async function waitForHome(page: Page) {
  const home = page.locator(homeSelector)
  await expect(home).toBeVisible({ timeout: 45_000 })
  await expect(home).toHaveAttribute('data-home-assets-ready', 'true', { timeout: 45_000 })
  await expect(home).toHaveAttribute('data-home-interaction-ready', 'true', { timeout: 45_000 })
  return home
}

async function waitForGround(page: Page) {
  const ground = page.locator(groundSelector).first()
  await expect(ground).toBeVisible({ timeout: 45_000 })
  await expect(ground).toHaveAttribute('data-ground-ready', 'true', { timeout: 45_000 })
  await expect(ground).toHaveAttribute('data-ground-camera-mode', /first-person|look/)
  return ground
}

async function enterGroundFromHome(page: Page) {
  await page.goto('/home/?homeAssetReview=1&homePrivateFixture=1', { waitUntil: 'domcontentloaded' })
  const home = await waitForHome(page)
  const canvas = home.locator('canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width * .50, box!.y + box!.height * .84)
  await expect.poll(() => normalizedPathname(page.url()), { timeout: 12_000 }).toBe('/ground')
  return waitForGround(page)
}

async function expectUnwindThenHome(page: Page, ground: Locator) {
  await expect(ground).toHaveAttribute('data-ground-camera-mode', 'unwind', { timeout: 4_000 })
  await expect.poll(() => normalizedPathname(page.url()), { timeout: 12_000 }).toBe('/home')
  const home = await waitForHome(page)
  await expect(home).toHaveAttribute('data-home-camera-mode', /cinematic-third-person|cinematic-look/)
  await expect(page.getByTestId('urai-home-embodied-avatar')).toHaveCount(1)
  await expect(page.getByTestId('urai-home-webgl-orb')).toHaveCount(1)
}

test.describe('Home Ground deterministic history and unwind', () => {
  test.describe.configure({ timeout: 180_000 })

  test('browser Back starts Ground unwind before Home history is consumed', async ({ page }) => {
    const ground = await enterGroundFromHome(page)
    await page.evaluate(() => window.history.back())
    await expectUnwindThenHome(page, ground)
  })

  test('Escape converges on the same Ground unwind and restores Home', async ({ page }) => {
    const ground = await enterGroundFromHome(page)
    await page.keyboard.press('Escape')
    await expectUnwindThenHome(page, ground)
  })

  test('Orb companion Return cannot bypass Ground unwind', async ({ page }) => {
    const ground = await enterGroundFromHome(page)
    const orb = page.locator('.urai-world-companion__orb').first()
    await expect(orb).toBeVisible()
    await orb.click()
    const returnButton = page.getByRole('button', { name: 'Return through the world' })
    await expect(returnButton).toBeVisible()
    await returnButton.click()
    await expectUnwindThenHome(page, ground)
  })

  test('direct Ground deep link unwinds to Home without a duplicate Ground loop', async ({ page }) => {
    await page.goto('/ground/', { waitUntil: 'domcontentloaded' })
    const ground = await waitForGround(page)
    await page.getByRole('button', { name: 'Return Home' }).click()
    await expectUnwindThenHome(page, ground)
    await page.evaluate(() => window.history.back())
    await page.waitForTimeout(350)
    expect(normalizedPathname(page.url())).not.toBe('/ground')
  })

  test('Forward after a completed browser-Back unwind restores a valid Ground state', async ({ page }) => {
    const ground = await enterGroundFromHome(page)
    await page.evaluate(() => window.history.back())
    await expectUnwindThenHome(page, ground)
    await page.evaluate(() => window.history.forward())
    await expect.poll(() => normalizedPathname(page.url()), { timeout: 12_000 }).toBe('/ground')
    const forwardGround = await waitForGround(page)
    await expect(forwardGround).toHaveAttribute('data-ground-input-ready', 'true', { timeout: 4_000 })
  })
})
