import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Actual unsigned production-route evidence. No account, private source,
// reconstruction, generated person, or physical-device acceptance is seeded.
const root = fileURLToPath(new URL('../', import.meta.url))
const exactHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
assert.match(exactHead, /^[0-9a-f]{40}$/)
assert.equal(process.env.URAI_EXACT_HEAD || exactHead, exactHead)
const require = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = require('playwright')
const base = new URL(process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173')
assert.ok(['http:', 'https:'].includes(base.protocol) && !base.username && !base.password && !base.search && !base.hash)
const output = path.resolve(process.env.URAI_PROOF_DIR || path.join(root, 'artifacts/lifemap-signed-out-authority'))
await mkdir(output, { recursive: true })
const profiles = [
  { id: 'desktop-1440x900', width: 1440, height: 900, isMobile: false, hasTouch: false },
  { id: 'landscape-844x390', width: 844, height: 390, isMobile: true, hasTouch: true },
  { id: 'narrow-320x700', width: 320, height: 700, isMobile: true, hasTouch: true },
]
const receipt = { schemaVersion: 'urai-lifemap-signed-out-authority-1', sourceSha: exactHead, scope: 'unsigned-production-route-render-and-semantics', captures: [], errors: [], privateWorldAccepted: false }
const browser = await chromium.launch({ headless: true })
try {
  for (const profile of profiles) for (const route of ['/life-map', '/unwind']) {
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.isMobile, hasTouch: profile.hasTouch, deviceScaleFactor: 1, permissions: [] })
    const page = await context.newPage()
    page.setDefaultTimeout(30_000)
    const record = { route, profile, sourceSha: exactHead }
    const errors = []
    page.on('pageerror', error => errors.push(String(error)))
    try {
      await page.goto(new URL(route + '/', base).href, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      const canonical = page.getByTestId('urai-r3f-canonical-lifemap')
      await canonical.waitFor({ state: 'visible' })
      await page.waitForFunction(() => {
        const realm = document.querySelector('[data-testid="urai-true-3d-life-map"]')
        return realm?.getAttribute('data-life-map-render-ready') === 'true'
      }, undefined, { timeout: 30_000 })
      assert.equal(await canonical.getAttribute('data-life-map-access'), 'signed-out')
      assert.equal(await canonical.getAttribute('data-private-memory-mounted'), 'false')
      assert.equal(await page.getByRole('main').count(), 1, 'signed-out route must expose one accessible main landmark')
      const disclosure = page.getByTestId('urai-life-map-signed-out-disclosure')
      await disclosure.waitFor({ state: 'visible' })
      record.geometry = await canonical.evaluate(element => {
        const wrapper = element.querySelector(':scope > div')
        const realm = element.querySelector('[data-testid="urai-true-3d-life-map"]')
        const canvas = realm?.querySelector('canvas')
        const disclosure = element.querySelector('[data-testid="urai-life-map-signed-out-disclosure"]')
        const disclosureRect = disclosure?.getBoundingClientRect()
        let effectiveOpacity = 1
        for (let current = canvas; current instanceof Element; current = current.parentElement) {
          effectiveOpacity *= Number.parseFloat(getComputedStyle(current).opacity || '1')
        }
        const canvasRect = canvas?.getBoundingClientRect()
        const controls = [...element.querySelectorAll('[data-testid="urai-life-map-signed-out-disclosure"] button')].map(button => {
          const rect = button.getBoundingClientRect()
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
          return { label: button.textContent?.trim(), width: rect.width, height: rect.height, x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, centerOwned: Boolean(hit && (hit === button || button.contains(hit))) }
        })
        return { effectiveOpacity, underlayInert: wrapper?.inert, underlayAriaHidden: wrapper?.getAttribute('aria-hidden'), canvasWidth: canvasRect?.width, canvasHeight: canvasRect?.height, backingWidth: canvas?.width, backingHeight: canvas?.height, disclosure: disclosureRect ? { x: disclosureRect.x, y: disclosureRect.y, width: disclosureRect.width, height: disclosureRect.height, right: disclosureRect.right, bottom: disclosureRect.bottom } : null, controls }
      })
      assert.ok(record.geometry.effectiveOpacity >= .98, 'semantic privacy flags must not dim the rendered empty realm')
      assert.equal(record.geometry.underlayInert, true)
      assert.equal(record.geometry.underlayAriaHidden, 'true')
      assert.ok(record.geometry.canvasWidth > 0 && record.geometry.canvasHeight > 0 && record.geometry.backingWidth > 0 && record.geometry.backingHeight > 0)
      const panel = record.geometry.disclosure
      assert.ok(panel && panel.x >= 0 && panel.y >= 0 && panel.right <= profile.width + 1 && panel.bottom <= profile.height + 1, 'the signed-out landmark must fit inside the viewport')
      assert.ok(panel.width * panel.height <= profile.width * profile.height * .35, 'the floating disclosure must preserve the visible spatial realm')
      for (const control of record.geometry.controls) {
        assert.ok(control.width >= 48 && control.height >= 48 && control.centerOwned, 'visible disclosure controls retain 48px owned targets')
        assert.ok(control.x >= 0 && control.y >= 0 && control.right <= profile.width + 1 && control.bottom <= profile.height + 1, 'disclosure controls stay within the viewport')
      }
      const focusBlocked = await canonical.locator(':scope > div button').evaluateAll(buttons => buttons.every(button => {
        button.focus({ preventScroll: true })
        return document.activeElement !== button
      }))
      assert.equal(focusBlocked, true, 'signed-out renderer controls remain outside keyboard focus')
      const filename = route.slice(1) + '--' + profile.id + '--' + exactHead.slice(0, 12) + '.png'
      const screenshot = await page.screenshot({ path: path.join(output, filename), fullPage: false, animations: 'disabled' })
      record.image = { path: filename, sha256: createHash('sha256').update(screenshot).digest('hex'), bytes: screenshot.length }
      record.finalUrl = page.url()
      if (route === '/unwind') {
        const url = new URL(page.url())
        assert.equal(url.pathname.replace(/\/+$/, ''), '/life-map')
        assert.equal(url.searchParams.get('from'), 'unwind')
        assert.equal(url.searchParams.get('overview'), '1')
      }
      const home = disclosure.getByRole('button', { name: 'Return Home', exact: true })
      await home.focus()
      assert.equal(await home.evaluate(element => element === document.activeElement), true)
      assert.equal(errors.length, 0)
      if (route === '/life-map') {
        await disclosure.getByRole('button', { name: 'Open disclosed sample', exact: true }).click()
        await page.waitForFunction(() => {
          const canonical = document.querySelector('[data-testid="urai-r3f-canonical-lifemap"]')
          const url = new URL(window.location.href)
          return canonical?.getAttribute('data-life-map-access') === 'explicit-demo'
            && url.pathname.replace(/\/+$/, '') === '/life-map'
            && url.searchParams.get('demo') === '1'
            && url.searchParams.get('manifestId') === 'replay-recovery-thread'
        })
        const url = new URL(page.url())
        assert.equal(url.searchParams.get('demo'), '1')
        assert.equal(url.searchParams.get('manifestId'), 'replay-recovery-thread')
        assert.equal(await canonical.getAttribute('role'), null)
        assert.equal(await canonical.locator(':scope > div').getAttribute('inert'), null)
        record.explicitDemoOpened = true
      } else {
        await home.click()
        await page.waitForURL(url => url.pathname.replace(/\/+$/, '') === '/home')
        record.homeReturn = true
      }
      receipt.captures.push(record)
    } catch (error) {
      record.error = String(error)
      record.pageErrors = errors
      receipt.errors.push(record)
    } finally { await context.close() }
  }
} finally {
  await browser.close()
  await writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n')
}
console.log(JSON.stringify({ sourceSha: exactHead, captures: receipt.captures.length, expectedCaptures: 6, errors: receipt.errors.length, privateWorldAccepted: false }))
assert.equal(receipt.errors.length, 0, 'signed-out production render/semantic evidence failed')
assert.equal(receipt.captures.length, 6)
