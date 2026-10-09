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
        const companionOverlaps = [...document.querySelectorAll('.urai-world-companion__orb, .urai-world-companion[data-open="true"] .urai-world-companion__menu, [data-urai-adam-launcher], [data-urai-adam-presence]')].filter(candidate => {
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
      expect(probe.companionOverlaps, `${probe.text}: companion core rectangles must be clear`).toEqual([])
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
        const companionOverlaps = [...document.querySelectorAll('.urai-world-companion__orb, .urai-world-companion[data-open="true"] .urai-world-companion__menu, [data-urai-adam-launcher], [data-urai-adam-presence]')].filter(candidate => {
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
      expect(probe.companionOverlaps, 'lower privacy copy must clear companion core rectangles').toEqual([])
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
