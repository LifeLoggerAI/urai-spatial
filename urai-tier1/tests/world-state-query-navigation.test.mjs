import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import * as destinations from '../src/spatial/world/destinationRegistry.ts'
import * as worldTypes from '../src/spatial/world/worldTypes.ts'

function load(path, imports, globals = {}) {
  const source = fs.readFileSync(path, 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } })
  const module = { exports: {} }
  vm.runInNewContext(outputText, { ...globals, module, exports: module.exports, require(id) { assert.ok(id in imports, `Unexpected dependency ${id}`); return imports[id] } })
  return module.exports
}

function harness() {
  const slots = []; let cursor = 0; let effects = []; let dirty = false
  const changed = (a, b) => !a || a.length !== b.length || a.some((value, index) => !Object.is(value, b[index]))
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    useReducer(reducer, input, initial) {
      const index = cursor++
      slots[index] ??= { value: initial(input) }
      return [slots[index].value, action => { slots[index].value = reducer(slots[index].value, action); dirty = true }]
    },
    useMemo(factory, deps) {
      const index = cursor++
      if (!slots[index] || changed(slots[index].deps, deps)) slots[index] = { value: factory(), deps }
      return slots[index].value
    },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps) },
    useEffect(effect, deps) {
      const index = cursor++
      if (!slots[index] || changed(slots[index].deps, deps)) {
        slots[index] = { deps, cleanup: slots[index]?.cleanup }
        effects.push(() => { slots[index].cleanup?.(); slots[index].cleanup = effect() })
      }
    },
    useSyncExternalStore(subscribe, snapshot) {
      const index = cursor++
      slots[index] ??= { cleanup: subscribe(() => { dirty = true }) }
      return snapshot()
    },
  }
  const events = new Map()
  const window = {
    location: { pathname: '/focus', search: '?memoryId=one&manifestId=manifest-one', hash: '' },
    addEventListener: (name, callback) => events.set(name, callback),
    removeEventListener: (name, callback) => { if (events.get(name) === callback) events.delete(name) },
  }
  const commit = (url) => {
    const next = new URL(url, 'http://localhost/focus')
    Object.assign(window.location, { pathname: next.pathname, search: next.search, hash: next.hash })
  }
  window.history = {
    pushState(_state, _title, url) { commit(url) },
    replaceState(_state, _title, url) { commit(url) },
  }
  const store = load('src/lib/browserLocationStore.ts', {}, { window })
  const hook = load('src/hooks/useBrowserLocation.ts', { react, '@/lib/browserLocationStore': store })
  const owner = load('src/spatial/world/WorldStateProvider.tsx', {
    react,
    'react/jsx-runtime': { jsx: (_type, props) => props.value },
    '@/hooks/useBrowserLocation': hook,
    './destinationRegistry': destinations,
    './worldTypes': worldTypes,
  }, { window, URLSearchParams })
  const render = () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      dirty = false; cursor = 0
      const result = owner.UraiWorldStateProvider({ pathname: '/focus', children: null })
      const pending = effects; effects = []; pending.forEach(effect => effect())
      if (!dirty) return result
    }
    throw new Error('World provider did not settle')
  }
  return {
    render,
    push(url) { window.history.pushState({}, '', url); return render() },
    replace(url) { window.history.replaceState({}, '', url); return render() },
    back(url) { commit(url); events.get('popstate')?.(); return render() },
    unmount() { slots.forEach(slot => slot?.cleanup?.()) },
    events,
  }
}

for (const operation of ['push', 'replace', 'back']) {
  test(`mounted world provider synchronizes same-path ${operation} memory, manifest and privacy context`, () => {
    const h = harness()
    assert.equal(h.render().world.memoryId, 'one')
    const next = h[operation]('/focus?memoryId=two&manifestId=manifest-two&privacyMode=held-private')
    assert.equal(next.world.destination, 'focus')
    assert.equal(next.world.memoryId, 'two')
    assert.equal(next.world.replayManifestId, 'manifest-two')
    assert.equal(next.world.privacyMode, 'held-private')
    assert.equal(next.phase, 'idle')
    h.unmount()
    assert.equal(h.events.size, 0)
  })
}

test('same-path travel commit releases transition input instead of leaving the world phase stuck', () => {
  const h = harness(); const initial = h.render()
  initial.beginTravel({ destination: 'focus', context: { memoryId: 'two', replayManifestId: 'manifest-two' } })
  assert.equal(h.render().phase, 'travelling')
  const committed = h.push('/focus?memoryId=two&manifestId=manifest-two')
  assert.equal(committed.phase, 'idle')
  assert.equal(committed.pendingTravel, undefined)
  assert.equal(committed.world.memoryId, 'two')
  assert.equal(committed.world.replayManifestId, 'manifest-two')
  h.unmount()
})
