import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const source = ts.transpileModule(fs.readFileSync(new URL('../src/spatial/lifemap/SpatialLifeMapCanonical.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText

// Execute the production access gate and callbacks. Identity, capability, hooks,
// router and renderer adapters are synthetic; this is not private-world proof.
function mount(mode, capability = true) {
  const states = [mode, mode === 'private' ? 'synthetic-owner' : null, capability]
  const routes = []
  let stateIndex = 0
  const boundary = () => null
  const semantic = () => null
  const modules = {
    react: {
      Suspense: 'synthetic-suspense',
      useState(initial) {
        const i = stateIndex++
        if (!(i in states)) states[i] = initial
        return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value }]
      },
      useEffect() {},
      useMemo: fn => fn(),
      useCallback: fn => fn,
    },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'synthetic-fragment' },
    'next/navigation': { useRouter: () => ({ push: href => routes.push(['push', href]), replace: href => routes.push(['replace', href]) }), useSearchParams: () => new URLSearchParams('overview=1') },
    'firebase/auth': { getAuth: () => ({}), onAuthStateChanged: () => () => {} },
    '@/spatial/assets/uraiAssets': { assetCssStack: () => 'none', lifeMapAssets: { primary: { src: '/synthetic-authorized-art.webp' }, mobile: { src: '/synthetic-authorized-art-mobile.webp' } } },
    '@/spatial/world/worldEvents': { requestUraiWorldReturn: () => routes.push(['return']) },
    '@/components/lifemap/LifeMapRouteBoundary': { __esModule: true, default: boundary },
    '@/components/lifemap/LifeMapSemanticNavigator': { __esModule: true, default: semantic },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true },
    '@/spatial/adam/AdamLauncherSlot': { __esModule: true, default: () => null },
  }
  const exports = {}
  vm.runInNewContext(source, { exports, URLSearchParams, HTMLElement: class {}, window: { location: { pathname: '/life-map' } }, require(id) {
    assert.ok(id in modules, `Unexpected import: ${id}`)
    return modules[id]
  } })
  const render = () => {
    stateIndex = 0
    const suspended = exports.default()
    return suspended.props.children.type()
  }
  return { render, states, routes, boundary, semantic }
}

function walk(node, predicate) {
  if (!node || typeof node !== 'object') return null
  if (predicate(node)) return node
  for (const child of [node.props?.children].flat()) {
    const found = walk(child, predicate)
    if (found) return found
  }
  return null
}

test('signed-out access exposes one main owner while its renderer stays semantically hidden and inert', () => {
  const h = mount('signed-out')
  const tree = h.render()
  assert.equal(tree.props.role, undefined, 'the renderer must not create a second accessible main owner')
  assert.equal(tree.props['data-private-memory-mounted'], 'false')
  const wrapper = tree.props.children[0]
  assert.equal(wrapper.props['aria-hidden'], true)
  assert.equal(wrapper.props.inert, true)
  assert.equal(wrapper.props.children.type, h.boundary)
  assert.equal(wrapper.props.children.props.authenticatedUserId, null)
  const disclosure = walk(tree, node => node.props?.['data-testid'] === 'urai-life-map-signed-out-disclosure')
  assert.ok(disclosure)
  assert.equal(disclosure.type, 'main', 'the current owner disclosure must retain its visible main landmark')
})

test('signed-out disclosure retains explicit sample consent and canonical Home return', () => {
  const h = mount('signed-out')
  const tree = h.render()
  const sample = walk(tree, node => node.type === 'button' && node.props.children === 'Open disclosed sample')
  const home = walk(tree, node => node.type === 'button' && node.props.children === 'Return Home')
  assert.equal(h.states[0], 'signed-out')
  sample.props.onClick()
  assert.equal(h.states[0], 'explicit-demo')
  assert.equal(h.routes[0][0], 'replace')
  const params = new URLSearchParams(h.routes[0][1].split('?')[1])
  assert.equal(params.get('demo'), '1')
  assert.equal(params.get('manifestId'), 'replay-recovery-thread')
  assert.equal(params.get('overview'), '1')
  home.props.onClick()
  assert.equal(h.routes[1][1], '/home')
})

for (const mode of ['private', 'explicit-demo']) {
  test(`${mode} retains its existing scene landmark and source authority`, () => {
    const h = mount(mode)
    const tree = h.render()
    assert.equal(tree.props.role, undefined, 'do not create nested main owners in interactive realms')
    const wrapper = tree.props.children[0]
    assert.equal(wrapper.props['aria-hidden'], undefined)
    assert.equal(wrapper.props.inert, undefined)
    assert.equal(wrapper.props.children.props.authenticatedUserId, mode === 'private' ? 'synthetic-owner' : null)
    assert.equal(walk(tree, node => node.props?.['data-testid'] === 'urai-life-map-signed-out-disclosure'), null)
  })
}

// Execute the actual diagnostic action block, including its browser predicate.
// The DOM, asynchronous navigation and clock are synthetic; this is not a
// browser capture or private-world acceptance substitute.
const captureSource = fs.readFileSync(new URL('../../scripts/capture-lifemap-signed-out-authority.mjs', import.meta.url), 'utf8')
const captureAst = ts.createSourceFile('capture.mjs', captureSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
const sampleActions = []
const timeoutSetters = []
function collectCaptureActions(node) {
  if (ts.isIfStatement(node) && ts.isBinaryExpression(node.expression)
    && ts.isIdentifier(node.expression.left) && node.expression.left.text === 'route'
    && node.expression.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
    && ts.isStringLiteral(node.expression.right) && node.expression.right.text === '/life-map') {
    sampleActions.push(node.thenStatement.getText(captureAst))
  }
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
    && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'page'
    && node.expression.name.text === 'setDefaultTimeout') timeoutSetters.push(node.getText(captureAst))
  ts.forEachChild(node, collectCaptureActions)
}
collectCaptureActions(captureAst)
assert.equal(sampleActions.length, 1, 'execute the sole actual disclosed-sample action block')
assert.equal(timeoutSetters.length, 1, 'use the actual capture timeout configuration')

function sampleNavigation({ modeAt = 0, urlAt = 200, destination = '/life-map/?demo=1&manifestId=replay-recovery-thread', inert, role = null } = {}) {
  let now = 0
  let access = 'signed-out'
  let href = 'https://synthetic.invalid/life-map/?overview=1'
  let defaultTimeout
  const waits = []
  const events = []
  const record = {}
  const settle = () => {
    for (const event of events.filter(event => !event.done && event.at <= now)) {
      event.done = true
      event.apply()
    }
  }
  const disclosure = { getByRole(kind, options) {
    assert.equal(kind, 'button')
    assert.deepEqual({ ...options }, { name: 'Open disclosed sample', exact: true })
    return { async click() {
      events.push({ at: modeAt, apply: () => { access = 'explicit-demo' } })
      events.push({ at: urlAt, apply: () => { href = new URL(destination, href).href } })
      settle()
    } }
  } }
  const page = {
    setDefaultTimeout(value) { defaultTimeout = value },
    url: () => href,
    async waitForFunction(predicate, argument, options) {
      const timeout = options?.timeout ?? defaultTimeout
      assert.ok(Number.isFinite(timeout) && timeout > 0, 'the actual wait must remain bounded')
      const wait = { start: now, timeout, end: null }
      waits.push(wait)
      const deadline = now + timeout
      try {
        while (!predicate(argument)) {
          const next = events.filter(event => !event.done && event.at > now).sort((a, b) => a.at - b.at)[0]
          now = Math.min(next?.at ?? deadline, deadline)
          settle()
          if (now === deadline && !predicate(argument)) throw new Error('Synthetic capture readiness timeout')
        }
      } finally { wait.end = now }
    },
  }
  const canonical = {
    async getAttribute(name) { assert.equal(name, 'role'); return role },
    locator(selector) {
      assert.equal(selector, ':scope > div')
      return { async getAttribute(name) {
        assert.equal(name, 'inert')
        return inert === undefined ? (access === 'explicit-demo' ? null : '') : inert
      } }
    },
  }
  const context = vm.createContext({
    assert, URL, page, disclosure, canonical, record,
    document: { querySelector(selector) {
      assert.equal(selector, '[data-testid="urai-r3f-canonical-lifemap"]')
      return { getAttribute(name) { assert.equal(name, 'data-life-map-access'); return access } }
    } },
    window: { location: { get href() { return href } } },
  })
  vm.runInContext(timeoutSetters[0], context)
  return { run: () => vm.runInContext(`(async () => ${sampleActions[0]})()`, context), record, waits, now: () => now, timeout: () => defaultTimeout }
}

test('actual disclosed-sample capture waits for the URL after synchronous access mode', async () => {
  const h = sampleNavigation()
  await h.run()
  assert.equal(h.record.explicitDemoOpened, true)
  assert.equal(h.now(), 200)
})

test('actual capture allows delayed mode and URL within one original readiness budget', async () => {
  const h = sampleNavigation({ modeAt: 29_000, urlAt: 29_999 })
  await h.run()
  assert.equal(h.timeout(), 30_000)
  assert.equal(h.now(), 29_999)
  assert.equal(h.record.explicitDemoOpened, true)
})

test('actual capture does not give URL settlement a new budget after delayed mode', async () => {
  const h = sampleNavigation({ modeAt: 29_000, urlAt: 30_001 })
  await assert.rejects(h.run(), /Synthetic capture readiness timeout/)
  assert.equal(h.now(), 30_000)
  assert.equal(h.record.explicitDemoOpened, undefined)
})

test('an exact URL cannot admit the sample while access mode is still signed out', async () => {
  const h = sampleNavigation({ modeAt: 30_001, urlAt: 0 })
  await assert.rejects(h.run(), /Synthetic capture readiness timeout/)
  assert.equal(h.now(), 30_000)
  assert.equal(h.record.explicitDemoOpened, undefined)
})

for (const destination of [
  '/home/?demo=1&manifestId=replay-recovery-thread',
  '/life-map/?demo=0&manifestId=replay-recovery-thread',
  '/life-map/?demo=1&manifestId=wrong-manifest',
]) {
  test(`actual sample readiness rejects ${destination}`, async () => {
    const h = sampleNavigation({ destination })
    await assert.rejects(h.run(), /Synthetic capture readiness timeout/)
    assert.equal(h.now(), 30_000)
    assert.equal(h.record.explicitDemoOpened, undefined)
  })
}

test('an already-settled exact sample keeps the retained role and inert checks', async () => {
  const ready = sampleNavigation({ urlAt: 0 })
  await ready.run()
  assert.equal(ready.now(), 0)
  assert.equal(ready.record.explicitDemoOpened, true)
  for (const options of [{ role: 'main' }, { inert: '' }]) {
    const invalid = sampleNavigation({ ...options, urlAt: 0 })
    await assert.rejects(invalid.run(), assert.AssertionError)
    assert.equal(invalid.record.explicitDemoOpened, undefined)
  }
})
