import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../src/app/invite/[code]/InvitePageClient.tsx', import.meta.url), 'utf8')
const javascript = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText

// Execute the real component's hooks and event handlers with a controlled service
// and clock. No Firebase connection, browser, or invitation write is made here.
function mountInvite(service, initialCode = 'URAI-DEMO') {
  const cells = [], effects = [], timers = new Map(), calls = [], navigations = []
  let cursor = 0, dirty = false, timerId = 0, code = initialCode, tree
  const hooks = {
    useState(initial) {
      const index = cursor++
      if (!cells[index]) cells[index] = { value: typeof initial === 'function' ? initial() : initial }
      return [cells[index].value, value => { cells[index].value = typeof value === 'function' ? value(cells[index].value) : value; dirty = true }]
    },
    useRef(value) {
      const index = cursor++
      return cells[index] ??= { current: value }
    },
    useEffect(callback, dependencies) {
      const index = cursor++
      const previous = cells[index]
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
        effects.push(() => { previous?.cleanup?.(); cells[index] = { dependencies, cleanup: callback() } })
      }
    },
  }
  const router = { push: path => navigations.push(path) }
  const module = { exports: {} }
  vm.runInNewContext(javascript, {
    module, exports: module.exports,
    setTimeout: callback => { timers.set(++timerId, callback); return timerId },
    clearTimeout: id => timers.delete(id),
    require(name) {
      if (name === 'react') return hooks
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
      if (name === 'next/navigation') return { useRouter: () => router }
      if (name === '@/spatial/layout/TierOneStaticShell') return { TierOneStaticShell: 'TierOneStaticShell' }
      if (name.endsWith('/inviteAccess')) return { acceptInvite: code => { calls.push(code); return service(code) } }
      throw new Error(`Unexpected dependency ${name}`)
    },
  })
  function render() {
    do {
      dirty = false; cursor = 0
      tree = module.exports.InvitePageClient({ code })
      effects.splice(0).forEach(effect => effect())
    } while (dirty)
    return tree
  }
  const nodes = node => node && typeof node === 'object' ? [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)] : []
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : node && typeof node === 'object' ? [node.props?.children].flat(Infinity).map(text).join(' ') : ''
  render()
  return {
    calls, navigations,
    render,
    content: () => text(render()),
    button: label => nodes(render()).find(node => node.type === 'button' && text(node) === label),
    advanceTimers() { const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback()) },
    changeCode(nextCode) { code = nextCode; render() },
    unmount() { cells.forEach(cell => cell?.cleanup?.()) },
  }
}

function deferred() {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

test('initial load and rerender show the exact invite code without calling the service or navigating', () => {
  const view = mountInvite(() => Promise.resolve({ ok: true, status: 'accepted' }))
  view.render(); view.advanceTimers()
  assert.deepEqual(view.calls, [])
  assert.deepEqual(view.navigations, [])
  assert.match(view.content(), /Invitation code:.*URAI-DEMO/)
  assert.equal(view.button('Accept invite').props.disabled, false)
  assert.ok(view.button('Request Access'))
})

test('explicit acceptance invokes the existing owner once while pending and once accepted', async () => {
  const pending = deferred()
  const view = mountInvite(() => pending.promise)
  const click = view.button('Accept invite').props.onClick
  const request = click()
  await click()
  assert.deepEqual(view.calls, ['URAI-DEMO'])
  assert.equal(view.button('Accepting…').props.disabled, true)
  assert.deepEqual(view.navigations, [])
  pending.resolve({ ok: true, status: 'accepted' })
  await request
  await click()
  assert.deepEqual(view.calls, ['URAI-DEMO'])
  assert.match(view.content(), /Invitation accepted/)
  view.advanceTimers()
  assert.deepEqual(view.navigations, ['/life-map'])
})

test('missing, invalid and offline results do not navigate and allow an explicit retry', async () => {
  for (const status of ['missing', 'invalid', 'offline']) {
    const view = mountInvite(() => Promise.resolve({ ok: false, status }))
    await view.button('Accept invite').props.onClick()
    view.advanceTimers()
    assert.deepEqual(view.navigations, [])
    assert.doesNotMatch(view.content(), /preserved locally|Invitation accepted|Tier-1/)
    assert.match(view.content(), status === 'missing' ? /could not be found/ : status === 'invalid' ? /not valid/ : /could not confirm/)
    assert.equal(view.button('Accept invite').props.disabled, false)
    await view.button('Accept invite').props.onClick()
    assert.equal(view.calls.length, 2)
  }
})

test('unexpected service rejection is truthful and Request Access remains a separate action', async () => {
  const view = mountInvite(() => Promise.reject(new Error('network failed')))
  await view.button('Accept invite').props.onClick()
  assert.match(view.content(), /could not confirm/)
  assert.doesNotMatch(view.content(), /preserved locally/)
  view.button('Request Access').props.onClick()
  assert.deepEqual(view.navigations, ['/early-access'])
  assert.equal(view.calls.length, 1)
})

test('leaving or changing the invite ignores stale acceptance and cancels queued navigation', async () => {
  const pending = deferred()
  const view = mountInvite(() => pending.promise)
  const request = view.button('Accept invite').props.onClick()
  view.changeCode('EARLY-ACCESS')
  pending.resolve({ ok: true, status: 'accepted' })
  await request
  view.advanceTimers()
  assert.deepEqual(view.navigations, [])
  assert.match(view.content(), /EARLY-ACCESS/)
  assert.equal(view.button('Accept invite').props.disabled, false)
  const accepted = mountInvite(() => Promise.resolve({ ok: true, status: 'accepted' }))
  await accepted.button('Accept invite').props.onClick()
  accepted.unmount()
  accepted.advanceTimers()
  assert.deepEqual(accepted.navigations, [])
})
