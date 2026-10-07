import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'

for (const viewport of [{ width: 320, height: 700 }, { width: 844, height: 390 }]) {
  test(`Founder helper stays in flow on text surfaces at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', error => pageErrors.push(error.message))
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const route of ['/about', '/support', '/status', '/location-map', '/adam']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      const launcher = page.locator('[data-urai-adam-launcher]')
      await expect(launcher).toHaveAttribute('data-adam-launcher-placement', 'inline-slot')
      await launcher.scrollIntoViewIfNeeded()
      const geometry = await launcher.evaluate(element => {
        const r = element.getBoundingClientRect()
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        const textOverlaps = [...document.querySelectorAll('main h1, main p')].filter(node => {
          const text = node.getBoundingClientRect()
          return text.width > 2 && text.height > 2 && r.left < text.right && r.right > text.left && r.top < text.bottom && r.bottom > text.top
        }).map(node => node.textContent?.trim())
        return { width: r.width, height: r.height, left: r.left, right: r.right, viewportWidth: innerWidth, position: getComputedStyle(element).position, pointerReachable: hit === element || element.contains(hit), textOverlaps }
      })
      expect(geometry.position).toBe('static')
      expect(geometry.width).toBeGreaterThanOrEqual(48)
      expect(geometry.height).toBeGreaterThanOrEqual(48)
      expect(geometry.left).toBeGreaterThanOrEqual(0)
      expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth)
      expect(geometry.pointerReachable).toBe(true)
      expect(geometry.textOverlaps, `${route} helper must not cover the page's text`).toEqual([])
      await launcher.focus()
      await page.keyboard.press('Enter')
      const about = page.getByText('About Adam', { exact: true })
      await expect(about).toBeVisible()
      expect((await about.boundingBox())!.height).toBeGreaterThanOrEqual(48)
      await about.focus()
      await page.keyboard.press('Enter')
      await expect(about.locator('..')).toHaveAttribute('open', '')
      await page.getByRole('button', { name: 'Close Adam', exact: true }).click()
      await expect(launcher).toHaveAttribute('data-adam-launcher-placement', 'inline-slot')
      expect(pageErrors, `${route} must hydrate without runtime errors`).toEqual([])
      await test.info().attach(`founder-${route.slice(1)}-${viewport.width}-geometry.json`, { body: JSON.stringify(geometry), contentType: 'application/json' })
    }
  })
}

async function assertInlineLauncher(page: Page, slot: string) {
  const launcher = page.locator('[data-urai-adam-launcher]')
  const anchor = page.locator(`[data-urai-adam-launcher-slot="${slot}"]`)
  await expect(anchor).toHaveAttribute('data-urai-adam-launcher-ready', 'true')
  await expect(anchor.locator('[data-urai-adam-launcher]')).toHaveCount(1)
  await expect(launcher).toHaveAttribute('data-adam-launcher-placement', 'inline-slot')
  await launcher.scrollIntoViewIfNeeded()
  const geometry = await launcher.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height, position: style.position, animation: style.animationName, transform: style.transform, viewportWidth: innerWidth, viewportHeight: innerHeight, reachable: hit === element || element.contains(hit) }
  })
  expect(geometry.position).toBe('static')
  expect(geometry.transform).toBe('none')
  expect(geometry.animation).toBe('none')
  expect(geometry.width).toBeGreaterThanOrEqual(48)
  expect(geometry.height).toBeGreaterThanOrEqual(48)
  expect(geometry.left).toBeGreaterThanOrEqual(0)
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1)
  expect(geometry.top).toBeGreaterThanOrEqual(0)
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1)
  expect(geometry.reachable).toBe(true)
  return { launcher, geometry }
}

async function assertCopyIsUnobstructed(copy: Locator) {
  await copy.scrollIntoViewIfNeeded()
  const geometry = await copy.evaluate(element => {
    const text = element.getBoundingClientRect()
    const launcher = document.querySelector('[data-urai-adam-launcher]')
    const button = launcher?.getBoundingClientRect()
    return { text: element.textContent, top: text.top, bottom: text.bottom, viewportHeight: innerHeight, coveredByLauncher: Boolean(button && text.left < button.right && text.right > button.left && text.top < button.bottom && text.bottom > button.top) }
  })
  expect(geometry.top).toBeGreaterThanOrEqual(-1)
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1)
  expect(geometry.coveredByLauncher, `Adam must not cover ${geometry.text}`).toBe(false)
  return geometry
}

async function exerciseKeyboardPanel(page: Page, slot: string) {
  let { launcher } = await assertInlineLauncher(page, slot)
  await launcher.focus()
  await page.keyboard.press('Enter')
  const panel = page.getByRole('complementary', { name: 'Adam founder presence' })
  const close = panel.getByRole('button', { name: 'Close Adam', exact: true })
  await expect(close).toBeFocused()
  const closeBounds = await close.boundingBox()
  expect(closeBounds!.width).toBeGreaterThanOrEqual(48)
  expect(closeBounds!.height).toBeGreaterThanOrEqual(48)
  await page.keyboard.press('Tab')
  const about = panel.getByText('About Adam', { exact: true })
  await expect(about).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(about.locator('..')).toHaveAttribute('open', '')
  await page.keyboard.press('Tab')
  await expect(panel.getByRole('textbox', { name: 'Message Adam', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(panel).toHaveCount(0)
  launcher = page.locator('[data-urai-adam-launcher]')
  await expect(launcher).toBeFocused()
  await assertInlineLauncher(page, slot)
  await page.keyboard.press('Enter')
  await expect(close).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(panel).toHaveCount(0)
  await expect(page.locator('[data-urai-adam-launcher]')).toBeFocused()
}

async function attachPlacement(page: Page, info: TestInfo, name: string, evidence: unknown) {
  await info.attach(`${name}.json`, { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' })
  await info.attach(`${name}.png`, { body: await page.screenshot(), contentType: 'image/png' })
}

const placementViewports = [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]
for (const viewport of placementViewports) {
  test(`Settings founder helper never covers privacy text at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/settings', { waitUntil: 'domcontentloaded' })
    const initial = await assertInlineLauncher(page, 'device-settings')
    const privacyCopy = page.getByText('Local sensory preferences live on this device. Private data permissions remain in the Consent Sanctuary, and ownership controls remain in Passport.', { exact: true })
    const privacy = await assertCopyIsUnobstructed(privacyCopy)
    await attachPlacement(page, info, `settings-privacy-${viewport.width}x${viewport.height}`, { launcher: initial.geometry, privacy })
    await exerciseKeyboardPanel(page, 'device-settings')
    const ownershipCopy = page.getByText('Inspect identity, ownership, export and account boundaries.', { exact: true })
    const ownership = await assertCopyIsUnobstructed(ownershipCopy)
    await attachPlacement(page, info, `settings-ownership-${viewport.width}x${viewport.height}`, { ownership })
    await assertInlineLauncher(page, 'device-settings')
    expect(errors).toEqual([])
  })

  for (const state of ['signed-out', 'demo']) {
    test(`Passport founder helper keeps every zone and deletion copy clear in ${state} at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
      test.setTimeout(60000)
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await page.setViewportSize(viewport)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(`/passport${state === 'demo' ? '?demo=1' : ''}`, { waitUntil: 'domcontentloaded' })
      const owner = page.locator('[data-route-owner="passport-ownership-vault"]')
      await expect(owner).toHaveAttribute('data-passport-source', state === 'demo' ? 'demo' : /^(signed-out|unavailable)$/)
      const initial = await assertInlineLauncher(page, 'passport-controls')
      const zones = page.getByRole('navigation', { name: 'Ownership Vault zones' }).getByRole('button')
      const zoneCount = await zones.count()
      expect(zoneCount).toBe(9)
      for (let index = 0; index < zoneCount; index++) {
        const zone = zones.nth(index)
        await zone.focus()
        await page.keyboard.press('Enter')
        await expect(zone).toHaveAttribute('aria-pressed', 'true')
      }
      await exerciseKeyboardPanel(page, 'passport-controls')
      const deletionCopy = page.getByText('Deletion is scoped, revision-safe, queued through the trusted backend, and leaves an append-only privacy-safe receipt. Provider and legal retention exceptions are disclosed rather than hidden.', { exact: true })
      const deletion = await assertCopyIsUnobstructed(deletionCopy)
      await attachPlacement(page, info, `passport-deletion-${state}-${viewport.width}x${viewport.height}`, { launcher: initial.geometry, deletion, zoneCount })
      const action = owner.getByRole('button', { name: 'Unlock and create deletion request', exact: true })
      await expect(action).toBeDisabled()
      await action.scrollIntoViewIfNeeded()
      const actionBounds = await action.boundingBox()
      expect(actionBounds!.height).toBeGreaterThanOrEqual(48)
      await attachPlacement(page, info, `passport-last-control-${state}-${viewport.width}x${viewport.height}`, { actionBounds })
      await assertInlineLauncher(page, 'passport-controls')
      expect(errors).toEqual([])
    })
  }
}

test('Passport no-WebGL keeps the founder slot and protected deletion text clear at 320px', async ({ page }, info) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: function(contextId: string, ...args: unknown[]) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(contextId)) return null
      return Reflect.apply(original, this, [contextId, ...args])
    } })
  })
  await page.setViewportSize({ width: 320, height: 568 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/passport?demo=1', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Vault controls remain available without WebGL.', { exact: true })).toBeVisible()
  const initial = await assertInlineLauncher(page, 'passport-controls')
  await exerciseKeyboardPanel(page, 'passport-controls')
  const deletion = await assertCopyIsUnobstructed(page.locator('.passportDanger > p'))
  await attachPlacement(page, info, 'passport-no-webgl-320x568', { launcher: initial.geometry, deletion })
})
