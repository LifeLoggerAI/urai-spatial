'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const appRoot = path.resolve(__dirname, '..')
const companionPath = path.join(appRoot, 'src/app/privacy-controls/CanonicalConsentCompanion.tsx')
const sanctuaryPath = path.join(appRoot, 'src/app/privacy-controls/ConsentSanctuaryClient.tsx')
const source = fs.readFileSync(companionPath, 'utf8')
const jsx = {
  jsx: (type, props, key) => ({ type, props: props || {}, key }),
  jsxs: (type, props, key) => ({ type, props: props || {}, key }),
  Fragment: Symbol.for('synthetic-react-fragment'),
}
function compile(text, requireModule) {
  const code = ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, {
    module, exports: module.exports, require: requireModule,
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
  })
  return module.exports
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null
  if (predicate(node)) return node
  for (const child of [node.props?.children].flat(Infinity)) {
    const found = find(child, predicate)
    if (found) return found
  }
  return null
}
function text(node) {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(text).join(' ')
  return text(node.props?.children)
}
function deferred() {
  let resolve, reject
  const promise = new Promise((a, b) => { resolve = a; reject = b })
  return { promise, resolve, reject }
}
const tick = () => new Promise(resolve => setImmediate(resolve))

// The actual TSX component runs with explicit React/Auth/callable doubles.
// This proves client initiation/display fencing, not server token binding or
// cancellation of a request already admitted by Firebase.
function fixture({ authorized = true } = {}) {
  const auth = { currentUser: null }
  const slots = [], calls = [], factories = []
  let cursor = 0, effects = [], listener, authError, disposed = false, tree
  let stateWrites = 0, authReads = 0, subscriptions = 0, factoryHook
  function slot(kind, init) {
    const index = cursor++
    if (!slots[index]) slots[index] = { kind, value: init?.() }
    assert.equal(slots[index].kind, kind)
    return slots[index]
  }
  const react = {
    useState(initial) {
      const s = slot('state', () => typeof initial === 'function' ? initial() : initial)
      return [s.value, next => { stateWrites++; s.value = typeof next === 'function' ? next(s.value) : next }]
    },
    useRef(initial) { return slot('ref', () => ({ current: initial })).value },
    useEffect(fn, deps) {
      const s = slot('effect')
      const changed = !s.deps || deps.some((value, i) => !Object.is(value, s.deps[i]))
      if (changed) {
        s.deps = deps
        effects.push(() => { s.cleanup?.(); s.cleanup = fn() })
      }
    },
  }
  const stubs = {
    react,
    'react/jsx-runtime': jsx,
    'firebase/auth': {
      onAuthStateChanged(_auth, callback, onError) {
        assert.equal(_auth, auth); subscriptions++; listener = callback; authError = onError
        return () => { listener = undefined; authError = undefined }
      },
    },
    'firebase/functions': {
      httpsCallable(_functions, name) {
        factories.push(name); factoryHook?.(name)
        return payload => {
          const pending = deferred()
          calls.push({ name, payload, actorAtInvocation: auth.currentUser, ...pending })
          return pending.promise
        }
      },
    },
    '@/lib/firebase/client': {
      disposableFirebaseReviewAuthorized: () => authorized,
      functions: { synthetic: true },
      getUrAiAuth: () => { authReads++; return auth },
    },
  }
  const Component = compile(source, name => {
    assert.ok(Object.hasOwn(stubs, name), 'Unexpected component dependency: ' + name)
    return stubs[name]
  }).default
  function commit() {
    if (disposed) return null
    cursor = 0; effects = []; tree = Component()
    for (const effect of effects) effect()
    return tree
  }
  const f = {
    auth, calls, factories,
    get stateWrites() { return stateWrites },
    get authReads() { return authReads },
    get subscriptions() { return subscriptions },
    set factoryHook(value) { factoryHook = value },
    commit,
    notify(user) { auth.currentUser = user; listener?.(user); commit() },
    observeSameUser() { listener?.(auth.currentUser); commit() },
    failAuth() { authError?.(new Error('synthetic auth unavailable')); commit() },
    button(label) {
      return find(commit(), n => n.type === 'button' && text(n).startsWith(label))
    },
    view() {
      const current = commit()
      return {
        tree: current,
        state: current?.props['data-canonical-consent-state'],
        status: text(find(current, n => n.props?.role === 'status')),
        grantDisabled: find(current, n => n.type === 'button' && text(n).startsWith('Grant'))?.props.disabled,
        rendered: text(current),
      }
    },
    async resolve(call, data) {
      assert.ok(call, 'Missing expected callable')
      call.resolve({ data }); await tick(); commit(); await tick()
    },
    async reject(call) { call.reject(new Error('synthetic transport unavailable')); await tick(); commit(); await tick() },
    unmount() {
      if (disposed) return
      disposed = true
      for (const s of slots) if (s.kind === 'effect') s.cleanup?.()
    },
  }
  commit()
  return f
}
const callsNamed = (f, name) => f.calls.filter(c => c.name === name)
const last = (f, name) => callsNamed(f, name).at(-1)
async function signedIn(t) {
  const f = fixture(), owner = { uid: 'synthetic-owner' }
  t.after(() => f.unmount())
  f.notify(owner)
  await f.resolve(last(f, 'evaluateCanonicalConsent'), { allowed: false, reason: 'NO_GRANT' })
  assert.equal(f.view().state, 'denied')
  return { f, owner }
}
function clickGrant(f) {
  const button = f.button('Grant')
  assert.equal(button.props.disabled, false)
  button.props.onClick()
  return last(f, 'setCanonicalConsent')
}

test('unauthorized surface starts no Auth observer or callable', () => {
  const f = fixture({ authorized: false })
  assert.equal(f.view().tree, null)
  assert.equal(f.authReads, 0); assert.equal(f.subscriptions, 0); assert.equal(f.calls.length, 0)
  f.unmount()
})

test('current actor can display confirmed grant and revocation without expanding purpose choices', async t => {
  const { f } = await signedIn(t)
  const select = find(f.view().tree, n => n.type === 'select')
  assert.deepEqual(Array.from(select.props.children, n => n.props.value), ['memory.storage', 'data.export'])
  const grant = clickGrant(f)
  assert.equal(grant.payload.purpose, 'memory.storage')
  assert.equal(f.view().state, 'unverified')
  await f.resolve(grant, { status: 'granted' })
  await f.resolve(last(f, 'evaluateCanonicalConsent'), { allowed: true, reason: 'GRANTED' })
  assert.equal(f.view().state, 'allowed')
  f.button('Revoke').props.onClick()
  await f.resolve(last(f, 'setCanonicalConsent'), { status: 'revoked' })
  await f.resolve(last(f, 'evaluateCanonicalConsent'), { allowed: false, reason: 'REVOKED' })
  assert.equal(f.view().state, 'denied')
  assert.match(f.view().status, /Jobs acknowledgement and private writes unverified/)
})

test('same-render repeated clicks issue one mutation before React commits busy state', async t => {
  const { f } = await signedIn(t)
  const click = f.button('Grant').props.onClick
  click(); click()
  assert.equal(callsNamed(f, 'setCanonicalConsent').length, 1)
  assert.equal(f.view().grantDisabled, true)
})

for (const sameUid of [false, true]) {
  test('initiation refuses ' + (sameUid ? 'same-UID replacement User' : 'another User') + ' before Auth observer catches up', async t => {
    const { f, owner } = await signedIn(t)
    const click = f.button('Grant').props.onClick
    f.auth.currentUser = { uid: sameUid ? owner.uid : 'synthetic-other' }
    click()
    assert.equal(callsNamed(f, 'setCanonicalConsent').length, 0)
    assert.equal(f.view().state, 'unverified')
    assert.equal(f.view().grantDisabled, true)
  })
}

test('account switch during callable construction stops mutation before SDK invocation', async t => {
  const { f } = await signedIn(t)
  f.factoryHook = name => { if (name === 'setCanonicalConsent') f.auth.currentUser = { uid: 'synthetic-other' } }
  clickGrant(f)
  assert.equal(callsNamed(f, 'setCanonicalConsent').length, 0)
  assert.equal(f.view().state, 'unverified')
})

test('account switch during read callable construction stops read before SDK invocation', t => {
  const f = fixture(); t.after(() => f.unmount())
  f.factoryHook = name => { if (name === 'evaluateCanonicalConsent') f.auth.currentUser = { uid: 'synthetic-other' } }
  f.notify({ uid: 'synthetic-owner' })
  assert.equal(f.calls.length, 0); assert.equal(f.view().state, 'unverified')
})

for (const transition of ['other-user', 'same-uid-new-user', 'signed-out']) {
  test('pending initial evaluation cannot overwrite ' + transition + ' consent display', async t => {
    const f = fixture(); t.after(() => f.unmount())
    const owner = { uid: 'synthetic-owner' }; f.notify(owner)
    const oldRead = last(f, 'evaluateCanonicalConsent')
    const next = transition === 'signed-out' ? null : { uid: transition === 'same-uid-new-user' ? owner.uid : 'synthetic-other' }
    f.notify(next)
    await f.resolve(oldRead, { allowed: true, reason: 'OLD_ACCOUNT_ALLOWED' })
    assert.equal(f.view().state, 'unverified')
    assert.doesNotMatch(f.view().rendered, /OLD_ACCOUNT_ALLOWED/)
  })

  test('late mutation receipt starts no follow-up evaluation after ' + transition, async t => {
    const { f, owner } = await signedIn(t)
    const oldMutation = clickGrant(f)
    const next = transition === 'signed-out' ? null : { uid: transition === 'same-uid-new-user' ? owner.uid : 'synthetic-other' }
    f.notify(next)
    const count = f.calls.length
    await f.resolve(oldMutation, { status: 'granted' })
    assert.equal(f.calls.length, count)
    assert.equal(f.view().state, 'unverified')
    assert.doesNotMatch(f.view().status, /Awaiting server receipt|Server: GRANTED/)
    if (next) assert.equal(f.view().grantDisabled, false)
  })

  test('late confirmation evaluation cannot publish after ' + transition, async t => {
    const { f, owner } = await signedIn(t)
    await f.resolve(clickGrant(f), { status: 'granted' })
    const oldRead = last(f, 'evaluateCanonicalConsent')
    const next = transition === 'signed-out' ? null : { uid: transition === 'same-uid-new-user' ? owner.uid : 'synthetic-other' }
    f.notify(next)
    await f.resolve(oldRead, { allowed: true, reason: 'OLD_ACCOUNT_ALLOWED' })
    assert.equal(f.view().state, 'unverified')
    assert.doesNotMatch(f.view().rendered, /OLD_ACCOUNT_ALLOWED/)
  })
}

test('a new Auth observation invalidates the epoch even for the same User instance', async t => {
  const { f } = await signedIn(t)
  const oldMutation = clickGrant(f)
  f.observeSameUser()
  const count = f.calls.length
  await f.resolve(oldMutation, { status: 'granted' })
  assert.equal(f.calls.length, count)
  assert.equal(f.view().state, 'unverified')
  assert.equal(f.view().grantDisabled, false)
})

for (const stage of ['mutation-receipt', 'confirmation-evaluation']) {
  test('unmount fences pending ' + stage + ' without state writes or later SDK calls', async t => {
    const { f } = await signedIn(t)
    let pending = clickGrant(f)
    if (stage === 'confirmation-evaluation') {
      await f.resolve(pending, { status: 'granted' }); pending = last(f, 'evaluateCanonicalConsent')
    }
    f.unmount()
    const writes = f.stateWrites, count = f.calls.length
    await f.resolve(pending, stage === 'mutation-receipt' ? { status: 'granted' } : { allowed: true, reason: 'GRANTED' })
    assert.equal(f.stateWrites, writes); assert.equal(f.calls.length, count)
  })
}

test('late initial read cannot overwrite a newer confirmed mutation for the same actor', async t => {
  const f = fixture(); t.after(() => f.unmount())
  f.notify({ uid: 'synthetic-owner' })
  const initial = last(f, 'evaluateCanonicalConsent')
  await f.resolve(clickGrant(f), { status: 'granted' })
  await f.resolve(last(f, 'evaluateCanonicalConsent'), { allowed: true, reason: 'GRANTED' })
  assert.equal(f.view().state, 'allowed')
  await f.resolve(initial, { allowed: false, reason: 'OLD_NO_GRANT' })
  assert.equal(f.view().state, 'allowed')
  assert.doesNotMatch(f.view().status, /OLD_NO_GRANT/)
})

test('old mutation completion cannot clear a new account mutation busy state', async t => {
  const { f } = await signedIn(t)
  const oldMutation = clickGrant(f)
  f.notify({ uid: 'synthetic-other' })
  const currentMutation = clickGrant(f)
  const count = f.calls.length
  await f.resolve(oldMutation, { status: 'granted' })
  assert.equal(f.calls.length, count)
  assert.equal(f.view().grantDisabled, true)
  assert.equal(f.view().status, 'Awaiting server receipt')
  await f.resolve(currentMutation, { status: 'granted' })
  await f.resolve(last(f, 'evaluateCanonicalConsent'), { allowed: true, reason: 'NEW_ACCOUNT_GRANTED' })
  assert.equal(f.view().state, 'allowed')
})

test('mismatched mutation receipt never starts confirmation or claims success', async t => {
  const { f } = await signedIn(t)
  const count = callsNamed(f, 'evaluateCanonicalConsent').length
  await f.resolve(clickGrant(f), { status: 'revoked' })
  assert.equal(callsNamed(f, 'evaluateCanonicalConsent').length, count)
  assert.equal(f.view().state, 'unverified')
  assert.match(f.view().status, /Change unverified/)
})

test('late rejected mutation cannot replace a new account status', async t => {
  const { f } = await signedIn(t)
  const oldMutation = clickGrant(f)
  f.notify({ uid: 'synthetic-other' })
  await f.reject(oldMutation)
  assert.equal(f.view().state, 'unverified')
  assert.equal(f.view().status, 'Server authority unverified')
})

// Render the exact sidebar JSX selected by the TypeScript parser. This avoids
// executing WebGL while testing the actual production branch expressions.
const sanctuarySource = fs.readFileSync(sanctuaryPath, 'utf8')
const parsed = ts.createSourceFile(sanctuaryPath, sanctuarySource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let sidebar
function visit(node) {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(parsed) === 'aside'
      && node.openingElement.attributes.properties.some(p => ts.isJsxAttribute(p)
        && p.name.getText(parsed) === 'className' && p.initializer?.getText(parsed) === '"consentOrb"')) sidebar = node
  ts.forEachChild(node, visit)
}
visit(parsed)
assert.ok(sidebar, 'Actual enforcement sidebar is required')
const renderSidebar = compile('export function render(displayMode, policy) { return (' + sidebar.getText(parsed) + '); }',
  name => { assert.equal(name, 'react/jsx-runtime'); return jsx }).render
for (const count of [0, 2]) {
  test('actual sidebar renders server state and ' + count + ' targets without a sample label', () => {
    const tree = renderSidebar('actual', { enforcement: { state: 'fully-enforced', affectedTargets: Array(count).fill('target') } })
    assert.equal(text(find(tree, n => n.type === 'strong')), 'fully-enforced')
    assert.match(text(tree), count ? /2 connected targets/ : /No active propagation job/)
    assert.doesNotMatch(text(tree), /SAMPLE|UNVERIFIED/)
  })
  test('sample sidebar labels both state and ' + count + ' targets as sample', () => {
    const tree = renderSidebar('sample', { enforcement: { state: 'partially-enforced', affectedTargets: Array(count).fill('sample') } })
    assert.equal(text(find(tree, n => n.type === 'strong')), 'SAMPLE partially-enforced')
    assert.match(text(tree), count ? /2 sample targets/ : /No sample propagation job/)
    assert.match(text(tree), /no private authority verified/)
    assert.doesNotMatch(text(tree), /connected targets|Animations reflect the server state/)
  })
}
test('unverified sidebar neither reads nor displays stale sample or former-owner authority', () => {
  const policy = Object.defineProperty({}, 'enforcement', { get() { throw new Error('Unverified policy was read') } })
  const tree = renderSidebar('unverified', policy)
  assert.equal(text(find(tree, n => n.type === 'strong')), 'UNVERIFIED')
  assert.match(text(tree), /No server authority verified/)
  assert.doesNotMatch(text(tree), /fully-enforced|partially-enforced|connected targets|sample targets/)
})
