import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseUrl = (process.env.URAI_AUDIT_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const exactSha = String(process.env.URAI_PROOF_SOURCE_SHA || process.env.URAI_EXACT_HEAD || '').trim()
const outDir = process.env.URAI_NATIVE_DOORWAY_OUT_DIR || 'native-doorway-proof'
const screenshotDir = path.join(outDir, 'screenshots')
const allowedMethods = new Set(['pointer', 'touch', 'keyboard'])
const forbiddenMethods = /href-fallback|fallback|direct|goto|router-push-from-test|link-follow|extracted-href|unknown/i

if (!/^[0-9a-f]{40}$/.test(exactSha)) {
  throw new Error('URAI_PROOF_SOURCE_SHA or URAI_EXACT_HEAD must be an exact 40-character lowercase hexadecimal SHA')
}

const doorways = [
  { id: 'ground', name: 'Open Ground', selector: '[data-urai-audit-action="home-ground"]', destination: '/ground' },
  { id: 'life-map', name: 'Open Life Map', selector: '[data-urai-audit-action="home-life-map"]', destination: '/life-map' },
]

const cases = [
  { device: 'desktop', method: 'pointer', viewport: { width: 1440, height: 1100 }, event: 'click' },
  { device: 'desktop', method: 'keyboard', viewport: { width: 1440, height: 1100 }, event: 'Enter' },
  { device: 'mobile', method: 'touch', viewport: { width: 390, height: 844 }, event: 'tap', isMobile: true, hasTouch: true },
]

const normalizePath = (value) => new URL(value).pathname.replace(/\/$/, '') || '/'

async function prove({ browser, doorway, testCase }) {
  const context = await browser.newContext({
    viewport: testCase.viewport,
    isMobile: Boolean(testCase.isMobile),
    hasTouch: Boolean(testCase.hasTouch),
    deviceScaleFactor: testCase.isMobile ? 2 : 1,
  })
  const page = await context.newPage()
  const sourceRoute = '/home'
  const startingUrl = `${baseUrl}${sourceRoute}`
  const expectedUrl = `${baseUrl}${doorway.destination}`
  const screenshot = path.join('screenshots', `${testCase.device}-${testCase.method}-home-to-${doorway.id}.png`)
  const record = {
    exactSha,
    sourceRoute,
    startingUrl,
    destinationRoute: doorway.destination,
    expectedUrl,
    resultingUrl: '',
    viewport: testCase.viewport,
    device: testCase.device,
    activationMethod: testCase.method,
    event: testCase.event,
    targetAccessibleName: doorway.name,
    targetSelector: doorway.selector,
    screenshot,
    timestamp: new Date().toISOString(),
    success: false,
    failureReason: '',
  }

  try {
    // Direct navigation is used only to establish the source route. It is never used after activation.
    await page.goto(startingUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    const target = page.getByRole('link', { name: doorway.name, exact: true })
    await target.waitFor({ state: 'visible', timeout: 15000 })

    const box = await target.boundingBox()
    if (!box || box.width < 44 || box.height < 44) throw new Error(`invalid hit target ${JSON.stringify(box)}`)
    if (box.x < 0 || box.y < 0 || box.x + box.width > testCase.viewport.width || box.y + box.height > testCase.viewport.height) {
      throw new Error(`target outside viewport ${JSON.stringify(box)}`)
    }

    if (testCase.method === 'pointer') {
      await target.click({ timeout: 10000, noWaitAfter: true })
    } else if (testCase.method === 'touch') {
      await target.tap({ timeout: 10000 })
    } else if (testCase.method === 'keyboard') {
      await target.focus()
      const focused = await target.evaluate((element) => element === document.activeElement)
      if (!focused) throw new Error('keyboard target did not receive focus')
      await target.press('Enter')
    } else {
      throw new Error(`unsupported activation method: ${testCase.method}`)
    }

    await page.waitForURL((url) => normalizePath(url.toString()) === doorway.destination, { timeout: 15000 })
    record.resultingUrl = page.url()
    if (normalizePath(record.resultingUrl) !== doorway.destination) throw new Error(`incorrect resulting URL: ${record.resultingUrl}`)
    await page.screenshot({ path: path.join(outDir, screenshot), animations: 'disabled' })
    record.success = true
  } catch (error) {
    record.resultingUrl = page.url()
    record.failureReason = String(error?.message || error)
  } finally {
    await context.close()
  }

  return record
}

function validate(records) {
  const expectedCount = doorways.length * cases.length
  const keys = new Set()
  const errors = []
  if (records.length !== expectedCount) errors.push(`expected ${expectedCount} records, received ${records.length}`)

  for (const record of records) {
    const key = `${record.device}:${record.activationMethod}:${record.destinationRoute}`
    if (keys.has(key)) errors.push(`duplicate interaction: ${key}`)
    keys.add(key)
    if (record.exactSha !== exactSha || !/^[0-9a-f]{40}$/.test(record.exactSha)) errors.push(`invalid SHA: ${key}`)
    if (!allowedMethods.has(record.activationMethod) || forbiddenMethods.test(record.activationMethod)) errors.push(`forbidden method: ${key}`)
    if (!record.targetAccessibleName || !record.targetSelector || !record.screenshot) errors.push(`missing evidence metadata: ${key}`)
    if (!record.viewport?.width || !record.viewport?.height) errors.push(`missing viewport: ${key}`)
    if (!record.success) errors.push(`interaction failed: ${key}: ${record.failureReason}`)
    if (record.resultingUrl && normalizePath(record.resultingUrl) !== record.destinationRoute) errors.push(`wrong destination: ${key}`)
  }
  return errors
}

async function main() {
  await fs.mkdir(screenshotDir, { recursive: true })
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const interactions = []
  try {
    for (const doorway of doorways) {
      for (const testCase of cases) interactions.push(await prove({ browser, doorway, testCase }))
    }
  } finally {
    await browser.close()
  }

  const errors = validate(interactions)
  const receipt = {
    schemaVersion: 1,
    exactSha,
    baseUrl,
    createdAt: new Date().toISOString(),
    allowedActivationMethods: [...allowedMethods],
    directDestinationNavigationPermitted: false,
    interactions,
    status: errors.length === 0 ? 'passed' : 'failed',
    errors,
  }
  await fs.writeFile(path.join(outDir, 'native-doorway-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
  if (errors.length) {
    console.error('NATIVE_DOORWAY_PROOF_FAILED')
    console.error(JSON.stringify(receipt, null, 2))
    process.exitCode = 1
  } else {
    console.log('NATIVE_DOORWAY_PROOF_PASSED')
    console.log(JSON.stringify(receipt, null, 2))
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
