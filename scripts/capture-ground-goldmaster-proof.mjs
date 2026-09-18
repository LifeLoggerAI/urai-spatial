import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')

const base = (process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '')
const outDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/ground-goldmaster-proof')
const exactHead = process.env.URAI_EXACT_HEAD || 'local'

const scenarios = [
  { id: 'temperate-desktop', environment: 'temperate', width: 1440, height: 900, mobile: false, reducedMotion: 'no-preference' },
  { id: 'woodland-desktop', environment: 'woodland', width: 1440, height: 900, mobile: false, reducedMotion: 'no-preference' },
  { id: 'temperate-phone-portrait', environment: 'temperate', width: 390, height: 844, mobile: true, reducedMotion: 'no-preference' },
  { id: 'woodland-phone-portrait', environment: 'woodland', width: 390, height: 844, mobile: true, reducedMotion: 'no-preference' },
  { id: 'temperate-reduced-motion', environment: 'temperate', width: 1440, height: 900, mobile: false, reducedMotion: 'reduce' },
]

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const captures = []
const errors = []

async function capture(page, scenario, state) {
  const file = `ground-${scenario.id}-${state}.png`
  await page.screenshot({ path: path.join(outDir, file), fullPage: false })
  captures.push({ scenario: scenario.id, environment: scenario.environment, reducedMotion: scenario.reducedMotion, state, file })
}

async function dragLook(page, canvasBox, dx, dy) {
  const x = canvasBox.x + canvasBox.width * 0.5
  const y = canvasBox.y + canvasBox.height * 0.5
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(240)
}

try {
  for (const scenario of scenarios) {
    const context = await browser.newContext({
      viewport: { width: scenario.width, height: scenario.height },
      isMobile: scenario.mobile,
      hasTouch: scenario.mobile,
      reducedMotion: scenario.reducedMotion,
      colorScheme: 'dark',
    })
    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(String(error)))
    page.on('console', (message) => { if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`) })

    await page.goto(`${base}/ground/?environment=${scenario.environment}`, { waitUntil: 'networkidle', timeout: 60_000 })
    const readyRoot = page.locator('[data-testid="urai-ground-lived-world"]').first()
    await readyRoot.waitFor({ state: 'visible', timeout: 45_000 })
    await page.waitForSelector('.ground-spatial-root canvas', { state: 'visible', timeout: 45_000 })
    try {
      await page.waitForFunction(() => document.querySelector('[data-testid="urai-ground-lived-world"]')?.getAttribute('data-ground-ready') === 'true', null, { timeout: 45_000, polling: 50 })
    } catch (error) {
      const diagnostic = await readyRoot.evaluate((node) => ({
        ready: node.getAttribute('data-ground-ready'),
        profile: node.getAttribute('data-ground-environment-profile'),
        camera: node.getAttribute('data-ground-camera-mode'),
        html: node.outerHTML.slice(0, 1200),
      })).catch(() => null)
      throw new Error(`${scenario.id}: Ground never reached exact ready state; diagnostic=${JSON.stringify(diagnostic)}; browserErrors=${pageErrors.join(" || ")}; cause=${String(error)}`)
    }
    await page.waitForTimeout(800)

    const root = page.locator('[data-testid="urai-ground-lived-world"]')
    const contract = await root.evaluate((node) => ({
      visualOwner: node.getAttribute('data-ground-visual-owner'),
      runtimeOwner: node.getAttribute('data-ground-runtime-owner'),
      exploration: node.getAttribute('data-ground-exploration'),
      camera: node.getAttribute('data-ground-camera'),
      eyeHeight: node.getAttribute('data-ground-eye-height'),
      desktopSpeed: node.getAttribute('data-ground-speed-desktop'),
      mobileSpeed: node.getAttribute('data-ground-speed-mobile'),
      acceleration: node.getAttribute('data-ground-acceleration'),
      deceleration: node.getAttribute('data-ground-deceleration'),
      collision: node.getAttribute('data-ground-collision'),
      visibleAvatar: node.getAttribute('data-ground-visible-avatar'),
      visibleHands: node.getAttribute('data-ground-visible-hands'),
      pointerLock: node.getAttribute('data-ground-pointer-lock'),
      placeLayer: node.getAttribute('data-ground-place-layer'),
      privateLocationMounted: node.getAttribute('data-ground-private-location-mounted'),
    }))

    const expected = {
      exploration: 'first-person-no-visible-body',
      eyeHeight: '1.69',
      desktopSpeed: '2.55',
      mobileSpeed: '2.4',
      acceleration: '8.5',
      deceleration: '10.2',
      visibleAvatar: 'false',
      visibleHands: 'false',
      pointerLock: 'false',
      placeLayer: 'consent-aware-empty-by-default',
      privateLocationMounted: 'false',
    }
    for (const [key, value] of Object.entries(expected)) {
      if (contract[key] !== value) errors.push(`${scenario.id}: ${key}=${contract[key]} expected ${value}`)
    }

    const canvas = page.locator('.ground-spatial-root canvas').first()
    const canvasBox = await canvas.boundingBox()
    if (!canvasBox || canvasBox.width < 240 || canvasBox.height < 240) throw new Error(`${scenario.id}: Ground canvas is not usable`)

    const fixedOrb = page.locator('.urai-world-companion__orb').first()
    const fixedOrbCount = await fixedOrb.count()
    const fixedOrbStyle = fixedOrbCount ? await fixedOrb.evaluate((node) => ({ opacity: getComputedStyle(node).opacity, pointerEvents: getComputedStyle(node).pointerEvents })) : null
    if (fixedOrbStyle && Number.parseFloat(fixedOrbStyle.opacity || '1') > 0.02) errors.push(`${scenario.id}: semantic Orb fallback is visibly duplicated`)

    await capture(page, scenario, 'idle')

    if (scenario.mobile) {
      const analog = page.locator('.ground-analog-pad').first()
      if (!(await analog.isVisible())) throw new Error(`${scenario.id}: analog movement pad is not visible`)
      const analogBox = await analog.boundingBox()
      if (!analogBox) throw new Error(`${scenario.id}: analog movement pad has no bounds`)
      await page.touchscreen.tap(analogBox.x + analogBox.width / 2, analogBox.y + analogBox.height * 0.2)
      await page.waitForTimeout(450)
      await capture(page, scenario, 'after-move')
    } else {
      await page.keyboard.down('KeyW')
      await page.waitForTimeout(700)
      await page.keyboard.up('KeyW')
      await page.waitForTimeout(180)
      await capture(page, scenario, 'after-move')

      await dragLook(page, canvasBox, 0, -220)
      await capture(page, scenario, 'look-down-material-gate')
      await dragLook(page, canvasBox, 0, 420)
      await capture(page, scenario, 'look-up-sky-gate')
      await dragLook(page, canvasBox, 620, -180)
      await capture(page, scenario, 'look-back-world-continuity')
    }

    captures[captures.length - 1].contract = contract
    errors.push(...pageErrors.map((error) => `${scenario.id}: ${error}`))
    await context.close()
  }
} finally {
  await browser.close()
}

const required = scenarios.flatMap((scenario) => scenario.mobile
  ? ['idle', 'after-move'].map((state) => `${scenario.id}:${state}`)
  : ['idle', 'after-move', 'look-down-material-gate', 'look-up-sky-gate', 'look-back-world-continuity'].map((state) => `${scenario.id}:${state}`))
const observed = new Set(captures.map((capture) => `${capture.scenario}:${capture.state}`))
for (const key of required) if (!observed.has(key)) errors.push(`missing required capture ${key}`)
const receipt = { schema: 'urai-ground-goldmaster-proof-2', exactHead, capturedAt: new Date().toISOString(), scenarios, captures, errors }
await writeFile(path.join(outDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
if (errors.length) throw new Error(`Ground Goldmaster proof recorded ${errors.length} error(s): ${errors.join(' | ')}`)
