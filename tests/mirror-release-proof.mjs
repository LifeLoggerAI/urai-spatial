import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const exactSha = String(process.env.URAI_PROOF_SOURCE_SHA || process.env.URAI_EXACT_HEAD || '').trim()
const baseUrl = String(process.env.URAI_AUDIT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '')
const outDir = process.env.URAI_MIRROR_PROOF_OUT_DIR || 'mirror-release-proof'
const shotDir = path.join(outDir, 'screenshots')

if (!/^[0-9a-f]{40}$/.test(exactSha)) throw new Error('Exact source SHA required')

const devices = {
  desktop: { viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
}

const demoQuery = 'memoryId=demo%3Aquiet-reset&demo=1'
const cases = []
const errors = []

function absolute(route) {
  return new URL(route, `${baseUrl}/`).toString()
}

function pathname(value) {
  return new URL(value).pathname.replace(/\/$/, '') || '/'
}

function pushCase(name, device, status, details = {}) {
  const record = { name, device, status, ...details }
  cases.push(record)
  if (status !== 'passed') errors.push(`${device}:${name}: ${details.error || 'failed'}`)
  console.log(`MIRROR_PROOF ${status.toUpperCase()} ${device} ${name}${details.error ? ` error=${details.error}` : ''}`)
}

async function createPage(browser, deviceName, options = {}) {
  const device = devices[deviceName]
  const context = await browser.newContext({
    ...device,
    reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(30000)

  if (options.disableWebGL) {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function getContext(type, ...args) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
        return original.call(this, type, ...args)
      }
    })
  }

  const consoleErrors = []
  const failedRequests = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(String(error?.message || error)))
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText || 'request failed'
    if (failure.includes('ERR_ABORTED')) return
    failedRequests.push(`${request.method()} ${request.url()} ${failure}`)
  })

  return { context, page, consoleErrors, failedRequests }
}

async function screenshot(page, name) {
  const relative = path.join('screenshots', `${name}.png`)
  await page.screenshot({ path: path.join(outDir, relative), fullPage: false, animations: 'disabled' })
  return relative
}

async function waitForWorld(page, route) {
  const response = await page.goto(absolute(route), { waitUntil: 'domcontentloaded', timeout: 60000 })
  if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()} for ${route}`)
  const world = page.getByTestId('mirror-spatial-world')
  await world.waitFor({ state: 'visible', timeout: 45000 })
  await page.waitForFunction(() => document.querySelector('[data-testid="mirror-spatial-world"]')?.getAttribute('data-mirror-ready') === 'true', null, { timeout: 45000 })
  return world
}

async function assertCleanEvidence(consoleErrors, failedRequests) {
  if (consoleErrors.length) throw new Error(`console errors: ${consoleErrors.join(' | ')}`)
  if (failedRequests.length) throw new Error(`failed requests: ${failedRequests.join(' | ')}`)
}

async function proveOverview(browser, deviceName) {
  const name = 'overview-and-inspection'
  const { context, page, consoleErrors, failedRequests } = await createPage(browser, deviceName)
  try {
    const world = await waitForWorld(page, `/mirror?${demoQuery}`)
    if (await world.getAttribute('data-demo') !== 'true') throw new Error('demo disclosure missing')
    if (await page.locator('canvas').count() !== 1) throw new Error('canonical canvas missing or duplicated')
    const rail = page.locator('section[aria-label="Reflection patterns"]')
    await rail.waitFor({ state: 'visible' })
    if (await rail.getByRole('button').count() !== 4) throw new Error('expected four reflection patterns')

    const controls = page.locator('button:visible')
    const controlCount = await controls.count()
    for (let index = 0; index < controlCount; index += 1) {
      const box = await controls.nth(index).boundingBox()
      if (box && (box.width < 44 || box.height < 44)) throw new Error(`undersized visible control ${Math.round(box.width)}x${Math.round(box.height)}`)
    }

    const startZ = Number(await world.getAttribute('data-mirror-camera-z'))
    if (deviceName === 'desktop') {
      await page.keyboard.down('ArrowUp')
      await page.waitForTimeout(700)
      await page.keyboard.up('ArrowUp')
    } else {
      const forward = page.getByRole('button', { name: 'Move forward' })
      await forward.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', button: 0, isPrimary: true })
      await page.waitForTimeout(700)
      await forward.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch', button: 0, isPrimary: true })
    }
    await page.waitForTimeout(250)
    const movedZ = Number(await world.getAttribute('data-mirror-camera-z'))
    if (!Number.isFinite(startZ) || !Number.isFinite(movedZ) || Math.abs(movedZ - startZ) < 0.05) throw new Error(`embodied movement not observed: ${startZ} -> ${movedZ}`)

    await rail.getByRole('button', { name: /^Rhythm/ }).click()
    await page.waitForFunction(() => document.querySelector('[data-testid="mirror-spatial-world"]')?.getAttribute('data-selected-pattern') === 'body-rhythm')
    const inspector = page.locator('aside[aria-label="Body rhythm evidence"]')
    await inspector.waitFor({ state: 'visible' })
    if (deviceName === 'mobile') {
      const geometry = await inspector.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }))
      if (geometry.scrollHeight <= geometry.clientHeight) throw new Error(`mobile inspector is not scrollable: ${geometry.clientHeight}/${geometry.scrollHeight}`)
      await inspector.evaluate((element) => { element.scrollTop = element.scrollHeight })
      await page.waitForTimeout(100)
      const scrollTop = await inspector.evaluate((element) => element.scrollTop)
      if (scrollTop <= 0) throw new Error('mobile inspector touch-scroll surface did not move')
    }
    if (!new URL(page.url()).searchParams.has('pattern')) throw new Error('selected pattern was not restored into URL state')

    const range = inspector.locator('input[type="range"]')
    const max = Number(await range.getAttribute('max'))
    if (max > 0) {
      await range.fill(String(max))
      const fragmentButtons = inspector.locator('.fragmentList button:not([disabled])')
      if (await fragmentButtons.count()) await fragmentButtons.last().click()
    }

    await page.getByRole('button', { name: /Ask the Orb to explain Body rhythm/ }).click()
    const shot = await screenshot(page, `${deviceName}-mirror-selected-body-rhythm`)
    await assertCleanEvidence(consoleErrors, failedRequests)
    pushCase(name, deviceName, 'passed', { screenshot: shot, startCameraZ: startZ, finalCameraZ: movedZ, finalUrl: page.url(), consoleErrors, failedRequests })
  } catch (error) {
    const shot = await screenshot(page, `${deviceName}-mirror-overview-failure`).catch(() => '')
    pushCase(name, deviceName, 'failed', { screenshot: shot, error: String(error?.message || error), finalUrl: page.url(), consoleErrors, failedRequests })
  } finally {
    await context.close()
  }
}

async function proveState(browser, config) {
  const { name, route, device = 'desktop', reducedMotion = false, disableWebGL = false, afterLoad } = config
  const { context, page, consoleErrors, failedRequests } = await createPage(browser, device, { reducedMotion, disableWebGL })
  try {
    const response = await page.goto(absolute(route), { waitUntil: 'domcontentloaded', timeout: 60000 })
    if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()} for ${route}`)
    await page.waitForTimeout(1200)
    if (afterLoad) await afterLoad(page, context)
    const marker = config.marker ? page.locator(config.marker) : page.locator('main')
    await marker.first().waitFor({ state: 'visible', timeout: 30000 })
    if (config.text) await page.getByText(config.text, { exact: false }).first().waitFor({ state: 'visible', timeout: 30000 })
    const shot = await screenshot(page, `${device}-${name}`)
    await assertCleanEvidence(consoleErrors, failedRequests)
    pushCase(name, device, 'passed', { screenshot: shot, finalUrl: page.url(), consoleErrors, failedRequests })
  } catch (error) {
    const shot = await screenshot(page, `${device}-${name}-failure`).catch(() => '')
    pushCase(name, device, 'failed', { screenshot: shot, error: String(error?.message || error), finalUrl: page.url(), consoleErrors, failedRequests })
  } finally {
    await context.close()
  }
}

async function proveTransition(browser, destination, buttonName) {
  const name = `transition-to-${destination}`
  const { context, page, consoleErrors, failedRequests } = await createPage(browser, 'desktop')
  try {
    await waitForWorld(page, `/mirror?${demoQuery}&pattern=body-rhythm`)
    await page.getByRole('button', { name: buttonName, exact: true }).click()
    await page.waitForURL((url) => pathname(url.toString()) === `/${destination}`, { timeout: 30000 })
    const shot = await screenshot(page, `desktop-${name}`)
    await assertCleanEvidence(consoleErrors, failedRequests)
    pushCase(name, 'desktop', 'passed', { screenshot: shot, finalUrl: page.url(), consoleErrors, failedRequests })
  } catch (error) {
    const shot = await screenshot(page, `desktop-${name}-failure`).catch(() => '')
    pushCase(name, 'desktop', 'failed', { screenshot: shot, error: String(error?.message || error), finalUrl: page.url(), consoleErrors, failedRequests })
  } finally {
    await context.close()
  }
}

async function proveSemanticFallback(browser) {
  const name = 'no-webgl-semantic-fallback'
  const { context, page, consoleErrors, failedRequests } = await createPage(browser, 'desktop', { disableWebGL: true })
  try {
    const response = await page.goto(absolute(`/mirror?${demoQuery}`), { waitUntil: 'domcontentloaded', timeout: 60000 })
    if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()} for semantic fallback`)
    const fallback = page.getByTestId('mirror-webgl-fallback')
    await fallback.waitFor({ state: 'visible', timeout: 45000 })
    await fallback.getByRole('button', { name: /^Body rhythm/ }).click()
    const inspector = fallback.locator('article[aria-label="Body rhythm evidence"]')
    await inspector.waitFor({ state: 'visible' })
    await inspector.getByText('Uncertainty', { exact: true }).waitFor({ state: 'visible' })
    await inspector.getByText(/owner-authorized|demonstration data/).waitFor({ state: 'visible' })
    const shot = await screenshot(page, 'desktop-no-webgl-semantic-fallback')
    await assertCleanEvidence(consoleErrors, failedRequests)
    pushCase(name, 'desktop', 'passed', { screenshot: shot, finalUrl: page.url(), consoleErrors, failedRequests })
  } catch (error) {
    const shot = await screenshot(page, 'desktop-no-webgl-semantic-fallback-failure').catch(() => '')
    pushCase(name, 'desktop', 'failed', { screenshot: shot, error: String(error?.message || error), finalUrl: page.url(), consoleErrors, failedRequests })
  } finally {
    await context.close()
  }
}

await fs.mkdir(shotDir, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-webgl'] })

try {
  await proveOverview(browser, 'desktop')
  await proveOverview(browser, 'mobile')
  await proveState(browser, { name: 'direct-entry-selected', route: `/mirror?${demoQuery}&pattern=emotional-recurrence`, marker: '[data-selected-pattern="emotional-recurrence"]', text: 'Emotional recurrence' })
  await proveState(browser, { name: 'partial-evidence', route: `/mirror?${demoQuery}&mirrorFixture=partial&pattern=body-rhythm`, marker: '[data-selected-pattern="body-rhythm"]', text: 'Limited evidence' })
  await proveState(browser, { name: 'conflicting-evidence', route: `/mirror?${demoQuery}&mirrorFixture=conflicting&pattern=emotional-recurrence`, marker: '[data-selected-pattern="emotional-recurrence"]', text: 'Conflicting evidence' })
  await proveState(browser, { name: 'empty-evidence', route: `/mirror?${demoQuery}&mirrorFixture=empty`, marker: '.mirrorEmpty', text: 'No reflection is available yet.' })
  await proveState(browser, { name: 'permission-denied', route: '/mirror?mirrorFixture=permission-denied', marker: '[data-testid="mirror-spatial-state"]', text: 'Mirror permission is not available.' })
  await proveState(browser, { name: 'failed-source', route: '/mirror?mirrorFixture=failed', marker: '[data-testid="mirror-spatial-state"]', text: 'Mirror could not load the permitted sources.' })
  await proveState(browser, {
    name: 'offline-existing-evidence',
    route: `/mirror?${demoQuery}`,
    marker: '[data-online="false"]',
    text: 'Offline · existing permitted evidence only',
    afterLoad: async (page, context) => {
      await page.getByTestId('mirror-spatial-world').waitFor({ state: 'visible', timeout: 45000 })
      await context.setOffline(true)
      await page.evaluate(() => window.dispatchEvent(new Event('offline')))
      await page.waitForTimeout(500)
    },
  })
  await proveState(browser, { name: 'reduced-motion', route: `/mirror?${demoQuery}`, reducedMotion: true, marker: '[data-testid="mirror-spatial-world"]', text: 'Mirror' })
  await proveSemanticFallback(browser)
  await proveTransition(browser, 'replay', 'Replay threshold')
  await proveTransition(browser, 'passport', 'Passport threshold')
} finally {
  await browser.close()
}

const receipt = {
  schemaVersion: 1,
  exactSha,
  baseUrl,
  createdAt: new Date().toISOString(),
  status: errors.length ? 'failed' : 'passed',
  caseCount: cases.length,
  screenshotCount: cases.filter((item) => item.screenshot).length,
  cases,
  errors,
}

await fs.writeFile(path.join(outDir, 'mirror-release-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
await fs.writeFile(path.join(outDir, 'mirror-release-summary.md'), [
  '# Mirror exact-head browser release proof',
  '',
  `Exact SHA: ${exactSha}`,
  `Base URL: ${baseUrl}`,
  `Created: ${receipt.createdAt}`,
  `Status: ${receipt.status.toUpperCase()}`,
  `Cases: ${receipt.caseCount}`,
  `Screenshots: ${receipt.screenshotCount}`,
  '',
  ...cases.map((item) => `- ${item.status === 'passed' ? 'PASS' : 'FAIL'} ${item.device} ${item.name}${item.error ? `: ${item.error}` : ''}`),
  '',
].join('\n'))

console.log(errors.length ? 'MIRROR_RELEASE_PROOF_FAILED' : 'MIRROR_RELEASE_PROOF_PASSED')
console.log(JSON.stringify(receipt, null, 2))
if (errors.length) process.exitCode = 1
