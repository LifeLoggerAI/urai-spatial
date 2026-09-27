import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'
const evidenceRoot = path.resolve('test-results/passport-evidence')

test('mobile Settings motion preference reaches loaded Home', async ({ page }) => {
  test.setTimeout(180_000)
  const runtime = await observe(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    localStorage.setItem('urai:onboarding:v2:complete', '1')
    localStorage.setItem('urai:onboarding:v3:setup-complete', '1')
  })
  try {
    await page.goto(`${baseURL}/settings/`, { waitUntil: 'domcontentloaded' })
    const motion = page.getByRole('checkbox', { name: 'Reduce motion', exact: true })
    await expect(motion).not.toBeChecked()
    await motion.focus()
    await page.keyboard.press('Space')
    await expect(motion).toBeChecked()
    for (const name of ['Reduce motion', 'Haptics', 'World audio']) {
      const target = page.getByRole('checkbox', { name, exact: true }).locator('..')
      const bounds = await target.boundingBox()
      expect(bounds).not.toBeNull()
      expect(bounds!.height).toBeGreaterThanOrEqual(48)
      expect(bounds!.width).toBeGreaterThanOrEqual(48)
    }
    await fs.mkdir(evidenceRoot, { recursive: true })
    await page.screenshot({ path: path.join(evidenceRoot, 'settings-mobile-motion.png') })
    const settings = page.locator('main[data-route-owner="device-settings"]')
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 })
      const privacy = page.getByRole('link', { name: /Permissions & consent/ })
      await privacy.scrollIntoViewIfNeeded()
      await expect(privacy).toBeInViewport()
      const metrics = await settings.evaluate(element => ({
        height: element.clientHeight, scrollHeight: element.scrollHeight,
        width: element.clientWidth, scrollWidth: element.scrollWidth,
        scrollTop: element.scrollTop, documentHeight: document.documentElement.scrollHeight,
      }))
      expect(metrics.scrollTop).toBeGreaterThan(0)
      expect(metrics.scrollHeight).toBeGreaterThan(metrics.height)
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width + 1)
      expect(metrics.documentHeight).toBeLessThanOrEqual(846)
      await page.screenshot({ path: path.join(evidenceRoot, `settings-bottom-${width}.png`) })
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('navigation', { name: 'Settings navigation' }).getByRole('link', { name: 'Home' }).click()
    const home = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    await expect(home).toHaveAttribute('data-home-assets-ready', 'true', { timeout: 60_000 })
    await expect(home).toHaveAttribute('data-home-orb-model-clip', 'stopped-reduced-motion')
    await expect(page.getByTestId('home-passport-physical-control')).toHaveAttribute('data-home-passport-reduced-motion', 'true')
    await page.screenshot({ path: path.join(evidenceRoot, 'settings-mobile-loaded-home.png') })
    expect(runtime.pageErrors).toEqual([])
  } finally {
    await save('settings-motion-runtime', runtime)
  }
})

type RuntimeEvidence = { consoleErrors: string[]; pageErrors: string[]; failedRequests: string[] }

async function observe(page: Page): Promise<RuntimeEvidence> {
  const evidence: RuntimeEvidence = { consoleErrors: [], pageErrors: [], failedRequests: [] }
  page.on('console', (message) => { if (message.type() === 'error') evidence.consoleErrors.push(message.text()) })
  page.on('pageerror', (error) => evidence.pageErrors.push(error.message))
  page.on('requestfailed', (request) => evidence.failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'unknown'}`))
  return evidence
}

async function save(name: string, evidence: RuntimeEvidence) {
  await fs.mkdir(evidenceRoot, { recursive: true })
  await fs.writeFile(path.join(evidenceRoot, `${name}.json`), JSON.stringify(evidence, null, 2))
}

async function expectPassportOwnsScroll(page: Page) {
  const metrics = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('main[data-route-owner="passport-ownership-vault"]')
    return {
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      rootClientHeight: root?.clientHeight ?? 0,
      rootScrollHeight: root?.scrollHeight ?? 0,
    }
  })
  expect(metrics.documentHeight).toBeLessThanOrEqual(metrics.viewportHeight + 2)
  expect(metrics.rootScrollHeight).toBeGreaterThan(metrics.rootClientHeight)
}

async function openDemo(page: Page) {
  await page.goto(`${baseURL}/passport/?demo=1`, { waitUntil: 'networkidle' })
  await expect(page.locator('main[data-route-owner="passport-ownership-vault"]')).toBeVisible()
  await expect(page.getByText('DEMONSTRATION — sample data only', { exact: true })).toBeVisible()
}

test('desktop Ownership Vault exposes every zone and transition', async ({ page }) => {
  const runtime = await observe(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openDemo(page)
  await page.screenshot({ path: path.join(evidenceRoot, 'desktop-initial-vault.png') })
  for (const label of ['Identity core', 'Connected sources', 'Devices and sessions', 'Provenance archive', 'Permission history', 'Export chamber', 'Deletion chamber', 'Audit corridor', 'Recovery threshold']) {
    await expect(page.getByRole('button', { name: label })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Provenance archive' }).click()
  await expect(page.getByRole('heading', { name: 'Provenance archive' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Enter Consent Sanctuary' })).toHaveAttribute('href', '/privacy-controls')
  await page.keyboard.press('Home')
  await expect(page.locator('#passport-controls')).toBeFocused()
  await expectPassportOwnsScroll(page)
  await page.screenshot({ path: path.join(evidenceRoot, 'desktop-ownership-vault.png'), fullPage: true })
  const publicGood = page.getByTestId('passport-global-emotional-field-consent')
  await publicGood.scrollIntoViewIfNeeded()
  await expect(publicGood).toBeVisible()
  await page.screenshot({ path: path.join(evidenceRoot, 'desktop-public-good-consent.png') })
  await save('desktop-runtime', runtime)
  expect(runtime.consoleErrors).toEqual([])
  expect(runtime.pageErrors).toEqual([])
})

test('signed-out entry never substitutes demo ownership data', async ({ page }) => {
  const runtime = await observe(page)
  await page.goto(`${baseURL}/passport/`, { waitUntil: 'networkidle' })
  const root = page.locator('main[data-route-owner="passport-ownership-vault"]')
  await expect(root).toBeVisible()
  await expect(root).not.toHaveAttribute('data-passport-source', 'demo')
  await expect(page.getByText('DEMONSTRATION — sample data only', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: path.join(evidenceRoot, 'signed-out-boundary.png'), fullPage: true })
  await save('signed-out-runtime', runtime)
  expect(runtime.pageErrors).toEqual([])
})

test('portrait mobile supports direct controls without spatial navigation', async ({ page }) => {
  const runtime = await observe(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await openDemo(page)
  await page.screenshot({ path: path.join(evidenceRoot, 'portrait-initial-vault.png') })
  await page.getByRole('link', { name: 'Skip to vault controls' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#passport-controls')).toBeFocused()
  await page.getByRole('button', { name: 'Audit corridor' }).click()
  await expect(page.getByRole('heading', { name: 'Audit corridor' })).toBeVisible()
  await expectPassportOwnsScroll(page)
  await page.screenshot({ path: path.join(evidenceRoot, 'portrait-mobile-vault.png'), fullPage: true })
  await save('mobile-runtime', runtime)
  expect(runtime.consoleErrors).toEqual([])
  expect(runtime.pageErrors).toEqual([])
})

test('reduced motion and WebGL fallback preserve records and actions', async ({ page }) => {
  const runtime = await observe(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === 'webgl' || type === 'webgl2') return null
      return original.call(this, type as never, ...(args as []))
    }
  })
  await openDemo(page)
  await expect(page.locator('main')).toHaveAttribute('data-passport-reduced-motion', 'true')
  await expect(page.getByText('All records and actions remain available without WebGL.')).toBeVisible()
  const fallbackNotice = page.getByTestId('passport-renderer-fallback')
  expect(await fallbackNotice.evaluate(element => Boolean(element.closest('[aria-hidden="true"]')))).toBe(false)
  const noticeBounds = await fallbackNotice.boundingBox()
  const headingBounds = await page.getByRole('heading', { level: 1 }).boundingBox()
  expect(noticeBounds).not.toBeNull()
  expect(headingBounds).not.toBeNull()
  expect(noticeBounds!.y).toBeGreaterThanOrEqual(headingBounds!.y + headingBounds!.height)
  await expect(page.getByRole('heading', { name: 'Export chamber' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Deletion chamber' })).toBeVisible()
  await page.screenshot({ path: path.join(evidenceRoot, 'reduced-motion-webgl-fallback.png'), fullPage: true })
  await save('fallback-runtime', runtime)
  expect(runtime.pageErrors).toEqual([])
})

test('review hydration and orientation changes preserve readable controls', async ({ page }) => {
  const runtime = await observe(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${baseURL}/passport/?assetReview=1&passportReview=unavailable`, { waitUntil: 'networkidle' })
  const root = page.locator('main[data-route-owner="passport-ownership-vault"]')
  await expect(root).toHaveAttribute('data-passport-review-state', 'unavailable')
  await expect(root).toHaveAttribute('data-passport-source', 'unavailable')
  await expect(page.getByText('DEMONSTRATION — sample data only', { exact: true })).toHaveCount(0)
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport)
    const controls = page.locator('#passport-controls')
    await controls.scrollIntoViewIfNeeded()
    const bounds = await controls.boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1)
    await expect(page.getByTestId('passport-return-origin')).toBeEnabled()
    await page.screenshot({ path: path.join(evidenceRoot, `review-${viewport.width}x${viewport.height}.png`) })
  }
  await save('review-orientation-runtime', runtime)
  expect(runtime.consoleErrors).toEqual([])
  expect(runtime.pageErrors).toEqual([])
})

test('offline state is explicit and sensitive operations remain disabled', async ({ page, context }) => {
  const runtime = await observe(page)
  await openDemo(page)
  await context.setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await expect(page.getByRole('status').filter({ hasText: 'Offline' })).toContainText('Offline')
  await expect(page.getByRole('button', { name: 'Unlock and request export' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Unlock and create deletion request' })).toBeDisabled()
  await page.screenshot({ path: path.join(evidenceRoot, 'offline-vault.png'), fullPage: true })
  await context.setOffline(false)
  await save('offline-runtime', runtime)
  expect(runtime.pageErrors).toEqual([])
})

test('reduced-motion Home Orb and Passport preserve keyboard origin return', async ({ page }) => {
  test.setTimeout(180_000)
  const runtime = await observe(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    localStorage.setItem('urai:onboarding:v2:complete', '1')
    localStorage.setItem('urai:onboarding:v3:setup-complete', '1')
    localStorage.removeItem('urai:onboarding:v3:setup-step')
  })
  try {
    await page.goto(`${baseURL}/home/?homeAssetReview=1`, { waitUntil: 'domcontentloaded' })
    const home = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    await expect(home).toHaveAttribute('data-home-assets-ready', 'true', { timeout: 60_000 })
    await expect(home).toHaveAttribute('data-home-stable-state', 'AVATAR_HOME_FIRST_PERSON')
    const orb = page.getByTestId('home-semantic-orb').first()
    await expect(orb).toBeEnabled({ timeout: 60_000 })
    await orb.focus()
    await orb.press('Enter')
    const menu = page.locator('#urai-world-companion-menu[aria-hidden="false"]')
    await expect(menu).toBeVisible({ timeout: 20_000 })
    const talk = menu.locator('summary').filter({ hasText: 'Talk with Orb' })
    await expect(talk).toBeVisible({ timeout: 20_000 })
    await talk.focus()
    await talk.press('Enter')
    await expect(menu.getByLabel('Message for Orb')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    await expect(orb).toBeFocused()
    const passport = page.getByTestId('home-passport-physical-control')
    await expect(passport).toHaveAttribute('data-home-passport-reduced-motion', 'true')
    await passport.focus()
    await passport.press('Enter')
    await page.waitForURL(url => url.pathname.replace(/\/+$/, '') === '/passport')
    await page.getByTestId('passport-return-origin').click()
    await page.waitForURL(url => url.pathname.replace(/\/+$/, '') === '/home')
    await expect(page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')).toHaveAttribute('data-home-stable-state', 'AVATAR_HOME_FIRST_PERSON', { timeout: 30_000 })
    await expect(home).toHaveAttribute('data-home-assets-ready', 'true', { timeout: 60_000 })
    // Home's WebGL warm-up can block the browser main thread for >5s even after
    // the ready attributes settle. Keep the strict null predicate, but give the
    // storage read enough time to return under that measured render stall.
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('urai:home:return-frame:v1')), { timeout: 15_000 }).toBeNull()
    expect(runtime.pageErrors).toEqual([])
  } finally {
    await fs.mkdir(evidenceRoot, { recursive: true })
    await save('reduced-orb-runtime', runtime)
    const controls = await page.locator('#urai-world-companion-menu, #urai-world-companion-menu summary').evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element), bounds = element.getBoundingClientRect()
      return { tag: element.tagName, text: element.tagName === 'SUMMARY' ? element.textContent : null, hidden: element.getAttribute('aria-hidden'), display: style.display, visibility: style.visibility, opacity: style.opacity, width: bounds.width, height: bounds.height }
    }))
    await fs.writeFile(path.join(evidenceRoot, 'reduced-orb-controls.json'), JSON.stringify(controls, null, 2))
    await page.screenshot({ path: path.join(evidenceRoot, 'reduced-orb-keyboard.png'), timeout: 30_000 })
  }
})
