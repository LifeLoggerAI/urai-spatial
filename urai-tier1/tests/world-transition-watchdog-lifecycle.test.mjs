import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

// Run the real controller, location store and destination admission checks. Only
// React's effect scheduler, browser DOM/history and time are controlled here.
function mount({ reducedMotion = true, pushCommits = false } = {}) {
  let now = 0, nextTimer = 1, hookIndex = 0
  let currentUrl = new URL('https://urai.test/focus/?demo=1')
  let world = { destination: 'focus', layer: 'infrastructure-world', demo: true }
  let phase = 'idle'
  const timers = new Map(), listeners = new Map(), observers = new Set()
  const hooks = [], effects = [], pushes = [], assignments = [], travelRequests = []
  const mountedSurfaces = new Set()
  const clock = {
    setTimeout(callback, delay) { const id = nextTimer++; timers.set(id, { callback, at: now + delay }); return id },
    clearTimeout(id) { timers.delete(id) },
    tick(ms) {
      const end = now + ms
      while (true) {
        const next = [...timers].filter(([, value]) => value.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
        if (!next) break
        const [id, value] = next
        timers.delete(id); now = value.at; value.callback()
      }
      now = end
    },
    queuedCallback() { assert.equal(timers.size, 1); return [...timers.values()][0].callback },
  }
  const window = {
    ...clock,
    location: {
      get origin() { return currentUrl.origin },
      get pathname() { return currentUrl.pathname },
      get search() { return currentUrl.search },
      get hash() { return currentUrl.hash },
      assign(href) { assignments.push(href) },
    },
    history: {
      pushState(_state, _title, href) { currentUrl = new URL(href, currentUrl) },
      replaceState(_state, _title, href) { currentUrl = new URL(href, currentUrl) },
    },
    matchMedia: () => ({ matches: reducedMotion }),
    sessionStorage: { setItem() {} },
    addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener) },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener) },
    dispatchEvent(event) { for (const listener of [...listeners.get(event.type) ?? []]) listener(event) },
  }
  const document = { body: {}, querySelector: selector => mountedSurfaces.has(selector) ? {} : null }
  class MutationObserver {
    constructor(callback) { this.callback = callback }
    observe() { observers.add(this) }
    disconnect() { observers.delete(this) }
  }
  const depsChanged = (old, next) => !old || old.length !== next.length || next.some((value, index) => !Object.is(old[index], value))
  const effect = (callback, deps) => {
    const index = hookIndex++, previous = hooks[index]
    if (depsChanged(previous?.deps, deps)) effects.push(() => {
      previous?.cleanup?.()
      hooks[index] = { deps, cleanup: callback() }
    })
  }
  const react = {
    useRef(initial) { const index = hookIndex++; hooks[index] ??= { current: initial }; return hooks[index] },
    useCallback(callback, deps) {
      const index = hookIndex++
      if (depsChanged(hooks[index]?.deps, deps)) hooks[index] = { deps, callback }
      return hooks[index].callback
    },
    useEffect: effect,
    useLayoutEffect: effect,
  }
  const router = { push(href) { pushes.push(href); if (pushCommits) window.history.pushState(null, '', href) } }
  const beginTravel = request => { travelRequests.push(request) }
  const jsx = (type, props) => ({ type, props })
  const modules = new Map([
    ['react', react],
    ['react/jsx-runtime', { jsx, jsxs: jsx }],
    ['next/navigation', { useRouter: () => router }],
    ['./WorldStateProvider', { useUraiWorldState: () => ({ world, phase, beginTravel }) }],
    ['../store/useSceneStore', { useSceneStore: { getState: () => ({}) } }],
  ])
  const context = vm.createContext({ window, document, MutationObserver, HTMLElement: class {}, URL, URLSearchParams, console })
  function load(relative) {
    const source = readFileSync(new URL(relative, import.meta.url), 'utf8')
    const compiled = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText
    const module = { exports: {} }
    vm.runInContext(`(function(require,module,exports){${compiled}\n})`, context)(name => {
      if (!modules.has(name)) throw new Error(`Unexpected controller dependency: ${name}`)
      return modules.get(name)
    }, module, module.exports)
    return module.exports
  }
  modules.set('@/lib/browserLocationStore', load('../src/lib/browserLocationStore.ts'))
  modules.set('./destinationRegistry', load('../src/spatial/world/destinationRegistry.ts'))
  modules.set('./worldTypes', load('../src/spatial/world/worldTypes.ts'))
  const events = load('../src/spatial/world/worldEvents.ts')
  modules.set('./worldEvents', events)
  const controller = load('../src/spatial/world/WorldTransitionController.tsx')
  const render = () => {
    hookIndex = 0
    controller.WorldTransitionController()
    while (effects.length) effects.shift()()
  }
  render()
  return {
    pushes, assignments, travelRequests, clock,
    get pathname() { return currentUrl.pathname },
    get pendingTimers() { return timers.size },
    get observerCount() { return observers.size },
    get locationListenerCount() { return (listeners.get('popstate')?.size ?? 0) + (listeners.get('hashchange')?.size ?? 0) },
    travel(destination, href) { window.dispatchEvent({ type: events.URAI_WORLD_TRAVEL_EVENT, detail: { destination, href } }) },
    async navigate(href, method = 'pushState') {
      window.history[method](null, '', href)
      await Promise.resolve() // browserLocationStore notifies after the framework commit.
    },
    admit(destination) {
      if (destination === 'replay') mountedSurfaces.add('[data-testid="cinematic-replay-client"]')
      if (destination === 'passport') mountedSurfaces.add('main[data-route-owner="passport-ownership-vault"]')
      for (const observer of [...observers]) observer.callback()
    },
    syncWorld(destination) { world = { ...world, destination }; phase = 'idle'; render() },
    unmount() { for (const hook of [...hooks].reverse()) hook?.cleanup?.() },
  }
}

test('reduced Focus → admitted Life Map → Home before 2500 ms cannot be reversed by the old watchdog', async () => {
  const page = mount()
  page.travel('life-map', '/life-map?memoryId=demo%3Aquiet-reset')
  page.clock.tick(259)
  assert.equal(page.pushes.length, 0)
  page.clock.tick(1)
  const staleRecovery = page.clock.queuedCallback()
  await page.navigate(page.pushes[0].replace('/life-map?', '/life-map/?'))
  page.syncWorld('life-map')
  assert.equal(page.pendingTimers, 0, 'destination admission retires the recovery timer immediately')
  assert.equal(page.observerCount, 0)
  assert.equal(page.locationListenerCount, 0)
  page.clock.tick(100)
  await page.navigate('/home/')
  page.syncWorld('home')
  staleRecovery() // A browser callback already queued before cancellation is also inert.
  page.clock.tick(3000)
  assert.equal(page.pathname, '/home/')
  assert.deepEqual(page.assignments, [])
  page.unmount()
})

test('router never changing location still recovers once at the original 2500 ms deadline', () => {
  const page = mount()
  page.travel('life-map', '/life-map')
  page.clock.tick(260)
  page.clock.tick(2499)
  assert.deepEqual(page.assignments, [])
  page.clock.tick(1)
  assert.deepEqual(page.assignments, [page.pushes[0]])
  assert.equal(page.pendingTimers, 0)
  assert.equal(page.observerCount, 0)
  assert.equal(page.locationListenerCount, 0)
  page.clock.tick(5000)
  assert.equal(page.assignments.length, 1)
  page.unmount()
})

for (const destination of ['replay', 'passport']) {
  test(`${destination} URL without its real destination surface retains failed-mount recovery`, async () => {
    const page = mount()
    page.travel(destination, `/${destination}`)
    page.clock.tick(260)
    await page.navigate(page.pushes[0])
    page.syncWorld(destination)
    assert.equal(page.pendingTimers, 1, 'route/world admission alone must not fake a mounted surface')
    page.clock.tick(2499)
    assert.deepEqual(page.assignments, [])
    page.clock.tick(1)
    assert.deepEqual(page.assignments, [page.pushes[0]])
    assert.equal(page.observerCount, 0)
    page.unmount()
  })

  test(`${destination} surface mounting after its URL retires recovery before later navigation`, async () => {
    const page = mount()
    page.travel(destination, `/${destination}`)
    page.clock.tick(260)
    const staleRecovery = page.clock.queuedCallback()
    await page.navigate(page.pushes[0])
    page.clock.tick(300)
    page.admit(destination)
    assert.equal(page.pendingTimers, 0)
    assert.equal(page.observerCount, 0)
    await page.navigate('/home/')
    staleRecovery()
    page.clock.tick(3000)
    assert.deepEqual(page.assignments, [])
    page.unmount()
  })
}

for (const laterHref of ['/home/', '/focus/?demo=1', '/replay?demo=1&memoryId=a-new-selection']) {
  test(`later navigation to ${laterHref} cancels an unmounted target's recovery`, async () => {
    const page = mount()
    page.travel('replay', '/replay')
    page.clock.tick(260)
    const staleRecovery = page.clock.queuedCallback()
    await page.navigate(page.pushes[0])
    await page.navigate(laterHref)
    assert.equal(page.pendingTimers, 0)
    staleRecovery()
    page.clock.tick(3000)
    assert.deepEqual(page.assignments, [])
    assert.equal(page.observerCount, 0)
    page.unmount()
  })
}

test('a new travel request invalidates an already queued delayed push', () => {
  const page = mount()
  page.travel('life-map', '/life-map')
  const stalePush = page.clock.queuedCallback()
  page.travel('passport', '/passport')
  stalePush()
  assert.deepEqual(page.pushes, [])
  page.clock.tick(260)
  assert.equal(page.pushes.length, 1)
  assert.match(page.pushes[0], /^\/passport\?/)
  page.clock.tick(2500)
  assert.deepEqual(page.assignments, [page.pushes[0]])
  page.unmount()
})

test('a new travel request invalidates queued recovery without cancelling the newer request', () => {
  const page = mount()
  page.travel('replay', '/replay')
  page.clock.tick(260)
  const staleRecovery = page.clock.queuedCallback()
  page.travel('passport', '/passport')
  staleRecovery()
  assert.equal(page.pendingTimers, 1)
  assert.deepEqual(page.assignments, [])
  page.clock.tick(2760)
  assert.equal(page.pushes.length, 2)
  assert.deepEqual(page.assignments, [page.pushes[1]])
  page.unmount()
})

test('a direct replacement navigation during the transition retires its delayed push', async () => {
  const page = mount()
  page.travel('life-map', '/life-map')
  const stalePush = page.clock.queuedCallback()
  await page.navigate('/home/', 'replaceState')
  stalePush()
  page.clock.tick(3000)
  assert.deepEqual(page.pushes, [])
  assert.deepEqual(page.assignments, [])
  assert.equal(page.observerCount, 0)
  page.unmount()
})

for (const afterPush of [false, true]) {
  test(`unmount cleans timers, location/surface observation and queued ${afterPush ? 'recovery' : 'push'}`, () => {
    const page = mount()
    page.travel('replay', '/replay')
    if (afterPush) page.clock.tick(260)
    const staleCallback = page.clock.queuedCallback()
    page.unmount()
    staleCallback()
    page.clock.tick(3000)
    assert.equal(page.pendingTimers, 0)
    assert.equal(page.observerCount, 0)
    assert.equal(page.locationListenerCount, 0)
    assert.equal(page.pushes.length, afterPush ? 1 : 0)
    assert.deepEqual(page.assignments, [])
    page.travel('passport', '/passport')
    assert.equal(page.pendingTimers, 0, 'world event listeners are also removed')
  })
}

test('synchronous successful router commit does not leave a newly installed watchdog', async () => {
  const page = mount({ pushCommits: true })
  page.travel('life-map', '/life-map')
  page.clock.tick(260)
  await Promise.resolve()
  assert.equal(page.pendingTimers, 0)
  assert.equal(page.observerCount, 0)
  assert.equal(page.locationListenerCount, 0)
  page.clock.tick(3000)
  assert.deepEqual(page.assignments, [])
  page.unmount()
})

test('normal-motion Focus → Replay keeps its 1900 ms transition and 2500 ms recovery', () => {
  const page = mount({ reducedMotion: false })
  page.travel('replay', '/replay')
  page.clock.tick(1899)
  assert.equal(page.pushes.length, 0)
  page.clock.tick(1)
  assert.equal(page.pushes.length, 1)
  page.clock.tick(2499)
  assert.deepEqual(page.assignments, [])
  page.clock.tick(1)
  assert.deepEqual(page.assignments, [page.pushes[0]])
  page.unmount()
})
