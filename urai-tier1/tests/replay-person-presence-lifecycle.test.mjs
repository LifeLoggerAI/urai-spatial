import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { jsx, jsxs } from 'react/jsx-runtime'

const source = fs.readFileSync(new URL('../src/app/replay/ReplayPersonPresence.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
const tick = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)) }
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : ''

// Execute the actual component handlers with deterministic hook storage and
// synthetic adapters. Providers deliberately ignore AbortSignal to exercise
// late delivery; this does not establish a live private-provider acceptance.
function fixture(adapters = {}) {
  const cells = [], effects = []; let cursor = 0
  const closed = [], requests = [], audio = [], urls = []
  const session = { preparePersonPresenceSession: async () => ({ sessionId: 'session-a' }),
    closePersonPresenceSession: async id => { closed.push(id) }, getPersonPresenceCapabilities: async () => ({ voice: true }), ...adapters.session }
  const provider = { PersonPresenceError: Error, requestPersonPresence: async request => {
    requests.push(request); return { caption: 'synthetic reply', uncertainty: '' }
  }, ...adapters.provider }
  const voice = { requestPersonPresenceVoice: async () => ({ blob: new Blob(['synthetic audio']) }), ...adapters.voice }
  const hooks = {
    useState: initial => { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }
      return [cells[i].value, next => { cells[i].value = typeof next === 'function' ? next(cells[i].value) : next }] },
    useRef: initial => { const i = cursor++; cells[i] ??= { current: initial }; return cells[i] },
    useEffect: (operation, deps) => { const i = cursor++, previous = cells[i]
      if (!previous || deps.some((value, index) => !Object.is(value, previous.deps[index]))) {
        effects.push(() => { previous?.cleanup?.(); cells[i] = { deps, cleanup: operation() } })
      }
    },
  }
  const module = { exports: {} }
  vm.runInNewContext(compiled, { module, exports: module.exports, require: name => {
    if (name === 'react') return hooks
    if (name === 'react/jsx-runtime') return { jsx, jsxs }
    if (name.endsWith('/localePreference')) return { currentSpeechTag: () => 'en-US' }
    if (name.endsWith('/personPresenceSessionClient')) return session
    if (name.endsWith('/personPresenceClient')) return provider
    if (name.endsWith('/personPresenceVoiceClient')) return voice
    throw new Error(`Unexpected component dependency: ${name}`)
  }, AbortController, URL: { createObjectURL: () => { const url = `blob:synthetic-${urls.length}`; urls.push(url); return url }, revokeObjectURL: () => {} },
  Audio: class { constructor(url) { this.url = url; audio.push(this) } play() { this.played = true; return Promise.resolve() } pause() { this.paused = true } } })
  let props = { sceneTruthPacketId: 'scene-a', people: [{ bundleId: 'bundle-a', personId: 'person-a', label: 'Synthetic person', asOf: '2020-01-01', knowledgeCutoff: '2020-01-01' }] }
  const render = () => { cursor = 0; const tree = module.exports.ReplayPersonPresence(props); while (effects.length) effects.shift()(); return tree }
  const find = predicate => { const visit = node => {
    if (Array.isArray(node)) { for (const child of node) { const found = visit(child); if (found) return found } }
    else if (node?.props) { if (predicate(node)) return node; return visit(node.props.children) }
    return null
  }; return visit(render()) }
  const button = label => find(node => node.type === 'button' && text(node).startsWith(label))
  const choose = async () => { button('Synthetic person').props.onClick(); await tick() }
  const consent = (index, checked) => { const inputs = []
    find(node => { if (node.type === 'input') inputs.push(node); return false })
    assert.ok(inputs[index]); inputs[index].props.onChange({ currentTarget: { checked } })
  }
  const send = async value => { find(node => node.type === 'textarea').props.onChange({ currentTarget: { value } })
    find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await tick() }
  return { render, find, button, choose, consent, send, closed, requests, audio, urls,
    changeScene: async () => { props = { ...props, sceneTruthPacketId: 'scene-b' }; render(); await tick() },
    unmount: () => { for (const cell of cells) cell?.cleanup?.() } }
}

test('closing while preparation is pending closes the late session without restoring controls', async () => {
  const pending = deferred(), f = fixture({ session: { preparePersonPresenceSession: () => pending.promise } })
  await f.choose(); f.button('Close').props.onClick(); await tick()
  pending.resolve({ sessionId: 'late-session' }); await tick()
  assert.deepEqual(f.closed, ['late-session'])
  assert.equal(f.find(node => node.type === 'section').props['data-person-presence'], 'available')
  assert.equal(f.button('Send'), null)
})

test('close suppresses late text and deltas even when the provider ignores cancellation', async () => {
  const pending = deferred(); let request
  const f = fixture({ provider: { requestPersonPresence: input => { request = input; return pending.promise } } })
  await f.choose(); f.consent(0, true); await f.send('synthetic question')
  f.button('Close').props.onClick(); await tick()
  request.onEvent({ type: 'delta', text: 'late private delta' }); pending.resolve({ caption: 'late private reply', uncertainty: '' }); await tick()
  assert.equal(request.signal.aborted, true)
  assert.equal(text(f.render()).includes('late private'), false)
  assert.deepEqual(f.closed, ['session-a'])
})

test('revoking voice consent while audio is pending prevents playback and object URL creation', async () => {
  const pending = deferred(), f = fixture({ voice: { requestPersonPresenceVoice: () => pending.promise } })
  await f.choose(); f.consent(0, true); f.consent(1, true); await f.send('synthetic question')
  f.consent(1, false); pending.resolve({ blob: new Blob(['late private audio']) }); await tick()
  assert.equal(f.audio.length, 0); assert.equal(f.urls.length, 0)
  assert.equal(f.button('Stop').props.disabled, true)
})

test('a stopped request cannot clear the busy state or transcript of a newer request', async () => {
  const first = deferred(), second = deferred(); let count = 0
  const f = fixture({ provider: { requestPersonPresence: () => ++count === 1 ? first.promise : second.promise } })
  await f.choose(); f.consent(0, true); await f.send('first question'); f.button('Stop').props.onClick()
  await f.send('second question'); first.resolve({ caption: 'old reply', uncertainty: '' }); await tick()
  assert.equal(f.button('Stop').props.disabled, false)
  assert.equal(text(f.render()).includes('old reply'), false)
  second.resolve({ caption: 'current reply', uncertainty: '' }); await tick()
  assert.equal(f.button('Stop').props.disabled, true); assert.equal(text(f.render()).includes('current reply'), true)
})

test('scene changes and unmount close the active authority and suppress late session creation', async () => {
  const f = fixture(); await f.choose(); await f.changeScene()
  assert.deepEqual(f.closed, ['session-a']); assert.equal(f.button('Send'), null)
  const pending = deferred(), unmounted = fixture({ session: { preparePersonPresenceSession: () => pending.promise } })
  await unmounted.choose(); unmounted.unmount(); pending.resolve({ sessionId: 'late-unmounted' }); await tick()
  assert.deepEqual(unmounted.closed, ['late-unmounted']); assert.equal(unmounted.audio.length, 0)
})

test('preparation failure offers retry without reusing an old session or consent', async () => {
  let calls = 0
  const f = fixture({ session: { preparePersonPresenceSession: async () => { if (++calls === 1) throw new Error('synthetic failure'); return { sessionId: 'retry-session' } } } })
  await f.choose(); assert.ok(f.button('Try again')); f.button('Try again').props.onClick(); await tick()
  assert.equal(f.find(node => node.type === 'section').props['data-person-presence'], 'active')
  assert.equal(f.button('Send').props.disabled, true)
})
