import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'
const evidenceRoot = path.resolve('test-results/privacy-controls-evidence')

test.setTimeout(60_000)

type RuntimeEvidence = {
  consoleErrors: string[]
  pageErrors: string[]
  failedRequests: string[]
  expectedOfflineFailures?: string[]
  unexpectedOfflineFailures?: string[]
  auditEscape?: {
    exactSha: string | null
    expectedURL: string
    browserAnimationFrames: number
    afterDismissal: SanctuaryReadback
    afterCapture: SanctuaryReadback
    screenshot: { path: string; bytes: number; sha256: string }
  }
}

type SanctuaryReadback = {
  url: string
  routeOwner: string | null
  privacySource: string | null
  destination: string | null
  transition: string | null
  loadingRoots: number
  auditPanels: number
}

async function captureRuntime(page: Page): Promise<RuntimeEvidence> {
  const evidence: RuntimeEvidence = { consoleErrors: [], pageErrors: [], failedRequests: [] }
  page.on('console', (message) => {
    if (message.type() === 'error') evidence.consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => evidence.pageErrors.push(error.message))
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText || 'unknown failure'
    evidence.failedRequests.push(`${request.method()} ${request.url()} :: ${failure}`)
  })
  return evidence
}

async function saveEvidence(name: string, evidence: RuntimeEvidence) {
  await fs.mkdir(evidenceRoot, { recursive: true })
  await fs.writeFile(path.join(evidenceRoot, `${name}.json`), JSON.stringify(evidence, null, 2))
}

async function openSanctuary(page: Page, suffix = '') {
  const response = await page.goto(`${baseURL}/privacy-controls/${suffix}`, {
    waitUntil: 'domcontentloaded',
    timeout: 45_000,
  })
  expect(response?.ok()).toBeTruthy()
  const root = page.locator('main[data-route-owner="consent-sanctuary"]')
  await expect(root).toBeVisible({ timeout: 20_000 })
  await page.waitForFunction(() => document.readyState !== 'loading')
  // Route semantics may become interactive before Next's visual loading boundary has
  // actually left the viewport. Retained sanctuary pixels must prove the settled
  // sanctuary, never a mislabeled global loading frame.
  await expect(page.locator('main.urai-system-state')).toHaveCount(0, { timeout: 20_000 })
  return root
}

async function openDemo(page: Page) {
  await openSanctuary(page, '?demo=1')
  await expect(page.getByText('DEMONSTRATION — no personal data', { exact: true })).toBeVisible()
}

async function assertSettledSanctuary(page: Page, expectedURL: string): Promise<SanctuaryReadback> {
  const root = page.locator('main[data-route-owner="consent-sanctuary"]')
  const world = page.getByTestId('urai-persistent-world-shell')
  await expect(page).toHaveURL(expectedURL)
  await expect(root).toBeVisible()
  await expect(root).toHaveAttribute('data-privacy-source', 'demo')
  await expect(world).toHaveAttribute('data-world-destination', 'privacy-controls')
  await expect(world).toHaveAttribute('data-world-transition', 'idle')
  await expect(page.locator('main.urai-system-state')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Privacy audit receipts' })).toHaveCount(0)
  const readback = await page.evaluate(() => {
    const root = document.querySelector('main[data-route-owner="consent-sanctuary"]')
    const world = document.querySelector('[data-testid="urai-persistent-world-shell"]')
    return {
      url: window.location.href,
      routeOwner: root?.getAttribute('data-route-owner') ?? null,
      privacySource: root?.getAttribute('data-privacy-source') ?? null,
      destination: world?.getAttribute('data-world-destination') ?? null,
      transition: world?.getAttribute('data-world-transition') ?? null,
      loadingRoots: document.querySelectorAll('main.urai-system-state').length,
      auditPanels: document.querySelectorAll('[aria-label="Privacy audit receipts"]').length,
    }
  })
  expect(readback).toEqual({
    url: expectedURL,
    routeOwner: 'consent-sanctuary',
    privacySource: 'demo',
    destination: 'privacy-controls',
    transition: 'idle',
    loadingRoots: 0,
    auditPanels: 0,
  })
  return readback
}

function classifyOfflineFailures(runtime: RuntimeEvidence) {
  const expectedPageErrors = runtime.pageErrors.filter((message) => message === 'Failed to fetch')
  const unexpectedPageErrors = runtime.pageErrors.filter((message) => message !== 'Failed to fetch')
  const expectedRequestFailures = runtime.failedRequests.filter((request) => (
    request.includes('cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver')
    && request.includes('net::ERR_INTERNET_DISCONNECTED')
  ))
  const unexpectedRequestFailures = runtime.failedRequests.filter((request) => !(
    request.includes('cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver')
    && request.includes('net::ERR_INTERNET_DISCONNECTED')
  ))

  runtime.expectedOfflineFailures = [...expectedPageErrors, ...expectedRequestFailures]
  runtime.unexpectedOfflineFailures = [...unexpectedPageErrors, ...unexpectedRequestFailures]
}

test('desktop demo exposes all domains and direct keyboard controls', async ({ page }) => {
  const runtime = await captureRuntime(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openDemo(page)

  const domains = ['Memory', 'Location', 'Models', 'Exports and sharing', 'Workforce and actions', 'Identity, relationships and legacy']
  for (const domain of domains) await expect(page.getByRole('button', { name: new RegExp(domain, 'i') })).toBeVisible()

  await page.getByRole('button', { name: /Location/i }).click()
  await expect(page.getByRole('region', { name: /Location controls/i })).toBeVisible()
  await page.keyboard.press('Home')
  await expect(page.getByRole('region', { name: /Memory controls/i })).toBeFocused()

  await page.getByRole('button', { name: 'Inspect receipts' }).click()
  await expect(page.getByRole('region', { name: 'Privacy audit receipts' })).toBeVisible()
  const sanctuaryURL = page.url()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('region', { name: 'Privacy audit receipts' })).toHaveCount(0)
  // Escape must dismiss this realm's panel without scheduling global reverse travel.
  // Browser animation frames allow React to commit; they are not GPU-frame proof.
  await page.evaluate(async () => {
    for (let frame = 0; frame < 4; frame += 1) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    }
  })
  const afterDismissal = await assertSettledSanctuary(page, sanctuaryURL)

  const screenshotPath = path.join(evidenceRoot, 'desktop-sanctuary-overview.png')
  const screenshot = await page.screenshot({ path: screenshotPath, fullPage: true })
  const afterCapture = await assertSettledSanctuary(page, sanctuaryURL)
  runtime.auditEscape = {
    exactSha: process.env.EXACT_HEAD_SHA ?? null,
    expectedURL: sanctuaryURL,
    browserAnimationFrames: 4,
    afterDismissal,
    afterCapture,
    screenshot: { path: screenshotPath, bytes: screenshot.length, sha256: createHash('sha256').update(screenshot).digest('hex') },
  }
  await saveEvidence('desktop-runtime', runtime)
  expect(runtime.consoleErrors).toEqual([])
  expect(runtime.pageErrors).toEqual([])
})

test('signed-out direct entry never becomes demo or private state', async ({ page }) => {
  const runtime = await captureRuntime(page)
  const root = await openSanctuary(page)
  await expect(root).not.toHaveAttribute('data-privacy-source', 'demo')
  await expect(root).toHaveAttribute('data-privacy-source', /^(signed-out|unavailable)$/)
  await expect(root).not.toContainText('fully-enforced')
  await expect(page.getByRole('button', { name: 'Request export' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Create deletion request' })).toBeDisabled()
  await expect(page.getByText('DEMONSTRATION — no personal data', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: path.join(evidenceRoot, 'signed-out-boundary.png'), fullPage: true })
  await saveEvidence('signed-out-runtime', runtime)
  expect(runtime.pageErrors).toEqual([])
})

test('portrait mobile remains usable without spatial movement', async ({ page }) => {
  const runtime = await captureRuntime(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await openDemo(page)
  const skip = page.getByRole('link', { name: 'Skip to direct controls' })
  await skip.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('region', { name: /Memory controls/i })).toBeFocused()
  await expect(page.getByRole('button', { name: /Models/i })).toBeVisible()
  await page.screenshot({ path: path.join(evidenceRoot, 'portrait-mobile-controls.png'), fullPage: true })
  await saveEvidence('mobile-runtime', runtime)
  expect(runtime.consoleErrors).toEqual([])
  expect(runtime.pageErrors).toEqual([])
})

test('settled mobile privacy navigation controls remain unobscured by the persistent companion', async ({ page }) => {
  const runtime = await captureRuntime(page)
  const layouts: unknown[] = []
  const viewports = [
    { width: 320, height: 568 },
    { width: 320, height: 700 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
  ]

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await openDemo(page)
    const expectedURL = page.url()
    await assertSettledSanctuary(page, expectedURL)
    await page.evaluate(async () => {
      for (let frame = 0; frame < 4; frame += 1) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      }
    })
    const settled = await assertSettledSanctuary(page, expectedURL)
    const buttons = page.locator('.consentRealmNav button')
    await expect(buttons).toHaveCount(6)

    const companionLayout = await page.evaluate(() => {
      const shell = document.querySelector('[data-testid="urai-persistent-world-shell"]')
      const companion = document.querySelector('.urai-world-companion')
      const orb = document.querySelector('.urai-world-companion__orb')
      const box = orb?.getBoundingClientRect()
      const style = companion ? getComputedStyle(companion) : null
      return {
        destination: shell?.getAttribute('data-world-destination') ?? null,
        transition: shell?.getAttribute('data-world-transition') ?? null,
        companionPosition: style?.position ?? null,
        companionLeft: style?.left ?? null,
        companionRight: style?.right ?? null,
        companionTop: style?.top ?? null,
        companionBottom: style?.bottom ?? null,
        companionWidth: style?.width ?? null,
        companionTransform: style?.transform ?? null,
        orbBox: box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null,
      }
    })

    const headerSurfaces = await page.locator('.consentHeader > p, .consentHeader h1, .consentHeader .consentStatus, .consentHeader .consentDisclosure').evaluateAll(elements => {
      const orb = document.querySelector('.urai-world-companion__orb')
      const rect = orb?.getBoundingClientRect()
      const halo = rect ? { left: rect.left - 17, right: rect.right + 17, top: rect.top - 17, bottom: rect.bottom + 17 } : null
      return elements.map(element => {
        const target = element as HTMLElement
        const textRects: DOMRect[] = []
        if (target.matches('p,h1')) {
          const range = document.createRange()
          range.selectNodeContents(target)
          textRects.push(...Array.from(range.getClientRects()))
        } else {
          textRects.push(target.getBoundingClientRect())
        }
        const overlaps = halo ? textRects.some(box => box.width > 0 && box.height > 0
          && box.left < halo.right && box.right > halo.left && box.top < halo.bottom && box.bottom > halo.top) : false
        return { surface: target.className || target.tagName, text: target.textContent, overlapsOrbHalo: overlaps }
      })
    })

    const initial = await buttons.evaluateAll(elements => {
      const overlays = '.consentSanctuary > .consentOrb, .urai-world-companion__orb, .urai-world-companion[data-open="true"] .urai-world-companion__menu, [data-urai-adam-launcher], [data-urai-adam-presence]'
      return elements.map(element => {
        const rect = element.getBoundingClientRect()
        const onScreen = rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= window.innerHeight
        const companionOverlaps = onScreen ? [...document.querySelectorAll(overlays)].filter(candidate => {
          for (let node: Element | null = candidate; node; node = node.parentElement) {
            const style = getComputedStyle(node)
            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
          }
          const paint = candidate.getBoundingClientRect()
          const halo = candidate.matches('.urai-world-companion__orb')
            ? { left: paint.left - 17, right: paint.right + 17, top: paint.top - 17, bottom: paint.bottom + 17 }
            : paint
          return halo.left < rect.right && halo.right > rect.left && halo.top < rect.bottom && halo.bottom > rect.top
        }).map(candidate => candidate.className || candidate.tagName) : []
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const hit = centerX >= 0 && centerX <= window.innerWidth && centerY >= 0 && centerY <= window.innerHeight
          ? document.elementFromPoint(centerX, centerY)
          : null
        return { text: element.textContent, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
          onScreen, centerOwned: !onScreen || hit === element || element.contains(hit), companionOverlaps }
      })
    })
    const initialVisible = initial.filter(button => button.onScreen)
    const blocked = initialVisible.filter(button => !button.centerOwned || button.companionOverlaps.length > 0)
    const directControlOcclusions = await page.locator(
      'main[data-route-owner="consent-sanctuary"] button, main[data-route-owner="consent-sanctuary"] a[href], main[data-route-owner="consent-sanctuary"] input, main[data-route-owner="consent-sanctuary"] select, main[data-route-owner="consent-sanctuary"] textarea',
    ).evaluateAll(elements => {
      const overlays = '.consentSanctuary > .consentOrb, .urai-world-companion__orb, .urai-world-companion[data-open="true"] .urai-world-companion__menu, [data-urai-adam-launcher], [data-urai-adam-presence]'
      return elements.flatMap(element => {
        const target = element as HTMLElement
        const rect = target.getBoundingClientRect()
        const fullyVisible = rect.width > 0 && rect.height > 0 && rect.left >= 0
          && rect.right <= window.innerWidth && rect.top >= 0 && rect.bottom <= window.innerHeight
        if (!fullyVisible) return []
        const companionOverlaps = [...document.querySelectorAll(overlays)].filter(candidate => {
          for (let node: Element | null = candidate; node; node = node.parentElement) {
            const style = getComputedStyle(node)
            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
          }
          const paint = candidate.getBoundingClientRect()
          const halo = candidate.matches('.urai-world-companion__orb')
            ? { left: paint.left - 17, right: paint.right + 17, top: paint.top - 17, bottom: paint.bottom + 17 }
            : paint
          return halo.left < rect.right && halo.right > rect.left && halo.top < rect.bottom && halo.bottom > rect.top
        }).map(candidate => candidate.className || candidate.tagName)
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const hit = document.elementFromPoint(centerX, centerY)
        return [{
          tag: target.tagName.toLowerCase(),
          label: (target.getAttribute('aria-label') || target.textContent || '').trim().slice(0, 80),
          bounds: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
          centerOwned: hit === target || target.contains(hit),
          companionOverlaps,
        }]
      })
    })
    const blockedDirectControls = directControlOcclusions.filter(control => !control.centerOwned || control.companionOverlaps.length > 0)
    layouts.push({ viewport, settled, companionLayout, headerSurfaces, initialVisible, directControlOcclusions })
    await page.screenshot({
      path: path.join(evidenceRoot, 'mobile-settled-nav-' + viewport.width + 'x' + viewport.height + '.png'),
      fullPage: false,
    })
    await fs.writeFile(path.join(evidenceRoot, 'mobile-settled-nav-geometry.json'), JSON.stringify({
      exactSha: process.env.EXACT_HEAD_SHA ?? null,
      scope: 'synthetic-demo-settled-responsive-navigation-only',
      layouts,
    }, null, 2))
    expect(initialVisible.length).toBeGreaterThan(0)
    expect(headerSurfaces.filter(surface => surface.overlapsOrbHalo),
      viewport.width + 'x' + viewport.height + ': visible header copy must clear the companion').toEqual([])
    expect(blocked,
      viewport.width + 'x' + viewport.height + ': visible domain navigation must clear the companion; geometry=' + JSON.stringify(companionLayout)).toEqual([])
    expect(blockedDirectControls,
      viewport.width + 'x' + viewport.height + ': every fully visible consent control must clear the companion').toEqual([])

    const scrolled: unknown[] = []
    for (const button of await buttons.all()) {
      await button.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }))
      await expect(button).toBeVisible()
      const probe = await button.evaluate(element => {
        const target = element as HTMLElement
        const rect = target.getBoundingClientRect()
        const overlays = '.consentSanctuary > .consentOrb, .urai-world-companion__orb, .urai-world-companion[data-open="true"] .urai-world-companion__menu, [data-urai-adam-launcher], [data-urai-adam-presence]'
        const companionOverlaps = [...document.querySelectorAll(overlays)].filter(candidate => {
          for (let node: Element | null = candidate; node; node = node.parentElement) {
            const style = getComputedStyle(node)
            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
          }
          const paint = candidate.getBoundingClientRect()
          const halo = candidate.matches('.urai-world-companion__orb')
            ? { left: paint.left - 17, right: paint.right + 17, top: paint.top - 17, bottom: paint.bottom + 17 }
            : paint
          return halo.left < rect.right && halo.right > rect.left && halo.top < rect.bottom && halo.bottom > rect.top
        }).map(candidate => candidate.className || candidate.tagName)
        const samples = [[0.1, 0.1], [0.9, 0.1], [0.5, 0.5], [0.1, 0.9], [0.9, 0.9]].map(([x, y]) => {
          const hit = document.elementFromPoint(rect.left + rect.width * x, rect.top + rect.height * y)
          return { x, y, owned: hit === target || target.contains(hit) }
        })
        return { text: target.textContent, width: rect.width, height: rect.height,
          top: rect.top, bottom: rect.bottom, samples, companionOverlaps }
      })
      expect(probe.width, probe.text + ': navigation target width').toBeGreaterThanOrEqual(48)
      expect(probe.height, probe.text + ': navigation target height').toBeGreaterThanOrEqual(48)
      expect(probe.top).toBeGreaterThanOrEqual(0)
      expect(probe.bottom).toBeLessThanOrEqual(viewport.height)
      expect(probe.samples.every(sample => sample.owned), probe.text + ': painted navigation target must be unobscured').toBe(true)
      expect(probe.companionOverlaps, probe.text + ': companion visual halo must be clear').toEqual([])
      scrolled.push(probe)
    }

    layouts[layouts.length - 1] = { viewport, settled, companionLayout, headerSurfaces, initialVisible, directControlOcclusions, scrolled }
    await fs.writeFile(path.join(evidenceRoot, 'mobile-settled-nav-geometry.json'), JSON.stringify({
      exactSha: process.env.EXACT_HEAD_SHA ?? null,
      scope: 'synthetic-demo-settled-responsive-navigation-only',
      layouts,
    }, null, 2))
  }

  await saveEvidence('mobile-settled-nav-runtime', runtime)
  expect(runtime.consoleErrors).toEqual([])
  expect(runtime.pageErrors).toEqual([])
})

test('narrow direct controls and lower privacy copy remain reachable above the companion', async ({ page }) => {
  const runtime = await captureRuntime(page)
  const surfaces: unknown[] = []
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport)
    const root = await openSanctuary(page, '?demo=1')
    const panel = page.getByRole('region', { name: /Memory controls/i })
    const controls = panel.locator('button:not(:disabled), a, select:not(:disabled), input:not(:disabled)')
    expect(await controls.count()).toBeGreaterThanOrEqual(3)
    for (const control of await controls.all()) {
      await control.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }))
      await control.focus()
      await expect(control).toBeFocused()
      const probe = await control.evaluate(element => {
        const rect = element.getBoundingClientRect()
        const companionOverlaps = [...document.querySelectorAll('.consentSanctuary > .consentOrb, .urai-world-companion__orb, .urai-world-companion[data-open="true"] .urai-world-companion__menu, [data-urai-adam-launcher], [data-urai-adam-presence]')].filter(candidate => {
          for (let node: Element | null = candidate; node; node = node.parentElement) {
            const style = getComputedStyle(node)
            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
          }
          const paint = candidate.getBoundingClientRect()
          return paint.width > 0 && paint.height > 0 && rect.left < paint.right && rect.right > paint.left && rect.top < paint.bottom && rect.bottom > paint.top
        }).map(candidate => candidate.className || candidate.tagName)
        const samples = [[0.1, 0.1], [0.9, 0.1], [0.5, 0.5], [0.1, 0.9], [0.9, 0.9]].map(([x, y]) => {
          const hit = document.elementFromPoint(rect.left + rect.width * x, rect.top + rect.height * y)
          return { x, y, owned: hit === element || element.contains(hit) }
        })
        return { text: element.textContent, width: rect.width, height: rect.height,
          top: rect.top, bottom: rect.bottom, samples, companionOverlaps }
      })
      expect(probe.width, `${probe.text}: target width`).toBeGreaterThanOrEqual(48)
      expect(probe.height, `${probe.text}: target height`).toBeGreaterThanOrEqual(48)
      expect(probe.top).toBeGreaterThanOrEqual(0)
      expect(probe.bottom).toBeLessThanOrEqual(viewport.height)
      expect(probe.samples.every(sample => sample.owned), `${probe.text}: painted target must be unobscured`).toBe(true)
      expect(probe.companionOverlaps, `${probe.text}: privacy and persistent companion overlays must be clear`).toEqual([])
      surfaces.push({ viewport, control: probe })
    }
    for (const copy of [
      panel.getByText('Choose scope. Tokens, credentials, raw secret fields and legally excepted records are excluded.', { exact: true }),
      panel.getByText('Completion is shown only after the trusted deletion job confirms it. Append-only evidence and required security/legal records may remain.', { exact: true }),
    ]) {
      await copy.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }))
      await expect(copy).toBeVisible()
      const probe = await copy.evaluate(element => {
        const rect = element.getBoundingClientRect()
        const companionOverlaps = [...document.querySelectorAll('.consentSanctuary > .consentOrb, .urai-world-companion__orb, .urai-world-companion[data-open="true"] .urai-world-companion__menu, [data-urai-adam-launcher], [data-urai-adam-presence]')].filter(candidate => {
          for (let node: Element | null = candidate; node; node = node.parentElement) {
            const style = getComputedStyle(node)
            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
          }
          const paint = candidate.getBoundingClientRect()
          return paint.width > 0 && paint.height > 0 && rect.left < paint.right && rect.right > paint.left && rect.top < paint.bottom && rect.bottom > paint.top
        }).map(candidate => candidate.className || candidate.tagName)
        const points = [[0.05, 0.1], [0.95, 0.1], [0.5, 0.5], [0.05, 0.9], [0.95, 0.9]].map(([x, y]) => {
          const hit = document.elementFromPoint(rect.left + rect.width * x, rect.top + rect.height * y)
          return { x, y, owned: hit === element || element.contains(hit) }
        })
        return { text: element.textContent, left: rect.left, right: rect.right,
          top: rect.top, bottom: rect.bottom, points, companionOverlaps }
      })
      expect(probe.left).toBeGreaterThanOrEqual(0)
      expect(probe.right).toBeLessThanOrEqual(viewport.width)
      expect(probe.top).toBeGreaterThanOrEqual(0)
      expect(probe.bottom).toBeLessThanOrEqual(viewport.height)
      expect(probe.points.every(point => point.owned), 'lower privacy copy must be painted above any companion').toBe(true)
      expect(probe.companionOverlaps, 'lower privacy copy must clear privacy and persistent companion overlays').toEqual([])
      surfaces.push({ viewport, copy: probe })
    }
    await expect(root).toHaveAttribute('data-privacy-source', 'demo')
    await expect(page.getByRole('button', { name: 'Request export' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Create deletion request' })).toBeDisabled()
    await page.screenshot({ path: path.join(evidenceRoot, `mobile-lower-copy-${viewport.width}x${viewport.height}.png`) })
  }
  await fs.writeFile(path.join(evidenceRoot, 'mobile-surface-geometry.json'), JSON.stringify({
    exactSha: process.env.EXACT_HEAD_SHA ?? null, surfaces,
    scope: 'disclosed-demo-native-scroll-focus-and-painted-surface-only',
  }, null, 2))
  await saveEvidence('mobile-lower-runtime', runtime)
  expect(runtime.consoleErrors).toEqual([])
  expect(runtime.pageErrors).toEqual([])
})

test('narrow sanctuary isolates its title from world labels and keeps the enforcement surface below controls', async ({ page }) => {
  const runtime = await captureRuntime(page)
  const layouts: unknown[] = []
  const viewports = [
    { width: 320, height: 700 },
    { width: 320, height: 568 },
    { width: 390, height: 844 },
  ]

  for (const [index, viewport] of viewports.entries()) {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: index === 2 ? 'reduce' : 'no-preference' })
    const root = await openSanctuary(page, '?demo=1')
    const geometry = await page.evaluate(exactSha => {
      const root = document.querySelector<HTMLElement>('main[data-route-owner="consent-sanctuary"]')!
      const header = root.querySelector<HTMLElement>('.consentHeader')!
      const nav = root.querySelector<HTMLElement>('.consentRealmNav')!
      const panel = root.querySelector<HTMLElement>('.consentPanel')!
      const orb = root.querySelector<HTMLElement>('.consentOrb')!
      const rootRect = root.getBoundingClientRect()
      const layoutTop = (element: HTMLElement) => element.getBoundingClientRect().top - rootRect.top + root.scrollTop
      const headerRect = header.getBoundingClientRect()
      const navRect = nav.getBoundingClientRect()
      const backgroundAlpha = (color: string) => {
        const channels = color.match(/[\d.]+/g) ?? []
        return channels.length >= 4 ? Number(channels[3]) : 1
      }
      const panelBottom = layoutTop(panel) + panel.getBoundingClientRect().height
      const orbTop = layoutTop(orb)
      return {
        exactSha,
        width: window.innerWidth,
        height: window.innerHeight,
        headerBottom: headerRect.bottom,
        navTop: navRect.top,
        navColumnCount: getComputedStyle(nav).gridTemplateColumns.trim().split(/\s+/).length,
        realmButtonBackgroundAlpha: backgroundAlpha(getComputedStyle(nav.querySelector('button')!).backgroundColor),
        panelBackgroundAlpha: backgroundAlpha(getComputedStyle(panel).backgroundColor),
        headerBackgroundImage: getComputedStyle(header).backgroundImage,
        realmButtons: [...nav.querySelectorAll('button')].map(button => {
          const rect = button.getBoundingClientRect()
          return { text: button.textContent?.trim() ?? '', left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }
        }),
        panelBottom,
        orbTop,
        panelOrbGap: orbTop - panelBottom,
      }
    }, process.env.EXACT_HEAD_SHA ?? null)

    expect(geometry.headerBackgroundImage).toContain('linear-gradient')
    expect(geometry.navTop).toBeGreaterThanOrEqual(geometry.headerBottom)
    expect(geometry.panelOrbGap, `${viewport.width}x${viewport.height}: enforcement status must follow, not cover, consent controls`).toBeGreaterThanOrEqual(0)
    expect(geometry.navColumnCount).toBe(viewport.width <= 340 ? 1 : 2)
    expect(geometry.realmButtonBackgroundAlpha).toBeGreaterThanOrEqual(0.97)
    expect(geometry.panelBackgroundAlpha).toBeGreaterThanOrEqual(0.97)
    expect(geometry.realmButtons).toHaveLength(6)
    for (const button of geometry.realmButtons) {
      expect(button.left, `${button.text}: horizontal viewport bounds`).toBeGreaterThanOrEqual(0)
      expect(button.right, `${button.text}: horizontal viewport bounds`).toBeLessThanOrEqual(viewport.width)
      expect(button.width, `${button.text}: usable width`).toBeGreaterThanOrEqual(48)
      expect(button.height, `${button.text}: usable height`).toBeGreaterThanOrEqual(48)
    }

    layouts.push(geometry)
    await expect(root).toHaveAttribute('data-privacy-source', 'demo')
    await expect(page.getByRole('button', { name: 'Request export' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Create deletion request' })).toBeDisabled()
    await page.screenshot({ path: path.join(evidenceRoot, `mobile-layout-initial-${viewport.width}x${viewport.height}.png`) })
  }

  await fs.writeFile(path.join(evidenceRoot, 'mobile-layout-geometry.json'), JSON.stringify({
    exactSha: process.env.EXACT_HEAD_SHA ?? null,
    layouts,
    scope: 'synthetic-explicit-demo-responsive-layout-only',
  }, null, 2))
  await saveEvidence('mobile-layout-runtime', runtime)
  expect(runtime.consoleErrors).toEqual([])
  expect(runtime.pageErrors).toEqual([])
})

test('reduced motion and WebGL fallback preserve the complete semantic surface', async ({ page }) => {
  const runtime = await captureRuntime(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === 'webgl' || type === 'webgl2') return null
      return original.call(this, type as never, ...(args as []))
    }
  })
  await openDemo(page)
  const fallbackNotice = page.getByRole('note').filter({ hasText: 'Semantic controls remain fully available without WebGL.' })
  await expect(fallbackNotice).toBeVisible()
  await expect(page.locator('.consentWorldFallback')).toHaveText('')
  expect(await fallbackNotice.evaluate(element => element.closest('[aria-hidden="true"]') === null)).toBe(true)
  const titleBox = await page.getByRole('heading', { level: 1 }).boundingBox()
  const noticeBox = await fallbackNotice.boundingBox()
  expect(titleBox).not.toBeNull()
  expect(noticeBox).not.toBeNull()
  expect(noticeBox!.y).toBeGreaterThanOrEqual(titleBox!.y + titleBox!.height)
  await expect(page.getByRole('region', { name: /Memory controls/i })).toBeVisible()
  await page.screenshot({ path: path.join(evidenceRoot, 'reduced-motion-webgl-fallback.png'), fullPage: true })
  await saveEvidence('fallback-runtime', runtime)
  expect(runtime.pageErrors).toEqual([])
})

test('offline transition is explicit and disables sensitive operations', async ({ page, context }) => {
  const runtime = await captureRuntime(page)
  await openDemo(page)
  await context.setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await expect(page.getByRole('status').filter({ hasText: 'Offline' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Request export' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Create deletion request' })).toBeDisabled()
  await page.screenshot({ path: path.join(evidenceRoot, 'offline-boundary.png'), fullPage: true })
  await context.setOffline(false)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(page.locator('[data-route-owner="consent-sanctuary"]')).toHaveAttribute('data-privacy-source', 'demo')
  await expect(page.getByRole('status').filter({ hasText: 'DEMONSTRATION' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Request export' })).toBeDisabled()

  classifyOfflineFailures(runtime)
  await saveEvidence('offline-runtime', runtime)

  expect(runtime.consoleErrors).toEqual([])
  expect(runtime.unexpectedOfflineFailures).toEqual([])
  expect(runtime.pageErrors.length).toBeLessThanOrEqual(1)
  expect(runtime.failedRequests.length).toBeLessThanOrEqual(1)
})
