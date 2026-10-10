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

async function expectReadableExportScopes(page: Page, captureName: string) {
  const labels = page.locator('.passportCheckGrid label')
  await expect(labels).toHaveCount(5)
  const geometry = []
  for (const label of await labels.all()) {
    await label.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }))
    const measured = await label.evaluate(element => {
      const box = element.getBoundingClientRect()
      const input = element.querySelector('input[type="checkbox"]')!
      const inputBox = input.getBoundingClientRect()
      const range = document.createRange()
      const text = Array.from(element.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())!
      range.selectNodeContents(text)
      const textBoxes = Array.from(range.getClientRects())
      const hits = [0.1, 0.5, 0.9].map(fraction => {
        const hit = document.elementFromPoint(box.left + box.width * fraction, box.top + box.height / 2)
        return Boolean(hit && (hit === element || element.contains(hit)))
      })
      return {
        scope: element.textContent?.trim(), labelWidth: box.width, labelHeight: box.height,
        checkboxWidth: inputBox.width, checkboxHeight: inputBox.height, hits,
        textRows: new Set(textBoxes.map(rect => Math.round(rect.top))).size,
        textFits: textBoxes.every(rect => rect.left >= inputBox.right && rect.right <= box.right),
      }
    })
    geometry.push(measured)
    expect(measured.labelWidth, `${measured.scope} activation width`).toBeGreaterThanOrEqual(48)
    expect(measured.labelHeight, `${measured.scope} activation height`).toBeGreaterThanOrEqual(48)
    expect(measured.checkboxWidth, `${measured.scope} checkbox must not consume the label`).toBeLessThanOrEqual(24)
    expect(measured.checkboxHeight).toBeLessThanOrEqual(24)
    expect(measured.textRows, `${measured.scope} must remain readable on one line`).toBe(1)
    expect(measured.textFits, `${measured.scope} must fit beside its checkbox`).toBe(true)
    expect(measured.hits, `${measured.scope} label must remain unobstructed`).toEqual([true, true, true])
  }
  const exportAction = page.getByRole('button', { name: 'Unlock and request export' })
  await exportAction.scrollIntoViewIfNeeded()
  const actionHits = await exportAction.evaluate(element => {
    const rect = element.getBoundingClientRect()
    return [0.1, 0.5, 0.9].map(fraction => {
      const hit = document.elementFromPoint(rect.left + rect.width * fraction, rect.top + rect.height / 2)
      return Boolean(hit && (hit === element || element.contains(hit)))
    })
  })
  expect(actionHits, 'the export action must scroll above the persistent companion').toEqual([true, true, true])
  await fs.mkdir(evidenceRoot, { recursive: true })
  await fs.writeFile(path.join(evidenceRoot, `${captureName}.json`), JSON.stringify(geometry, null, 2))
  await page.screenshot({ path: path.join(evidenceRoot, `${captureName}.png`), fullPage: true })
}

test('desktop Ownership Vault exposes every zone and transition', async ({ page }) => {
  const runtime = await observe(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openDemo(page)
  for (const label of ['Identity core', 'Connected sources', 'Devices and sessions', 'Provenance archive', 'Permission history', 'Export chamber', 'Deletion chamber', 'Audit corridor', 'Recovery threshold']) {
    const zone = page.getByRole('button', { name: label })
    await expect(zone).toBeVisible()
    const hits = await zone.evaluate(element => {
      const rect = element.getBoundingClientRect()
      return [0.1, 0.5, 0.9].map(fraction => {
        const hit = document.elementFromPoint(rect.left + rect.width * fraction, rect.top + rect.height / 2)
        return Boolean(hit && (hit === element || element.contains(hit)))
      })
    })
    expect(hits, `${label} must remain unobstructed by global overlays`).toEqual([true, true, true])
  }
  await page.getByRole('button', { name: 'Provenance archive' }).click()
  await expect(page.getByRole('heading', { name: 'Provenance archive' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Enter Consent Sanctuary' })).toHaveAttribute('href', '/privacy-controls')
  await page.keyboard.press('Home')
  await expect(page.locator('#passport-controls')).toBeFocused()
  await page.screenshot({ path: path.join(evidenceRoot, 'desktop-ownership-vault.png'), fullPage: true })
  await expectReadableExportScopes(page, 'desktop-export-scopes')
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
  await expect(root).toHaveAttribute('data-passport-source', /^(signed-out|unavailable)$/)
  await expect(root).toHaveAttribute('data-key-state', 'locked')
  await expect(root).not.toContainText('sample-owner')
  await expect(root).not.toContainText('Disclosed sample owner')
  await expect(root).not.toContainText('fully-enforced')
  await expect(page.getByRole('button', { name: 'Unlock and request export' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Unlock and create deletion request' })).toBeDisabled()
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
  await expectReadableExportScopes(page, 'portrait-mobile-export-scopes')
  await save('mobile-runtime', runtime)
  expect(runtime.consoleErrors).toEqual([])
  expect(runtime.pageErrors).toEqual([])
})

test('320px export scopes remain readable with reduced motion', async ({ page }) => {
  const runtime = await observe(page)
  await page.setViewportSize({ width: 320, height: 740 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openDemo(page)
  await expectReadableExportScopes(page, 'narrow-export-scopes')
  await save('narrow-runtime', runtime)
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
  const notice = page.getByRole('note').filter({ hasText: 'Vault controls remain available without WebGL.' })
  await expect(notice).toBeVisible()
  expect(await notice.evaluate(element => element.closest('[aria-hidden="true"]') !== null)).toBe(false)
  await expect(page.locator('.passportFallback')).toHaveText('')
  const headingBox = await page.getByRole('heading', { level: 1 }).boundingBox()
  const noticeBox = await notice.boundingBox()
  expect(headingBox).not.toBeNull()
  expect(noticeBox).not.toBeNull()
  expect(noticeBox!.y).toBeGreaterThanOrEqual(headingBox!.y + headingBox!.height)
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
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(page.locator('main[data-route-owner="passport-ownership-vault"]')).toHaveAttribute('data-passport-source', 'demo')
  await expect(page.locator('.passportStatus')).toContainText('DEMONSTRATION')
  await expect(page.getByRole('button', { name: 'Unlock and request export' })).toBeDisabled()
  await save('offline-runtime', runtime)
  expect(runtime.pageErrors).toEqual([])
})
