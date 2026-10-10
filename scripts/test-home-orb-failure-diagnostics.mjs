import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { attachHomeOrbFailureProbe, captureHomeOrbFailure, diagnosticUrl, readCanvasOcclusionSamples } from './home-orb-failure-diagnostics.mjs'

function fixture({ unavailable = false, oversized = false } = {}) {
  const listeners = new Map()
  return {
    listeners,
    on(name, listener) { listeners.set(name, listener) },
    off(name, listener) { assert.equal(listeners.get(name), listener); listeners.delete(name) },
    async addInitScript(script) { assert.equal(typeof script, 'function') },
    async evaluate() { if (unavailable) throw new Error('private-evaluation-error'); return { ownerPresent: true, attributes: { 'data-home-assets-ready': 'false' } } },
    async screenshot(options) { assert.equal(options.timeout, 30_000); if (unavailable) throw new Error('private-screenshot-error'); return Buffer.alloc(oversized ? 4 * 1024 * 1024 + 1 : 12, 1) },
  }
}

test('network diagnostics exclude credentials, query, fragment and non-HTTP URLs', () => {
  assert.equal(diagnosticUrl('https://user:secret@example.invalid/model.glb?token=private#secret'), 'https://example.invalid/model.glb')
  assert.equal(diagnosticUrl('data:text/plain,private'), '[non-http]')
  assert.equal(diagnosticUrl('not a URL'), '[invalid-url]')
})

test('event collection is bounded, suppresses raw console contents and detaches', async () => {
  const page = fixture(), probe = await attachHomeOrbFailureProbe(page)
  page.listeners.get('console')({ type: () => 'warning', text: () => 'WebGL private bearer secret' })
  for (let i = 0; i < 80; i++) page.listeners.get('response')({ url: () => 'https://example.invalid/model.glb?key=private', status: () => 200 })
  const snapshot = probe.snapshot()
  assert.equal(snapshot.events.length, 64)
  assert.equal(snapshot.droppedEvents, 17)
  assert.equal(snapshot.events[0].category, 'webgl')
  assert.ok(!JSON.stringify(snapshot).includes('private'))
  probe.stop()
  assert.equal(page.listeners.size, 0)
})

for (const mode of ['available', 'unavailable', 'oversized']) {
  test(`failure evidence preserves rejection when diagnostics are ${mode}`, async () => {
    const outputDir = await mkdtemp(path.join(os.tmpdir(), 'urai-home-diagnostic-'))
    try {
      const page = fixture({ unavailable: mode === 'unavailable', oversized: mode === 'oversized' })
      const probe = await attachHomeOrbFailureProbe(page)
      const result = await captureHomeOrbFailure(page, { outputDir, prefix: 'desktop-6d1e994b0057', stage: 'home-assets-ready', probe })
      assert.equal(result.acceptance, false)
      assert.equal(result.runtimeReadinessVerified, false)
      assert.equal(result.stage, 'home-assets-ready')
      const saved = JSON.parse(await readFile(path.join(outputDir, result.file), 'utf8'))
      assert.deepEqual(saved, result)
      if (mode === 'unavailable') {
        assert.deepEqual(result.errors, ['occlusion-snapshot-unavailable', 'browser-snapshot-unavailable', 'failure-screenshot-unavailable'])
        assert.ok(!JSON.stringify(result).includes('private-'))
      } else {
        assert.equal(result.browser.attributes['data-home-assets-ready'], 'false')
        if (mode === 'oversized') {
          assert.equal(result.screenshotOmitted, 'exceeds-4MiB-diagnostic-budget')
          assert.equal((await readdir(outputDir)).length, 1)
        } else assert.equal((await readFile(path.join(outputDir, result.screenshot))).length, 12)
      }
      probe.stop()
    } finally { await rm(outputDir, { recursive: true, force: true }) }
  })
}

test('artifact prefix cannot escape the selected diagnostic directory', async () => {
  await assert.rejects(captureHomeOrbFailure(fixture(), { outputDir: os.tmpdir(), prefix: '../escape', stage: 'ready', probe: { snapshot: () => ({}) } }), /invalid-diagnostic-prefix/)
})

test('occlusion diagnostic identifies the covered point without recording DOM text or private attributes', () => {
  const previous = globalThis.document
  const canvas = { getBoundingClientRect: () => ({ x: 0, y: 0, width: 390, height: 844 }), tagName: 'CANVAS', classList: [] }
  const overlay = { tagName: 'BUTTON', classList: ['home-touch-control'], textContent: 'private text', id: 'private-id' }
  try {
    globalThis.document = { querySelector: () => canvas, elementFromPoint: (x, y) => x > 300 && y > 600 ? overlay : canvas }
    const result = readCanvasOcclusionSamples()
    assert.equal(result.samples.length, 12)
    assert.equal(result.samples.filter(sample => !sample.canvasTopmost).length, 1)
    assert.deepEqual(result.samples[11], { point: [.88,.82], canvasTopmost: false, hitTag: 'BUTTON', hitClasses: ['home-touch-control'] })
    assert.ok(!JSON.stringify(result).includes('private'))
    globalThis.document.querySelector = () => null
    assert.deepEqual(readCanvasOcclusionSamples(), { canvasPresent: false, samples: [] })
  } finally { globalThis.document = previous }
})
