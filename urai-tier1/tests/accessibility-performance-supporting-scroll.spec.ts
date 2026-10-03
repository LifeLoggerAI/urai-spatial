import { expect, test, type Locator } from '@playwright/test'

const surfaces = [
  {
    name: 'Passport',
    path: '/passport',
    owner: '.passportVault',
    source: 'data-passport-source',
    disclosure: '.passportDisclosure',
    status: '.passportStatus',
    panel: '.passportPanel',
    navigation: '.passportZones',
    firstZone: 'Identity core',
    lastZone: 'Recovery threshold',
    firstAction: 'Enter Consent Sanctuary',
    firstActionRole: 'link',
    lastAction: 'Unlock and create deletion request',
  },
  {
    name: 'Privacy Controls',
    path: '/privacy-controls',
    owner: '.consentSanctuary',
    source: 'data-privacy-source',
    disclosure: '.consentDisclosure',
    status: '.consentStatus',
    panel: '.consentPanel',
    navigation: '.consentRealmNav',
    firstZone: 'Memory',
    lastZone: 'Identity, relationships and legacy',
    firstAction: 'Inspect receipts',
    firstActionRole: 'button',
    lastAction: 'Create deletion request',
  },
] as const

const viewports = [
  { name: '320 portrait', width: 320, height: 740 },
  { name: '844 landscape', width: 844, height: 390 },
  { name: 'short desktop', width: 1280, height: 320 },
] as const

async function assertContained(target: Locator, checkHit = true) {
  await expect(target).toBeVisible()
  const evidence = await target.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const viewport = window.visualViewport
    const left = viewport?.offsetLeft ?? 0
    const top = viewport?.offsetTop ?? 0
    const topmost = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return {
      label: element.textContent?.trim(),
      width: rect.width,
      height: rect.height,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      viewportLeft: left,
      viewportTop: top,
      viewportRight: left + (viewport?.width ?? window.innerWidth),
      viewportBottom: top + (viewport?.height ?? window.innerHeight),
      topmostOwned: topmost === element || Boolean(topmost && element.contains(topmost)),
    }
  })
  expect(evidence.left).toBeGreaterThanOrEqual(evidence.viewportLeft - 1)
  expect(evidence.right).toBeLessThanOrEqual(evidence.viewportRight + 1)
  expect(evidence.top).toBeGreaterThanOrEqual(evidence.viewportTop - 1)
  expect(evidence.bottom).toBeLessThanOrEqual(evidence.viewportBottom + 1)
  expect(evidence.width).toBeGreaterThanOrEqual(48)
  expect(evidence.height).toBeGreaterThanOrEqual(48)
  if (checkHit) expect(evidence.topmostOwned).toBe(true)
  return evidence
}

async function assertScrollOwner(owner: Locator) {
  const metrics = await owner.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      height: rect.height,
      overflowY: style.overflowY,
      viewportHeight: window.innerHeight,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }
  })
  expect(metrics.overflowY).toBe('auto')
  expect(metrics.height).toBeLessThanOrEqual(metrics.viewportHeight + 1)
  expect(metrics.height).toBeGreaterThanOrEqual(metrics.viewportHeight - 1)
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight + 48)
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1)
  return metrics
}

test.describe('Supporting routes own bounded, reachable semantic scrollboxes', () => {
  for (const surface of surfaces) {
    for (const viewport of viewports) {
      test(`${surface.name} first and last controls remain reachable in ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(`${surface.path}?demo=1`, { waitUntil: 'domcontentloaded' })
        const owner = page.locator(surface.owner)
        await expect(owner).toHaveAttribute(surface.source, 'demo')
        await expect(owner.locator(surface.disclosure)).toHaveText(/DEMONSTRATION/)
        const initial = await assertScrollOwner(owner)

        const navigation = owner.locator(surface.navigation)
        const firstZone = navigation.getByRole('button', { name: new RegExp(`^${surface.firstZone}`) })
        const lastZone = navigation.getByRole('button', { name: new RegExp(`^${surface.lastZone}`) })
        await firstZone.focus()
        await expect(firstZone).toBeFocused()
        const firstZoneEvidence = await assertContained(firstZone)
        await lastZone.focus()
        await expect(lastZone).toBeFocused()
        const lastZoneEvidence = await assertContained(lastZone)
        const navigationEvidence = await navigation.evaluate((element) => ({
          top: element.getBoundingClientRect().top,
          bottom: element.getBoundingClientRect().bottom,
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
          scrollTop: element.scrollTop,
          position: getComputedStyle(element).position,
        }))
        if (navigationEvidence.position === 'fixed') {
          expect(navigationEvidence.top).toBeGreaterThanOrEqual(0)
          expect(navigationEvidence.bottom).toBeLessThanOrEqual(viewport.height + 1)
          if (navigationEvidence.scrollHeight > navigationEvidence.clientHeight + 1) expect(navigationEvidence.scrollTop).toBeGreaterThan(0)
        }

        const firstAction = owner.getByRole(surface.firstActionRole, { name: surface.firstAction, exact: true })
        await firstAction.focus()
        await expect(firstAction).toBeFocused()
        const firstActionEvidence = await assertContained(firstAction)
        await expect.poll(async () => owner.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
        const beforeWheel = await owner.evaluate((element) => element.scrollTop)
        await firstAction.hover()
        await page.mouse.wheel(0, viewport.height * 4)
        await expect.poll(async () => owner.evaluate((element) => element.scrollTop)).toBeGreaterThan(beforeWheel)

        const lastAction = owner.getByRole('button', { name: surface.lastAction, exact: true })
        await expect(lastAction).toBeDisabled()
        await lastAction.scrollIntoViewIfNeeded()
        const lastActionEvidence = await assertContained(lastAction)
        const end = await assertScrollOwner(owner)
        expect(end.scrollHeight).toBeGreaterThan(initial.clientHeight)

        await test.info().attach(`${surface.name.toLowerCase().replaceAll(' ', '-')}-${viewport.width}x${viewport.height}-scroll.json`, {
          body: JSON.stringify({ initial, firstZoneEvidence, lastZoneEvidence, navigationEvidence, firstActionEvidence, beforeWheel, lastActionEvidence, end }, null, 2),
          contentType: 'application/json',
        })
        await test.info().attach('last-control-viewport.png', { body: await page.screenshot(), contentType: 'image/png' })
      })
    }

    test(`${surface.name} default access remains locked and cannot substitute a connected demo account`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 740 })
      await page.goto(surface.path, { waitUntil: 'domcontentloaded' })
      const owner = page.locator(surface.owner)
      await expect.poll(async () => owner.getAttribute(surface.source)).toMatch(/^(signed-out|unavailable)$/)
      await expect(owner.locator(surface.disclosure)).toHaveCount(0)
      await expect(owner.locator(surface.status)).toHaveText(/sign in|not configured|unavailable/i)
      const lastAction = owner.getByRole('button', { name: surface.lastAction, exact: true })
      await expect(lastAction).toBeDisabled()
      await lastAction.scrollIntoViewIfNeeded()
      await assertContained(lastAction)
      await assertScrollOwner(owner)
    })
  }

  test('long status text reflows within the route and does not expand its viewport scrollbox', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 })
    for (const surface of surfaces) {
      await page.goto(`${surface.path}?demo=1`, { waitUntil: 'domcontentloaded' })
      const owner = page.locator(surface.owner)
      await expect(owner).toHaveAttribute(surface.source, 'demo')
      // Layout fixture only; this is neither personal data nor a persisted policy.
      await owner.locator(surface.status).evaluate((element) => { element.textContent = 'LAYOUT-FIXTURE-ONLY-'.repeat(30) })
      await assertScrollOwner(owner)
      const textRect = await owner.locator(surface.status).evaluate((element) => ({ width: element.getBoundingClientRect().width, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }))
      expect(textRect.width).toBeLessThanOrEqual(320)
      expect(textRect.scrollWidth).toBeLessThanOrEqual(textRect.clientWidth + 1)
      const lastAction = owner.getByRole('button', { name: surface.lastAction, exact: true })
      await lastAction.scrollIntoViewIfNeeded()
      await assertContained(lastAction)
    }
  })
})
