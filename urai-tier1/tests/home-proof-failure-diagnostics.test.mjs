import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { diagnosticUrl, homeProofDomSnapshot, homeProofNetworkLedger, retainHomeProofFailure } from '../../scripts/home-proof-failure-diagnostics.mjs'

test('network diagnostics strip URL credentials, query tokens, fragments and inline payloads', () => {
  assert.equal(diagnosticUrl('https://private:secret@example.test/asset.glb?token=private#secret'), 'https://example.test/asset.glb')
  assert.equal(diagnosticUrl('data:text/plain,private-memory'), 'data:')
  assert.equal(diagnosticUrl('blob:https://example.test/private-id'), 'blob:')
  assert.equal(diagnosticUrl('not a URL'), 'invalid-url')
})

test('network outcomes retain responses and finish/failure state within a bounded ledger', () => {
  const handlers = {}
  const ledger = homeProofNetworkLedger({ on: (name, handler) => { handlers[name] = handler } }, 4)
  const request = { url: () => 'https://example.test/world.glb?private=secret', resourceType: () => 'fetch' }
  handlers.request(request)
  handlers.response({ request: () => request, status: () => 200 })
  handlers.requestfinished(request)
  handlers.requestfailed(request)
  for (let index = 0; index < 1000; index += 1) handlers.request(request)
  assert.equal(ledger.events.length, 4)
  assert.equal(ledger.observed, 1004)
  assert.equal(ledger.dropped, 1000)
  assert.deepEqual(ledger.events.map((row) => row.event), ['started', 'response', 'finished', 'failed'])
  assert.equal(ledger.events[1].status, 200)
  assert.ok(ledger.events.every((row) => row.url === 'https://example.test/world.glb'))
})

test('actual browser snapshot preserves false readiness, canvas dimensions and frames without private text', async () => {
  const canvas = { width: 1440, height: 900, getBoundingClientRect: () => ({ width: 1440, height: 900 }) }
  const owner = {
    attributes: [{ name: 'data-home-assets-ready', value: 'false' }, { name: 'data-private-memory', value: 'secret private memory' }],
    getBoundingClientRect: canvas.getBoundingClientRect, querySelectorAll: () => [canvas], textContent: 'secret private memory',
  }
  const snapshot = await runInNewContext(`(${homeProofDomSnapshot.toString()})({ frameBudgetMs: 100 })`, {
    URL, setTimeout, clearTimeout, performance: { now: () => performance.now(), getEntriesByType: () => [{ name: 'https://example.test/asset.glb?token=secret', initiatorType: 'fetch', duration: 3 }] },
    document: { querySelectorAll: () => [owner], readyState: 'complete', visibilityState: 'visible' },
    location: { href: 'https://example.test/home/?privateMemory=secret' },
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }),
    requestAnimationFrame: (callback) => setTimeout(callback, 0), cancelAnimationFrame: clearTimeout,
  })
  assert.equal(snapshot.owners[0].attributes['data-home-assets-ready'], 'false')
  assert.equal(snapshot.owners[0].canvases[0].width, 1440)
  assert.equal(snapshot.frames.observed, 3)
  assert.equal(snapshot.url, 'https://example.test/home/')
  assert.equal(snapshot.resourceTimings[0].url, 'https://example.test/asset.glb')
  assert.equal(JSON.stringify(snapshot).includes('secret'), false)
})

async function fixture(run) {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'urai-failed-home-proof-'))
  try { await run({ outputDir, id: 'desktop', exactHead: 'a'.repeat(40), stage: 'assets-ready', network: { events: [] } }) }
  finally { await rm(outputDir, { recursive: true, force: true }) }
}

test('failed readiness retains image identity even when DOM evaluation fails', async () => fixture(async (options) => {
  const bytes = Buffer.from('synthetic failure frame')
  const diagnostic = await retainHomeProofFailure({ evaluate: async () => { throw new Error('DOM disconnected') }, screenshot: async () => bytes }, options)
  assert.equal(diagnostic.stage, 'assets-ready')
  assert.match(diagnostic.domError, /DOM disconnected/)
  assert.equal(diagnostic.screenshot.acceptance, false)
  assert.equal(diagnostic.screenshot.sha256, createHash('sha256').update(bytes).digest('hex'))
  assert.deepEqual(await readFile(path.join(options.outputDir, diagnostic.screenshot.fileName)), bytes)
  assert.equal('passed' in diagnostic, false)
}))

test('screenshot failure retains selected DOM and never changes readiness evidence', async () => fixture(async (options) => {
  const dom = { owners: [{ attributes: { 'data-home-assets-ready': 'false' } }], frames: { observed: 0 } }
  const diagnostic = await retainHomeProofFailure({ evaluate: async () => dom, screenshot: async () => { throw new Error('renderer unavailable') } }, options)
  assert.deepEqual(diagnostic.dom, dom)
  assert.match(diagnostic.screenshotError, /renderer unavailable/)
  assert.equal(diagnostic.screenshot, undefined)
  assert.equal('passed' in diagnostic, false)
}))

test('both unresponsive capture operations time out so later device cases can execute', async () => fixture(async (options) => {
  const never = () => new Promise(() => {})
  const started = performance.now()
  const diagnostic = await retainHomeProofFailure({ evaluate: never, screenshot: never }, { ...options, timeoutMs: 25 })
  assert.match(diagnostic.domError, /DOM diagnostic timed out after 25ms/)
  assert.match(diagnostic.screenshotError, /screenshot diagnostic timed out after 25ms/)
  assert.ok(performance.now() - started < 1000)
}))
