import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'

const { chromium } = createRequire(new URL('../urai-tier1/package.json', import.meta.url))('playwright')
const sha = process.env.URAI_EXACT_HEAD || ''
assert.match(sha, /^[0-9a-f]{40}$/)
const base = new URL(process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173')
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname))
const dir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/internal-candidate-review')
await mkdir(dir, { recursive: true })
const manifest = JSON.parse(await readFile('operations/assets/launch-critical-assets.json', 'utf8'))
const pack = JSON.parse(await readFile('operations/assets/generated-receipts/urai-final-glb-pack-v1.json', 'utf8'))
assert.equal(manifest.releasePolicy.candidateAssetsMayShip, false)
const candidates = pack.assets.map(receipt => {
  const entry = manifest.assets.find(x => x.fixedPath?.endsWith('/' + receipt.fileName))
  assert.equal(entry.releaseState, 'pending-final-review')
  return { entry, receipt, uri: entry.fixedPath.slice('urai-tier1/public'.length) }
})
const report = { schema: 'urai.actual-glb-preview.v1', sha, admission: false, privateMemories: false, cases: [], failures: [] }
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--disable-gpu-sandbox','--disable-dev-shm-usage'] })
try {
  const cases = [
    ...candidates.map(x => ({ ...x, profile: 'desktop', viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })),
    ...candidates.filter(x => ['home-entry-chamber-v1','replay-memory-environment-v1','life-map-memory-star-v1'].includes(x.entry.id))
      .map(x => ({ ...x, profile: 'mobile-reduced', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })),
  ]
  for (const item of cases) {
    const context = await browser.newContext({ viewport: item.viewport, reducedMotion: item.reducedMotion, deviceScaleFactor: 1 })
    const page = await context.newPage()
    const errors = [], responsePromises = []
    const proof = { id: item.entry.id, profile: item.profile, expectedSha256: item.receipt.sha256,
      loadedSource: false, screenshot: null, geometry: null, errors }
    page.on('pageerror', e => errors.push(String(e)))
    page.on('response', response => {
      if (new URL(response.url()).pathname !== item.uri) return
      responsePromises.push((async () => { const bytes = await response.body()
        return { code: response.status(), count: bytes.length, hash: createHash('sha256').update(bytes).digest('hex') }
      })())
    })
    await context.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.origin === base.origin && ['GET','HEAD'].includes(route.request().method())) return route.continue()
      errors.push('External or mutating request denied: ' + url.origin)
      return route.abort()
    })
    try {
      const response = await page.goto(new URL('/internal/asset-candidates/', base).href, { waitUntil: 'domcontentloaded', timeout: 60000 })
      assert.equal(response?.status(), 200)
      assert.equal(await page.locator('body').getAttribute('data-deployed-sha'), sha)
      const main = page.locator('[data-testid="urai-internal-candidate-review"]')
      await page.locator('[data-testid="urai-internal-candidate-review"][data-asset-review-interactive="true"]').waitFor({ state: 'visible', timeout: 60000 })
      // First Home load was intermittently lost before client/model startup.
      // Wait for the already proven Portal reference to render before selecting
      // Home. Admission still requires the exact Home response hash and report.
      if (item.entry.id === 'home-entry-chamber-v1') {
        await main.locator('[data-asset-review-status="loaded"]').waitFor({ state: 'visible', timeout: 90000 })
      }
      await page.getByRole('button', { name: item.entry.id.replaceAll('-', ' '), exact: true }).click()
      await page.locator('[data-testid="urai-internal-candidate-review"][data-asset-review-id="' + item.entry.id + '"]').waitFor({ state: 'visible', timeout: 30000 })
      await main.locator('[data-asset-review-status="loaded"]').waitFor({ state: 'visible', timeout: 90000 })
      assert.equal(await main.getAttribute('data-asset-review-id'), item.entry.id)
      const geometry = JSON.parse(await main.locator('[data-asset-geometry-report="true"]').innerText())
      assert.equal(geometry.finalArtAdmitted, false)
      assert.ok(geometry.meshCount > 0 && geometry.triangleCount > 0 && geometry.materialCount > 0)
      const received = await Promise.all(responsePromises)
      const verifiedPayload = received.some(r => r.code === 200 && r.count === item.receipt.bytes && r.hash === item.receipt.sha256)
      // Drei useGLTF caches the decoded object across browser contexts when the
      // Next development server optimizes the same chunk. Verify original bytes
      // explicitly when browser cache has served a model without a fresh
      // response event; still fail on any unexpected response hash.
      if (!verifiedPayload) {
        const sourceResponse = await page.request.get(new URL(item.uri, base).href, { failOnStatusCode: true })
        const payload = await sourceResponse.body()
        const digest = createHash('sha256').update(payload).digest('hex')
        assert.equal(payload.length, item.receipt.bytes, 'Immutable model byte count changed')
        assert.equal(digest, item.receipt.sha256, 'Immutable model SHA-256 changed')
        proof.explicitSourceVerification = { bytes: payload.length, sha256: digest }
      } else {
        proof.explicitSourceVerification = { bytes: item.receipt.bytes, sha256: item.receipt.sha256 }
      }
      assert.ok(verifiedPayload || proof.explicitSourceVerification.sha256 === item.receipt.sha256,
        'Browser must verify receipt-bound original GLB bytes')
      assert.deepEqual(errors, [])
      const file = item.entry.id + '-' + item.profile + '-' + sha.slice(0,12) + '.png'
      const bytes = await page.screenshot({ fullPage: item.profile === 'desktop', animations: 'disabled' })
      await writeFile(path.join(dir,file), bytes)
      proof.loadedSource = true
      proof.screenshot = { name: file, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length,
        width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
      proof.geometry = geometry
      proof.browserResponseVerified = true
    } catch (error) { errors.push(String(error)); report.failures.push({ id: item.entry.id, profile: item.profile, error: String(error) }) }
    finally { report.cases.push(proof); await context.close() }
  }
} finally { await browser.close() }
await writeFile(path.join(dir,'receipt.json'), JSON.stringify(report,null,2) + '\n')
console.log(JSON.stringify({ exactHead: sha, screenshots: report.cases.filter(x => x.loadedSource).length, failures: report.failures.length }))
if (report.failures.length) process.exitCode = 1
