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

async function activate(page, target, method, hitPoint) {
  if (method === 'pointer') return page.mouse.click(hitPoint.center.x, hitPoint.center.y)
  if (method === 'touch') return page.touchscreen.tap(hitPoint.center.x, hitPoint.center.y)
  await target.focus()
  if (!await target.evaluate((node) => node === document.activeElement)) throw new Error('target did not receive focus')
  return target.press('Enter', { noWaitAfter: true })
}

async function resolveTarget(page, doorway) {
  const doorwayLayer = page.locator('.urai-home-runtime-doorways')
  await doorwayLayer.waitFor({ state: 'visible', timeout: 45000 })
  const target = doorwayLayer.getByRole('button', { name: doorway.name, exact: true })
  await target.waitFor({ state: 'visible', timeout: 15000 })
  return target
}

async function inspectHitPoint(target) {
  return target.evaluate((node) => {
    const rect = node.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const hit = document.elementFromPoint(x, y)
    const describe = (element) => element ? {
      tag: element.tagName.toLowerCase(),
      id: element.id || '',
      className: typeof element.className === 'string' ? element.className : '',
      ariaLabel: element.getAttribute('aria-label') || '',
      pointerEvents: getComputedStyle(element).pointerEvents,
      zIndex: getComputedStyle(element).zIndex,
    } : null
    return {
      center: { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) },
      target: describe(node),
      hit: describe(hit),
      targetOwnsHitPoint: hit === node || Boolean(hit && node.contains(hit)),
    }
  })
}

async function prove(browser, doorway, testCase) {
  const context = await browser.newContext({ viewport: testCase.viewport, isMobile: !!testCase.isMobile, hasTouch: !!testCase.hasTouch, deviceScaleFactor: testCase.isMobile ? 2 : 1 })
  const page = await context.newPage()
  const screenshot = `screenshots/${testCase.device}-${testCase.method}-home-to-${doorway.id}.png`
  const record = { exactSha, sourceRoute: '/home', destinationRoute: doorway.destination, device: testCase.device, activationMethod: testCase.method, inputDispatch: testCase.method === 'keyboard' ? 'focused-enter' : 'browser-coordinate', viewport: testCase.viewport, targetAccessibleName: doorway.name, resultingUrl: '', screenshot, hitPoint: null, success: false, failureReason: '' }
  try {
    await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    const target = await resolveTarget(page, doorway)
    await target.scrollIntoViewIfNeeded()
    const box = await target.boundingBox()
    if (!box || box.width < 44 || box.height < 44) throw new Error(`invalid hit target ${JSON.stringify(box)}`)
    record.hitPoint = await inspectHitPoint(target)
    if (!record.hitPoint.targetOwnsHitPoint) throw new Error(`target does not own center hit point ${JSON.stringify(record.hitPoint)}`)
    await activate(page, target, testCase.method, record.hitPoint)
    await page.waitForURL((url) => normalize(url.toString()) === doorway.destination, { timeout: 20000 })
    record.resultingUrl = page.url()
    record.success = normalize(record.resultingUrl) === doorway.destination
  } catch (error) {
    record.resultingUrl = page.url()
    record.failureReason = String(error?.message || error)
  } finally {
    await page.screenshot({ path: path.join(outDir, screenshot), animations: 'disabled' }).catch(() => {})
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
const receipt = { schemaVersion: 6, exactSha, baseUrl, createdAt: new Date().toISOString(), persistentWorldCanon: true, directDestinationNavigationPermitted: true, interactions, status: errors.length ? 'failed' : 'passed', errors }
await fs.writeFile(path.join(outDir, 'native-doorway-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
console.log(errors.length ? 'NATIVE_DOORWAY_PROOF_FAILED' : 'NATIVE_DOORWAY_PROOF_PASSED')
console.log(JSON.stringify(receipt, null, 2))
if (errors.length) process.exitCode = 1
