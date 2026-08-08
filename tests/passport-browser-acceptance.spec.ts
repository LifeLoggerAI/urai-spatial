import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'
const evidenceRoot = path.resolve('test-results/passport-evidence')

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

async function openDemo(page: Page) {
  await page.goto(`${baseURL}/passport/?demo=1`, { waitUntil: 'networkidle' })
  await expect(page.locator('main[data-route-owner="passport-ownership-vault"]')).toBeVisible()
  await expect(page.getByText('DEMONSTRATION — sample data only', { exact: true })).toBeVisible()
}

test('desktop Ownership Vault exposes every zone and transition', async ({ page }) => {
  const runtime = await observe(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openDemo(page)
  for (const label of ['Identity core', 'Connected sources', 'Devices and sessions', 'Provenance archive', 'Permission history', 'Export chamber', 'Deletion chamber', 'Audit corridor', 'Recovery threshold']) {
    await expect(page.getByRole('button', { name: label })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Provenance archive' }).click()
  await expect(page.getByRole('heading', { name: 'Provenance archive' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Enter Consent Sanctuary' })).toHaveAttribute('href', '/privacy-controls')
  await page.keyboard.press('Home')
  await expect(page.locator('#passport-controls')).toBeFocused()
  await page.screenshot({ path: path.join(evidenceRoot, 'desktop-ownership-vault.png'), fullPage: true })
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
  await page.getByRole('link', { name: 'Skip to vault controls' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#passport-controls')).toBeFocused()
  await page.getByRole('button', { name: 'Audit corridor' }).click()
  await expect(page.getByRole('heading', { name: 'Audit corridor' })).toBeVisible()
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
  await expect(page.getByText('All records and actions remain available without WebGL.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Export chamber' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Deletion chamber' })).toBeVisible()
  await page.screenshot({ path: path.join(evidenceRoot, 'reduced-motion-webgl-fallback.png'), fullPage: true })
  await save('fallback-runtime', runtime)
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
