import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')

const base = (process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '')
const outDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/ground-performance-proof')
const exactHead = process.env.URAI_EXACT_HEAD || 'local'

const profiles = [
  { id: 'desktop', width: 1440, height: 900, mobile: false, sampleFrames: 300 },
  { id: 'mobile', width: 390, height: 844, mobile: true, sampleFrames: 240 },
]

function percentile(values, fraction) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))]
}

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
const results = []
const errors = []

try {
  for (const profile of profiles) {
    const context = await browser.newContext({
      viewport: { width: profile.width, height: profile.height },
      isMobile: profile.mobile,
      hasTouch: profile.mobile,
      reducedMotion: 'no-preference',
    })
    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(String(error)))
    page.on('console', (message) => { if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`) })

    await page.goto(`${base}/ground/?environment=temperate`, { waitUntil: 'networkidle', timeout: 60_000 })
    const root = page.locator('[data-testid="urai-ground-lived-world"][data-ground-ready="true"]')
    await root.waitFor({ state: 'visible', timeout: 45_000 })
    await page.locator('.ground-spatial-root canvas').first().waitFor({ state: 'visible', timeout: 45_000 })

    const renderer = await page.evaluate(() => {
      const canvas = document.querySelector('.ground-spatial-root canvas')
      const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl')
      if (!gl) return { available: false, renderer: 'none', vendor: 'none' }
      const debug = gl.getExtension('WEBGL_debug_renderer_info')
      return {
        available: true,
        renderer: String(debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)),
        vendor: String(debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)),
      }
    })

    const beforeHeap = await page.evaluate(() => {
      const perf = performance
      return 'memory' in perf ? perf.memory?.usedJSHeapSize ?? null : null
    })

    if (profile.mobile) {
      const pad = page.locator('.ground-analog-pad').first()
      if (await pad.isVisible()) {
        const box = await pad.boundingBox()
        if (box) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.2)
      }
    } else {
      await page.keyboard.down('KeyW')
      await page.waitForTimeout(900)
      await page.keyboard.up('KeyW')
    }

    const intervals = await page.evaluate(async (frameCount) => new Promise((resolve) => {
      const values = []
      let previous = performance.now()
      let remaining = frameCount
      const tick = (now) => {
        values.push(now - previous)
        previous = now
        remaining -= 1
        if (remaining <= 0) resolve(values.slice(1))
        else requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }), profile.sampleFrames)

    const afterHeap = await page.evaluate(() => {
      const perf = performance
      return 'memory' in perf ? perf.memory?.usedJSHeapSize ?? null : null
    })

    const numeric = intervals.filter((value) => Number.isFinite(value) && value > 0)
    const meanMs = numeric.reduce((sum, value) => sum + value, 0) / Math.max(1, numeric.length)
    const p50Ms = percentile(numeric, 0.5)
    const p95Ms = percentile(numeric, 0.95)
    const p99Ms = percentile(numeric, 0.99)
    const maxMs = numeric.length ? Math.max(...numeric) : null
    const effectiveFps = meanMs ? 1000 / meanMs : null

    results.push({
      profile: profile.id,
      viewport: { width: profile.width, height: profile.height },
      renderer,
      sampleCount: numeric.length,
      meanFrameIntervalMs: meanMs,
      p50FrameIntervalMs: p50Ms,
      p95FrameIntervalMs: p95Ms,
      p99FrameIntervalMs: p99Ms,
      maxFrameIntervalMs: maxMs,
      effectiveFps,
      heap: beforeHeap == null || afterHeap == null ? null : { beforeBytes: beforeHeap, afterBytes: afterHeap, deltaBytes: afterHeap - beforeHeap },
      contract: await root.evaluate((node) => ({
        eyeHeight: node.getAttribute('data-ground-eye-height'),
        desktopSpeed: node.getAttribute('data-ground-speed-desktop'),
        mobileSpeed: node.getAttribute('data-ground-speed-mobile'),
        collision: node.getAttribute('data-ground-collision'),
        exploration: node.getAttribute('data-ground-exploration'),
      })),
    })
    errors.push(...pageErrors.map((error) => `${profile.id}: ${error}`))
    await context.close()
  }
} finally {
  await browser.close()
}

const receipt = {
  schema: 'urai-ground-performance-proof-1',
  exactHead,
  capturedAt: new Date().toISOString(),
  measurementClass: 'ci-software-renderer-diagnostic-not-device-certification',
  targets: { desktopFpsWhereSupported: 60, mainstreamMobileMinimumFps: 30 },
  results,
  errors,
}
await writeFile(path.join(outDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')

if (errors.length) throw new Error(`Ground performance proof recorded ${errors.length} browser error(s): ${errors.join(' | ')}`)
if (results.length !== profiles.length || results.some((result) => result.sampleCount < 180)) throw new Error('Ground performance proof did not collect the required frame samples')
