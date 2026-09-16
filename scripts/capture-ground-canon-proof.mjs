import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')

const base = (process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '')
const outDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/ground-canon-proof')
const exactHead = process.env.URAI_EXACT_HEAD || 'local'

const viewports = [
  { id: 'desktop', width: 1440, height: 900, mobile: false },
  { id: 'mobile', width: 390, height: 844, mobile: true },
]

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
const captures = []
const errors = []

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile,
      hasTouch: viewport.mobile,
      reducedMotion: 'no-preference',
      colorScheme: 'dark',
    })
    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(String(error)))
    page.on('console', (message) => { if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`) })

    await page.goto(`${base}/ground/?environment=temperate`, { waitUntil: 'networkidle', timeout: 60_000 })
    await page.waitForSelector('[data-testid="urai-ground-lived-world"][data-ground-ready="true"]', { timeout: 45_000 })
    await page.waitForSelector('.ground-spatial-root canvas', { state: 'visible', timeout: 45_000 })
    await page.waitForTimeout(700)

    const contract = await page.locator('[data-testid="urai-ground-lived-world"]').evaluate((root) => ({
      visualOwner: root.getAttribute('data-ground-visual-owner'),
      runtimeOwner: root.getAttribute('data-ground-runtime-owner'),
      exploration: root.getAttribute('data-ground-exploration'),
      camera: root.getAttribute('data-ground-camera'),
      eyeHeight: root.getAttribute('data-ground-eye-height'),
      desktopSpeed: root.getAttribute('data-ground-speed-desktop'),
      mobileSpeed: root.getAttribute('data-ground-speed-mobile'),
      acceleration: root.getAttribute('data-ground-acceleration'),
      deceleration: root.getAttribute('data-ground-deceleration'),
      collision: root.getAttribute('data-ground-collision'),
      visibleAvatar: root.getAttribute('data-ground-visible-avatar'),
      visibleHands: root.getAttribute('data-ground-visible-hands'),
      pointerLock: root.getAttribute('data-ground-pointer-lock'),
    }))

    const canvas = page.locator('.ground-spatial-root canvas').first()
    const canvasBox = await canvas.boundingBox()
    if (!canvasBox || canvasBox.width < 240 || canvasBox.height < 240) throw new Error(`${viewport.id}: Ground canvas is not usable`)

    const fixedOrb = page.locator('.urai-world-companion__orb').first()
    const fixedOrbCount = await fixedOrb.count()
    const fixedOrbStyle = fixedOrbCount ? await fixedOrb.evaluate((node) => ({ opacity: getComputedStyle(node).opacity, pointerEvents: getComputedStyle(node).pointerEvents })) : null

    const idlePath = path.join(outDir, `ground-${viewport.id}-idle.png`)
    await page.screenshot({ path: idlePath, fullPage: false })
    captures.push({ viewport: viewport.id, state: 'idle', file: path.basename(idlePath), contract, fixedOrbStyle })

    if (viewport.mobile) {
      const analog = page.locator('.ground-analog-pad').first()
      if (!(await analog.isVisible())) throw new Error('mobile: analog movement pad is not visible')
      const analogBox = await analog.boundingBox()
      if (!analogBox) throw new Error('mobile: analog movement pad has no bounds')
      await page.touchscreen.tap(analogBox.x + analogBox.width / 2, analogBox.y + analogBox.height * 0.2)
      await page.waitForTimeout(450)
      const movePath = path.join(outDir, 'ground-mobile-after-move.png')
      await page.screenshot({ path: movePath, fullPage: false })
      captures.push({ viewport: viewport.id, state: 'after-move', file: path.basename(movePath) })
    } else {
      await page.keyboard.down('KeyW')
      await page.waitForTimeout(700)
      await page.keyboard.up('KeyW')
      await page.waitForTimeout(160)
      const movePath = path.join(outDir, 'ground-desktop-after-move.png')
      await page.screenshot({ path: movePath, fullPage: false })
      captures.push({ viewport: viewport.id, state: 'after-move', file: path.basename(movePath) })
    }

    for (const [key, expected] of Object.entries({
      exploration: 'first-person-no-visible-body',
      eyeHeight: '1.69',
      desktopSpeed: '2',
      mobileSpeed: '1.8',
      acceleration: '6.5',
      deceleration: '8',
      visibleAvatar: 'false',
      visibleHands: 'false',
      pointerLock: 'false',
    })) {
      if (contract[key] !== expected) errors.push(`${viewport.id}: ${key}=${contract[key]} expected ${expected}`)
    }
    if (fixedOrbStyle && Number.parseFloat(fixedOrbStyle.opacity || '1') > 0.02) errors.push(`${viewport.id}: fixed Orb is still visibly duplicated`)
    errors.push(...pageErrors.map((error) => `${viewport.id}: ${error}`))
    await context.close()
  }
} finally {
  await browser.close()
}

const receipt = { schema: 'urai-ground-canon-proof-1', exactHead, capturedAt: new Date().toISOString(), captures, errors }
await writeFile(path.join(outDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
if (errors.length) throw new Error(`Ground canon proof recorded ${errors.length} error(s): ${errors.join(' | ')}`)
