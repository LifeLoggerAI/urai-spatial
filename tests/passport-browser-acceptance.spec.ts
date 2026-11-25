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
  const panel = page.locator('#passport-controls')
  await expect(panel).toContainText('Owner reference sample-owner')
  await expect(panel).toContainText(/Ownership:\s*verified/)
  await expect(panel).toContainText(/Consent revision:\s*4/)
  await page.getByRole('button', { name: 'Connected sources' }).click()
  await expect(panel.getByRole('heading', { name: 'Sample phone capture', exact: true })).toBeVisible()
  await expect(panel.getByRole('heading', { name: 'Sample calendar connection', exact: true })).toBeVisible()
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

test('initial vault markup waits for access without presenting sample records', async ({ browser }) => {
  const page = await browser.newPage({ javaScriptEnabled: false })
  try {
    await page.goto(`${baseURL}/passport/`)
    const vault = page.locator('main[data-route-owner="passport-ownership-vault"]')
    await expect(vault).toHaveAttribute('data-passport-source', 'loading')
    await expect(vault).toHaveAttribute('data-key-state', 'locked')
    await expect(vault).not.toContainText(/sample-owner|ownership:\s*verified|consent revision:|fully-enforced/i)
    await expect(vault.locator('.passportRows article')).toHaveCount(0)
  } finally {
    await page.close()
  }
})

test('signed-out entry never substitutes demo ownership data', async ({ page, context }) => {
  const runtime = await observe(page)
  await page.goto(`${baseURL}/passport/`, { waitUntil: 'networkidle' })
  const root = page.locator('main[data-route-owner="passport-ownership-vault"]')
  await expect(root).toBeVisible()
  await expect(root).toHaveAttribute('data-passport-source', /^(signed-out|unavailable)$/)
  await expect(root).toHaveAttribute('data-key-state', 'locked')
  await expect(root).not.toContainText(/sample-owner|ownership:\s*verified|consent revision:|fully-enforced/i)
  await expect(page.getByText('DEMONSTRATION — sample data only', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Connected sources' }).click()
  await expect(root.locator('.passportRows article')).toHaveCount(0)
  await expect(root).not.toContainText(/sample phone|sample calendar|no owner-scoped records exist/i)
  await expect(root.getByRole('button', { name: 'Unlock and request export' })).toBeDisabled()
  await expect(root.getByRole('button', { name: 'Unlock and create deletion request' })).toBeDisabled()
  const entryState = await root.getAttribute('data-passport-source')
  for (const offline of [true, false]) {
    await context.setOffline(offline)
    await page.evaluate((offline) => window.dispatchEvent(new Event(offline ? 'offline' : 'online')), offline)
    await expect(root).toHaveAttribute('data-passport-source', entryState!)
    await expect(root.locator('.passportRows article')).toHaveCount(0)
    await expect(root).not.toContainText(/last server snapshot|refreshing owner authority/i)
  }
  await page.screenshot({ path: path.join(evidenceRoot, 'signed-out-boundary.png'), fullPage: true })
  await save('signed-out-runtime', runtime)
  expect(runtime.pageErrors).toEqual([])
})

test('authenticated canonical review shows an unavailable operational vault and keeps the exits usable', async ({ page, context }) => {
  test.skip(process.env.NEXT_PUBLIC_URAI_CANONICAL_PRIVACY_LAB !== 'true' ||
    process.env.NEXT_PUBLIC_URAI_PRIVACY_CONTRACT !== 'canonical-v1' ||
    !['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname), 'Requires the disposable local Firebase canonical review.')
  await page.goto(`${baseURL}/privacy-canonical-lab`)
  await page.getByRole('button', { name: 'Create disposable local test account' }).click()
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeEnabled()

  await page.goto(`${baseURL}/passport/`)
  const vault = page.locator('main[data-route-owner="passport-ownership-vault"]')
  await expect(vault).toHaveAttribute('data-passport-source', 'unavailable')
  await expect(vault.locator('.passportStatus')).toContainText('vault service is unavailable')
  await expect(vault).not.toContainText(/sample-owner|ownership:\s*verified|consent revision:|fully-enforced/i)
  await page.getByRole('button', { name: 'Connected sources' }).click()
  await expect(vault.locator('.passportRows article')).toHaveCount(0)
  await expect(vault.getByRole('button', { name: 'Unlock and request export' })).toBeDisabled()
  await expect(vault.getByRole('button', { name: 'Unlock and create deletion request' })).toBeDisabled()
  await expect(vault.getByRole('link', { name: 'Return to Ground' })).toBeVisible()

  await context.setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await expect(vault).toHaveAttribute('data-passport-source', 'offline')
  await expect(vault.locator('.passportStatus')).toContainText('Reconnect to load')
  await expect(vault.locator('.passportRows article')).toHaveCount(0)
  await context.setOffline(false)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(vault).toHaveAttribute('data-passport-source', 'unavailable')
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
  const vault = page.locator('main[data-route-owner="passport-ownership-vault"]')
  await expect(vault).toHaveAttribute('data-passport-source', 'demo')
  await expect(vault.locator('.passportDisclosure')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Unlock and request export' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Unlock and create deletion request' })).toBeDisabled()
  await page.screenshot({ path: path.join(evidenceRoot, 'offline-vault.png'), fullPage: true })
  await context.setOffline(false)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(vault).toHaveAttribute('data-passport-source', 'demo')
  await expect(vault.locator('.passportDisclosure')).toBeVisible()
  await expect(vault.locator('.passportStatus')).not.toContainText('Offline')
  await save('offline-runtime', runtime)
  expect(runtime.pageErrors).toEqual([])
})
