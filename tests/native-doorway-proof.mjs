import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseUrl = (process.env.URAI_AUDIT_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const exactSha = String(process.env.URAI_PROOF_SOURCE_SHA || process.env.URAI_EXACT_HEAD || '').trim()
const outDir = process.env.URAI_NATIVE_DOORWAY_OUT_DIR || 'native-doorway-proof'
const cases = [
  { device: 'desktop', method: 'pointer', viewport: { width: 1440, height: 1100 } },
  { device: 'desktop', method: 'keyboard', viewport: { width: 1440, height: 1100 } },
  { device: 'mobile', method: 'touch', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
]
const doorways = [
  { id: 'ground', destination: '/ground', name: 'Open the ground and descend into Hidden Infrastructure' },
  { id: 'life-map', destination: '/life-map', name: 'Ascend to Life Map' },
]
if (!/^[0-9a-f]{40}$/.test(exactSha)) throw new Error('Exact source SHA required')
const normalize = (value) => new URL(value).pathname.replace(/\/$/, '') || '/'

async function activate(target, method, position) {
  const options = { timeout: 10000, noWaitAfter: true, ...(position ? { position } : {}) }
  if (method === 'pointer') return target.click(options)
  if (method === 'touch') return target.tap(options)
  await target.focus()
  if (!await target.evaluate((node) => node === document.activeElement)) throw new Error('target did not receive focus')
  return target.press('Enter', { noWaitAfter: true })
}

function safeGroundPosition(box) {
  return {
    x: Math.max(24, Math.min(box.width * 0.18, box.width - 24)),
    y: Math.max(24, Math.min(box.height * 0.55, box.height - 24)),
  }
}

function safeSkyPosition(box) {
  return {
    x: Math.max(24, Math.min(box.width * 0.5, box.width - 24)),
    y: Math.max(24, Math.min(box.height * 0.18, box.height - 24)),
  }
}

async function resolveActivation(page, doorway, method) {
  if (doorway.id === 'ground') {
    const target = page.getByRole('button', { name: doorway.name, exact: true })
    await target.waitFor({ state: 'attached', timeout: 15000 })
    const box = await target.boundingBox()
    if (!box || box.width < 44 || box.height < 44) throw new Error(`invalid Ground hit target ${JSON.stringify(box)}`)
    return { target, position: method === 'keyboard' ? undefined : safeGroundPosition(box), owner: 'ground-gateway' }
  }

  if (method === 'keyboard') {
    const target = page.getByRole('button', { name: doorway.name, exact: true })
    await target.waitFor({ state: 'attached', timeout: 15000 })
    return { target, position: undefined, owner: 'semantic-sky-control' }
  }

  const target = page.locator('[data-home-spatial-renderer="webgl"] canvas').first()
  await target.waitFor({ state: 'visible', timeout: 15000 })
  const box = await target.boundingBox()
  if (!box || box.width < 240 || box.height < 240) throw new Error(`invalid Home canvas ${JSON.stringify(box)}`)
  return { target, position: safeSkyPosition(box), owner: 'rendered-sky' }
}

async function prove(browser, doorway, testCase) {
  const context = await browser.newContext({ viewport: testCase.viewport, isMobile: !!testCase.isMobile, hasTouch: !!testCase.hasTouch, deviceScaleFactor: testCase.isMobile ? 2 : 1 })
  const page = await context.newPage()
  const screenshot = `screenshots/${testCase.device}-${testCase.method}-home-to-${doorway.id}.png`
  const record = { exactSha, sourceRoute: '/home', destinationRoute: doorway.destination, device: testCase.device, activationMethod: testCase.method, viewport: testCase.viewport, targetAccessibleName: doorway.name, interactionOwner: '', resultingUrl: '', screenshot, success: false, failureReason: '' }
  try {
    await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await page.locator('[data-urai-home-runtime="single-authoritative-sanctuary"]').waitFor({ state: 'attached', timeout: 15000 })
    const activation = await resolveActivation(page, doorway, testCase.method)
    record.interactionOwner = activation.owner
    await activate(activation.target, testCase.method, activation.position)
    await page.waitForURL((url) => normalize(url.toString()) === doorway.destination, { timeout: 20000 })
    record.resultingUrl = page.url()
    await page.screenshot({ path: path.join(outDir, screenshot), animations: 'disabled' })
    record.success = normalize(record.resultingUrl) === doorway.destination
  } catch (error) {
    record.resultingUrl = page.url()
    record.failureReason = String(error?.message || error)
  } finally {
    await context.close()
  }
  return record
}

await fs.mkdir(path.join(outDir, 'screenshots'), { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const interactions = []
try {
  for (const doorway of doorways) for (const testCase of cases) interactions.push(await prove(browser, doorway, testCase))
} finally {
  await browser.close()
}
const errors = interactions.filter((item) => !item.success).map((item) => `${item.device}:${item.activationMethod}:${item.destinationRoute}: ${item.failureReason}`)
const receipt = { schemaVersion: 4, exactSha, baseUrl, createdAt: new Date().toISOString(), persistentWorldCanon: true, directDestinationNavigationPermitted: false, interactions, status: errors.length ? 'failed' : 'passed', errors }
await fs.writeFile(path.join(outDir, 'native-doorway-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
console.log(errors.length ? 'NATIVE_DOORWAY_PROOF_FAILED' : 'NATIVE_DOORWAY_PROOF_PASSED')
console.log(JSON.stringify(receipt, null, 2))
if (errors.length) process.exitCode = 1
