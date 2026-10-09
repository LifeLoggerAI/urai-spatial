import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { admitSyntheticHomeOrbFixture } from '../../scripts/home-orb-review-fixture.mjs'

// Execute the real capture function, canonical publisher, sensory bindings and
// Home event consumer with owned page/DOM adapters. No browser pixels, provider
// delivery, trusted Firebase account or family-source acceptance is asserted.
const harness = fs.readFileSync(new URL('../../scripts/capture-continuous-spatial-proof-v18.mjs', import.meta.url), 'utf8')
const home = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')
const controller = fs.readFileSync(new URL('../src/app/home/orbStateController.ts', import.meta.url), 'utf8')
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const clipsSource = home.match(/const ORB_CLIPS: Record<OrbState, string> = \{[\s\S]*?\n\}/)?.[0]
const consumerSource = home.match(/    const onOrbState = \(event: CustomEvent<OrbStateEventDetail>\) => \{[\s\S]*?    window.addEventListener\(URAI_ORB_STATE_EVENT, onOrbState\)/)?.[0]
assert.ok(clipsSource && consumerSource, 'Actual Home clip/consumer boundaries must remain discoverable')
const orbClips = vm.runInNewContext(compile(clipsSource) + '\nORB_CLIPS')
const orbStates = Object.keys(orbClips)
assert.equal(orbStates.length, 12)
const captureStart = harness.indexOf('async function captureHomeState(')
const captureEnd = harness.indexOf('async function captureLoading(', captureStart)
assert.ok(captureStart >= 0 && captureEnd > captureStart)

function fixture({ state = 'thinking', query, attributes = {}, phase = 'HOME', groundDescent = false } = {}) {
  let current = 'idle'
  const events = []
  const listeners = new Map()
  const window = {
    location: { search: query ?? `?homeAssetReview=1&homePrivateFixture=1&homeOrbState=${state}` },
    addEventListener(name, callback) { listeners.set(name, callback) },
    dispatchEvent(event) { events.push(event); listeners.get(event.type)?.(event) },
  }
  class CustomEvent { constructor(type, init) { this.type = type; this.detail = init.detail } }
  const attrs = { 'data-home-asset-mode': 'disclosed-review-candidate', 'data-home-personalization-mode': 'private-personalized',
    'data-home-review-fixture': 'safe-private', 'data-home-scene-phase': phase,
    'data-home-ready': 'true', 'data-home-assets-ready': 'true', 'data-home-input-ready': 'true', 'data-home-interaction-ready': 'true', ...attributes }
  const owner = { getAttribute(name) {
    if (name === 'data-home-orb-state') return current
    if (name === 'data-home-orb-clip') return orbClips[current]
    return attrs[name] ?? null
  } }
  const document = { querySelectorAll: () => [owner], querySelector: () => owner }
  const module = { exports: {} }
  const context = vm.createContext({ window, document, CustomEvent, URLSearchParams, module, exports: module.exports })
  vm.runInContext(compile(controller), context)
  const actual = module.exports
  Object.assign(context, { phase, groundDescent, isOrbState: actual.isOrbState, URAI_ORB_STATE_EVENT: actual.URAI_ORB_STATE_EVENT,
    setOrbState: state => { current = state } })
  vm.runInContext(compile(consumerSource), context)
  const evaluate = (callback, input) => { context.input = input; return vm.runInContext(`(${callback.toString()})(input)`, context) }
  const page = { evaluate, async goto() {}, async screenshot() {},
    async waitForFunction(callback, input, limits) { assert.equal(limits.timeout, 10_000); assert.equal(evaluate(callback, input), true, 'Actual consumer must expose the requested state and authored clip') } }
  const options = { ownerSelector: '.actual-owned-home', orbStates, orbClips, expectReady: false }
  return { actual, page, options, events, attrs, get state() { return current }, owner,
    capture: async requestedState => {
      const receipt = { captures: [], errors: [] }
      const scope = { receipt, outputDir: '/owned-synthetic-proof', exactHead: 'owned-fixture', expectReady: false,
        ownerSelector: options.ownerSelector, orbStates, orbClips, admitSyntheticHomeOrbFixture,
        openContext: async () => ({ context: {}, page }), attachDiagnostics: () => () => ({ pageErrors: [], consoleErrors: [], failedRequests: [] }),
        candidateQuery: query => `homeAssetReview=1&${query}`, urlFor: (route, query) => `${route}?${query}`,
        // Reproduce the legitimate initialization reset after query-driven state.
        waitForAssetHome: async () => actual.publishOrbState('idle', 'conversation'), waitFrames: async () => {},
        verifyHome: async (_page, expected) => ({ orbState: current, orbClip: orbClips[current],
          passed: current === expected.orbState && orbClips[current] === orbClips[expected.orbState] }),
        path: { join: (...parts) => parts.join('/'), relative: (_base, filename) => filename }, safeName: name => name,
        closeAndRecordVideo: async () => null,
      }
      const capture = vm.runInNewContext(harness.slice(captureStart, captureEnd) + '\ncaptureHomeState', scope)
      await capture({}, { id: 'owned' }, { id: `home-orb-${requestedState}`, query: `homePrivateFixture=1&homeOrbState=${requestedState}`,
        orbState: requestedState, syntheticOrbFixture: true })
      return receipt
    },
  }
}

for (const state of orbStates) test(`actual governed capture admits ${state} after legitimate initialization reset`, async () => {
  const owned = fixture({ state })
  const receipt = await owned.capture(state)
  assert.equal(receipt.errors.length, 0)
  assert.equal(receipt.captures[0].verification.orbState, state)
  assert.equal(receipt.captures[0].verification.orbClip, orbClips[state])
  assert.equal(receipt.captures[0].syntheticFixtureAdmission?.evidenceKind, 'synthetic-visual-fixture')
  assert.equal(receipt.captures[0].syntheticFixtureAdmission?.admissions, 1)
})

test('single fixture event uses the real canonical consumer and yields to later actor/normal state', async () => {
  const owned = fixture()
  const record = await admitSyntheticHomeOrbFixture(owned.page, { syntheticOrbFixture: true, orbState: 'thinking' }, owned.options)
  assert.equal(record.previousState, 'idle')
  assert.equal(owned.events.length, 1)
  assert.equal(owned.events[0].type, owned.actual.URAI_ORB_STATE_EVENT)
  assert.equal(owned.actual.resolveOrbSensoryOutput(owned.state, false, true).material, 'inner-orbit')
  owned.actual.publishOrbState('idle', 'conversation')
  assert.equal(owned.state, 'idle', 'Actor cancellation remains authoritative after fixture admission')
  owned.actual.publishOrbState('attention', 'companion')
  assert.equal(owned.state, 'attention', 'Normal interaction remains authoritative after fixture admission')
  assert.equal(owned.events.length, 3, 'No persistent fixture re-admission or observer exists')
})

for (const query of ['?homePrivateFixture=1&homeOrbState=thinking', '?homeAssetReview=1&homeOrbState=thinking', '?homeAssetReview=1&homePrivateFixture=1&homeOrbState=speaking']) {
  test(`refuses missing/mismatched explicit fixture query ${query}`, async () => {
    const owned = fixture({ query })
    await assert.rejects(admitSyntheticHomeOrbFixture(owned.page, { syntheticOrbFixture: true, orbState: 'thinking' }, owned.options), /not admitted/)
    assert.equal(owned.events.length, 0)
  })
}
for (const [name, value] of [['data-home-asset-mode', 'ready'], ['data-home-personalization-mode', 'standard'], ['data-home-review-fixture', 'none'],
  ['data-home-scene-phase', 'ASCENT'], ...['data-home-ready', 'data-home-assets-ready', 'data-home-input-ready', 'data-home-interaction-ready'].map(name => [name, 'false'])]) {
  test(`refuses unavailable or non-review owner ${name}`, async () => {
    const owned = fixture({ attributes: { [name]: value } })
    await assert.rejects(admitSyntheticHomeOrbFixture(owned.page, { syntheticOrbFixture: true, orbState: 'thinking' }, owned.options), /not admitted/)
    assert.equal(owned.events.length, 0)
  })
}
test('normal captures do not inject a fixture; production-ready and unknown fixtures are refused', async () => {
  const owned = fixture()
  assert.equal(await admitSyntheticHomeOrbFixture(owned.page, { orbState: 'thinking' }, owned.options), null)
  for (const [state, options] of [[{ syntheticOrbFixture: true, orbState: 'thinking' }, { ...owned.options, expectReady: true }],
    [{ syntheticOrbFixture: true, orbState: 'fabricated' }, owned.options]]) {
    await assert.rejects(admitSyntheticHomeOrbFixture(owned.page, state, options), /disclosed review candidate/)
  }
  assert.equal(owned.events.length, 0)
})

test('original v22/v21 materializers retain one-shot admission and all twelve actual clip assertions', async () => {
  const scripts = new URL('../../scripts/', import.meta.url)
  const input = new Map(['capture-continuous-spatial-proof-v18.mjs', 'run-continuous-spatial-proof-v18-portal-stable.mjs',
    'run-continuous-spatial-proof-v19-portal-stable.mjs'].map(name => [name, fs.readFileSync(new URL(name, scripts), 'utf8')]))
  const context = vm.createContext({ URL, JSON, Date, process: { env: { URAI_PROOF_GROUP: 'visual' } },
    readFile: async url => input.get(path.basename(url.pathname)), writeFile: async () => {} })
  const prefix = (name, cutoff) => {
    const source = fs.readFileSync(new URL(name, scripts), 'utf8')
    const end = source.indexOf(cutoff)
    assert.ok(end > 0, `Actual materializer ${name} cutoff must be explicit`)
    return source.slice(0, end).replace(/^import .*\n/gm, '').replaceAll('import.meta.url', JSON.stringify(new URL(name, scripts).href))
  }
  const natural = await vm.runInContext(`(async () => { ${prefix('run-continuous-spatial-proof-v22-natural.mjs', 'await writeFile(captureUrl, patched')}\nreturn patched })()`, context)
  input.set('capture-continuous-spatial-proof-v18.mjs', natural)
  const grouped = await vm.runInContext(`(async () => { ${prefix('run-continuous-spatial-proof-v21-grouped.mjs', 'await writeFile(sourceUrl, grouped')}\nreturn grouped })()`, context)
  assert.match(grouped, /import \{ admitSyntheticHomeOrbFixture \} from '\.\/home-orb-review-fixture\.mjs'/)
  assert.equal(grouped.split('await admitSyntheticHomeOrbFixture(page, state,').length - 1, 1)
  assert.match(grouped, /syntheticOrbFixture: true/)
  assert.match(grouped, /result\.orbState === expected\.orbState/)
  assert.match(grouped, /result\.orbClip === orbClips\[expected\.orbState\]/)
  for (const [state, clip] of Object.entries(orbClips)) assert.match(grouped, new RegExp(`${state}: '${clip}'`))
})
