import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

// Execute the actual mounted component and helpers. React/Next browser edges
// and selected-memory subscriptions are controlled; this is not browser,
// Firestore, account or rendered-world acceptance.
function load(file, imports, globals = {}) {
  const source = fs.readFileSync(file, 'utf8')
  const compiled = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  })
  assert.equal(compiled.diagnostics?.length ?? 0, 0)
  const module = { exports: {} }
  vm.runInNewContext(compiled.outputText, {
    ...globals, module, exports: module.exports,
    require(id) { assert.ok(id in imports, `Unexpected dependency ${id}`); return imports[id] },
  }, { filename: file })
  return module.exports
}

const contract = load(path.resolve('src/spatial/memory/selectedMemoryContract.ts'), {}, { URL })
const journey = load(path.resolve('src/app/onboardingJourney.ts'), {
  '@/spatial/memory/selectedMemoryContract': contract,
}, { URL, URLSearchParams })
const completionKey = 'urai:onboarding:v2:complete'
function selection(id = 'chosen-memory', manifestId = 'chosen-manifest', demo = false) {
  return { status: demo ? 'demo' : 'ready', memory: { id, demo, replayManifest: { id: manifestId } }, message: 'Ready' }
}

function harness(address = '/life-map?memoryId=chosen-memory&manifestId=chosen-manifest&onboarding=1', result = selection()) {
  const slots = []
  let cursor = 0, dirty = false, pending = [], mounted, chamber = null
  const stored = new Map(), observers = [], frames = []
  const browser = {
    location: new URL(address, 'https://urai.app'),
    localStorage: { getItem(key) { return stored.get(key) ?? null }, setItem(key, value) { stored.set(key, value) } },
    requestAnimationFrame(callback) { frames.push(callback); return frames.length }, cancelAnimationFrame() {},
  }
  const document = { body: {}, querySelector() { return chamber } }
  class MutationObserver {
    constructor(callback) { this.callback = callback; this.active = false; observers.push(this) }
    observe() { this.active = true }
    disconnect() { this.active = false }
  }
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((value, index) => !Object.is(value, b[index]))
  const react = {
    Suspense: 'suspense',
    useState(initial) {
      const index = cursor++
      slots[index] ??= { value: initial }
      return [slots[index].value, value => {
        const next = typeof value === 'function' ? value(slots[index].value) : value
        if (!Object.is(next, slots[index].value)) { slots[index].value = next; dirty = true }
      }]
    },
    useRef(value) { const index = cursor++; slots[index] ??= { value: { current: value } }; return slots[index].value },
    useEffect(effect, deps) {
      const index = cursor++, previous = slots[index]
      if (!previous || changed(previous.deps, deps)) {
        slots[index] = { deps, cleanup: previous?.cleanup }
        pending.push(() => { slots[index].cleanup?.(); slots[index].cleanup = effect() })
      }
    },
  }
  const element = (type, props) => ({ type, props: props ?? {} })
  const jsx = { jsx: element, jsxs: element, Fragment: 'fragment' }
  const assets = Object.fromEntries(['home', 'ground', 'life-map', 'privacy'].map(name => [`first-run-${name}-card`, { src: `${name}.webp`, alt: name, fallback: 'fallback.webp' }]))
  const imports = {
    react, 'react-dom': { flushSync: callback => callback() }, 'react/jsx-runtime': jsx,
    'next/navigation': { usePathname: () => browser.location.pathname, useSearchParams: () => browser.location.searchParams },
    '@/hooks/useBrowserLocation': { useBrowserLocation: () => `${browser.location.pathname}${browser.location.search}${browser.location.hash}` },
    '@/spatial/memory/useSelectedMemory': { useSelectedMemory: () => result },
    '@/spatial/assets/uraiV2Assets': { v2Onboarding: assets },
    './onboardingJourney': journey,
    './UraiCanonicalVersionAssetTemplate': { default: () => null },
  }
  for (const name of ['v2-ground-states', 'v2-ground-council', 'v2-ground-objects', 'v2-ground-interaction', 'v2-memory-states', 'v2-realm-states', 'v2-accessibility-states', 'v2-state-controller', 'v2-onboarding']) imports[`./${name}.css`] = {}
  const component = load(process.env.URAI_ONBOARDING_COMPONENT ?? path.resolve('src/app/UraiV2OnboardingLayer.tsx'), imports, {
    window: browser, document, URL, URLSearchParams, MutationObserver,
  }).default
  const expand = node => {
    if (!node || typeof node !== 'object') return node
    if (Array.isArray(node)) return node.map(expand)
    if (typeof node.type === 'function') return expand(node.type(node.props))
    return { ...node, props: { ...node.props, children: expand(node.props.children) } }
  }
  const all = (node, predicate) => {
    if (!node || typeof node !== 'object') return []
    if (Array.isArray(node)) return node.flatMap(child => all(child, predicate))
    return [...(predicate(node) ? [node] : []), ...all(node.props.children, predicate)]
  }
  return {
    stored, observers, browser,
    render() {
      for (let count = 0; count < 20; count++) {
        cursor = 0; dirty = false; mounted = expand(component())
        const effects = pending; pending = []; effects.forEach(effect => effect())
        if (!dirty) return mounted
      }
      throw new Error('Guide did not settle')
    },
    setChamber(dataset) { chamber = { dataset }; observers.forEach(observer => { if (observer.active) observer.callback() }) },
    nodes(predicate) { return all(mounted, predicate) },
    unmount() { slots.forEach(slot => slot?.cleanup?.()) },
  }
}

const primary = h => h.nodes(node => node.type === 'a')[0]
test('guided Life Map carries the chosen real memory and its accepted manifest', () => {
  const h = harness(); h.render()
  const href = new URL(primary(h)?.props.href, 'https://urai.app')
  assert.equal(href.pathname, '/focus')
  assert.equal(href.searchParams.get('memoryId'), 'chosen-memory')
  assert.equal(href.searchParams.get('manifestId'), 'chosen-manifest')
  assert.equal(href.searchParams.get('node'), 'chosen-memory')
  assert.equal(href.searchParams.get('returnNode'), 'chosen-memory')
  assert.equal(href.searchParams.get('onboarding'), '1')
  assert.equal(href.searchParams.has('demo'), false)
})

for (const status of ['loading', 'unavailable', 'deleted', 'unauthorized', 'corrupt']) {
  test(`${status} selection has a disabled guide action and cannot complete onboarding`, () => {
    const h = harness(undefined, { status, memory: null, message: status }); h.render()
    assert.equal(primary(h), undefined)
    assert.equal(h.nodes(node => node.type === 'button' && node.props.disabled).length, 1)
    assert.equal(h.stored.has(completionKey), false)
  })
}

for (const [label, address, result] of [
  ['zero memories', '/life-map?onboarding=1', selection()],
  ['overview retaining an old identity', '/life-map?overview=1&memoryId=chosen-memory&onboarding=1', selection()],
  ['conflicting node', '/life-map?node=other-memory&memoryId=chosen-memory&onboarding=1', selection()],
  ['stale accepted identity', '/life-map?memoryId=new-memory&onboarding=1', selection()],
  ['wrong manifest', '/life-map?memoryId=chosen-memory&manifestId=other-manifest&onboarding=1', selection()],
  ['undisclosed demonstration', '/life-map?memoryId=chosen-memory&onboarding=1', selection('demo:chosen-memory', 'chosen-manifest', true)],
]) {
  test(`${label} cannot be silently replaced with a sample`, () => {
    const h = harness(address, result); h.render(); assert.equal(primary(h), undefined)
    assert.equal(h.stored.has(completionKey), false)
  })
}

test('a disclosed demonstration remains explicit through its actual guide action', () => {
  const h = harness('/life-map?memoryId=demo-other&manifestId=demo-manifest&demo=1&onboarding=1', selection('demo:demo-other', 'demo-manifest', true)); h.render()
  const url = new URL(primary(h)?.props.href, 'https://urai.app')
  assert.equal(url.searchParams.get('memoryId'), 'demo-other')
  assert.equal(url.searchParams.get('manifestId'), 'demo-manifest')
  assert.equal(url.searchParams.get('demo'), '1')
})

test('activating the Focus link does not complete the journey before arrival', () => {
  const h = harness(); h.render(); primary(h)?.props.onClick?.()
  assert.equal(h.stored.has(completionKey), false)
})

for (const [label, dataset] of [
  ['loading destination', { memoryStatus: 'loading', chamberState: 'loading' }],
  ['unauthorized destination', { memoryStatus: 'unauthorized', chamberState: 'unauthorized' }],
  ['different memory', { memoryStatus: 'ready', chamberState: 'ready', memoryId: 'other-memory', manifestId: 'chosen-manifest' }],
  ['different manifest', { memoryStatus: 'ready', chamberState: 'ready', memoryId: 'chosen-memory', manifestId: 'other-manifest' }],
]) {
  test(`${label} cannot complete onboarding`, () => {
    const h = harness('/focus?memoryId=chosen-memory&manifestId=chosen-manifest&onboarding=1'); h.setChamber(dataset); h.render()
    assert.equal(h.stored.has(completionKey), false)
  })
}

test('completion is recorded only after the matching accepted Focus chamber mounts', () => {
  const h = harness('/focus?memoryId=chosen-memory&manifestId=chosen-manifest&onboarding=1'); h.render()
  assert.equal(h.stored.has(completionKey), false)
  h.setChamber({ memoryStatus: 'ready', chamberState: 'ready', memoryId: 'chosen-memory', manifestId: 'chosen-manifest' })
  assert.equal(h.stored.get(completionKey), '1')
  assert.equal(h.observers.some(observer => observer.active), false)
})

test('a queued arrival after leaving Focus is inert and observation tears down', () => {
  const h = harness('/focus?memoryId=chosen-memory&manifestId=chosen-manifest&onboarding=1'); h.render()
  h.browser.location = new URL('https://urai.app/focus?memoryId=new-memory&onboarding=1')
  h.setChamber({ memoryStatus: 'ready', chamberState: 'ready', memoryId: 'chosen-memory', manifestId: 'chosen-manifest' })
  assert.equal(h.stored.has(completionKey), false)
  h.unmount(); assert.equal(h.observers.some(observer => observer.active), false)
})

test('Skip remains an explicit completion and dismissal action', () => {
  const h = harness(); h.render()
  h.nodes(node => node.type === 'button' && node.props.children === 'Skip')[0].props.onClick()
  h.render(); assert.equal(h.stored.get(completionKey), '1')
  assert.equal(h.nodes(node => node.type === 'aside').length, 0)
})

for (const [route, destination] of [['/', '/ground'], ['/ground', '/life-map']]) {
  test(`${route} guide preserves the explicitly requested demo boundary`, () => {
    const h = harness(`${route}?onboarding=1&demo=1`); h.render()
    const url = new URL(primary(h)?.props.href, 'https://urai.app')
    assert.equal(url.pathname, destination)
    assert.equal(url.searchParams.get('demo'), '1')
    assert.equal(url.searchParams.get('onboarding'), '1')
    assert.equal(h.stored.has(completionKey), false)
  })
}

test('the action footer is a sibling of the scrollable guide content', () => {
  const h = harness('/?onboarding=1'); h.render()
  const card = h.nodes(node => node.type === 'aside')[0]
  const children = card.props.children
  assert.equal(children.length, 2)
  assert.equal(children[0].props.className, 'uraiV2OnboardingContent')
  assert.equal(children[1].props.className, 'uraiV2OnboardingActions')
  assert.equal(h.nodes(node => node.type === 'button' && node.props.children === 'Skip').length, 1)
})

test('only validated memory/manifest tokens can become a guided destination', () => {
  assert.equal(journey.guidedFocusHref(new URLSearchParams('memoryId=../invalid'), selection('../invalid')), null)
  assert.equal(journey.guidedFocusHref(new URLSearchParams('memoryId=chosen-memory'), selection('chosen-memory', '../invalid')), null)
  assert.equal(journey.guidedFocusHref(new URLSearchParams('memoryId=chosen-memory'), { ...selection(), status: 'ready', memory: { ...selection().memory, demo: true } }), null)
})

test('only explicitly guided arrival can persist completion', () => {
  const dataset = { memoryStatus: 'ready', chamberState: 'ready', memoryId: 'chosen-memory', manifestId: 'chosen-manifest' }
  assert.equal(journey.guidedFocusArrived(new URLSearchParams('memoryId=chosen-memory'), selection(), dataset), false)
  assert.equal(journey.guidedFocusArrived(new URLSearchParams('memoryId=chosen-memory&firstRun=1'), selection(), dataset), true)
})

for (const route of ['/home/', '/ground/', '/life-map/', '/privacy-controls/']) {
  test(`static-export trailing-slash ${route} retains its real guided card`, () => {
    const h = harness(`${route}?memoryId=chosen-memory&manifestId=chosen-manifest&onboarding=1`); h.render()
    assert.equal(h.nodes(node => node.type === 'aside').length, 1)
    if (route === '/life-map/') assert.equal(new URL(primary(h).props.href, 'https://urai.app').searchParams.get('memoryId'), 'chosen-memory')
    assert.equal(h.stored.has(completionKey), false)
  })
}

test('static-export trailing-slash Focus persists only validated actual chamber arrival', () => {
  const h = harness('/focus/?memoryId=chosen-memory&manifestId=chosen-manifest&onboarding=1'); h.render()
  assert.equal(h.stored.has(completionKey), false)
  h.setChamber({ memoryStatus: 'ready', chamberState: 'ready', memoryId: 'chosen-memory', manifestId: 'chosen-manifest' })
  assert.equal(h.stored.get(completionKey), '1')
})
