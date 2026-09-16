import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')

const base = (process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '')
const outDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/ground-transition-proof')
const exactHead = process.env.URAI_EXACT_HEAD || 'local'

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
const captures = []
const errors = []

async function snapshot(page, id, metadata = {}) {
  const file = `${id}.png`
  await page.screenshot({ path: path.join(outDir, file), fullPage: false })
  captures.push({ id, file, url: page.url(), ...metadata })
}

async function waitForHomeReady(page) {
  await page.waitForSelector('[data-testid="home-visible-navigable-sanctuary-world"][data-home-ready="true"]', { timeout: 45_000 })
  await page.waitForSelector('.urai-asset-home-world canvas', { state: 'visible', timeout: 45_000 })
}

async function activatePhysicalTerrain(page) {
  const canvas = page.locator('.urai-asset-home-world canvas').first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Home canvas has no bounds')
  const candidates = [
    [0.50, 0.78],
    [0.38, 0.76],
    [0.62, 0.76],
    [0.50, 0.70],
  ]
  for (const [nx, ny] of candidates) {
    await page.mouse.click(box.x + box.width * nx, box.y + box.height * ny)
    const activated = await page.waitForFunction(() => {
      const root = document.querySelector('[data-testid="home-visible-navigable-sanctuary-world"]')
      return root?.getAttribute('data-home-ground-cinematic-phase') !== 'none'
    }, null, { timeout: 550 }).then(() => true).catch(() => false)
    if (activated) return { nx, ny }
    if (!page.url().includes('/home') && !page.url().endsWith('/')) throw new Error(`Terrain activation navigated unexpectedly to ${page.url()}`)
  }
  throw new Error('Could not activate physical Home terrain with retained-proof click candidates')
}

async function waitPhase(page, phase, timeout = 2500) {
  await page.waitForFunction((expected) => {
    const root = document.querySelector('[data-testid="home-visible-navigable-sanctuary-world"]')
    return root?.getAttribute('data-home-ground-cinematic-phase') === expected
  }, phase, { timeout })
  return page.locator('[data-testid="home-visible-navigable-sanctuary-world"]').evaluate((root) => ({
    phase: root.getAttribute('data-home-ground-cinematic-phase'),
    cameraMode: root.getAttribute('data-home-camera-mode'),
    progress: root.getAttribute('data-home-transition-progress'),
    avatarGeometry: root.getAttribute('data-home-ground-avatar-geometry'),
    durationMs: root.getAttribute('data-home-ground-cinematic-duration-ms'),
    visibleAvatarAuthority: root.getAttribute('data-home-embodied-self'),
  }))
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('console', (message) => { if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`) })
  await page.goto(`${base}/home/`, { waitUntil: 'networkidle', timeout: 60_000 })
  await waitForHomeReady(page)
  await snapshot(page, '01-home-before-ground-selection', {
    contract: await page.locator('[data-testid="home-visible-navigable-sanctuary-world"]').evaluate((root) => ({
      embodiedSelf: root.getAttribute('data-home-embodied-self'),
      presentation: root.getAttribute('data-home-presence-presentation'),
      groundEntry: root.getAttribute('data-home-ground-entry'),
      lifeMapEntry: root.getAttribute('data-home-life-map-entry'),
    })),
  })
  const activation = await activatePhysicalTerrain(page)
  const approach = await waitPhase(page, 'home-avatar-camera-approach')
  await snapshot(page, '02-home-avatar-camera-approach', { activation, contract: approach })
  const eye = await waitPhase(page, 'home-avatar-eye-transfer')
  await snapshot(page, '03-home-avatar-eye-transfer', { contract: eye })
  const surface = await waitPhase(page, 'ground-surface-approach')
  await snapshot(page, '04-ground-surface-approach', { contract: surface })
  const crossing = await waitPhase(page, 'ground-surface-crossing')
  await snapshot(page, '05-ground-surface-crossing-current-proxy', { contract: crossing })
  const fold = await waitPhase(page, 'ground-spatial-fold')
  await snapshot(page, '06-ground-spatial-fold-current-proxy', { contract: fold })
  await page.waitForURL(/\/ground\//, { timeout: 8000 })
  await page.waitForSelector('[data-testid="urai-ground-lived-world"][data-ground-ready="true"]', { timeout: 45_000 })
  await snapshot(page, '07-ground-arrival-first-frame')
  errors.push(...pageErrors.map((error) => `desktop: ${error}`))
  await context.close()

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const reducedPage = await reduced.newPage()
  const reducedErrors = []
  reducedPage.on('pageerror', (error) => reducedErrors.push(String(error)))
  reducedPage.on('console', (message) => { if (message.type() === 'error') reducedErrors.push(`console: ${message.text()}`) })
  await reducedPage.goto(`${base}/home/`, { waitUntil: 'networkidle', timeout: 60_000 })
  await waitForHomeReady(reducedPage)
  const reducedActivation = await activatePhysicalTerrain(reducedPage)
  await reducedPage.waitForFunction(() => {
    const root = document.querySelector('[data-testid="home-visible-navigable-sanctuary-world"]')
    return root?.getAttribute('data-home-ground-cinematic-duration-ms') === '520'
  }, null, { timeout: 1000 })
  await snapshot(reducedPage, '08-reduced-motion-ground-transfer', { activation: reducedActivation })
  await reducedPage.waitForURL(/\/ground\//, { timeout: 5000 })
  await reducedPage.waitForSelector('[data-testid="urai-ground-lived-world"][data-ground-ready="true"]', { timeout: 45_000 })
  await snapshot(reducedPage, '09-reduced-motion-ground-arrival')
  errors.push(...reducedErrors.map((error) => `reduced: ${error}`))
  await reduced.close()
} catch (error) {
  errors.push(String(error))
} finally {
  await browser.close()
}

const receipt = {
  schema: 'urai-ground-transition-proof-1',
  exactHead,
  capturedAt: new Date().toISOString(),
  captures,
  errors,
  boundary: 'Screenshots are retained runtime evidence; crossing/fold proxy frames are not Gold-Master acceptance until literal inspection passes.',
}
await writeFile(path.join(outDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
if (errors.length) throw new Error(`Ground transition proof recorded ${errors.length} error(s): ${errors.join(' | ')}`)
if (captures.length < 9) throw new Error(`Expected 9 Ground transition captures, got ${captures.length}`)
