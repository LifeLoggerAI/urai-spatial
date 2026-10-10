import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as THREE from 'three'
import { withLifeMapSelectionIdentity } from '../src/spatial/memory/lifeMapSelectionJourney.ts'
import { buildNamedExplicitDemoMemory } from '../src/spatial/memory/explicitDemoMemory.ts'

for (const id of ['quiet-reset', 'voice-note-home', 'home-place-fragment', 'demo:quiet-reset']) {
  test(`explicit demo selection resolves the actual ${id} manifest rather than a previous star`, () => {
    const current = new URLSearchParams('demo=1&memoryId=other-star&manifestId=stale-manifest&onboarding=1')
    const next = withLifeMapSelectionIdentity(current, new URLSearchParams(), id)
    const expected = buildNamedExplicitDemoMemory(id.startsWith('demo:') ? id : `demo:${id}`)
    assert.equal(next.get('manifestId'), expected.replayManifest.id)
    assert.equal(next.get('demo'), '1')
    assert.equal(next.get('onboarding'), '1')
  })
}
for (const flag of ['onboarding', 'firstRun']) {
  test(`${flag} remains explicit through current selection and destination metadata`, () => {
    for (const mode of ['', 'demo=1&']) {
      const next = withLifeMapSelectionIdentity(new URLSearchParams(`${mode}${flag}=1`), new URLSearchParams(), 'chosen-memory')
      assert.equal(next.get(flag), '1')
    }
  })
}
test('an already bound private manifest remains attached to the same private selection', () => {
  const next = withLifeMapSelectionIdentity(new URLSearchParams('memoryId=chosen-memory&manifestId=accepted-manifest'), new URLSearchParams(), 'chosen-memory')
  assert.equal(next.get('manifestId'), 'accepted-manifest')
  assert.equal(next.get('demo'), null)
})
test('another private memory does not inherit or fabricate the previous manifest', () => {
  const next = withLifeMapSelectionIdentity(new URLSearchParams('memoryId=old-memory&manifestId=old-manifest&onboarding=1'), new URLSearchParams(), 'chosen-memory')
  assert.equal(next.get('manifestId'), null)
  assert.equal(next.get('demo'), null)
  assert.equal(next.get('onboarding'), '1')
})
for (const marker of ['', '0', 'true', '01']) {
  test(`demo=${marker} does not turn a private selection into a sample`, () => {
    const next = withLifeMapSelectionIdentity(new URLSearchParams(`demo=${marker}&onboarding=0&firstRun=true`), new URLSearchParams(), 'chosen-memory')
    assert.equal(next.get('demo'), null)
    assert.equal(next.get('manifestId'), null)
    assert.equal(next.get('onboarding'), null)
    assert.equal(next.get('firstRun'), null)
  })
}
test('an unrelated incoming query is never copied into navigation metadata', () => {
  const next = withLifeMapSelectionIdentity(new URLSearchParams('privateNote=must-remain-private&onboarding=1'), new URLSearchParams(), 'chosen-memory')
  assert.deepEqual([...next.keys()], ['onboarding'])
})

// Exercise the actual retained scene's selection and destination handlers.
// Rendering/React/Next edges are controlled; no WebGL or browser proof is claimed.
const sceneSource = fs.readFileSync(process.env.URAI_LIFEMAP_SCENE_SOURCE ?? 'src/components/lifemap/AdaptiveLifeMapScene.tsx', 'utf8')
const sceneCompiled = ts.transpileModule(sceneSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
function sceneFixture(search, chosenId = 'quiet-reset') {
  const chosen = { id: chosenId, title: 'Chosen memory', type: 'memory', position: [1, 2, 3], connectedTo: [], replayAvailable: true }
  const nodes = [chosen], slots = [], calls = []
  let cursor = 0, dirty = false, effects = []
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((value, index) => !Object.is(value, b[index]))
  const browser = { location: new URL('http://localhost/life-map' + search), addEventListener() {}, removeEventListener() {}, clearTimeout() {}, setTimeout() { throw Error('Reduced motion must avoid travel timers') } }
  const react = {
    useState(initial) { const index = cursor++; slots[index] ??= { value: initial }; return [slots[index].value, next => { if (!Object.is(next, slots[index].value)) { slots[index].value = next; dirty = true } }] },
    useRef(initial) { const index = cursor++; slots[index] ??= { value: { current: initial } }; return slots[index].value },
    useMemo(factory, deps) { const index = cursor++; if (!slots[index] || changed(slots[index].deps, deps)) slots[index] = { value: factory(), deps }; return slots[index].value },
    useEffect(effect, deps) { const index = cursor++, old = slots[index]; if (!old || changed(old.deps, deps)) { slots[index] = { deps, cleanup: old?.cleanup }; effects.push(() => { slots[index].cleanup?.(); slots[index].cleanup = effect() }) } },
  }
  react.useCallback = (callback, deps) => react.useMemo(() => callback, deps)
  const element = (type, props) => ({ type, props: props ?? {} })
  const imports = {
    react, 'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'fragment' },
    '@react-three/fiber': { Canvas: 'canvas', useFrame() {}, useThree() {} },
    '@react-three/drei': { Html: 'html', Line: 'line', Stars: 'stars' }, three: THREE,
    'next/navigation': { useSearchParams: () => browser.location.searchParams, useRouter: () => ({ replace(destination, options) { calls.push({ kind: 'selection', destination, options }); browser.location = new URL(destination, browser.location) }, push(destination) { calls.push({ kind: 'destination', destination }) } }) },
    './useLifeMapEvents': { useLifeMapEvents: () => ({ nodes, loading: false, sourceMode: search.includes('demo=1') ? 'explicit-demo' : 'private' }) },
    './lifeMapData': { lifeMapTypeLabels: { memory: 'Memory' } },
    '@/spatial/performance/useAdaptiveSpatialQuality': { useAdaptiveSpatialQuality: () => ({ reducedMotion: true, pixelRatioMax: 1, antialias: false }) },
    '@/spatial/memory/lifeMapSelectionJourney': { withLifeMapSelectionIdentity },
  }
  const module = { exports: {} }
  vm.runInNewContext(sceneCompiled, { module, exports: module.exports, require(id) { assert.ok(id in imports, 'Unexpected dependency ' + id); return imports[id] }, window: browser, document: { body: { style: {} } }, URLSearchParams, HTMLElement: class {} }, { filename: 'actual-AdaptiveLifeMapScene.tsx' })
  const descendants = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...(Array.isArray(tree.props?.children) ? tree.props.children.flat(Infinity) : [tree.props?.children]).flatMap(descendants)]
  function render() {
    for (let count = 0; count < 20; count++) { cursor = 0; dirty = false; const tree = module.exports.default(); const pending = effects; effects = []; pending.forEach(effect => effect()); if (!dirty) return tree }
    throw Error('Retained scene did not settle')
  }
  return {
    calls, browser,
    select() { const world = descendants(render()).find(element => element.type?.name === 'LifeMapWorld'); assert.ok(world); world.props.onSelect(chosen); render(); return browser.location.searchParams },
    focus() { const button = descendants(render()).find(element => element.type === 'button' && element.props.children === 'Enter Focus'); assert.ok(button); button.props.onClick(); return new URL(calls.at(-1).destination, browser.location).searchParams },
  }
}
for (const flag of ['onboarding', 'firstRun']) {
  test(`the retained scene carries ${flag} through selection and its actual Focus action`, () => {
    const fixture = sceneFixture(`?demo=1&${flag}=1`)
    assert.equal(fixture.select().get(flag), '1')
    const destination = fixture.focus()
    assert.equal(destination.get(flag), '1')
    assert.equal(destination.get('memoryId'), 'quiet-reset')
    assert.equal(destination.get('manifestId'), 'replay-recovery-thread')
  })
}
test('the retained scene uses the actual nondefault sample manifest at selection and Focus', () => {
  const fixture = sceneFixture('?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&onboarding=1', 'voice-note-home')
  assert.equal(fixture.select().get('manifestId'), 'demo-manifest')
  assert.equal(fixture.focus().get('manifestId'), 'demo-manifest')
})
for (const search of ['', '?memoryId=another-memory&manifestId=previous-manifest']) {
  test(`the retained scene cannot mint or carry unrelated private manifest authority from ${search || 'an unbound selection'}`, () => {
    const fixture = sceneFixture(search)
    assert.equal(fixture.select().get('manifestId'), null)
    assert.equal(fixture.focus().get('manifestId'), null)
    assert.equal(fixture.focus().get('demo'), null)
  })
}
test('the retained scene preserves a manifest already bound to the same private memory', () => {
  const fixture = sceneFixture('?memoryId=quiet-reset&manifestId=accepted-manifest&onboarding=1')
  assert.equal(fixture.select().get('manifestId'), 'accepted-manifest')
  assert.equal(fixture.focus().get('manifestId'), 'accepted-manifest')
})
