import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')

const base = (process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '')
const outDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/ground-goldmaster-proof')
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const viewports = [
  { id: 'desktop', width: 1440, height: 900, mobile: false },
  { id: 'mobile', width: 390, height: 844, mobile: true },
]

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const captures = []
const errors = []

async function capture(page, viewport, state) {
  const file = `ground-${viewport.id}-${state}.png`
  await page.screenshot({ path: path.join(outDir, file), fullPage: false })
  captures.push({ viewport: viewport.id, state, file })
}

async function retainDiagnostic(page, viewport, pageErrors, phase, failure) {
  const root = page.locator('[data-testid="urai-ground-lived-world"]').first()
  const canvas = page.locator('.ground-spatial-root canvas').first()
  const rootCount = await root.count().catch(() => 0)
  const canvasCount = await canvas.count().catch(() => 0)
  const rootState = rootCount ? await root.evaluate((node) => ({ ready: node.getAttribute('data-ground-ready'), visualOwner: node.getAttribute('data-ground-visual-owner'), runtimeOwner: node.getAttribute('data-ground-runtime-owner'), exploration: node.getAttribute('data-ground-exploration'), camera: node.getAttribute('data-ground-camera'), cameraMode: node.getAttribute('data-ground-camera-mode'), environment: node.getAttribute('data-ground-environment-profile'), rect: (() => { const rect = node.getBoundingClientRect(); return { width: rect.width, height: rect.height, x: rect.x, y: rect.y } })() })).catch((error) => ({ evaluateError: String(error) })) : null
  const canvasState = canvasCount ? { visible: await canvas.isVisible().catch(() => false), box: await canvas.boundingBox().catch(() => null) } : null
  const bodyExcerpt = await page.locator('body').innerText().then((text) => text.slice(0, 4000)).catch(() => '')
  const htmlExcerpt = await page.locator('body').innerHTML().then((html) => html.slice(0, 6000)).catch(() => '')
  const diagnostic = { schema: 'urai-ground-proof-diagnostic-1', exactHead, viewport: viewport.id, phase, url: page.url(), failure: String(failure), rootCount, rootState, canvasCount, canvasState, pageErrors, bodyExcerpt, htmlExcerpt }
  const jsonFile = `ground-${viewport.id}-${phase}-diagnostic.json`
  const screenshotFile = `ground-${viewport.id}-${phase}-diagnostic.png`
  await writeFile(path.join(outDir, jsonFile), `${JSON.stringify(diagnostic, null, 2)}\n`, 'utf8')
  await page.screenshot({ path: path.join(outDir, screenshotFile), fullPage: false }).catch(() => undefined)
  captures.push({ viewport: viewport.id, state: `${phase}-diagnostic`, file: screenshotFile, diagnostic: jsonFile })
}

async function dragLook(page, canvasBox, dx, dy) {
  const x = canvasBox.x + canvasBox.width * 0.5
  const y = canvasBox.y + canvasBox.height * 0.5
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 12 }); await page.mouse.up(); await page.waitForTimeout(240)
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.mobile, hasTouch: viewport.mobile, reducedMotion: 'no-preference', colorScheme: 'dark' })
    const page = await context.newPage(); const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(String(error)))
    page.on('console', (message) => { if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`) })
    await page.goto(`${base}/ground/?environment=temperate`, { waitUntil: 'networkidle', timeout: 60_000 })
    try { await page.waitForSelector('[data-testid="urai-ground-lived-world"]', { state: 'visible', timeout: 20_000 }) } catch (error) { await retainDiagnostic(page, viewport, pageErrors, 'root-timeout', error); errors.push(`${viewport.id}: Ground root did not become visible`); await context.close(); continue }
    try { await page.waitForSelector('.ground-spatial-root canvas', { state: 'visible', timeout: 20_000 }) } catch (error) { await retainDiagnostic(page, viewport, pageErrors, 'canvas-timeout', error); errors.push(`${viewport.id}: Ground canvas did not become visible`); await context.close(); continue }
    try { await page.waitForSelector('[data-testid="urai-ground-lived-world"][data-ground-ready="true"]', { timeout: 20_000 }) } catch (error) { await retainDiagnostic(page, viewport, pageErrors, 'readiness-timeout', error); errors.push(`${viewport.id}: Ground readiness did not become true`) }
    await page.waitForTimeout(250)
    const root = page.locator('[data-testid="urai-ground-lived-world"]')
    const contract = await root.evaluate((node) => ({ ready: node.getAttribute('data-ground-ready'), visualOwner: node.getAttribute('data-ground-visual-owner'), runtimeOwner: node.getAttribute('data-ground-runtime-owner'), exploration: node.getAttribute('data-ground-exploration'), camera: node.getAttribute('data-ground-camera'), eyeHeight: node.getAttribute('data-ground-eye-height'), desktopSpeed: node.getAttribute('data-ground-speed-desktop'), mobileSpeed: node.getAttribute('data-ground-speed-mobile'), acceleration: node.getAttribute('data-ground-acceleration'), deceleration: node.getAttribute('data-ground-deceleration'), collision: node.getAttribute('data-ground-collision'), visibleAvatar: node.getAttribute('data-ground-visible-avatar'), visibleHands: node.getAttribute('data-ground-visible-hands'), pointerLock: node.getAttribute('data-ground-pointer-lock'), placeLayer: node.getAttribute('data-ground-place-layer'), privateLocationMounted: node.getAttribute('data-ground-private-location-mounted') }))
    const expected = { ready: 'true', exploration: 'first-person-no-visible-body', eyeHeight: '1.69', desktopSpeed: '2.55', mobileSpeed: '2.4', acceleration: '8.5', deceleration: '10.2', visibleAvatar: 'false', visibleHands: 'false', pointerLock: 'false', placeLayer: 'consent-aware-empty-by-default', privateLocationMounted: 'false' }
    for (const [key, value] of Object.entries(expected)) if (contract[key] !== value) errors.push(`${viewport.id}: ${key}=${contract[key]} expected ${value}`)
    const canvas = page.locator('.ground-spatial-root canvas').first(); const canvasBox = await canvas.boundingBox(); if (!canvasBox || canvasBox.width < 240 || canvasBox.height < 240) throw new Error(`${viewport.id}: Ground canvas is not usable`)
    const fixedOrb = page.locator('.urai-world-companion__orb').first(); const fixedOrbCount = await fixedOrb.count(); const fixedOrbStyle = fixedOrbCount ? await fixedOrb.evaluate((node) => ({ opacity: getComputedStyle(node).opacity, pointerEvents: getComputedStyle(node).pointerEvents })) : null
    if (fixedOrbStyle && Number.parseFloat(fixedOrbStyle.opacity || '1') > 0.02) errors.push(`${viewport.id}: semantic Orb fallback is visibly duplicated`)
    await capture(page, viewport, 'idle')
    if (viewport.mobile) {
      const analog = page.locator('.ground-analog-pad').first(); if (!(await analog.isVisible())) throw new Error('mobile: analog movement pad is not visible'); const analogBox = await analog.boundingBox(); if (!analogBox) throw new Error('mobile: analog movement pad has no bounds'); await page.touchscreen.tap(analogBox.x + analogBox.width / 2, analogBox.y + analogBox.height * 0.2); await page.waitForTimeout(450); await capture(page, viewport, 'after-move')
    } else {
      await page.keyboard.down('KeyW'); await page.waitForTimeout(700); await page.keyboard.up('KeyW'); await page.waitForTimeout(180); await capture(page, viewport, 'after-move'); await dragLook(page, canvasBox, 0, -220); await capture(page, viewport, 'look-down-material-gate'); await dragLook(page, canvasBox, 0, 420); await capture(page, viewport, 'look-up-sky-gate'); await dragLook(page, canvasBox, 620, -180); await capture(page, viewport, 'look-back-world-continuity')
    }
    captures[captures.length - 1].contract = contract
    errors.push(...pageErrors.map((error) => `${viewport.id}: ${error}`)); await context.close()
  }
} finally { await browser.close() }

const receipt = { schema: 'urai-ground-goldmaster-proof-1', exactHead, capturedAt: new Date().toISOString(), captures, errors }
await writeFile(path.join(outDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
if (errors.length) throw new Error(`Ground Goldmaster proof recorded ${errors.length} error(s): ${errors.join(' | ')}`)
