import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const proof = await readFile(new URL('./native-doorway-proof.mjs', import.meta.url), 'utf8')

test('keyboard doorway activation bypasses moving-target geometric stability', () => {
  assert.match(proof, /await target\.focus\(\)/)
  assert.match(proof, /target\.press\('Enter'\)/)
  assert.match(proof, /node === document\.activeElement/)
  assert.doesNotMatch(proof, /page\.keyboard\.press\('Enter'\)/)
})

test('pointer and touch use deterministic browser scrolling before hit proof', () => {
  assert.match(proof, /node\.scrollIntoView\(\{ block: 'nearest', inline: 'nearest', behavior: 'auto' \}\)/)
  assert.match(proof, /requestAnimationFrame\(resolve\)/)
  assert.match(proof, /semantic target geometry is still moving/)
})

test('pointer and touch retain real browser-coordinate hit ownership', () => {
  assert.match(proof, /page\.mouse\.click\(hitPoint\.center\.x, hitPoint\.center\.y\)/)
  assert.match(proof, /page\.touchscreen\.tap\(hitPoint\.center\.x, hitPoint\.center\.y\)/)
  assert.match(proof, /targetOwnsHitPoint/)
  assert.match(proof, /box\.width < 44 \|\| box\.height < 44/)
})


test('doorway activation waits for the React click handler to hydrate', () => {
  assert.match(proof, /page\.waitForFunction/)
  assert.match(proof, /key\.startsWith\('__reactProps'\)/)
  assert.match(proof, /typeof node\[key\]\?\.onClick === 'function'/)
})

import { readSettledLifeMapRendererSnapshot, waitForLifeMapDestination } from './native-doorway-destination-readiness.mjs'

function withRenderer(change, assertion) {
  const priorWindow = globalThis.window
  const priorDocument = globalThis.document
  const attributes = {
    'data-life-map-render-ready': 'true',
    'data-life-map-visible-objects': '21',
    'data-life-map-visible-anchors': '8',
    'data-life-map-render-calls': '1',
    'data-life-map-render-triangles': '72',
    'data-life-map-source': 'signed-out',
    'data-life-map-phase': 'overview',
  }
  Object.assign(attributes, change.attributes || {})
  const canvas = { width: change.width ?? 1440, height: change.height ?? 1100 }
  const root = {
    getAttribute: (name) => attributes[name] ?? null,
    querySelectorAll: () => Array.from({ length: change.canvasCount ?? 1 }, () => canvas),
  }
  globalThis.window = { location: { pathname: change.pathname || '/life-map/' } }
  globalThis.document = {
    querySelectorAll: () => Array.from({ length: change.ownerCount ?? 1 }, () => root),
    querySelector: () => ({ getAttribute: () => 'false' }),
  }
  try { assertion() } finally {
    if (priorWindow === undefined) delete globalThis.window; else globalThis.window = priorWindow
    if (priorDocument === undefined) delete globalThis.document; else globalThis.document = priorDocument
  }
}

test('a matching route without the scene owner cannot certify destination pixels', () => {
  withRenderer({ ownerCount: 0 }, () => assert.equal(readSettledLifeMapRendererSnapshot(), null))
})

test('DOM hydration and a ready label without actual draws remain insufficient', () => {
  withRenderer({ attributes: { 'data-life-map-render-calls': '0' } }, () => assert.equal(readSettledLifeMapRendererSnapshot(), null))
  withRenderer({ attributes: { 'data-life-map-render-ready': 'false' } }, () => assert.equal(readSettledLifeMapRendererSnapshot(), null))
})

test('the existing authored object and anchor thresholds stay strict', () => {
  withRenderer({ attributes: { 'data-life-map-visible-objects': '20' } }, () => assert.equal(readSettledLifeMapRendererSnapshot(), null))
  withRenderer({ attributes: { 'data-life-map-visible-anchors': '7' } }, () => assert.equal(readSettledLifeMapRendererSnapshot(), null))
})

test('nonfinite or malformed renderer counters fail closed', () => {
  for (const attribute of ['data-life-map-visible-objects', 'data-life-map-visible-anchors', 'data-life-map-render-calls', 'data-life-map-render-triangles']) {
    for (const value of ['NaN', 'Infinity', 'unknown']) withRenderer({ attributes: { [attribute]: value } }, () => assert.equal(readSettledLifeMapRendererSnapshot(), null))
  }
})

test('the destination must own exactly one nonempty canvas', () => {
  for (const change of [{ ownerCount: 2 }, { canvasCount: 0 }, { canvasCount: 2 }, { width: 0 }, { height: 0 }]) withRenderer(change, () => assert.equal(readSettledLifeMapRendererSnapshot(), null))
})

test('the observed renderer cannot be attributed to a different route', () => {
  withRenderer({ pathname: '/home' }, () => assert.equal(readSettledLifeMapRendererSnapshot(), null))
})

test('strict ready readback retains exact scene counts and unsigned truth boundary', () => {
  withRenderer({}, () => assert.deepEqual(readSettledLifeMapRendererSnapshot(), {
    pathname: '/life-map', renderReady: true, visibleObjects: 21, visibleAnchors: 8,
    renderCalls: 1, renderTriangles: 72, canvasCount: 1, canvasWidth: 1440, canvasHeight: 1100,
    sourceMode: 'signed-out', phase: 'overview', privateMemoryMounted: 'false',
  }))
})

test('readiness loss between dispatch and retained capture is a failure', async () => {
  const before = { renderReady: true }
  let evaluations = 0
  const page = {
    waitForFunction: async (predicate, argument, options) => {
      assert.equal(predicate, readSettledLifeMapRendererSnapshot)
      assert.equal(options.timeout, 30_000)
      return { jsonValue: async () => before, dispose: async () => {} }
    },
    evaluate: async () => (++evaluations === 1 ? undefined : null),
  }
  await assert.rejects(waitForLifeMapDestination(page), /readiness was lost before retained capture/)
})

test('the native proof requires readiness before declaring success and hashes retained PNGs', () => {
  assert.match(proof, /await waitForLifeMapDestination\(page\)/)
  assert.ok(proof.indexOf('await waitForLifeMapDestination(page)') < proof.indexOf('record.success = record.navigationSucceeded'))
  assert.match(proof, /createHash\('sha256'\)\.update\(bytes\)/)
  assert.match(proof, /retained screenshot failed/)
  assert.doesNotMatch(proof, /page\.screenshot[^\n]*\.catch\(\(\) => \{\}\)/)
})
