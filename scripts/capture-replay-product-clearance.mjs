import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const requireTier = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireTier('playwright')
const exactHead = process.env.URAI_EXACT_HEAD
assert.match(exactHead || '', /^[0-9a-f]{40}$/)
const base = new URL(process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173')
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'Proof is limited to the locally built candidate')
const output = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/replay-product-clearance')
await mkdir(output, { recursive: true })
const receipt = { schema: 'urai.replay-product-clearance.v2', exactHead,
  scope: 'Unsigned explicit read-only demo. Layout, hit testing and keyboard disclosure only; no private memory, mutations, provider, device, final-art or release acceptance.',
  cases: [], errors: [] }
const profiles = [
  { id: 'narrow', width: 320, height: 700 },
  { id: 'mobile', width: 390, height: 844 },
  { id: 'small-phone', width: 320, height: 568 },
  { id: 'short-reflow', width: 320, height: 320 },
  { id: 'small-landscape', width: 700, height: 390 },
  { id: 'landscape', width: 844, height: 390 },
  { id: 'narrow-breakpoint', width: 480, height: 700 },
  { id: 'after-narrow-breakpoint', width: 481, height: 700 },
  { id: 'launcher-breakpoint', width: 560, height: 390 },
  { id: 'after-product-breakpoint', width: 701, height: 390 },
]
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
try {
  for (const spec of profiles) {
    const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, reducedMotion: 'reduce', deviceScaleFactor: 1 })
    const page = await context.newPage()
    const record = { id: spec.id, viewport: spec, passed: false, pageErrors: [], deniedRequests: [], screenshots: [] }
    page.on('pageerror', error => record.pageErrors.push(String(error)))
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url())
      if (url.origin === base.origin && ['GET', 'HEAD'].includes(request.method())) return route.continue()
      record.deniedRequests.push({ origin: url.origin, method: request.method() })
      return route.abort()
    })
    const screenshot = async label => {
      const bytes = await page.screenshot({ animations: 'disabled', timeout: 15000 })
      const name = `${spec.id}-${label}-${exactHead.slice(0, 12)}.png`
      await writeFile(path.join(output, name), bytes)
      record.screenshots.push({ path: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) })
    }
    const box = async locator => {
      const value = await locator.boundingBox()
      assert.ok(value, 'A required control has no layout box')
      return value
    }
    const within = bounds => {
      assert.ok(bounds.x >= -0.5 && bounds.y >= -0.5 && bounds.x + bounds.width <= spec.width + 0.5 && bounds.y + bounds.height <= spec.height + 0.5, `Outside viewport: ${JSON.stringify(bounds)}`)
    }
    const hit = async locator => {
      await locator.scrollIntoViewIfNeeded()
      const bounds = await box(locator)
      within(bounds)
      assert.ok(bounds.width >= 48 && bounds.height >= 48, 'Interactive target is below 48 pixels')
      assert.ok(await locator.evaluate(element => {
        const r = element.getBoundingClientRect()
        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
        return top === element || element.contains(top)
      }), 'Control center is covered by another element')
      return bounds
    }
    try {
      const response = await page.goto(new URL('/replay/?demo=1&memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread', base).href, { waitUntil: 'domcontentloaded', timeout: 60000 })
      assert.equal(response?.status(), 200)
      assert.equal(await page.locator('body').getAttribute('data-deployed-sha'), exactHead)
      const world = page.locator('main.replayWorld[data-memory-status="demo"][data-replay-media-ready="true"]')
      await world.waitFor({ state: 'visible', timeout: 60000 })
      const product = world.locator('.replayProduct'), summary = product.locator(':scope > summary')
      const orb = page.locator('.urai-world-companion[data-hydrated="true"] .urai-world-companion__orb')
      await summary.waitFor({ state: 'visible', timeout: 15000 })
      await orb.waitFor({ state: 'visible', timeout: 15000 })
      const adam = page.locator('[data-urai-adam-launcher="true"]')
      await adam.waitFor({ state: 'visible', timeout: 15000 })
      assert.equal(await adam.count(), 1, 'The existing Adam action must remain available exactly once')
      await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
      assert.equal(await product.count(), 1)
      assert.equal(await product.getAttribute('open'), null)
      const separate = (a, b, label) => {
        const gapX = Math.max(b.x - a.x - a.width, a.x - b.x - b.width)
        const gapY = Math.max(b.y - a.y - a.height, a.y - b.y - b.height)
        assert.ok(gapX >= 8 || gapY >= 8, `${label}: control rectangles need 8px clearance`)
      }
      const verifyControlLayout = async (state, expanded = false) => {
        const bounds = { summary: await hit(summary), orb: await hit(orb), adam: await hit(adam) }
        separate(bounds.summary, bounds.orb, `${state}: summary/Orb`)
        separate(bounds.summary, bounds.adam, `${state}: summary/Adam`)
        separate(bounds.orb, bounds.adam, `${state}: Orb/Adam`)
        if (expanded) {
          bounds.actions = await box(product.locator('.replayProductActions'))
          within(bounds.actions)
          separate(bounds.actions, bounds.adam, `${state}: full panel/Adam`)
          separate(bounds.actions, bounds.orb, `${state}: full panel/Orb`)
        }
        record[state] = bounds
      }
      await verifyControlLayout('closed')
      await screenshot('closed')
      await summary.focus()
      await page.keyboard.press('Enter')
      assert.notEqual(await product.getAttribute('open'), null, 'Keyboard activation must open the real disclosure')
      const actions = product.locator('.replayProductActions')
      await actions.waitFor({ state: 'visible' })
      await verifyControlLayout('open', true)
      await screenshot('open')
      const buttons = actions.locator(':scope > button:not(.retry)')
      assert.equal(await buttons.count(), 3)
      for (let i = 0; i < 3; i += 1) assert.equal(await buttons.nth(i).isDisabled(), true, 'Demo mutation must remain disabled')
      await hit(actions.locator('.lifeMovieEntry'))
      const history = actions.locator('.replayHistory > summary')
      await hit(history)
      await history.click()
      await actions.locator('.replayHistory[open]').waitFor({ state: 'visible' })
      await hit(history)
      {
        const message = actions.locator('.replayHistory > p')
        await message.scrollIntoViewIfNeeded()
        within(await box(message))
      }
      await verifyControlLayout('history', true)
      await screenshot('history')
      await history.click()
      await summary.focus()
      await page.keyboard.press('Enter')
      assert.equal(await product.getAttribute('open'), null)
      await verifyControlLayout('closedAgain')
      await screenshot('closed-again')
      assert.equal(record.pageErrors.length, 0, 'Browser page errors occurred')
      assert.equal(record.deniedRequests.length, 0, 'Unexpected external or mutating requests occurred')
      record.passed = true
    } catch (error) {
      record.error = String(error)
      receipt.errors.push({ id: spec.id, error: record.error })
      await screenshot('failure').catch(captureError => { record.captureError = String(captureError) })
    } finally {
      receipt.cases.push(record)
      await context.close()
      await writeFile(path.join(output, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
    }
  }
} finally {
  await browser.close()
}
if (receipt.errors.length) process.exitCode = 1
