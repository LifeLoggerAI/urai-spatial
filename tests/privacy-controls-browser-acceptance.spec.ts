import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'
const evidenceRoot = path.resolve('test-results/privacy-controls-evidence')

type RuntimeEvidence = {
  consoleErrors: string[]
  pageErrors: string[]
  failedRequests: string[]
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

async function openDemo(page: Page) {
  await page.goto(`${baseURL}/privacy-controls/?demo=1`, { waitUntil: 'networkidle' })
  await expect(page.locator('main[data-route-owner="consent-sanctuary"]')).toBeVisible()
  await expect(page.getByText('DEMONSTRATION — no personal data', { exact: false })).toBeVisible()
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
  await page.keyboard.press('Escape')
  await expect(page.getByRole('region', { name: 'Privacy audit receipts' })).toHaveCount(0)

  await page.screenshot({ path: path.join(evidenceRoot, 'desktop-sanctuary-overview.png'), fullPage: true })
  await saveEvidence('desktop-runtime', runtime)
  expect(runtime.consoleErrors).toEqual([])
  expect(runtime.pageErrors).toEqual([])
})

test('signed-out direct entry never becomes demo or private state', async ({ page }) => {
  const runtime = await captureRuntime(page)
  await page.goto(`${baseURL}/privacy-controls/`, { waitUntil: 'networkidle' })
  const root = page.locator('main[data-route-owner="consent-sanctuary"]')
  await expect(root).toBeVisible()
  await expect(root).not.toHaveAttribute('data-privacy-source', 'demo')
  await expect(page.getByText('DEMONSTRATION — no personal data', { exact: false })).toHaveCount(0)
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
  await expect(page.getByText('Semantic controls remain fully available without WebGL.')).toBeVisible()
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
  await expect(page.getByRole('status')).toContainText('Offline')
  await expect(page.getByRole('button', { name: 'Request export' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Create deletion request' })).toBeDisabled()
  await page.screenshot({ path: path.join(evidenceRoot, 'offline-boundary.png'), fullPage: true })
  await context.setOffline(false)
  await saveEvidence('offline-runtime', runtime)
  expect(runtime.pageErrors).toEqual([])
})
