import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/portal-orb-proof')
await mkdir(outputDir, { recursive: true })

const cases = [
  { id: 'desktop-left-sky', viewport: { width: 1440, height: 900 }, point: [.20, .18], expected: 'SKY_ASCENT' },
  { id: 'desktop-center-sky', viewport: { width: 1440, height: 900 }, point: [.50, .22], expected: 'SKY_ASCENT' },
  { id: 'desktop-right-sky', viewport: { width: 1440, height: 900 }, point: [.80, .18], expected: 'SKY_ASCENT' },
  { id: 'desktop-upper-middle-sky', viewport: { width: 1440, height: 900 }, point: [.50, .11], expected: 'SKY_ASCENT' },
  { id: 'desktop-ground-negative', viewport: { width: 1440, height: 900 }, point: [.50, .82], expected: 'NOT_SKY_ASCENT' },
  { id: 'mobile-sky', viewport: { width: 390, height: 844 }, point: [.50, .16], expected: 'SKY_ASCENT', isMobile: true, hasTouch: true },
  { id: 'mobile-ground-negative', viewport: { width: 390, height: 844 }, point: [.50, .82], expected: 'NOT_SKY_ASCENT', isMobile: true, hasTouch: true },
  { id: 'reduced-motion-sky', viewport: { width: 1440, height: 900 }, point: [.50, .18], expected: 'SKY_ASCENT', reducedMotion: 'reduce' },
]

const receipt = { schemaVersion: 'urai-home-sky-interaction-proof-4', exactHead, capturedAt: new Date().toISOString(), cases: [], errors: [] }

for (const spec of cases) {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
  const context = await browser.newContext({ viewport: spec.viewport, isMobile: spec.isMobile, hasTouch: spec.hasTouch, reducedMotion: spec.reducedMotion })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(String(error)))
  const record = { ...spec, passed: false, pageErrors }
  try {
    await page.goto(`${base}/home/?homeAssetReview=1&homePrivateFixture=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const owner = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    await owner.waitFor({ state: 'visible', timeout: 45_000 })
    await page.waitForFunction(() => document.querySelector('.urai-asset-home-world')?.getAttribute('data-home-assets-ready') === 'true', null, { timeout: 45_000 })
    await page.evaluate(() => {
      const root = document.querySelector('.urai-asset-home-world')
      window.__uraiSkyPhaseTrace = root ? [root.getAttribute('data-home-scene-phase')] : []
      window.__uraiSkyTraceObserver?.disconnect?.()
      if (root) {
        window.__uraiSkyTraceObserver = new MutationObserver(() => {
          window.__uraiSkyPhaseTrace.push(root.getAttribute('data-home-scene-phase'))
        })
        window.__uraiSkyTraceObserver.observe(root, { attributes: true, attributeFilter: ['data-home-scene-phase'] })
      }
    })
    const canvas = owner.locator('canvas')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Home canvas has no interaction bounds')
    const x = box.x + box.width * spec.point[0]
    const y = box.y + box.height * spec.point[1]
    if (spec.hasTouch) await page.touchscreen.tap(x, y)
    else await page.mouse.click(x, y)

    if (spec.expected === 'SKY_ASCENT') {
      await page.waitForFunction(() => {
        const root = document.querySelector('.urai-asset-home-world')
        const trace = window.__uraiSkyPhaseTrace || []
        return trace.includes('SKY_ASCENT')
          && root?.getAttribute('data-home-input-locked') === 'true'
          && root?.getAttribute('data-home-transition-sequence') === 'life-map:traversal'
          && root?.getAttribute('data-home-portal-sequence') === 'idle'
      }, null, { timeout: 6_000, polling: 25 })
      record.scenePhase = await owner.getAttribute('data-home-scene-phase')
      record.phaseTrace = await page.evaluate(() => window.__uraiSkyPhaseTrace || [])
      record.observedSkyAscent = record.phaseTrace.includes('SKY_ASCENT')
      record.inputLocked = await owner.getAttribute('data-home-input-locked')
      record.transitionSequence = await owner.getAttribute('data-home-transition-sequence')
      record.portalSequence = await owner.getAttribute('data-home-portal-sequence')
      record.cameraMode = await owner.getAttribute('data-home-camera-mode')
      await page.waitForTimeout(spec.reducedMotion === 'reduce' ? 80 : 180)
      await page.screenshot({ path: path.join(outputDir, `${spec.id}-${exactHead.slice(0,12)}.png`), animations: 'disabled', caret: 'hide' })
      record.passed = record.observedSkyAscent === true
        && record.inputLocked === 'true'
        && record.transitionSequence === 'life-map:traversal'
        && record.portalSequence === 'idle'
        && record.cameraMode === 'life-map'
        && pageErrors.length === 0
    } else {
      await page.waitForTimeout(300)
      record.scenePhase = await owner.getAttribute('data-home-scene-phase')
      record.phaseTrace = await page.evaluate(() => window.__uraiSkyPhaseTrace || [])
      record.inputLocked = await owner.getAttribute('data-home-input-locked')
      record.transitionSequence = await owner.getAttribute('data-home-transition-sequence')
      record.portalSequence = await owner.getAttribute('data-home-portal-sequence')
      record.passed = !record.phaseTrace.includes('SKY_ASCENT')
        && record.transitionSequence !== 'life-map:traversal'
        && record.portalSequence === 'idle'
        && pageErrors.length === 0
    }
  } catch (error) {
    record.error = String(error)
  }
  receipt.cases.push(record)
  if (!record.passed) receipt.errors.push(record)
  await context.close().catch(() => {})
  await browser.close().catch(() => {})
}

await writeFile(path.join(outputDir, 'sky-interaction-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
if (receipt.errors.length) process.exit(1)
