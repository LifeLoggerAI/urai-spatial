import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/portal-orb-proof')
const portalPath = '/assets/urai/generated/models/portal-ring-master-v1.glb'
const orbPath = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'
const expected = {
  [portalPath]: { sha256: '6e29acaaab0eb048ddd2e4690bf5949ef58865061574ca961bdec6b6312d80f5', bytes: 73164 },
  [orbPath]: { sha256: '34f48f2bc042458c041d738d2b68d390eab05a61f91b37a8cd30defd0753d18c', bytes: 83984 },
}
const cases = [
  { id: 'desktop', viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' },
  { id: 'mobile', viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference', isMobile: true, hasTouch: true },
  { id: 'reduced-motion', viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' },
]

await mkdir(outputDir, { recursive: true })
for (const [assetPath, proof] of Object.entries(expected)) {
  const bytes = await readFile(path.resolve('urai-tier1/public', assetPath.slice(1)))
  const digest = createHash('sha256').update(bytes).digest('hex')
  if (bytes.length !== proof.bytes || digest !== proof.sha256) {
    throw new Error(`binary identity mismatch for ${assetPath}: bytes=${bytes.length} sha256=${digest}`)
  }
}

const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
const receipt = { schemaVersion: 'urai-portal-orb-proof-1', exactHead, capturedAt: new Date().toISOString(), cases: [], errors: [] }
for (const spec of cases) {
  const context = await browser.newContext({ viewport: spec.viewport, reducedMotion: spec.reducedMotion, isMobile: spec.isMobile, hasTouch: spec.hasTouch })
  const page = await context.newPage()
  const responses = new Map()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('response', (response) => {
    const pathname = new URL(response.url()).pathname
    if (pathname === portalPath || pathname === orbPath) responses.set(pathname, response.status())
  })
  const record = { id: spec.id, viewport: spec.viewport, reducedMotion: spec.reducedMotion, pageErrors, passed: false }
  try {
    const response = await page.goto(`${base}/home/?homeAssetReview=1&homePrivateFixture=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const owner = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    await owner.waitFor({ state: 'visible', timeout: 45_000 })
    await page.waitForFunction(() => document.querySelector('.urai-asset-home-world')?.getAttribute('data-home-assets-ready') === 'true', null, { timeout: 45_000 })
    await page.waitForTimeout(1800)
    record.status = response?.status()
    record.assetsReady = await owner.getAttribute('data-home-assets-ready')
    record.portalStatus = responses.get(portalPath) ?? null
    record.orbStatus = responses.get(orbPath) ?? null
    record.screenshot = `${spec.id}-${exactHead.slice(0, 12)}.png`
    await page.screenshot({ path: path.join(outputDir, record.screenshot), fullPage: true })
    record.passed = record.status === 200 && record.assetsReady === 'true' && record.portalStatus === 200 && record.orbStatus === 200 && pageErrors.length === 0
  } catch (error) {
    record.error = String(error)
  } finally {
    receipt.cases.push(record)
    if (!record.passed) receipt.errors.push(record)
    await context.close()
  }
}
await browser.close()
await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
if (receipt.errors.length) process.exit(1)
