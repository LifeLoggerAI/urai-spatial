import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = (process.env.URAI_AUDIT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '')
const outputDir = path.resolve(process.env.URAI_AUDIT_OUT_DIR || 'artifacts/live-visual-audit')
const exactHead = process.env.URAI_EXACT_HEAD || process.env.URAI_PROOF_SOURCE_SHA || 'local'

const routes = [
  { id: 'home', path: '/home/', selector: '[data-home-spatial-renderer="webgl"]', markers: ['Move through Home'], controls: ['Open Ground directly', 'Open Life Map directly'] },
  { id: 'ground', path: '/ground/', selector: '.ground-spatial-root', markers: ['URAI Ground', 'Private infrastructure, embodied.'] },
  { id: 'life-map', path: '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1', selector: '[data-testid="urai-true-3d-life-map"]', markers: ['Sample constellation'] },
  { id: 'focus', path: '/focus?memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1', selector: '[data-testid="urai-final-focus-chamber"]', markers: ['The Quiet Reset', 'Selected memory', 'Enter Replay'] },
  { id: 'replay', path: '/replay?memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1', selector: 'main', markers: ['The Quiet Reset'] },
  { id: 'mirror', path: '/mirror', selector: 'main', markers: ['Mirror does not judge.'] },
  { id: 'passport', path: '/passport', selector: 'main', markers: ['Your life remains yours.'] },
  { id: 'privacy-controls', path: '/privacy-controls', selector: 'main', markers: ['Nothing moves without you.'] },
  { id: 'location-map', path: '/location-map', selector: 'main', markers: ['Places carry signal.'] },
  { id: 'spatial-ar-vr', path: '/spatial/ar-vr', selector: 'body', markers: ['URAI AR / VR / XR entry chamber', 'Explorable entry chamber'] },
  { id: 'demo', path: '/demo', selector: 'main', markers: ['Your life is a world.', 'Demo fixture'] },
]

await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true })
const receipt = { schemaVersion: 'urai-canonical-live-visual-audit-3', exactHead, base, capturedAt: new Date().toISOString(), routes: [], interactions: [] }
let failed = false

async function stable(page, frames = 3) {
  await page.evaluate((count) => new Promise((resolve) => {
    let remaining = count
    const next = () => { remaining -= 1; if (remaining <= 0) resolve(); else requestAnimationFrame(next) }
    requestAnimationFrame(next)
  }), frames)
}

async function settleSpatialRoute(page, route) {
  if (route.id === 'home') {
    await page.waitForFunction(() => document.querySelector('[data-home-spatial-renderer="webgl"]')?.getAttribute('data-home-ready') === 'true', null, { timeout: 30_000, polling: 50 })
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

async function centerHit(target) {
  return target.evaluate((node) => {
    const rect = node.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const hit = document.elementFromPoint(x, y)
    return { x, y, owned: hit === node || Boolean(hit && node.contains(hit)) }
  })
}

async function captureRoute(route, viewport) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const record = { id: route.id, viewport, url: `${base}${route.path}`, status: null, markers: {}, controls: {}, passed: false }
  try {
    const response = await page.goto(record.url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    record.status = response?.status() ?? null
    await page.locator(route.selector).first().waitFor({ state: 'visible', timeout: 45_000 })
    await settleSpatialRoute(page, route)
    const body = await page.locator('body').innerText()
    for (const marker of route.markers) record.markers[marker] = body.toLowerCase().includes(marker.toLowerCase())
    for (const control of route.controls || []) {
      record.controls[control] = await page.getByRole('button', { name: control, exact: true }).isVisible().catch(() => false)
    }
    const screenshot = `${route.id}-${viewport.width}x${viewport.height}-${exactHead.slice(0, 12)}.png`
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: false, animations: 'disabled', caret: 'hide' })
    record.screenshot = screenshot
    record.passed = record.status === 200 && Object.values(record.markers).every(Boolean) && Object.values(record.controls).every(Boolean)
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
    const start = `${base}/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1`
    const response = await page.goto(start, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    if (response?.status() !== 200) throw new Error(`Life Map returned ${response?.status()}`)
    const root = page.locator('[data-testid="urai-true-3d-life-map"]').first()
    await root.waitFor({ state: 'visible', timeout: 45_000 })
    const node = page.getByRole('button', { name: /The Quiet Reset/i }).first()
    await node.waitFor({ state: 'visible', timeout: 20_000 })
    await node.scrollIntoViewIfNeeded()
    const nodeHit = await centerHit(node)
    if (!nodeHit.owned) throw new Error('Life Map memory does not own its center hit point')
    await page.mouse.click(nodeHit.x, nodeHit.y)
    await page.waitForFunction(() => {
      const selected = document.querySelector('[data-testid="urai-true-3d-life-map"]')?.getAttribute('data-life-map-mode') === 'selected'
      const query = new URLSearchParams(window.location.search)
      return selected && query.get('node') === 'quiet-reset' && query.get('memoryId') === 'quiet-reset'
    }, null, { timeout: 20_000, polling: 25 })
    const focus = page.getByRole('button', { name: 'Enter Focus', exact: true })
    await focus.waitFor({ state: 'visible', timeout: 20_000 })
    await focus.scrollIntoViewIfNeeded()
    const box = await focus.boundingBox()
    if (!box || box.width < 48 || box.height < 48) throw new Error('Focus action does not meet the 48px touch-target contract')
    const focusHit = await centerHit(focus)
    if (!focusHit.owned) throw new Error('Focus action does not own its center hit point')
    await page.mouse.click(focusHit.x, focusHit.y)
    await page.waitForFunction(() => window.location.pathname === '/focus' && new URLSearchParams(window.location.search).get('demo') === '1', null, { timeout: 30_000, polling: 25 })
    const chamber = page.locator('[data-testid="urai-final-focus-chamber"]')
    await chamber.waitFor({ state: 'visible', timeout: 30_000 })
    const memoryStatus = await chamber.getAttribute('data-memory-status')
    const memoryId = await chamber.getAttribute('data-memory-id')
    const destination = new URL(page.url())
    record.memoryStatus = memoryStatus
    record.memoryId = memoryId
    record.destination = destination.toString()
    record.passed = memoryStatus === 'demo' && Boolean(memoryId?.startsWith('demo:')) && destination.searchParams.get('demo') === '1' && Boolean(destination.searchParams.get('memoryId')) && !((await page.locator('body').innerText()).includes('Memory unavailable'))
    if (!record.passed) throw new Error(`Life Map did not preserve truthful explicit-demo identity into Focus: ${JSON.stringify(record)}`)
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
