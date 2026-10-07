import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const exactHead = process.env.URAI_EXACT_HEAD
if (!/^[0-9a-f]{40}$/.test(exactHead || '')) throw new Error('Exact donor head is required')
const output = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/restored-home-source-proof')
const modelPath = '/assets/urai/generated/models/home-entry-chamber-v1.glb'
const expected = { bytes: 184160, sha256: 'b7bdced5a721598a9dfe592ee19da04d754d5b8b1d48b23cc44403a89b1ee529' }
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
for (const root of ['urai-tier1/public', 'urai-tier1/out']) {
  const bytes = await readFile(path.join(root, modelPath.slice(1)))
  if (bytes.length !== expected.bytes || digest(bytes) !== expected.sha256) throw new Error(`${root}: restored model identity changed`)
}
await mkdir(output, { recursive: true })
const receipt = {
  schema: 'urai.restored-home-source-proof.v1', exactHead, modelPath, expected,
  truthBoundary: {
    freshUnsignedContexts: true, privateFixturesUsed: false, personalizedRuntimeVerified: false,
    visualApproval: false, currentReleaseAccepted: false, deploymentAuthorized: false,
    nativeDeviceAcceptance: false, animationPoseEnvelopeVerified: false,
  }, cases: [], errors: [],
}
const cases = [
  { id: 'desktop', viewport: { width: 1440, height: 900 } },
  { id: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { id: 'tablet-portrait', viewport: { width: 768, height: 1024 } },
  { id: 'tablet-landscape', viewport: { width: 1024, height: 768 } },
  { id: 'reduced-motion', viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' },
  { id: 'no-webgl', viewport: { width: 390, height: 844 }, noWebGL: true },
]

for (const spec of cases) {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
  const context = await browser.newContext({ viewport: spec.viewport, isMobile: spec.isMobile, hasTouch: spec.hasTouch, reducedMotion: spec.reducedMotion })
  const page = await context.newPage()
  const modelResponses = []
  const pageErrors = []
  const failedRequests = []
  page.on('pageerror', error => pageErrors.push(String(error)))
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText }))
  page.on('response', response => {
    if (new URL(response.url()).pathname === modelPath) modelResponses.push((async () => {
      try {
        const bytes = await response.body()
        return { status: response.status(), bytes: bytes.length, sha256: digest(bytes) }
      } catch (error) { return { error: String(error) } }
    })())
  })
  const record = { id: spec.id, viewport: spec.viewport, noWebGL: Boolean(spec.noWebGL), passed: false, pageErrors, failedRequests }
  try {
    if (spec.noWebGL) await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null
        return original.apply(this, [type, ...args])
      }
    })
    const response = await page.goto(`${base}/home/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    if (response?.status() !== 200) throw new Error(`Home status=${response?.status()}`)
    if (spec.noWebGL) {
      await page.locator('[data-urai-home-runtime="accessible-fallback-without-webgl"]').waitFor({ state: 'visible', timeout: 90000 })
      record.runtimeState = 'accessible-fallback-without-webgl'
      const navigation = page.getByRole('navigation', { name: 'Accessible Home destinations' })
      if (await navigation.locator('button,a[href]').count() !== 3) throw new Error('Fallback destinations missing')
    } else {
      const owner = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"][data-home-assets-ready="true"]')
      await owner.waitFor({ state: 'visible', timeout: 90000 })
      await page.locator('.urai-home-spatial-runtime-layer[data-webgl-ready="true"][data-home-assets-ready="true"]').waitFor({ state: 'visible', timeout: 90000 })
      await page.evaluate(() => new Promise(resolve => {
        let frames = 0
        const tick = () => { frames += 1; frames >= 8 ? resolve() : requestAnimationFrame(tick) }
        requestAnimationFrame(tick)
      }))
      record.runtimeState = 'renderer-and-assets-ready'
      record.runtimeAssets = await owner.getAttribute('data-home-runtime-assets')
      if (!record.runtimeAssets?.includes('home-entry-chamber-v1.glb')) throw new Error('Current settled owner omitted the restored model')
      record.modelResponses = await Promise.all(modelResponses)
      if (!record.modelResponses.length || record.modelResponses.some(item => item.status !== 200 || item.bytes !== expected.bytes || item.sha256 !== expected.sha256)) throw new Error('Actual browser model response differs from reviewed bytes')
      record.canvasCount = await owner.locator('canvas').count()
      if (record.canvasCount !== 1) throw new Error(`Expected one settled canvas, found ${record.canvasCount}`)
      if (spec.reducedMotion === 'reduce' && await owner.getAttribute('data-home-orb-reduced-motion') !== 'true') throw new Error('Reduced motion not observed')
    }
    const image = await page.screenshot({ fullPage: false, animations: 'disabled', timeout: 90000 })
    const file = `${spec.id}-${exactHead.slice(0, 12)}.png`
    await writeFile(path.join(output, file), image)
    record.image = { path: file, bytes: image.length, sha256: digest(image), width: image.readUInt32BE(16), height: image.readUInt32BE(20) }
    if (image.length <= 12000 || record.image.width !== spec.viewport.width || record.image.height !== spec.viewport.height) throw new Error('Screenshot identity or viewport invalid')
    if (pageErrors.length || failedRequests.length) throw new Error('Runtime produced errors or failed resource requests')
    record.passed = true
  } catch (error) {
    record.error = String(error)
    receipt.errors.push({ id: spec.id, error: record.error })
  }
  receipt.cases.push(record)
  await context.close().catch(() => {})
  await browser.close().catch(() => {})
  await writeFile(path.join(output, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
}
if (receipt.errors.length) process.exitCode = 1
