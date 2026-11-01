import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../src/spatial/store/useSceneStore.ts', import.meta.url), 'utf8')
const result = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
}})
assert.equal((result.diagnostics ?? []).filter(x => x.category === ts.DiagnosticCategory.Error).length, 0)
const module = { exports: {} }
function createStore(init) {
  let state
  const set = update => {
    const patch = typeof update === 'function' ? update(state) : update
    state = { ...state, ...patch }
  }
  state = init(set, () => state)
  const hook = select => select(state)
  hook.getState = () => state
  return hook
}
vm.runInNewContext(result.outputText, { module, exports: module.exports,
  require(specifier) { if (specifier === 'zustand') return { create: createStore }; throw Error(specifier) },
  Math, Number, Object, Error,
}, { filename: 'useSceneStore.js' })
const { placeForPathname, useSceneStore } = module.exports

const routes = new Map([
  ['/', 'HOME'], ['/spatial/ar-vr', 'HOME'], ['/ground', 'GROUND'],
  ['/ground/', 'GROUND'], ['/ground/room', 'GROUND'], ['/life-map', 'LIFEMAP'],
  ['/life-map/', 'LIFEMAP'], ['/life-map/star', 'LIFEMAP'], ['/focus', 'FOCUS'],
  ['/focus/memory', 'FOCUS'], ['/replay', 'REPLAY'], ['/replay/segment', 'REPLAY'],
  ['/passport', 'PASSPORT'], ['/passport/privacy', 'PASSPORT'], ['/status', 'STATUS'],
  ['/status/health', 'STATUS'], ['/grounded', 'HOME'], ['/life-mapped', 'HOME'],
  ['/focused', 'HOME'], ['/replayer', 'HOME'], ['/passporting', 'HOME'], ['/statuspage', 'HOME'],
])

test('canonical routing matches complete path segments only', () => {
  for (const [path, expected] of routes) assert.equal(placeForPathname(path), expected, path)
})

test('ascent progress cannot poison camera state with nonfinite values', () => {
  const state = useSceneStore.getState()
  state.enterLifeMap()
  assert.equal(useSceneStore.getState().phase, 'ASCENT')
  assert.equal(useSceneStore.getState().inputLocked, true)
  assert.equal(useSceneStore.getState().progress, 0)
  for (const p of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    useSceneStore.getState().setProgress(p)
    assert.equal(useSceneStore.getState().progress, 0, 'nonfinite ' + p)
  }
  useSceneStore.getState().setProgress(0.47)
  assert.equal(useSceneStore.getState().progress, 0.47)
  useSceneStore.getState().setProgress(-2)
  assert.equal(useSceneStore.getState().progress, 0)
  useSceneStore.getState().setProgress(2)
  assert.equal(useSceneStore.getState().progress, 1)
})

test('route navigation exits ascent and preserves legal focus/replay path', () => {
  useSceneStore.getState().setPlaceFromRoute('/life-map')
  assert.equal(useSceneStore.getState().phase, 'LIFEMAP')
  assert.equal(useSceneStore.getState().inputLocked, false)
  useSceneStore.getState().focusStar('star-1', [1, 2, 3])
  assert.equal(useSceneStore.getState().phase, 'FOCUS')
  useSceneStore.getState().enterReplay()
  assert.equal(useSceneStore.getState().phase, 'REPLAY')
  useSceneStore.getState().clearFocusedStar()
  assert.equal(useSceneStore.getState().phase, 'LIFEMAP')
  useSceneStore.getState().setPlaceFromRoute('/grounded')
  assert.equal(useSceneStore.getState().phase, 'HOME')
})
