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
  { id: 'ground', destination: '/ground', name: 'Open Ground directly' },
  { id: 'life-map', destination: '/life-map', name: 'Open Life Map directly' },
]
if (!/^[0-9a-f]{40}$/.test(exactSha)) throw new Error('Exact source SHA required')
const normalize = (value) => new URL(value).pathname.replace(/\/$/, '') || '/'

async function activate(page, target, method, box) {
  if (method === 'pointer') return page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  if (method === 'touch') return page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  await target.focus()
  if (!await target.evaluate((node) => node === document.activeElement)) throw new Error('target did not receive focus')
  return target.press('Enter', { noWaitAfter: true })
}

async function resolveTarget(page, doorway) {
  const target = page.getByRole('button', { name: doorway.name, exact: true })
  await target.waitFor({ state: 'visible', timeout: 15000 })
  await target.scrollIntoViewIfNeeded()
  return target
}

async function prove(doorway, testCase) {
  // A fresh browser process per case prevents one proof's WebGL/GPU context from
  // influencing the next. Each interaction still uses a validated native DOM hit
  // target and real mouse, touch, or keyboard input against the exact static build.
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const context = await browser.newContext({ viewport: testCase.viewport, isMobile: !!testCase.isMobile, hasTouch: !!testCase.hasTouch, deviceScaleFactor: testCase.isMobile ? 2 : 1 })
  const page = await context.newPage()
  const screenshot = `screenshots/${testCase.device}-${testCase.method}-home-to-${doorway.id}.png`
  const record = { exactSha, sourceRoute: '/home', destinationRoute: doorway.destination, device: testCase.device, activationMethod: testCase.method, viewport: testCase.viewport, targetAccessibleName: doorway.name, resultingUrl: '', screenshot, success: false, failureReason: '' }
  try {
    await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    const target = await resolveTarget(page, doorway)
    const box = await target.boundingBox()
    if (!box || box.width < 44 || box.height < 44) throw new Error(`invalid hit target ${JSON.stringify(box)}`)
    await activate(page, target, testCase.method, box)
    await page.waitForURL((url) => normalize(url.toString()) === doorway.destination, { timeout: 20000 })
    record.resultingUrl = page.url()
    await page.screenshot({ path: path.join(outDir, screenshot), animations: 'disabled' })
    record.success = normalize(record.resultingUrl) === doorway.destination
  } catch (error) {
    record.resultingUrl = page.url()
    record.failureReason = String(error?.message || error)
  } finally {
    await context.close()
    await browser.close()
  }
  return record
}

await fs.mkdir(path.join(outDir, 'screenshots'), { recursive: true })
const interactions = []
for (const doorway of doorways) {
  for (const testCase of cases) interactions.push(await prove(doorway, testCase))
}
const errors = interactions.filter((item) => !item.success).map((item) => `${item.device}:${item.method}:${item.destinationRoute}: ${item.failureReason}`)
const receipt = { schemaVersion: 6, exactSha, baseUrl, createdAt: new Date().toISOString(), persistentWorldCanon: true, directDestinationNavigationPermitted: true, pointerProofMethod: 'validated-hit-target-coordinate-input-isolated-browser', interactions, status: errors.length ? 'failed' : 'passed', errors }
await fs.writeFile(path.join(outDir, 'native-doorway-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
console.log(errors.length ? 'NATIVE_DOORWAY_PROOF_FAILED' : 'NATIVE_DOORWAY_PROOF_PASSED')
console.log(JSON.stringify(receipt, null, 2))
if (errors.length) process.exitCode = 1
