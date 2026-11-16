import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

function fixture() {
  const events = new Map()
  const calls = []
  const window = {
    location: { pathname: '/focus', search: '?memoryId=one', hash: '' },
    addEventListener: (name, callback) => events.set(name, callback),
    removeEventListener: (name, callback) => { if (events.get(name) === callback) events.delete(name) },
  }
  const commit = (receiver, data, title, url) => {
    assert.equal(receiver, window.history, 'delegate with the native History receiver')
    const next = new URL(url, 'http://localhost/focus')
    if (next.origin !== 'http://localhost') throw new Error('cross-origin history denied')
    Object.assign(window.location, { pathname: next.pathname, search: next.search, hash: next.hash })
    calls.push({ data, title, url })
    return 'original-return'
  }
  window.history = {
    pushState(data, title, url) { return commit(this, data, title, url) },
    replaceState(data, title, url) { return commit(this, data, title, url) },
  }
  const originals = { ...window.history }
  const source = fs.readFileSync('src/lib/browserLocationStore.ts', 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  const module = { exports: {} }
  vm.runInNewContext(outputText, { window, module, exports: module.exports })
  return { store: module.exports, window, events, calls, originals }
}

test('committed push/replace and Back/Forward notify mounted consumers without extra history writes', async () => {
  const f = fixture(); const snapshots = []
  const stop = f.store.subscribeBrowserLocation(() => snapshots.push(f.store.browserLocationSnapshot()))
  assert.equal(f.store.serverLocationSnapshot(), '')
  assert.equal(f.window.history.pushState({ preserved: 1 }, 'unused title', '?memoryId=two'), 'original-return')
  assert.equal(f.store.browserLocationSnapshot(), '/focus?memoryId=two')
  assert.deepEqual(snapshots, [])
  await Promise.resolve()
  assert.equal(f.window.history.replaceState({ preserved: 2 }, '', '?memoryId=three#chapter'), 'original-return')
  assert.equal(f.store.browserLocationSnapshot(), '/focus?memoryId=three#chapter')
  await Promise.resolve()
  f.events.get('popstate')()
  f.events.get('hashchange')()
  assert.deepEqual(snapshots, ['/focus?memoryId=two', '/focus?memoryId=three#chapter', '/focus?memoryId=three#chapter', '/focus?memoryId=three#chapter'])
  assert.equal(f.calls.length, 2, 'observation does not append duplicate history entries')
  assert.deepEqual(f.calls[0], { data: { preserved: 1 }, title: 'unused title', url: '?memoryId=two' })
  stop()
  assert.equal(f.events.size, 0)
  assert.equal(f.window.history.pushState, f.originals.pushState)
  assert.equal(f.window.history.replaceState, f.originals.replaceState)
})

test('failed history commits do not announce a selection that never became current', async () => {
  const f = fixture(); let observed = 0
  const stop = f.store.subscribeBrowserLocation(() => { observed += 1 })
  assert.throws(() => f.window.history.pushState({}, '', 'https://foreign.example/focus'), /cross-origin/)
  await Promise.resolve()
  assert.equal(observed, 0)
  assert.equal(f.store.browserLocationSnapshot(), '/focus?memoryId=one')
  stop()
})

test('multiple owners retain observation until the final owner leaves', async () => {
  const f = fixture(); let first = 0; let second = 0
  const stopFirst = f.store.subscribeBrowserLocation(() => { first += 1 })
  const wrapper = f.window.history.pushState
  const stopSecond = f.store.subscribeBrowserLocation(() => { second += 1 })
  assert.equal(f.window.history.pushState, wrapper)
  stopFirst()
  f.window.history.pushState({}, '', '?memoryId=two')
  await Promise.resolve()
  assert.equal(first, 0); assert.equal(second, 1)
  stopSecond()
  assert.equal(f.events.size, 0)
})

test('cleanup preserves a later framework wrapper and a remount cannot double-notify through its stale delegate', async () => {
  const f = fixture(); let observed = 0
  const stop = f.store.subscribeBrowserLocation(() => { observed += 1 })
  const delegate = f.window.history.pushState
  const framework = function (...args) { return Reflect.apply(delegate, this, args) }
  f.window.history.pushState = framework
  f.window.history.pushState({}, '', '?memoryId=two')
  stop()
  await Promise.resolve()
  assert.equal(observed, 0, 'queued callbacks cannot outlive their observer owner')
  assert.equal(f.window.history.pushState, framework)
  const remount = f.store.subscribeBrowserLocation(() => { observed += 1 })
  f.window.history.pushState({}, '', '?memoryId=three')
  await Promise.resolve()
  assert.equal(observed, 1)
  remount()
  assert.equal(f.window.history.pushState, framework)
})

test('history commits never invoke reactive observers during the framework insertion phase', async () => {
  const f = fixture(); const snapshots = []; let insertionCommit = false
  const stop = f.store.subscribeBrowserLocation(() => {
    assert.equal(insertionCommit, false, 'React observers must run after the history commit phase')
    snapshots.push(f.store.browserLocationSnapshot())
  })
  for (const operation of ['pushState', 'replaceState']) {
    insertionCommit = true
    assert.equal(f.window.history[operation]({}, '', `?memoryId=${operation}`), 'original-return')
    assert.equal(f.store.browserLocationSnapshot(), `/focus?memoryId=${operation}`, 'authority reads see the committed URL synchronously')
    insertionCommit = false
    await Promise.resolve()
    assert.equal(snapshots.at(-1), `/focus?memoryId=${operation}`)
  }
  stop()
})

test('a removed subscriber cannot receive a queued commit while another observer remains mounted', async () => {
  const f = fixture(); let removed = 0; let current = 0
  const stopRemoved = f.store.subscribeBrowserLocation(() => { removed += 1 })
  const stopCurrent = f.store.subscribeBrowserLocation(() => { current += 1 })
  f.window.history.pushState({}, '', '?memoryId=two')
  stopRemoved()
  await Promise.resolve()
  assert.equal(removed, 0)
  assert.equal(current, 1)
  stopCurrent()
})
