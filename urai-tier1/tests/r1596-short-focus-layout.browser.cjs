'use strict'
// R1596 HOLD: real compiled-source Focus bounds after the observed 320px collision.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const base = process.env.URAI_REVIEW_URL || 'http://127.0.0.1:3004'
const source = process.env.URAI_EXACT_SHA
assert.equal(new URL(base).protocol, 'http:')
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname))
assert.match(source || '', /^[0-9a-f]{40}$/)
const output = process.env.URAI_FOCUS_QA_DIR || '/tmp/urai-r1596-focus-layout'
fs.mkdirSync(output, { recursive: true })
const report = { source, cases: [], privateData: false, physicalDevice: false, aaaAccepted: false }

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  try {
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
      const page = await context.newPage()
      const record = { viewport, pageErrors: [] }
      report.cases.push(record)
      page.on('pageerror', error => record.pageErrors.push(error.message))
      const capture = async suffix => {
        const session = await context.newCDPSession(page)
        const shot = await session.send('Page.captureScreenshot', { format: 'jpeg', quality: 80, captureBeyondViewport: false })
        fs.writeFileSync(path.join(output, viewport.width + '-' + suffix + '.jpg'), Buffer.from(shot.data, 'base64'))
        await session.detach()
      }
      try {
        const response = await page.goto(base + '/focus?memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1', { waitUntil: 'domcontentloaded', timeout: 30000 })
        assert.equal(response.status(), 200)
        await page.locator('[data-testid="urai-final-focus-chamber"][data-focus-input-ready="true"]').waitFor({ timeout: 60000 })
        assert.equal(await page.locator('meta[name="urai-deployed-sha"]').getAttribute('content'), source)
        const header = page.getByLabel('Selected memory summary', { exact: true })
        assert.equal(await header.getAttribute('tabindex'), '0')
        record.bounds = await page.evaluate(() => {
          const box = selector => {
            const element = document.querySelector(selector)
            const b = element.getBoundingClientRect()
            return { x: b.x, y: b.y, right: b.right, bottom: b.bottom, width: b.width, height: b.height, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }
          }
          return { header: box('.focusHeading'), meaning: box('.memoryMeaning'), controls: box('.focusControls'), help: box('.focusHelp'), adam: box('[data-urai-adam-launcher="true"]') }
        })
        const b = record.bounds
        assert.ok(b.header.bottom + 12 <= b.meaning.y, 'Memory summary clears context')
        assert.ok(b.meaning.bottom <= b.adam.y, 'Companion clears context')
        assert.ok(b.adam.bottom <= b.controls.y, 'Companion clears navigation')
        assert.ok(b.adam.right <= b.help.x, 'Companion and Explore do not overlap')
        assert.ok(b.help.bottom <= b.controls.y, 'Explore clears navigation')
        await capture('focus')
        if (b.header.scrollHeight > b.header.clientHeight) {
          await header.focus()
          await page.keyboard.press('End')
          await page.waitForFunction(() => document.querySelector('.focusHeading').scrollTop > 0)
          record.keyboardScrollTop = await header.evaluate(element => element.scrollTop)
          await capture('summary-scrolled')
        }
        assert.deepEqual(record.pageErrors, [])
        record.status = 'PASS'
        console.log('PASS', viewport.width + 'x' + viewport.height, 'compiled Focus bounds, accessible summary and controls')
      } catch (error) {
        record.status = 'FAIL'
        record.failure = String(error.stack || error)
        await capture('failure').catch(() => {})
        console.error(record.failure)
      } finally {
        await context.close()
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
      }
    }
  } finally {
    await browser.close()
  }
  if (report.cases.some(record => record.status !== 'PASS')) process.exitCode = 1
  console.log('R1596_FOCUS_LAYOUT_RESULT ' + JSON.stringify(report))
}
run().catch(error => { console.error(error); process.exitCode = 1 })
