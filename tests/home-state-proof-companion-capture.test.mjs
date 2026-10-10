import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { captureVisibleCanvasPng } from '../scripts/capture-visible-canvas-png.mjs'

const source = fs.readFileSync(new URL('../scripts/capture-home-state-proof.mjs', import.meta.url), 'utf8')
const start = source.indexOf("    stage = 'revoke-consent'")
const end = source.indexOf("    const expectedAnimation =", start)
assert.ok(start >= 0 && end > start, 'the actual Orb lifecycle capture tail must exist')
const captureTail = vm.compileFunction(`return (async () => { ${source.slice(start, end)} })()`, [
  'page', 'consent', 'owner', 'record', 'ownerSelector', 'outputDir', 'id',
  'exactHead', 'waitForVisualEvidence', 'createHash', 'path', 'stage',
  'inspectFocusedHomeNavigation',
])

// These are proof-harness ports, not provider, product or pixel acceptance.
// Execute the actual script tail with the unchanged strict canvas-capture helper.
async function runCapture({ escapeCloses = true, revokeWorks = true, navigationReadable = true } = {}) {
  const events = []
  const record = {}
  let checked = true
  let panelOpen = true
  let state = 'attention'
  const owner = { getAttribute: async (name) => attributes(name) }
  const attributes = (name) => ({
    'data-home-orb-state': state,
    'data-home-orb-clip': `Orb_${state[0].toUpperCase()}${state.slice(1)}`,
    'data-home-orb-animation': state === 'idle' ? 'orb-breathe' : `orb-${state}`,
  })[name]
  const document = { querySelector: () => ({ getAttribute: attributes }) }
  const consent = {
    focus: async () => events.push('focus-consent'),
    isChecked: async () => checked,
  }
  const bounds = { x: 0, y: 0, width: 1440, height: 900 }
  const canvas = {
    waitFor: async () => {},
    boundingBox: async () => bounds,
    evaluate: async () => !panelOpen,
  }
  const page = {
    keyboard: { press: async (key) => {
      events.push(`key:${key}`)
      if (key === 'Space' && revokeWorks) { checked = false; state = 'privacy' }
      if (key === 'Escape' && escapeCloses) { panelOpen = false; state = 'idle' }
    } },
    locator: (selector) => ({ waitFor: async ({ state: expected }) => {
      events.push(`wait:${selector}:${expected}`)
      assert.equal(panelOpen, false, 'the native Escape must close the companion')
    } }),
    waitForFunction: async (fn, selector) => {
      assert.equal(vm.runInNewContext(`(${fn.toString()})(selector)`, { document, selector }), true)
    },
    viewportSize: () => ({ width: 1440, height: 900 }),
    screenshot: async (options) => {
      events.push(options.clip ? 'canvas-pixels' : panelOpen ? 'privacy-panel-pixels' : 'closed-world-pixels')
      assert.equal(checked, false, 'privacy evidence must follow actual checkbox revocation')
      return Buffer.alloc(12001, panelOpen ? 1 : 2)
    },
  }
  const visual = async () => {
    const retained = await captureVisibleCanvasPng(page, canvas)
    return { available: true, viewportCoverage: retained.capture.viewportCoverage, luminanceRange: 143, visibleSamples: 9 }
  }
  // Explicit synthetic measurement port for this extracted-tail unit test.
  // Actual browser measurement stays in the native capture's imported helper.
  const inspectFocusedNavigation = async () => {
    events.push('inspect-focused-navigation')
    assert.equal(panelOpen, false, 'label inspection must follow native companion closure')
    return { passed: navigationReadable, qualification: 'synthetic proof-harness port only' }
  }
  await captureTail(page, consent, owner, record, '.home-owner', '/evidence', 'orb-lifecycle', 'exact-head', visual, createHash, path, undefined, inspectFocusedNavigation)
  return { events, record }
}

test('retain the revoked-consent panel before native closure and strict unoccluded canvas proof', async () => {
  const { events, record } = await runCapture()
  assert.equal(record.consentRevoked, true)
  assert.equal(record.privacyState, 'privacy')
  assert.equal(record.closedState, 'idle')
  assert.equal(record.visual.available, true)
  assert.equal(record.focusedNavigationReadability.passed, true)
  assert.ok(events.indexOf('key:Escape') < events.indexOf('inspect-focused-navigation'))
  assert.ok(events.indexOf('inspect-focused-navigation') < events.indexOf('canvas-pixels'))
  assert.ok(record.privacyScreenshotBytes > 12000)
  assert.match(record.privacyScreenshotSha256, /^[a-f0-9]{64}$/)
  assert.ok(events.indexOf('privacy-panel-pixels') < events.indexOf('key:Escape'))
  assert.ok(events.indexOf('key:Escape') < events.indexOf('canvas-pixels'))
  assert.ok(events.some((event) => event.includes('[aria-hidden="true"]')))
})

test('failure to close the companion cannot produce a canvas-proof pass', async () => {
  await assert.rejects(runCapture({ escapeCloses: false }))
})

test('failure to revoke consent cannot be certified by closing the panel', async () => {
  await assert.rejects(runCapture({ revokeWorks: false }))
})

test('failed focused-label measurement cannot produce a closed-world canvas-proof pass', async () => {
  await assert.rejects(runCapture({ navigationReadable: false }), /Actual focused Home destination labels are clipped, hidden or obstructed/)
})
