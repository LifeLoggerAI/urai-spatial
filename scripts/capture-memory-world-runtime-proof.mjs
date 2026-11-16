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

async function verifyFallbackDisclosure(page, spec) {
  const region = page.getByRole('region', { name: 'Memory view status and provenance' })
  const fallback = page.getByTestId('memory-world-renderer-fallback')
  assert.equal(await region.locator(':scope > p').nth(1).textContent(), 'Three-dimensional exploration is unavailable. Your memory and return controls remain available.')
  assert.match(await region.locator(':scope > p').first().textContent(), /not recorded history/i)
  const provenanceSummary = region.locator('details > summary')
  await provenanceSummary.focus()
  assert.equal(await provenanceSummary.evaluate(element => element === document.activeElement), true, 'Provenance summary must receive keyboard focus')
  await provenanceSummary.press('Enter')
  assert.equal(await region.locator('details').evaluate(details => details.open), true, 'Native keyboard activation must reveal complete provenance')
  await region.focus()
  assert.equal(await region.evaluate(element => element === document.activeElement), true, 'Fallback status region must receive keyboard focus')
  const initialScrollTop = await region.evaluate(element => element.scrollTop)
  const overflowing = await region.evaluate(element => element.scrollHeight > element.clientHeight + 1)
  await region.press('End')
  await page.waitForTimeout(120)
  const keyboardEndScrollTop = await region.evaluate(element => element.scrollTop)
  if (overflowing) assert.ok(keyboardEndScrollTop > initialScrollTop, 'Focused disclosure must scroll with the keyboard')
  await region.press('Home')
  await page.waitForTimeout(120)
  const lines = []
  const elements = region.locator(':scope > h2, :scope > p, details > summary, details > p')
  for (let elementIndex = 0; elementIndex < await elements.count(); elementIndex++) {
    const element = elements.nth(elementIndex)
    const lineCount = await element.evaluate(node => {
      const range = document.createRange()
      range.selectNodeContents(node)
      return [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0).length
    })
    assert.ok(lineCount > 0, 'Every disclosure field must render real text')
    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      let measurement
      let attempts = 0
      for (; attempts <= 80; attempts++) {
        measurement = await element.evaluate((node, index) => {
          const region = node.closest('[role="region"]')
          const range = document.createRange()
          range.selectNodeContents(node)
          const line = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0)[index]
          const box = region.getBoundingClientRect()
          const left = box.left + region.clientLeft
          const top = box.top + region.clientTop
          const right = left + region.clientWidth
          const bottom = top + region.clientHeight
          const centerX = (line.left + line.right) / 2
          const centerY = (line.top + line.bottom) / 2
          const hit = document.elementFromPoint(centerX, centerY)
          return {
            text: node.textContent,
            lineIndex: index,
            line: { left: line.left, top: line.top, right: line.right, bottom: line.bottom, height: line.height },
            region: { left, top, right, bottom, height: region.clientHeight },
            scrollTop: region.scrollTop,
            scrollHeight: region.scrollHeight,
            hitReadable: Boolean(hit && region.contains(hit)),
          }
        }, lineIndex)
        assert.ok(measurement.region.height >= measurement.line.height + 2, 'Fallback region must fit at least one complete disclosure line')
        const line = measurement.line
        const box = measurement.region
        assert.ok(line.left >= box.left - 1 && line.right <= box.right + 1, 'Disclosure line must not be horizontally clipped')
        if (line.top >= box.top - 1 && line.bottom <= box.bottom + 1 && measurement.hitReadable) break
        assert.ok(attempts < 80, 'Disclosure line must become completely readable after bounded real pointer scrolling')
        await page.mouse.move((box.left + box.right) / 2, (box.top + box.bottom) / 2)
        await page.mouse.wheel(0, line.top < box.top ? -8 : 8)
        await page.waitForTimeout(20)
      }
      let screenshot = null
      if (spec.id === 'no-webgl-landscape') {
        const file = `${spec.id}-disclosure-field-${elementIndex}-line-${lineIndex}-${head.slice(0, 12)}.png`
        const bytes = await page.screenshot({ path: path.join(output, file) })
        screenshot = { file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
      }
      lines.push({ ...measurement, pointerScrollSteps: attempts, screenshot })
    }
  }
  const finalScrollTop = await region.evaluate(element => element.scrollTop)
  const exit = fallback.getByRole('button', { name: 'Return to Replay', exact: true })
  await exit.focus()
  assert.equal(await exit.evaluate(button => button === document.activeElement), true, 'Return to Replay must receive focus after reading the disclosure')
  return { viewport: spec, initialScrollTop, keyboardEndScrollTop, finalScrollTop, completeTextLines: lines, returnFocused: true }
}

try {
  for (const spec of [
    { id: 'desktop', width: 1440, height: 900, reducedMotion: 'no-preference' },
    { id: 'portrait', width: 390, height: 844, reducedMotion: 'no-preference' },
    { id: 'reduced-motion', width: 390, height: 844, reducedMotion: 'reduce' },
    { id: 'no-webgl', width: 390, height: 844, reducedMotion: 'reduce' },
    { id: 'no-webgl-landscape', width: 568, height: 320, reducedMotion: 'reduce' },
  ]) {
    const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, reducedMotion: spec.reducedMotion })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(String(error)))
    if (spec.id.startsWith('no-webgl')) await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/i.test(type) ? null : original.call(this, type, ...args) }
    })
    try {
      await page.goto(base + href, { waitUntil: 'domcontentloaded', timeout: 60000 })
      const runtime = page.getByTestId('memory-world-runtime')
      await runtime.waitFor({ state: 'visible' })
      await page.waitForFunction(() => ['ready', 'unavailable'].includes(document.querySelector('[data-testid="memory-world-runtime"]')?.getAttribute('data-memory-world-renderer')), null, { timeout: 45000 })
      assert.match(await runtime.getAttribute('data-memory-world-truth'), /not recorded history/i)
      if (spec.id.startsWith('no-webgl')) {
        assert.equal(await runtime.getAttribute('data-memory-world-renderer'), 'unavailable')
        assert.equal(await runtime.locator('canvas').count(), 0)
        assert.equal(await page.getByTestId('memory-world-renderer-fallback').isVisible(), true)
      } else {
        assert.equal(await runtime.getAttribute('data-memory-world-renderer'), 'ready')
        const canvas = runtime.locator('canvas')
        await canvas.waitFor({ state: 'visible' })
        await page.waitForFunction(() => {
          const element = document.querySelector('[data-testid="memory-world-runtime"] canvas')
          if (!(element instanceof HTMLCanvasElement)) return false
          const rect = element.getBoundingClientRect()
          return rect.width >= 300 && rect.height >= 300
        }, null, { timeout: 15000 })
        const rect = await canvas.boundingBox()
        assert.ok(rect && rect.width >= 300 && rect.height >= 300, `Memory World canvas must settle at >=300x300; got ${rect ? `${rect.width}x${rect.height}` : 'no box'}`)
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
      const hasFallback = ['unavailable', 'lost'].includes(await runtime.getAttribute('data-memory-world-renderer'))
      if (hasFallback) {
        const exit = page.getByTestId('memory-world-renderer-fallback').getByRole('button', { name: 'Return to Replay', exact: true })
        const clearance = await exit.evaluate(button => {
          const rect = button.getBoundingClientRect()
          const tools = document.querySelector('[data-testid="memory-world-authoring-tools"]')?.getBoundingClientRect()
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
          return { width: rect.width, height: rect.height, bottom: rect.bottom, toolsTop: tools?.top ?? null, reachable: button === hit || button.contains(hit) }
        })
        assert.ok(clearance.width >= 48 && clearance.height >= 48, 'Fallback exit must be a 48px target')
        assert.ok(clearance.toolsTop !== null && clearance.bottom + 8 <= clearance.toolsTop, 'Fallback exit must clear authoring tools by at least 8px')
        assert.equal(clearance.reachable, true, 'Fallback exit center must receive pointer input')
        const statusRegion = page.getByRole('region', { name: 'Memory view status and provenance' })
        const statusBox = await statusRegion.boundingBox()
        assert.ok(statusBox && statusBox.height > 0 && statusBox.y >= 0 && statusBox.y + statusBox.height <= spec.height, 'Fallback governance copy must have an onscreen scroll region')
        receipt.captures.at(-1).fallbackExitClearance = clearance
        receipt.captures.at(-1).fallbackDisclosure = await verifyFallbackDisclosure(page, spec)
        await exit.press('Enter')
      } else await page.getByRole('button', { name: '← Replay', exact: true }).click()
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
  receipt.passed = receipt.errors.length === 0 && receipt.captures.length === 6
  await writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n')
}
if (!receipt.passed) throw new Error(JSON.stringify(receipt.errors))


