import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const exactHead = process.env.URAI_EXACT_HEAD
assert.match(exactHead || '', /^[0-9a-f]{40}$/, 'Exact source head is required')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const baseUrl = new URL(base)
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(baseUrl.hostname), 'Use the existing local built-candidate server, not a production account')
const output = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/home-fallback-layout-proof')
await mkdir(output, { recursive: true })
const receipt = {
  schema: 'urai.home-fallback-layout-proof.v1', exactHead,
  scope: 'Unsigned built-candidate no-WebGL layout and keyboard controls; no private data or provider calls.',
  nativeDeviceAcceptance: false, visualApproval: false, deploymentAuthorized: false,
  cases: [], errors: [],
}
const cases = [
  { id: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
  { id: 'small-mobile', width: 320, height: 568, isMobile: true, hasTouch: true },
  { id: 'short-viewport', width: 320, height: 320 },
  { id: 'landscape-mobile', width: 844, height: 390, isMobile: true, hasTouch: true },
  { id: 'tablet-portrait', width: 768, height: 1024 },
  { id: 'tablet-landscape', width: 1024, height: 768 },
  { id: 'desktop', width: 1440, height: 900 },
  // CSS viewport equivalent of 1280x720 at 200% zoom, not physical-device zoom acceptance.
  { id: 'reflow-640x360', width: 640, height: 360, reducedMotion: 'reduce' },
]
const overlaps = (a, b) => Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x)
  && Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y)
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
try {
  for (const spec of cases) {
    const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height },
      isMobile: spec.isMobile, hasTouch: spec.hasTouch, reducedMotion: spec.reducedMotion })
    const page = await context.newPage()
    const record = { id: spec.id, viewport: { width: spec.width, height: spec.height }, passed: false, pageErrors: [], failedRequests: [] }
    page.on('pageerror', error => record.pageErrors.push(String(error)))
    page.on('requestfailed', request => record.failedRequests.push({ url: request.url(), failure: request.failure()?.errorText }))
    try {
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null
          return original.apply(this, [type, ...args])
        }
      })
      const response = await page.goto(`${base}/home/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      assert.equal(response?.status(), 200, 'Built Home must load')
      // Capability detectors share a test ID while hydrating. Measure only the
      // canonical settled Home owner, never a detecting placeholder or nth match.
      const fallback = page.locator('section.urai-home-spatial-runtime-layer[data-urai-home-runtime="accessible-fallback-without-webgl"]')
      await fallback.waitFor({ state: 'visible', timeout: 90000 })
      assert.equal(await fallback.count(), 1, 'Exactly one canonical Home fallback must own the scene')
      assert.equal(await fallback.getAttribute('data-webgl-state'), 'unavailable')
      assert.equal(await page.locator('body').getAttribute('data-deployed-sha'), exactHead, 'Served build must match the proof head')
      const launcher = fallback.locator('.home-adam-launcher-slot button')
      await launcher.waitFor({ state: 'visible', timeout: 15000 })
      await page.waitForFunction(() => {
        const orb = document.querySelector('[data-testid="home-semantic-orb"]')
        return orb instanceof HTMLButtonElement && !orb.disabled
      }, undefined, { timeout: 15000 })
      const recovery = fallback.locator('.home-runtime-recovery')
      const navigation = fallback.locator('.home-semantic-navigation[data-home-navigation-owner="runtime-boundary"]')
      const rectangles = { launcher: await launcher.boundingBox(), recovery: await recovery.boundingBox(), navigation: await navigation.boundingBox() }
      for (const [name, box] of Object.entries(rectangles)) {
        assert.ok(box && box.width > 0 && box.height > 0, `${name} must have visible bounds`)
        assert.ok(box.x >= -1 && box.x + box.width <= spec.width + 1, `${name} must fit horizontally`)
        assert.ok(box.y >= -1 && box.y + box.height <= spec.height + 1, `${name} must fit vertically`)
      }
      for (const [a, b] of [['launcher', 'recovery'], ['recovery', 'navigation'], ['launcher', 'navigation']]) {
        assert.equal(overlaps(rectangles[a], rectangles[b]), false, `${a} must not cover ${b}`)
      }
      record.rectangles = rectangles
      const controls = navigation.locator('button,a[href]')
      assert.equal(await controls.count(), 3, 'Retain Orb, Ground, and Life Map')
      record.controls = []
      for (let i = 0; i < 3; i++) {
        const control = controls.nth(i)
        const box = await control.boundingBox()
        assert.ok(box && box.width >= 48 && box.height >= 48, 'Control must retain its 48px target')
        assert.equal(await control.evaluate(element => {
          const box = element.getBoundingClientRect()
          const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
          return hit === element || element.contains(hit)
        }), true, 'Destination must not be intercepted by another layer')
        await control.focus()
        assert.equal(await control.evaluate(element => document.activeElement === element), true, 'Keyboard focus must reach each destination')
        record.controls.push({ text: await control.innerText(), href: await control.getAttribute('href'), bounds: box })
      }
      assert.equal(record.pageErrors.length, 0, 'No runtime page errors')
      assert.equal(record.failedRequests.length, 0, 'No failed runtime requests')
      record.passed = true
    } catch (error) {
      record.error = String(error)
      receipt.errors.push({ id: spec.id, error: record.error })
    } finally {
      try {
        const image = await page.screenshot({ animations: 'disabled', timeout: 15000 })
        const filename = `${spec.id}-${exactHead.slice(0, 12)}.png`
        await writeFile(path.join(output, filename), image)
        record.image = { path: filename, bytes: image.length, sha256: createHash('sha256').update(image).digest('hex'), width: image.readUInt32BE(16), height: image.readUInt32BE(20) }
      } catch (error) {
        record.passed = false
        receipt.errors.push({ id: spec.id, error: `Screenshot: ${String(error)}` })
      }
      receipt.cases.push(record)
      await context.close().catch(() => {})
      await writeFile(path.join(output, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
    }
  }
} finally {
  await browser.close()
}
console.log(JSON.stringify({ exactHead, passed: receipt.cases.filter(item => item.passed).length, failed: receipt.cases.filter(item => !item.passed).length }))
if (receipt.errors.length) process.exitCode = 1
