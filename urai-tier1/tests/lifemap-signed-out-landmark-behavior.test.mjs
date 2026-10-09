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
  assert.equal(tree.props.role, 'main', 'the visible signed-out disclosure must own a main landmark')
  assert.equal(tree.props['data-private-memory-mounted'], 'false')
  const wrapper = tree.props.children[0]
  assert.equal(wrapper.props['aria-hidden'], true)
  assert.equal(wrapper.props.inert, true)
  assert.equal(wrapper.props.children.type, h.boundary)
  assert.equal(wrapper.props.children.props.authenticatedUserId, null)
  assert.ok(walk(tree, node => node.props?.['data-testid'] === 'urai-life-map-signed-out-disclosure'))
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
