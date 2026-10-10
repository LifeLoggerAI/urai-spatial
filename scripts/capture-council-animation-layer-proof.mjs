import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const requireTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const exactHead = process.env.URAI_EXACT_HEAD
assert.match(exactHead || '', /^[0-9a-f]{40}$/, 'Exact donor head is required')
const output = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/retained-runtime-asset-render-proof/council')
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const models = [
  ['guide', 1708924, 'fd71bed01e3216b2b60c88a34bb37465ecd49d331f089ccba830e23df1446756'],
  ['archivist', 1708944, 'd5017492a51d7c96b4156eeb9339812a9e2edfabd73d929898ebb5ce7c9bfaaf'],
  ['guardian', 1708672, '05a5c7c4e2e47c4fb2c831b7c4aeee21d9443ab08ce681e667e730d397046564'],
  ['builder', 1709412, '16bd75109012c99ff10879dd6c80f59ab60248e4ea90eb27d163899acdb914be'],
  ['mirror', 1708872, '41447d012af9fd8abd181135a43cc2877c1318bde1fad6879916cc66c79fda9e'],
  ['trickster', 1708876, '06d12032e5c0076055c0b6d7fbe260e862bfbc77222fcc8f82b90d77be07a356'],
].map(([role, bytes, sha256]) => ({ role, bytes, sha256, path: `/assets/urai/generated/human-makehuman-v4/council-${role}-human-makehuman-v4.glb` }))
for (const model of models) for (const root of ['urai-tier1/public', 'urai-tier1/out']) {
  const bytes = await readFile(path.join(root, model.path.slice(1)))
  assert.equal(bytes.length, model.bytes, `${root}: retained ${model.role} byte count`)
  assert.equal(digest(bytes), model.sha256, `${root}: retained ${model.role} identity`)
}
await mkdir(output, { recursive: true })
const receipt = {
  schema: 'urai.retained-council-animation-layer-proof.v1', exactHead, models,
  truthBoundary: {
    freshUnsignedContexts: true, privateFixturesUsed: false, personalizedRuntimeVerified: false,
    visualApproval: false, currentReleaseAccepted: false, deploymentAuthorized: false,
    nativeDeviceAcceptance: false, animationPoseEnvelopeVerified: false, artPoseImprovementAccepted: false,
    paidGenerationUsed: false, retainedModelBytesUnchanged: true,
  }, cases: [], errors: [],
}

for (const reducedMotion of [false, true]) {
  const id = reducedMotion ? 'reduced-motion' : 'desktop'
  const viewport = { width: 1440, height: 900 }
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
  const context = await browser.newContext({ viewport, reducedMotion: reducedMotion ? 'reduce' : 'no-preference' })
  const page = await context.newPage()
  const responses = [], pageErrors = [], failedRequests = []
  page.on('pageerror', error => pageErrors.push(String(error)))
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText }))
  page.on('response', response => {
    const model = models.find(model => model.path === new URL(response.url()).pathname)
    if (model) responses.push((async () => {
      try {
        const bytes = await response.body()
        return { path: model.path, status: response.status(), bytes: bytes.length, sha256: digest(bytes) }
      } catch (error) { return { path: model.path, error: String(error) } }
    })())
  })
  const record = { id, viewport, reducedMotion, passed: false, pageErrors, failedRequests }
  try {
    const response = await page.goto(`${base}/council/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    assert.equal(response?.status(), 200, 'Council route status')
    const owner = page.locator('[data-spatial-realm="council"][data-council-embodied-ready="true"]')
    await owner.waitFor({ state: 'visible', timeout: 90000 })
    await page.waitForFunction(() => {
      const owner = document.querySelector('[data-spatial-realm="council"]')
      return owner && Array.from({ length: 6 }, (_, i) => owner.dataset[`councilIdleActive${i}`] !== undefined && owner.dataset[`councilBodyY${i}`] !== undefined && owner.dataset[`councilHeadX${i}`] !== undefined).every(Boolean)
    }, null, { timeout: 90000 })
    await page.waitForTimeout(800)
    record.samples = []
    for (let sample = 0; sample < 6; sample++) {
      record.samples.push(await owner.evaluate(element => Array.from({ length: 6 }, (_, index) => ({
        index,
        idleActive: element.dataset[`councilIdleActive${index}`] === 'true',
        listeningActive: element.dataset[`councilListeningActive${index}`] === 'true',
        bodyY: Number(element.dataset[`councilBodyY${index}`]),
        headX: Number(element.dataset[`councilHeadX${index}`]),
      }))))
      await page.waitForTimeout(500)
    }
    for (const sample of record.samples) for (const avatar of sample) {
      assert.ok(Number.isFinite(avatar.bodyY) && Number.isFinite(avatar.headX), 'Actual finite skeleton measurements')
      assert.equal(avatar.idleActive, !reducedMotion, 'Actual body-idle action state')
      assert.equal(avatar.listeningActive, !reducedMotion && avatar.index === 0, 'Actual selected head-listening action state')
    }
    const range = values => Math.max(...values) - Math.min(...values)
    record.selectedBodyYRange = range(record.samples.map(sample => sample[0].bodyY))
    record.selectedHeadXRange = range(record.samples.map(sample => sample[0].headX))
    if (reducedMotion) {
      assert.ok(record.selectedBodyYRange <= 1e-7 && record.selectedHeadXRange <= 1e-7, 'Reduced motion retains a static skeleton')
    } else {
      assert.ok(record.selectedBodyYRange > 1e-5, 'Selected avatar retained actual body breathing')
      assert.ok(record.selectedHeadXRange > 1e-5, 'Selected avatar retained actual head listening')
    }
    record.modelResponses = await Promise.all(responses)
    for (const model of models) {
      const actual = record.modelResponses.filter(response => response.path === model.path)
      assert.ok(actual.length, `Browser received ${model.role}`)
      assert.ok(actual.every(response => response.status === 200 && response.bytes === model.bytes && response.sha256 === model.sha256), `Browser ${model.role} identity`)
    }
    assert.equal(await owner.locator('canvas').count(), 1, 'One actual Council renderer')
    const image = await page.screenshot({ fullPage: false, animations: 'disabled', timeout: 90000 })
    const file = `${id}-${exactHead.slice(0, 12)}.png`
    await writeFile(path.join(output, file), image)
    record.image = { path: file, bytes: image.length, sha256: digest(image), width: image.readUInt32BE(16), height: image.readUInt32BE(20) }
    assert.ok(image.length > 12000, 'Actual scene screenshot')
    assert.equal(record.image.width, viewport.width)
    assert.equal(record.image.height, viewport.height)
    assert.equal(pageErrors.length, 0, 'No browser runtime errors')
    assert.equal(failedRequests.length, 0, 'No failed resource requests')
    record.passed = true
  } catch (error) {
    record.error = String(error)
    receipt.errors.push({ id, error: record.error })
  }
  receipt.cases.push(record)
  await context.close().catch(() => {})
  await browser.close().catch(() => {})
  await writeFile(path.join(output, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
}
if (receipt.errors.length) process.exitCode = 1
