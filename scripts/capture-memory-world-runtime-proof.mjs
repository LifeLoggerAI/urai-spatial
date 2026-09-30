import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import path from 'node:path'
import assert from 'node:assert/strict'
const require = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = require('playwright')
const head = process.env.URAI_EXACT_HEAD
assert.match(head ?? '', /^[0-9a-f]{40}$/)
const base = process.env.URAI_PROOF_BASE ?? 'http://127.0.0.1:4173'
const output = path.resolve(process.env.URAI_PROOF_DIR ?? 'artifacts/memory-world-proof')
await mkdir(output, { recursive: true })
const receipt = { schema: 'urai-memory-world-runtime-proof-1', exactHead: head, truthScope: 'disclosed-context-template-only', capturedAt: new Date().toISOString(), captures: [], errors: [] }
const href = '/spatial/memory-world/?demo=1&memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset'
const browser = await chromium.launch({ headless: true })
async function capture(page, id, spec) {
  const file = id + '-' + head.slice(0, 12) + '.png'
  const bytes = await page.screenshot({ path: path.join(output, file) })
  receipt.captures.push({ id, file, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, viewport: spec, url: page.url(), state: await page.getByTestId('memory-world-runtime').getAttribute('data-memory-world-renderer') })
}
try {
  for (const spec of [
    { id: 'desktop', width: 1440, height: 900, reducedMotion: 'no-preference' },
    { id: 'portrait', width: 390, height: 844, reducedMotion: 'no-preference' },
    { id: 'reduced-motion', width: 390, height: 844, reducedMotion: 'reduce' },
    { id: 'no-webgl', width: 390, height: 844, reducedMotion: 'reduce' },
  ]) {
    const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, reducedMotion: spec.reducedMotion })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(String(error)))
    if (spec.id === 'no-webgl') await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/i.test(type) ? null : original.call(this, type, ...args) }
    })
    try {
      await page.goto(base + href, { waitUntil: 'domcontentloaded', timeout: 60000 })
      const runtime = page.getByTestId('memory-world-runtime')
      await runtime.waitFor({ state: 'visible' })
      await page.waitForFunction(() => ['ready', 'unavailable'].includes(document.querySelector('[data-testid="memory-world-runtime"]')?.getAttribute('data-memory-world-renderer')), null, { timeout: 45000 })
      assert.match(await runtime.getAttribute('data-memory-world-truth'), /not recorded history/i)
      if (spec.id === 'no-webgl') {
        assert.equal(await runtime.getAttribute('data-memory-world-renderer'), 'unavailable')
        assert.equal(await runtime.locator('canvas').count(), 0)
        assert.equal(await page.getByTestId('memory-world-renderer-fallback').isVisible(), true)
      } else {
        assert.equal(await runtime.getAttribute('data-memory-world-renderer'), 'ready')
        const canvas = runtime.locator('canvas')
        await canvas.waitFor({ state: 'visible' })
        const rect = await canvas.boundingBox()
        assert.ok(rect.width >= 300 && rect.height >= 300)
        const left = page.getByRole('button', { name: 'Look left', exact: true })
        await left.focus()
        await left.press('Enter')
        await page.getByRole('button', { name: 'Move nearer', exact: true }).click()
      }
      await capture(page, spec.id, spec)
      if (spec.id === 'desktop') {
        await page.evaluate(() => {
          const canvas = document.querySelector('[data-testid="memory-world-runtime"] canvas')
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
          if (!gl?.getExtension('WEBGL_lose_context')) throw new Error('Context loss extension unavailable')
          gl.getExtension('WEBGL_lose_context').loseContext()
        })
        await page.getByTestId('memory-world-renderer-fallback').waitFor({ state: 'visible' })
        assert.equal(await runtime.getAttribute('data-memory-world-renderer'), 'lost')
        await capture(page, 'context-loss', spec)
      }
      await page.getByRole('button', { name: '← Replay', exact: true }).click()
      await page.waitForURL(url => url.pathname.startsWith('/replay'), { timeout: 30000 })
      const returned = new URL(page.url())
      assert.equal(returned.searchParams.get('memoryId'), 'demo:quiet-reset')
      assert.equal(returned.searchParams.get('manifestId'), 'replay-recovery-thread')
      assert.equal(returned.searchParams.get('node'), 'quiet-reset')
      assert.equal(returned.searchParams.get('demo'), '1')
      receipt.captures.at(-1).returnVerified = true
      assert.deepEqual(errors, [])
    } catch (error) {
      receipt.errors.push({ device: spec.id, error: String(error), pageErrors: errors })
    } finally { await context.close() }
  }
} finally {
  await browser.close()
  receipt.passed = receipt.errors.length === 0 && receipt.captures.length === 5
  await writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n')
}
if (!receipt.passed) throw new Error(JSON.stringify(receipt.errors))

