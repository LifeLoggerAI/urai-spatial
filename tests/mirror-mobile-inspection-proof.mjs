import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const exactSha = String(process.env.URAI_PROOF_SOURCE_SHA || process.env.URAI_EXACT_HEAD || '').trim()
const baseUrl = String(process.env.URAI_AUDIT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '')
const outDir = process.env.URAI_MIRROR_PROOF_OUT_DIR || 'mirror-release-proof'

if (!/^[0-9a-f]{40}$/.test(exactSha)) throw new Error('Exact source SHA required')

await fs.mkdir(path.join(outDir, 'screenshots'), { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-webgl'] })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
})
const page = await context.newPage()
page.setDefaultTimeout(30000)

const consoleErrors = []
const failedRequests = []
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => consoleErrors.push(String(error?.message || error)))
page.on('requestfailed', (request) => {
  const failure = request.failure()?.errorText || 'request failed'
  if (!failure.includes('ERR_ABORTED')) failedRequests.push(`${request.method()} ${request.url()} ${failure}`)
})

let receipt
try {
  const response = await page.goto(`${baseUrl}/mirror/?memoryId=demo%3Aquiet-reset&demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()}`)

  const world = page.getByTestId('mirror-spatial-world')
  await world.waitFor({ state: 'visible', timeout: 45000 })
  await page.waitForFunction(() => document.querySelector('[data-testid="mirror-spatial-world"]')?.getAttribute('data-mirror-ready') === 'true', null, { timeout: 45000 })

  const movementPad = page.locator('.urai-mobile-movement')
  const orb = page.locator('.mirrorOrb')
  await movementPad.waitFor({ state: 'visible' })
  await orb.waitFor({ state: 'visible' })

  const rail = page.locator('section[aria-label="Reflection patterns"]')
  await rail.getByRole('button', { name: /^Rhythm/ }).click()
  const inspector = page.locator('aside[aria-label="Body rhythm evidence"]')
  await inspector.waitFor({ state: 'visible' })
  await movementPad.waitFor({ state: 'hidden' })
  await orb.waitFor({ state: 'hidden' })

  const range = inspector.locator('input[type="range"]')
  const max = Number(await range.getAttribute('max'))
  if (max <= 0) throw new Error('expected at least one inspectable fragment')
  await range.fill(String(max))

  const finalFragment = inspector.locator('.fragmentList button:not([disabled])').last()
  await finalFragment.scrollIntoViewIfNeeded()
  const fragmentHit = await finalFragment.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const hit = document.elementFromPoint(x, y)
    return {
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      unobstructed: Boolean(hit && (hit === element || element.contains(hit))),
    }
  })
  if (!fragmentHit.unobstructed) throw new Error(`final fragment control is obstructed: ${JSON.stringify(fragmentHit)}`)

  await finalFragment.click()
  const status = inspector.locator('.fragmentStatus')
  await status.waitFor({ state: 'visible' })
  await status.scrollIntoViewIfNeeded()

  const statusGeometry = await status.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const inspectorRect = element.closest('.mirrorInspection')?.getBoundingClientRect()
    return {
      status: { top: rect.top, bottom: rect.bottom },
      inspector: inspectorRect ? { top: inspectorRect.top, bottom: inspectorRect.bottom } : null,
      visibleWithinInspector: Boolean(inspectorRect && rect.top >= inspectorRect.top && rect.bottom <= inspectorRect.bottom),
    }
  })
  if (!statusGeometry.visibleWithinInspector) throw new Error(`fragment status is clipped: ${JSON.stringify(statusGeometry)}`)

  const thresholds = page.locator('.mirrorThresholds')
  const passport = thresholds.getByRole('button', { name: 'Passport threshold' })
  const passportHit = await passport.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const hit = document.elementFromPoint(x, y)
    return {
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      unobstructed: Boolean(hit && (hit === element || element.contains(hit))),
    }
  })
  if (!passportHit.unobstructed) throw new Error(`Passport threshold is obstructed during inspection: ${JSON.stringify(passportHit)}`)

  const screenshot = 'screenshots/mobile-mirror-inspector-unobstructed.png'
  await page.screenshot({ path: path.join(outDir, screenshot), fullPage: false, animations: 'disabled' })

  if (consoleErrors.length) throw new Error(`console errors: ${consoleErrors.join(' | ')}`)
  if (failedRequests.length) throw new Error(`failed requests: ${failedRequests.join(' | ')}`)

  receipt = {
    schemaVersion: 2,
    exactSha,
    status: 'passed',
    screenshot,
    movementPadVisibleInOverview: true,
    movementPadHiddenDuringInspection: true,
    orbVisibleInOverview: true,
    orbHiddenDuringInspection: true,
    passportThresholdUnobstructed: true,
    finalFragmentUnobstructed: true,
    fragmentStatusVisibleWithinInspector: true,
    consoleErrors,
    failedRequests,
  }
} catch (error) {
  const screenshot = 'screenshots/mobile-mirror-inspector-failure.png'
  await page.screenshot({ path: path.join(outDir, screenshot), fullPage: false, animations: 'disabled' }).catch(() => {})
  receipt = {
    schemaVersion: 2,
    exactSha,
    status: 'failed',
    screenshot,
    error: String(error?.message || error),
    consoleErrors,
    failedRequests,
  }
  process.exitCode = 1
} finally {
  await context.close()
  await browser.close()
}

await fs.writeFile(path.join(outDir, 'mirror-mobile-inspection-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
console.log(JSON.stringify(receipt, null, 2))
