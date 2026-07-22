import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = (process.env.URAI_AUDIT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '')
const outputDir = path.resolve(process.env.URAI_AUDIT_OUT_DIR || 'artifacts/live-visual-audit')
const exactHead = process.env.URAI_EXACT_HEAD || process.env.URAI_PROOF_SOURCE_SHA || 'local'

const routes = [
  {
    id: 'home',
    path: '/home/',
    selector: '.urai-final-home-world[data-home-spatial-renderer="webgl"], [data-testid="urai-home-accessible-fallback"]',
    markers: [],
  },
  { id: 'ground', path: '/ground/', selector: '.ground-spatial-root', markers: ['URAI Ground', 'Private infrastructure, embodied.'] },
  { id: 'life-map', path: '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1', selector: '[data-testid="urai-true-3d-life-map"]', markers: ['Sample constellation'] },
  { id: 'focus', path: '/focus?memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1', selector: '[data-testid="urai-final-focus-chamber"]', markers: ['The Quiet Reset', 'Selected memory', 'Enter Replay'] },
  { id: 'replay', path: '/replay?memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1', selector: 'main', markers: ['The Quiet Reset'] },
  { id: 'mirror', path: '/mirror', selector: 'main', markers: ['Mirror does not judge.'] },
  { id: 'passport', path: '/passport', selector: 'main[data-route-owner="passport-ownership-vault"]', markers: ['UrAi Passport', 'Ownership key'] },
  { id: 'privacy-controls', path: '/privacy-controls', selector: 'main[data-route-owner="consent-sanctuary"]', markers: ['UrAi Consent Sanctuary', 'Enforcement'] },
  { id: 'location-map', path: '/location-map', selector: 'main[data-location-map-owner="canonical-route"]', markers: ['Private emotional geography'] },
  { id: 'spatial-ar-vr', path: '/spatial/ar-vr', selector: 'body', markers: ['URAI AR / VR / XR entry chamber', 'Explorable entry chamber'] },
  { id: 'demo', path: '/demo', selector: 'main', markers: ['Your life is a world.', 'Demo fixture'] },
]

await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true })
const receipt = { schemaVersion: 'urai-canonical-live-visual-audit-4', exactHead, base, capturedAt: new Date().toISOString(), routes: [], interactions: [] }
let failed = false

async function stable(page, frames = 3) {
  await page.evaluate((count) => new Promise((resolve) => {
    let remaining = count
    const next = () => {
      remaining -= 1
      if (remaining <= 0) resolve()
      else requestAnimationFrame(next)
    }
    requestAnimationFrame(next)
  }), frames)
}

async function settleSpatialRoute(page, route) {
  if (route.id === 'home') {
    await page.waitForFunction(() => {
      const webglOwner = document.querySelector('.urai-final-home-world[data-home-spatial-renderer="webgl"]')
      if (webglOwner) {
        const canvas = webglOwner.querySelector('canvas')
        const rect = canvas?.getBoundingClientRect()
        return webglOwner.getAttribute('data-home-ready') === 'true'
          && webglOwner.getAttribute('data-home-visible-world') === 'final-physical-sanctuary-memory-rooms'
          && Boolean(rect && rect.width >= 240 && rect.height >= 240)
      }
      const fallback = document.querySelector('[data-testid="urai-home-accessible-fallback"]')
      const body = document.body.innerText || ''
      return Boolean(fallback && body.includes('Own your life.') && body.includes('Threshold online'))
    }, null, { timeout: 45_000, polling: 50 })
  }
  if (route.id === 'ground') {
    await page.waitForFunction(() => {
      const root = document.querySelector('[data-testid="urai-ground-private-workforce-world"]')
      return root?.getAttribute('data-ground-ready') === 'true' && root?.getAttribute('data-ground-arrival') === 'settled'
    }, null, { timeout: 30_000, polling: 50 })
  }
  if (route.id === 'life-map') {
    await page.waitForFunction(() => document.querySelector('[data-testid="urai-true-3d-life-map"]')?.getAttribute('data-life-map-mode') === 'overview', null, { timeout: 30_000, polling: 50 })
  }
  await stable(page, 6)
}

async function captureRoute(route, viewport) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const pageErrors = []
  const consoleErrors = []
  const requestFailures = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('requestfailed', (request) => requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'unknown'}`))
  const record = { id: route.id, viewport, url: `${base}${route.path}`, status: null, markers: {}, pageErrors, consoleErrors, requestFailures, passed: false }
  try {
    const response = await page.goto(record.url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    record.status = response?.status() ?? null
    await page.locator(route.selector).first().waitFor({ state: 'visible', timeout: 45_000 })
    await settleSpatialRoute(page, route)
    const body = await page.locator('body').innerText()
    for (const marker of route.markers) record.markers[marker] = body.toLowerCase().includes(marker.toLowerCase())
    const screenshot = `${route.id}-${viewport.width}x${viewport.height}-${exactHead.slice(0, 12)}.png`
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: false, animations: 'disabled', caret: 'hide' })
    record.screenshot = screenshot
    record.passed = record.status === 200
      && Object.values(record.markers).every(Boolean)
      && pageErrors.length === 0
      && consoleErrors.length === 0
      && requestFailures.length === 0
  } catch (error) {
    record.error = String(error)
    failed = true
  } finally {
    if (!record.passed) failed = true
    receipt.routes.push(record)
    await context.close()
  }
}

async function proveLifeMapToFocus() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const record = { id: 'life-map-to-focus', passed: false }
  try {
    const start = `${base}/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset`
    const response = await page.goto(start, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    if (response?.status() !== 200) throw new Error(`Life Map returned ${response?.status()}`)
    const map = page.locator('[data-testid="urai-true-3d-life-map"]')
    await map.waitFor({ state: 'visible', timeout: 30_000 })
    await page.waitForFunction(() => document.querySelector('[data-testid="urai-true-3d-life-map"]')?.getAttribute('data-life-map-mode') === 'selected', null, { timeout: 30_000, polling: 50 })
    const actions = page.locator('.life-map-actions[aria-label="Selected memory actions"]')
    await actions.waitFor({ state: 'visible', timeout: 30_000 })
    const focus = actions.getByRole('button', { name: 'Enter Focus', exact: true })
    const box = await focus.boundingBox()
    if (!box || box.width < 48 || box.height < 48) throw new Error('Focus action does not meet the 48px touch-target contract')
    await focus.click()
    await page.waitForFunction(() => {
      const destination = new URL(window.location.href)
      return destination.pathname.replace(/\/$/, '') === '/focus'
        && destination.searchParams.get('from') === 'life-map'
    }, null, { timeout: 30_000, polling: 50 })
    const chamber = page.locator('[data-testid="urai-final-focus-chamber"]')
    await chamber.waitFor({ state: 'visible', timeout: 30_000 })
    const destination = new URL(page.url())
    record.memoryStatus = await chamber.getAttribute('data-memory-status')
    record.memoryId = await chamber.getAttribute('data-memory-id')
    record.destination = destination.toString()
    record.passed = destination.searchParams.get('memoryId') === 'quiet-reset'
      && destination.searchParams.get('manifestId') === 'replay-recovery-thread'
      && destination.searchParams.get('from') === 'life-map'
      && !((await page.locator('body').innerText()).includes('Memory unavailable'))
    if (!record.passed) throw new Error(`Life Map did not preserve selected-memory identity into Focus: ${JSON.stringify(record)}`)
  } catch (error) {
    record.error = String(error)
    failed = true
  } finally {
    receipt.interactions.push(record)
    await context.close()
  }
}

for (const route of routes) {
  await captureRoute(route, { width: 1440, height: 900 })
  if (['home', 'ground', 'life-map'].includes(route.id)) await captureRoute(route, { width: 390, height: 844 })
}
await proveLifeMapToFocus()

await browser.close()
receipt.completedAt = new Date().toISOString()
receipt.passed = !failed && receipt.routes.every((route) => route.passed) && receipt.interactions.every((interaction) => interaction.passed)
await writeFile(path.join(outputDir, 'visual-audit.json'), JSON.stringify(receipt, null, 2))
await writeFile(path.join(outputDir, 'visual-audit-summary.md'), `# Canonical visual audit\n\n- Exact head: ${exactHead}\n- Passed: ${receipt.passed ? 'yes' : 'no'}\n- Route captures: ${receipt.routes.length}\n- Interaction proofs: ${receipt.interactions.length}\n`)
if (!receipt.passed) process.exitCode = 1
