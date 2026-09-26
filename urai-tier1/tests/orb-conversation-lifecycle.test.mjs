import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }
const stream = () => {
  const track = { stopped: 0, stop() { this.stopped++ } }
  return { track, getTracks: () => [track] }
}
const response = (message = 'A reply') => ({ provider: 'openai', message, disclosure: 'Test response', suggestedActions: [] })

function harness(options = {}) {
  const slots = [], effects = [], permissions = [], contexts = [], requests = [], voiceRequests = [], audio = [], speech = []
  const events = new Map(), timers = new Map(), frames = new Map(), signals = [], states = []
  let index = 0, sequence = 0, tree, unmounted = false, updatesAfterUnmount = 0
  const react = {
    useRef(value) { const slot = index++; return slots[slot] ??= { current: value } },
    useState(value) {
      const slot = index++
      if (!(slot in slots)) slots[slot] = value
      return [slots[slot], (next) => {
        if (unmounted) updatesAfterUnmount++
        slots[slot] = typeof next === 'function' ? next(slots[slot]) : next
      }]
    },
    useEffect(fn, dependencies) {
      const slot = index++, previous = slots[slot]
      if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) {
        effects.push(() => {
          previous?.cleanup?.()
          slots[slot] = { dependencies, cleanup: fn() }
        })
      }
    },
  }
  class Context {
    state = options.suspended ? 'suspended' : 'running'
    destination = {}
    closeGate = deferred()
    resumeGate = deferred()
    closed = 0
    constructor() {
      if (options.constructorError) throw new Error('AudioContext unavailable')
      contexts.push(this)
    }
    createMediaStreamSource() {
      if (options.sourceError) throw new Error('Source unavailable')
      return { connect() {}, disconnect() {} }
    }
    createMediaElementSource() { return this.createMediaStreamSource() }
    createAnalyser() { return { fftSize: 1024, connect() {}, disconnect() {}, getFloatTimeDomainData() {} } }
    resume() { return options.deferResume ? this.resumeGate.promise : Promise.resolve() }
    close() { this.closed++; this.state = 'closed'; return options.deferClose ? this.closeGate.promise : Promise.resolve() }
  }
  class Audio {
    currentTime = 0
    duration = 1
    paused = 0
    plays = 0
    constructor(src) { this.src = src; audio.push(this) }
    play() { this.plays++; return Promise.resolve() }
    pause() { this.paused++ }
  }
  class TrackedController extends AbortController {
    constructor() {
      super()
      const listeners = new Set(), signal = this.signal
      const add = signal.addEventListener.bind(signal), remove = signal.removeEventListener.bind(signal)
      signal.addEventListener = (type, fn, ...rest) => { if (type === 'abort') listeners.add(fn); add(type, fn, ...rest) }
      signal.removeEventListener = (type, fn, ...rest) => { if (type === 'abort') listeners.delete(fn); remove(type, fn, ...rest) }
      signals.push({ signal, listeners })
    }
  }
  const window = {
    addEventListener(type, fn) { if (!events.has(type)) events.set(type, new Set()); events.get(type).add(fn) },
    removeEventListener(type, fn) { events.get(type)?.delete(fn) },
    dispatchEvent(event) { for (const fn of events.get(event.type) ?? []) fn(event) },
    setTimeout(fn) { const id = ++sequence; timers.set(id, fn); return id },
    clearTimeout(id) { timers.delete(id) },
    requestAnimationFrame(fn) { const id = ++sequence; frames.set(id, fn); return id },
    cancelAnimationFrame(id) { frames.delete(id) },
    speechSynthesis: { speaking: false, cancel() {}, speak(utterance) { speech.push(utterance) } },
  }
  const imports = {
    react,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    '@/app/home/orbStateController': { publishOrbState: (value) => states.push(value) },
    '@/spatial/narrator/elevenlabsClient': { requestExternalVoiceAudio: (...args) => {
      const request = deferred(); voiceRequests.push({ ...request, args }); return request.promise
    } },
    '@/spatial/narrator/narratorCopy': { URAI_VOICE_CONFIG: { neutral: { voiceId: 'test' } } },
    '@/spatial/narrator/narratorPlayback': { narratorPlayback: { setExternalVoiceConsent() {} } },
    '@/spatial/world/worldEvents': { URAI_WORLD_ORB_CLOSE_EVENT: 'orb-close' },
    './OrbConversationPanel.module.css': { default: {} },
    './orbSpeechClock': { emitOrbSpeechClock() {}, ORB_RESPONSE_ANTICIPATION_MS: 150 },
    './openaiClient': {
      requestOpenAIOrb: (input) => { const request = deferred(); requests.push({ ...request, input }); return request.promise },
      deterministicOrbFallback: (message) => response(message),
      attemptedExternalOrbFallback: response, uncertainExternalOrbFallback: response,
      OrbProviderAttemptError: class extends Error {}, OrbProviderAttemptUncertainError: class extends Error {},
    },
  }
  const exports = {}
  const source = fs.readFileSync(new URL('../src/spatial/orb/OrbConversationPanel.tsx', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  vm.runInNewContext(compiled, {
    exports, window, AudioContext: Context, Audio, AbortController: TrackedController,
    SpeechSynthesisUtterance: class {}, performance: { now: () => 100 },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    CustomEvent: class { constructor(type) { this.type = type } },
    navigator: { mediaDevices: { getUserMedia() { const request = deferred(); permissions.push(request); return request.promise } } },
    require(id) { if (!(id in imports)) throw new Error(`Unexpected import ${id}`); return imports[id] },
  })
  function nodes(type) {
    const result = []
    const visit = (node) => {
      if (Array.isArray(node)) { node.forEach(visit); return }
      if (!node || typeof node !== 'object') return
      if (node.type === type) result.push(node)
      visit(node.props?.children)
    }
    visit(tree)
    return result
  }
  const h = {
    permissions, contexts, requests, voiceRequests, audio, speech, signals, states, frames, timers,
    render() { index = 0; tree = exports.default(); for (const effect of effects.splice(0)) effect(); return h },
    button(label) { const button = nodes('button').find((node) => node.props.children === label); assert.ok(button, label); return button.props },
    mic() { const button = nodes('button').find((node) => ['Start mic', 'Mic listening'].includes(node.props.children)); return button.props },
    close() { window.dispatchEvent({ type: 'orb-close' }); h.render() },
    unmount() { unmounted = true; for (const slot of slots) slot?.cleanup?.() },
    get updatesAfterUnmount() { return updatesAfterUnmount },
    get draft() { return nodes('textarea')[0].props.value },
    get status() { return nodes('p').find((node) => node.props.role === 'status').props.children },
    get busy() { return nodes('form')[0].props['aria-busy'] },
    setDraft(value) { nodes('textarea')[0].props.onChange({ target: { value } }); h.render() },
    consent(external = false) { nodes('input')[external ? 1 : 0].props.onChange({ target: { checked: true } }); h.render() },
    send() { const promise = nodes('form')[0].props.onSubmit({ preventDefault() {} }); h.render(); return promise },
    flushTimers() { const pending = [...timers.values()]; timers.clear(); pending.forEach((fn) => fn()); h.render() },
  }
  return h.render()
}

for (const close of ['close', 'unmount']) {
  test(`late microphone permission after ${close} releases every track without activation`, async () => {
    const h = harness(), late = stream()
    h.mic().onClick(); await settle()
    h[close]()
    h.permissions[0].resolve(late)
    await settle()
    assert.equal(late.track.stopped, 1)
    assert.equal(h.contexts.length, 0)
    assert.equal(h.frames.size, 0)
    assert.equal(h.updatesAfterUnmount, 0)
    if (close === 'close') assert.equal(h.mic()['aria-pressed'], false)
  })
}

test('microphone on/off detaches synchronously; old context close cannot stop a newer session', async () => {
  const h = harness({ deferClose: true }), first = stream(), second = stream()
  h.mic().onClick(); await settle(); h.permissions[0].resolve(first); await settle(); h.render()
  assert.equal(h.mic()['aria-pressed'], true)
  h.mic().onClick(); await settle(); h.render()
  assert.equal(first.track.stopped, 1)
  assert.equal(h.mic()['aria-pressed'], false)
  assert.equal(h.frames.size, 0)
  h.mic().onClick(); await settle(); h.permissions[1].resolve(second); await settle(); h.render()
  h.contexts[0].closeGate.resolve(); await settle(); h.render()
  assert.equal(h.mic()['aria-pressed'], true)
  assert.equal(second.track.stopped, 0)
  h.close()
  assert.equal(second.track.stopped, 1)
})

test('latest microphone request wins when permissions resolve out of order', async () => {
  const h = harness(), stale = stream(), current = stream()
  h.mic().onClick(); await settle(); h.mic().onClick()
  h.permissions[1].resolve(current); await settle(); h.render()
  h.permissions[0].resolve(stale); await settle(); h.render()
  assert.equal(stale.track.stopped, 1)
  assert.equal(current.track.stopped, 0)
  assert.equal(h.mic()['aria-pressed'], true)
  assert.equal(h.contexts.length, 1)
  h.close()
})

for (const error of ['constructorError', 'sourceError']) {
  test(`microphone ${error} releases the acquired stream`, async () => {
    const h = harness({ [error]: true }), acquired = stream()
    h.mic().onClick(); await settle(); h.permissions[0].resolve(acquired); await settle(); h.render()
    assert.equal(acquired.track.stopped, 1)
    assert.equal(h.mic()['aria-pressed'], false)
    assert.equal(h.frames.size, 0)
    if (h.contexts.length) assert.equal(h.contexts[0].closed, 1)
  })
}

test('close during audio resume cleans owned resources and stale rejection cannot affect newer mic', async () => {
  const h = harness({ deferResume: true }), first = stream(), second = stream()
  h.mic().onClick(); await settle(); h.permissions[0].resolve(first); await settle()
  h.close()
  assert.equal(first.track.stopped, 1)
  assert.equal(h.contexts[0].closed, 1)
  h.mic().onClick(); await settle(); h.permissions[1].resolve(second); await settle()
  h.contexts[1].resumeGate.resolve(); await settle(); h.render()
  h.contexts[0].resumeGate.reject(new Error('Closed while resuming')); await settle(); h.render()
  assert.equal(h.mic()['aria-pressed'], true)
  assert.equal(second.track.stopped, 0)
  h.close()
})

test('fulfilled resume without a running context releases microphone without claiming Listening', async () => {
  const h = harness({ suspended: true }), acquired = stream()
  h.mic().onClick(); await settle()
  h.permissions[0].resolve(acquired); await settle(); h.render()
  assert.equal(acquired.track.stopped, 1)
  assert.equal(h.contexts[0].closed, 1)
  assert.equal(h.mic()['aria-pressed'], false)
  assert.equal(h.states.includes('listening'), false)
})

test('close aborts provider work, preserves draft, and ignores late events/results after a newer send', async () => {
  const h = harness()
  h.consent(); h.setDraft('Keep this draft')
  const old = h.send()
  h.close()
  assert.equal(h.requests[0].input.signal.aborted, true)
  assert.equal(h.draft, 'Keep this draft')
  assert.equal(h.busy, false)
  h.setDraft('New request')
  const current = h.send()
  const before = h.status
  h.requests[0].input.onEvent({ type: 'status' })
  h.requests[0].input.onEvent({ type: 'delta', text: 'Stale text' })
  h.requests[0].resolve(response('Old reply'))
  await old; h.render()
  assert.equal(h.status, before)
  assert.equal(h.busy, true)
  assert.equal(h.draft, 'New request')
  h.requests[1].resolve(response('New reply')); await current; h.render()
  assert.equal(h.busy, false)
  assert.equal(h.draft, '')
  h.close()
  assert.equal(h.timers.size, 0)
})

test('close during device anticipation clears timers and cannot start hidden speech', async () => {
  const h = harness()
  h.consent(); h.setDraft('Say hello')
  const pending = h.send(); h.requests[0].resolve(response()); await pending; h.render()
  assert.ok(h.timers.size > 0)
  h.close(); h.flushTimers(); await settle()
  assert.equal(h.speech.length, 0)
  assert.equal(h.timers.size, 0)
})

test('completed conversation history survives close and is included in the next message', async () => {
  const h = harness()
  h.consent(); h.setDraft('First question')
  const first = h.send(); h.requests[0].resolve(response('First answer')); await first; h.render()
  h.close()
  h.setDraft('Follow-up question')
  const second = h.send()
  assert.equal(h.requests[1].input.context.length, 2)
  assert.equal(h.requests[1].input.context[0].content, 'First question')
  assert.equal(h.requests[1].input.context[1].content, 'First answer')
  h.close(); h.requests[1].resolve(response()); await second
})

test('late external voice after close cannot create playback', async () => {
  const h = harness()
  h.consent(); h.consent(true); h.setDraft('Say hello')
  const pending = h.send(); h.requests[0].resolve(response()); await pending
  assert.equal(h.voiceRequests.length, 1)
  h.close(); h.voiceRequests[0].resolve({}); await settle()
  assert.equal(h.voiceRequests[0].args[1].aborted, true)
  assert.equal(h.audio.length, 0)
  assert.equal(h.speech.length, 0)
})

for (const ending of ['complete', 'close']) {
  test(`natural voice anticipation removes abort listener on ${ending}`, async () => {
    const h = harness()
    h.consent(); h.consent(true); h.setDraft('Say hello')
    const pending = h.send(); h.requests[0].resolve(response()); await pending
    h.voiceRequests[0].resolve({}); await settle()
    const signal = h.signals.at(-1)
    assert.equal(signal.listeners.size, 1)
    if (ending === 'close') h.close()
    else h.flushTimers()
    await settle()
    assert.equal(signal.listeners.size, 0)
    assert.equal(h.audio[0].plays, ending === 'complete' ? 1 : 0)
    h.close()
    assert.equal(h.frames.size, 0)
  })
}
