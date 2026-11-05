import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import * as destinations from '../src/spatial/world/destinationRegistry.ts'
import * as worldTypes from '../src/spatial/world/worldTypes.ts'
import { retainDisclosedHomeAscentDemo, retainDisclosedHomeReturnDemo } from '../src/spatial/navigation/homeSkyInteraction.ts'
for (const [name, path, begin, end, exported] of [
  ['controller', 'src/spatial/world/WorldTransitionController.tsx', 'const CONTEXT_KEYS = [', 'function normalizedPathname(', 'buildTravelHref'],
  ['hard fallback', 'src/spatial/world/worldEvents.ts', 'const WORLD_TRAVEL_CONTEXT_KEYS = [', 'function commitHardFallback(', 'buildFallbackHref'],
]) {
  test(`actual ${name} preserves only explicitly disclosed Life Map demo on Home return`, () => {
    const source = fs.readFileSync(path, 'utf8')
    const start = source.indexOf(begin), stop = source.indexOf(end, start)
    assert.ok(start >= 0 && stop > start)
    const code = source.slice(start, stop) + '\nexports.build = ' + exported
    const { outputText } = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
    const location = { origin: 'https://urai.app', pathname: '/life-map/', search: '?demo=1' }
    const module = { exports: {} }
    vm.runInNewContext(outputText, {
      module, exports: module.exports, URL, URLSearchParams, window: { location },
      definitionForDestination: destination => ({ href: '/' + destination }),
      retainDisclosedHomeAscentDemo, retainDisclosedHomeReturnDemo,
    })
    const home = (search, request = {}) => {
      location.search = search
      return new URL(module.exports.build({ destination: 'home', href: '/home/', ...request }), location.origin)
    }
    for (const search of ['?demo=1', '?demo=1&memoryId=demo:quiet-reset&node=public-node&manifestId=public-manifest']) {
      const target = home(search)
      assert.deepEqual([...target.searchParams.getAll('demo')], ['1'])
      for (const key of ['memoryId', 'node', 'manifestId', 'movieId', 'chapterId', 'thread', 'personId', 'placeId'])
        assert.equal(target.searchParams.has(key), false, key + ' escaped onto Home')
    }
    for (const search of ['', '?demo=0', '?demo=true', '?demo=1&demo=0', '?demo=1&demo=1',
      '?demo=1&memoryId=private-memory', '?demo=1&manifestId=private-manifest',
      '?demo=1&memoryId=demo:quiet-reset&memoryId=private-memory',
      '?demo=1&memoryId=demo:quiet-reset&movieId=private-movie']) {
      assert.equal(home(search, {context:{demo:true}}).searchParams.has('demo'), false, search)
    }
    assert.equal(home('?demo=1', { context:{memoryId:'private-memory',demo:true} }).searchParams.has('demo'), false)
    assert.equal(home('?demo=1', { href:'/home/?demo=0' }).searchParams.has('demo'), false)
    location.pathname = '/focus/'
    assert.equal(home('?demo=1').searchParams.has('demo'), false)
  })
}

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

test('the canonical world controller never aliases a visual node to memory authority', () => {
  const source = fs.readFileSync('src/spatial/world/WorldTransitionController.tsx', 'utf8')
  assert.match(source, /const sameMemory = Boolean\(selectedMemoryId && currentMemoryId && selectedMemoryId === currentMemoryId\)/)
  // A scene node is not memory authority. Movie/chapter/demo identity also
  // cannot flow into an unrelated selected memory or an unselected destination.
  assert.match(source, /if \(\(key === 'node' \|\| key === 'manifestId' \|\| key === 'movieId' \|\| key === 'chapterId' \|\| key === 'demo'\) && \(!memoryDestination \|\| !sameMemory\)\) continue/)
  assert.match(source, /if \(\(key === 'thread' \|\| key === 'personId' \|\| key === 'placeId'\) && selectedMemoryId && currentMemoryId && !sameMemory\) continue/)
  assert.match(source, /if \(!memoryDestination\) \{\s*target\.searchParams\.delete\('memoryId'\)/)
  assert.doesNotMatch(source, /target\.searchParams\.set\('memoryId', nodeId\)/)
  assert.doesNotMatch(source, /target\.searchParams\.set\('node', memoryId\)/)
})

test('non-memory travel does not inherit private relationship hints from a selected memory', () => {
  const source = fs.readFileSync('src/spatial/world/WorldTransitionController.tsx', 'utf8')
  const start = source.indexOf('const CONTEXT_KEYS = [')
  const end = source.indexOf('function normalizedPathname(', start)
  assert.ok(start >= 0 && end > start, 'real world navigation helper must exist')
  const snippet = source.slice(start, end) + '\nexports.buildTravelHref = buildTravelHref'
  const { outputText } = ts.transpileModule(snippet, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    module, exports: module.exports, URL, URLSearchParams,
    window: { location: {
      origin: 'https://urai.app', pathname: '/focus',
      search: '?memoryId=private-memory&thread=private-thread&personId=private-person&placeId=private-place&privacyMode=private',
    } },
    definitionForDestination: destination => ({ href: '/' + destination }),
    retainDisclosedHomeAscentDemo, retainDisclosedHomeReturnDemo,
  })
  const build = module.exports.buildTravelHref
  const parsed = request => new URL(build(request), 'https://urai.app')
  const home = parsed({ destination: 'home' })
  for (const key of ['memoryId', 'thread', 'personId', 'placeId']) {
    assert.equal(home.searchParams.has(key), false, key + ' leaked from private memory into Home')
  }
  assert.equal(home.searchParams.get('privacyMode'), 'private')
  const intentional = parsed({ destination: 'home', href: '/home?personId=explicit-person' })
  assert.equal(intentional.searchParams.get('personId'), 'explicit-person')
  const explicitContext = parsed({ destination: 'home', context: { personId: 'requested-person' } })
  assert.equal(explicitContext.searchParams.get('personId'), 'requested-person')
  const sameMemoryReplay = parsed({ destination: 'replay', href: '/replay?memoryId=private-memory' })
  for (const [key, value] of [['thread', 'private-thread'], ['personId', 'private-person'], ['placeId', 'private-place']]) {
    assert.equal(sameMemoryReplay.searchParams.get(key), value, key + ' continuity lost in selected memory Replay')
  }
  const differentReplay = parsed({ destination: 'replay', href: '/replay?memoryId=other-memory' })
  for (const key of ['thread', 'personId', 'placeId']) {
    assert.equal(differentReplay.searchParams.has(key), false, key + ' leaked across memories')
  }
})


// Execute the exact production reverseTravel and URL builder bodies together.
// These callbacks must not reintroduce relationship hints that the URL
// inheritance fence intentionally excluded on a nonmemory return.
function actualReverseTravelHref(currentWorld, search) {
  const source = fs.readFileSync('src/spatial/world/WorldTransitionController.tsx', 'utf8')
  const slice = (startText, endText) => {
    const start = source.indexOf(startText)
    const end = source.indexOf(endText, start)
    assert.ok(start >= 0 && end > start, 'Missing world transition source: ' + startText)
    return source.slice(start, end)
  }
  const code = [
    slice('const CONTEXT_KEYS = [', 'function normalizedPathname('),
    slice('function destinationFromOriginRealm(', 'export function WorldTransitionController()'),
    'const worldRef = { current: currentWorld };',
    "const phaseRef = { current: 'idle' };",
    'const useCallback = fn => fn;',
    'let capturedRequest;',
    'const executeTravel = request => { capturedRequest = request };',
    slice('  const reverseTravel = useCallback(', '\n  useLayoutEffect(() => {'),
    'reverseTravel(); exports.request = capturedRequest; exports.href = buildTravelHref(capturedRequest);',
  ].join('\n')
  const { outputText } = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    module, exports: module.exports, currentWorld,
    window: { location: { origin: 'https://urai.app', pathname: '/focus', search } },
    URL, URLSearchParams,
    definitionForDestination: destination => ({
      href: '/' + destination, entryPortal: 'portal-' + destination, cameraCheckpoint: 'cam-' + destination,
    }),
    previousDestinationForReturn: worldTypes.previousDestinationForReturn,
    retainDisclosedHomeAscentDemo, retainDisclosedHomeReturnDemo,
  })
  return {
    request: module.exports.request,
    url: new URL(module.exports.href, 'https://urai.app'),
  }
}

test('actual reverse-travel controller never reintroduces private IDs onto Home', () => {
  const { request, url } = actualReverseTravelHref({
    destination: 'infrastructure-hub', previousDestination: 'home',
    memoryId: 'private-memory', threadId: 'private-thread',
    personId: 'private-person', placeId: 'private-place',
    replayManifestId: 'secret-manifest', privacyMode: 'private',
  }, '?memoryId=private-memory&thread=private-thread&personId=private-person&placeId=private-place&manifestId=secret-manifest')
  assert.equal(request.destination, 'home')
  assert.equal(url.pathname, '/home')
  for (const key of ['memoryId', 'thread', 'personId', 'placeId', 'manifestId']) {
    assert.equal(url.searchParams.has(key), false, key + ' escaped into Home URL')
  }
  assert.equal(url.searchParams.get('privacyMode'), 'private')
})

test('actual reverse-travel fallback to Home also strips old private relationships', () => {
  const { request, url } = actualReverseTravelHref({
    destination: 'infrastructure-hub', previousDestination: undefined,
    memoryId: 'private-memory', threadId: 'private-thread', personId: 'private-person', placeId: 'private-place',
  }, '?memoryId=private-memory&thread=private-thread&personId=private-person&placeId=private-place')
  assert.equal(request.destination, 'home')
  assert.equal(url.pathname, '/home')
  for (const key of ['memoryId', 'thread', 'personId', 'placeId']) {
    assert.equal(url.searchParams.has(key), false, key + ' escaped on fallback return')
  }
})

test('actual reverse-travel controller preserves same-memory Replay to Focus continuity', () => {
  const { request, url } = actualReverseTravelHref({
    destination: 'replay', previousDestination: 'focus',
    memoryId: 'private-memory', threadId: 'private-thread',
    personId: 'private-person', placeId: 'private-place', replayManifestId: 'secret-manifest',
  }, '?memoryId=private-memory&thread=private-thread&personId=private-person&placeId=private-place&manifestId=secret-manifest')
  assert.equal(request.destination, 'focus')
  assert.equal(url.pathname, '/focus')
  for (const [key, value] of [
    ['memoryId', 'private-memory'], ['thread', 'private-thread'], ['personId', 'private-person'],
    ['placeId', 'private-place'], ['manifestId', 'secret-manifest'],
  ]) assert.equal(url.searchParams.get(key), value)
})


test('real hard-fallback navigation neither leaks selected-memory relationships nor loses same-memory continuity', () => {
  const source = fs.readFileSync('src/spatial/world/worldEvents.ts', 'utf8')
  const begin = source.indexOf('const WORLD_TRAVEL_CONTEXT_KEYS = [')
  const end = source.indexOf('function commitHardFallback(', begin)
  assert.ok(begin >= 0 && end > begin, 'the actual hard-fallback implementation must exist')
  const { outputText } = ts.transpileModule(
    source.slice(begin, end) + '\nexports.buildFallbackHref = buildFallbackHref',
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  )
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    module, exports: module.exports, URL, URLSearchParams,
    window: { location: {
      origin: 'https://urai.app', pathname: '/replay',
      search: '?memoryId=private-memory&thread=private-thread&personId=private-person&placeId=private-place&manifestId=secret-manifest',
    } },
    retainDisclosedHomeAscentDemo, retainDisclosedHomeReturnDemo,
  })
  const build = module.exports.buildFallbackHref
  const parsed = request => new URL(build(request), 'https://urai.app')
  const home = parsed({ destination: 'home', href: '/home/' })
  for (const key of ['memoryId', 'thread', 'personId', 'placeId', 'manifestId']) {
    assert.equal(home.searchParams.has(key), false, key + ' escaped private memory on Home hard fallback')
  }
  const replay = parsed({ destination: 'replay', href: '/replay/?memoryId=private-memory' })
  for (const [key, value] of [
    ['memoryId', 'private-memory'], ['thread','private-thread'], ['personId','private-person'], ['placeId','private-place'],
  ]) assert.equal(replay.searchParams.get(key), value)
  const other = parsed({ destination: 'replay', href: '/replay/?memoryId=other-memory' })
  for (const key of ['thread', 'personId', 'placeId']) {
    assert.equal(other.searchParams.has(key), false, key + ' escaped onto a different selected memory')
  }
})

