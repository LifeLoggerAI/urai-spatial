import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

// Execute the actual audio owners with deterministic hook, media and clock
// boundaries. These tests verify sound requests and cancellation, not text
// patterns, without claiming browser/device sound-quality acceptance.
function hookDriver() {
  const slots = []
  let cursor = 0
  let pending = []
  let dirty = false
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((value, index) => !Object.is(value, b[index]))
  const react = {
    useState(initial) {
      const index = cursor++
      if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial }
      const update = (value) => {
        const next = typeof value === 'function' ? value(slots[index].value) : value
        if (!Object.is(next, slots[index].value)) { slots[index].value = next; dirty = true }
      }
      return [slots[index].value, update]
    },
    useRef(initial) { const index = cursor++; slots[index] ??= { current: initial }; return slots[index] },
    useMemo(factory, deps) {
      const index = cursor++
      if (!slots[index] || changed(slots[index].deps, deps)) slots[index] = { value: factory(), deps }
      return slots[index].value
    },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps) },
    useEffect(effect, deps) {
      const index = cursor++
      const previous = slots[index]
      if (!previous || changed(previous.deps, deps)) {
        slots[index] = { deps, cleanup: previous?.cleanup }
        pending.push(() => { slots[index].cleanup?.(); slots[index].cleanup = effect() })
      }
    },
  }
  function render(owner) {
    let result
    for (let attempt = 0; attempt < 20; attempt += 1) {
      cursor = 0
      dirty = false
      result = owner()
      const effects = pending
      pending = []
      effects.forEach((effect) => effect())
      if (!dirty) return result
    }
    throw new Error('audio owner did not settle')
  }
  return { react, render, unmount: () => slots.forEach((slot) => slot?.cleanup?.()) }
}

function loadOwner(relative, imports, globals = {}) {
  const source = fs.readFileSync(path.resolve('src/spatial/audio', relative), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: relative,
  })
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    ...globals,
    exports: module.exports,
    module,
    require: (id) => {
      assert.ok(id in imports, `unexpected import ${id}`)
      return imports[id]
    },
  }, { filename: relative })
  return module.exports
}

function controllerHarness({ playResult } = {}) {
  const driver = hookDriver()
  const elements = []
  const frames = new Map()
  let frameId = 0
  let now = 0
  class Media {
    src = ''
    volume = 0
    currentTime = 0
    paused = true
    playCount = 0
    constructor(src = '') { this.src = src; elements.push(this) }
    play() { this.paused = false; this.playCount += 1; return playResult?.(this) ?? Promise.resolve() }
    pause() { this.paused = true }
  }
  const owner = loadOwner('useAudioController.ts', {
    react: driver.react,
    '@/lib/clientApiUrl': { clientApiUrl: (url) => url },
  }, {
    Audio: Media,
    window: { dispatchEvent() {} },
    performance: { now: () => now },
    requestAnimationFrame: (callback) => { frames.set(++frameId, callback); return frameId },
    cancelAnimationFrame: (id) => frames.delete(id),
  })
  const audio = driver.render(owner.useAudioController)
  const advance = (milliseconds) => {
    now += milliseconds
    const queued = [...frames.values()]
    frames.clear()
    queued.forEach((callback) => callback(now))
  }
  return { audio, elements, frames, advance }
}

function ambientHarness({ consented = true, muted = false, safe = false } = {}) {
  const driver = hookDriver()
  const listeners = new Map()
  const storage = new Map([
    ['urai:spatial-audio-consent-v1', String(consented)],
    ['urai:spatial-audio-muted-v1', String(muted)],
  ])
  const plays = []
  const state = { destination: 'home', phase: 'idle' }
  let stops = 0
  const audio = { setAmbientPhase: (phase) => plays.push(phase), stopAmbient: () => stops++, stopAllAudio: () => stops++ }
  const owner = loadOwner('SpatialAmbientRuntime.tsx', {
    react: driver.react,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    '@/spatial/world/WorldStateProvider': { useUraiWorldState: () => ({ world: { destination: state.destination }, phase: state.phase }) },
    './useAudioController': { useAudioController: () => audio },
    '@/spatial/accessibility/SensorySafeRuntime': { sensorySafeEnabled: () => safe, URAI_SENSORY_SAFE_EVENT: 'urai:sensory-safe-changed' },
  }, {
    sessionStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    window: {
      addEventListener(name, listener) { const set = listeners.get(name) ?? new Set(); set.add(listener); listeners.set(name, set) },
      removeEventListener(name, listener) { listeners.get(name)?.delete(listener) },
    },
  })
  const render = () => driver.render(owner.SpatialAmbientRuntime)
  render()
  return {
    plays, state, render, stops: () => stops,
    event(name, detail) { listeners.get(name)?.forEach((listener) => listener({ detail })); return render() },
  }
}

function positionedHarness({ delayedDecode = false } = {}) {
  const driver = hookDriver()
  const listeners = new Map()
  const sources = []
  const gains = []
  let decoded
  class Node {
    connections = []
    connect(next) { this.connections.push(next); return next }
    disconnect() { this.connections = [] }
  }
  class Context {
    sampleRate = 48000
    state = 'running'
    destination = new Node()
    createBuffer(channels, length) { return { numberOfChannels: channels, getChannelData: () => new Float32Array(length) } }
    createConvolver() { return new Node() }
    createGain() { const gain = Object.assign(new Node(), { gain: { value: 1 } }); gains.push(gain); return gain }
    createBufferSource() {
      const source = Object.assign(new Node(), {
        started: false, stopped: false,
        start() { this.started = true },
        stop() { this.stopped = true; this.onended?.() },
      })
      sources.push(source)
      return source
    }
    decodeAudioData() { return delayedDecode ? new Promise((resolve) => { decoded = resolve }) : Promise.resolve({}) }
    resume() { this.state = 'running'; return Promise.resolve() }
    close() { this.state = 'closed'; return Promise.resolve() }
  }
  const owner = loadOwner('SpatialPositionedAudioRuntime.tsx', {
    react: driver.react,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    '@/spatial/accessibility/SensorySafeRuntime': { sensorySafeEnabled: () => false, URAI_SENSORY_SAFE_EVENT: 'urai:sensory-safe-changed' },
  }, {
    PannerNode: Node,
    sessionStorage: { getItem: (key) => key.includes('consent') ? 'true' : 'false' },
    fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }),
    window: {
      AudioContext: Context,
      addEventListener(name, listener) { const set = listeners.get(name) ?? new Set(); set.add(listener); listeners.set(name, set) },
      removeEventListener(name, listener) { listeners.get(name)?.delete(listener) },
    },
  })
  driver.render(owner.default)
  return {
    sources, gains, unmount: driver.unmount,
    releaseDecode: () => { assert.ok(decoded, 'cue has reached decoding'); decoded({}) },
    event: (name, detail) => listeners.get(name)?.forEach((listener) => listener({ detail })),
  }
}

async function settleCue() { for (let index = 0; index < 12; index += 1) await Promise.resolve() }

function deferred() {
  let resolve
  const promise = new Promise((accept) => { resolve = accept })
  return { promise, resolve }
}

// The actual voice owner runs with synthetic network/media adapters. No provider
// request or private audio is used to exercise interrupted response-body reads.
function narratorHarness({ response, playFailure = false, autoEnd = true } = {}) {
  const driver = hookDriver()
  const elements = [], created = [], revoked = [], fallback = []
  class Media {
    paused = true
    constructor(src) { this.src = src; elements.push(this) }
    play() {
      this.paused = false
      if (playFailure) return Promise.reject(new Error('media playback denied'))
      if (autoEnd) queueMicrotask(() => this.onended?.())
      return Promise.resolve()
    }
    pause() { this.paused = true }
  }
  const owner = loadOwner('useAudioController.ts', {
    react: driver.react,
    '@/lib/clientApiUrl': { clientApiUrl: (url) => url },
  }, {
    Audio: Media, AbortController, DOMException,
    CustomEvent: class { constructor(type) { this.type = type } },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text } },
    URL: {
      createObjectURL(blob) { const url = `blob:synthetic-${blob.id}`; created.push(url); return url },
      revokeObjectURL(url) { revoked.push(url) },
    },
    fetch: async () => response ?? { ok: true, blob: async () => ({ id: 'voice' }) },
    window: {
      dispatchEvent() {},
      speechSynthesis: {
        cancel() {},
        speak(utterance) { fallback.push(utterance.text); queueMicrotask(() => utterance.onend?.()) },
      },
    },
  })
  return { audio: driver.render(owner.useAudioController), elements, created, revoked, fallback, unmount: driver.unmount }
}

for (const stop of ['stopAllAudio', 'unmount']) test(`${stop} during a voice body read prevents late media playback`, async () => {
  const body = deferred()
  const h = narratorHarness({ response: { ok: true, blob: () => body.promise } })
  const speaking = h.audio.speak({ id: 'interrupted', text: 'Synthetic narration' })
  await settleCue()
  if (stop === 'unmount') h.unmount()
  else h.audio.stopAllAudio()
  body.resolve({ id: 'interrupted' })
  await speaking
  assert.equal(h.elements.length, 0)
  assert.equal(h.created.length, 0)
  assert.equal(h.fallback.length, 0)
  assert.equal(h.audio.getAudioState().isSpeaking, false)
})

test('a superseded voice body cannot replace or play after the current narration', async () => {
  const first = deferred()
  let reads = 0
  const h = narratorHarness({ response: { ok: true, blob: () => ++reads === 1 ? first.promise : Promise.resolve({ id: 'current' }) } })
  const previous = h.audio.speak({ id: 'previous', text: 'Previous synthetic narration' })
  await settleCue()
  await h.audio.speak({ id: 'current', text: 'Current synthetic narration' })
  first.resolve({ id: 'previous' })
  await previous
  assert.deepEqual(h.created, ['blob:synthetic-current'])
  assert.deepEqual(h.revoked, ['blob:synthetic-current'])
  assert.equal(h.fallback.length, 0)
})

test('successful voice completion releases its blob exactly once even after stop', async () => {
  const h = narratorHarness()
  await h.audio.speak({ id: 'complete', text: 'Synthetic narration' })
  h.audio.stopAllAudio()
  assert.deepEqual(h.revoked, h.created)
  assert.equal(h.elements[0].src, '')
})

test('rejected media playback releases the blob before the existing speech fallback', async () => {
  const h = narratorHarness({ playFailure: true })
  await h.audio.speak({ id: 'denied', text: 'Synthetic narration' })
  assert.deepEqual(h.revoked, h.created)
  assert.equal(h.elements[0].paused, true)
  assert.equal(h.elements[0].src, '')
  assert.deepEqual(h.fallback, ['Synthetic narration'])
})

test('stopping active narration releases its blob and never invokes speech fallback', async () => {
  const h = narratorHarness({ autoEnd: false })
  const speaking = h.audio.speak({ id: 'playing', text: 'Synthetic narration' })
  await settleCue()
  assert.equal(h.elements.length, 1)
  h.audio.stopAllAudio()
  await speaking
  assert.deepEqual(h.revoked, h.created)
  assert.equal(h.elements[0].paused, true)
  assert.equal(h.elements[0].src, '')
  assert.equal(h.fallback.length, 0)
})

test('returning Home during a Focus crossfade leaves Home as the sole active ambience', () => {
  const h = controllerHarness()
  h.audio.setAmbientPhase('HOME')
  h.advance(1500)
  h.audio.setAmbientPhase('FOCUS')
  h.advance(200)
  h.audio.setAmbientPhase('HOME')
  h.advance(2000)
  const active = h.elements.filter((element) => !element.paused && element.src)
  assert.equal(active.length, 1)
  assert.ok(active[0].src.endsWith('/home-ambient-v1.opus'))
  assert.equal(h.frames.size, 0)
})

test('rejected ambience can retry the same route without leaving a stale crossfade', async () => {
  let attempts = 0
  const h = controllerHarness({ playResult: () => ++attempts === 1 ? Promise.reject(new Error('playback denied')) : Promise.resolve() })
  h.audio.setAmbientPhase('HOME')
  await settleCue()
  assert.equal(h.frames.size, 0)
  assert.ok(h.elements.every((element) => element.paused && element.src === ''))
  h.audio.setAmbientPhase('HOME')
  h.advance(2000)
  assert.equal(attempts, 2)
  const active = h.elements.filter((element) => !element.paused && element.src)
  assert.equal(active.length, 1)
  assert.ok(active[0].src.endsWith('/home-ambient-v1.opus'))
})

test('a retired ambience rejection cannot silence a newer destination', async () => {
  let rejectOld, attempts = 0
  const h = controllerHarness({ playResult: () => ++attempts === 1 ? new Promise((_, reject) => { rejectOld = reject }) : Promise.resolve() })
  h.audio.setAmbientPhase('HOME')
  h.audio.setAmbientPhase('FOCUS')
  rejectOld(new Error('retired playback denied'))
  await settleCue()
  h.advance(2000)
  const active = h.elements.filter((element) => !element.paused && element.src)
  assert.equal(active.length, 1)
  assert.ok(active[0].src.endsWith('/focus-ambient-v1.opus'))
})

test('repeated phase requests preserve the ongoing crossfade and mute cancels it', () => {
  const h = controllerHarness()
  h.audio.setAmbientPhase('HOME')
  h.advance(100)
  h.audio.setAmbientPhase('HOME')
  assert.equal(h.elements.reduce((count, element) => count + element.playCount, 0), 1)
  h.audio.stopAmbient()
  h.advance(2000)
  assert.equal(h.frames.size, 0)
  assert.ok(h.elements.every((element) => element.paused && element.src === '' && element.volume === 0))
})

test('explicit controller phase requests preserve their requested final ambience', () => {
  const h = controllerHarness()
  h.audio.setAmbientPhase('HOME')
  h.advance(1500)
  h.audio.setAmbientPhase('FOCUS')
  h.advance(100)
  h.audio.setAmbientPhase('REPLAY')
  h.advance(2500)
  const active = h.elements.filter((element) => !element.paused && element.src)
  assert.equal(active.length, 1)
  assert.ok(active[0].src.endsWith('/replay-ambient-v1.opus'))
})

test('sensory-safe stops ambience and disabling it restores the current consented route', () => {
  const h = ambientHarness()
  assert.deepEqual(h.plays, ['HOME'])
  h.event('urai:sensory-safe-changed', { enabled: true })
  h.state.destination = 'focus'
  h.render()
  assert.deepEqual(h.plays, ['HOME'])
  h.event('urai:sensory-safe-changed', { enabled: false })
  assert.deepEqual(h.plays, ['HOME', 'FOCUS'])
  assert.ok(h.stops() > 0)
})

test('consent and unmute events cannot start ambience while sensory-safe is enabled', () => {
  const h = ambientHarness({ safe: true })
  h.event('urai:audio-consent', { enabled: true })
  h.event('urai:audio-mute', { muted: false })
  assert.deepEqual(h.plays, [])
})

for (const destination of ['replay', 'life-movie']) {
  for (const phase of ['idle', 'ascending', 'travelling']) {
    test(`${destination} ${phase} never mounts generic ambience over the source soundtrack`, () => {
      const h = ambientHarness()
      h.state.destination = destination
      h.state.phase = phase
      const before = h.plays.length
      const stops = h.stops()
      const state = h.render()
      h.event('urai:audio-consent', { enabled: true })
      h.event('urai:audio-mute', { muted: false })
      h.event('urai:sensory-safe-changed', { enabled: true })
      h.event('urai:sensory-safe-changed', { enabled: false })
      assert.equal(h.plays.length, before)
      assert.ok(h.stops() > stops)
      assert.equal(state.props['data-audio-phase'], 'none')
      assert.match(state.props.children, destination === 'replay' ? /source-audio-first/ : /authorized soundtrack/)
    })
  }
  test(`leaving ${destination} restores only the current authorized Home ambience`, () => {
    const h = ambientHarness()
    h.state.destination = destination
    h.render()
    const before = h.plays.length
    h.state.destination = 'home'
    h.render()
    assert.deepEqual(h.plays.slice(before), ['HOME'])
  })
}

test('muted or unconsented sound stays silent after sensory-safe is disabled', () => {
  for (const options of [{ consented: false, safe: true }, { muted: true, safe: true }]) {
    const h = ambientHarness(options)
    h.event('urai:sensory-safe-changed', { enabled: false })
    assert.deepEqual(h.plays, [])
  }
})

test('a cue decoded after mute and unmute cannot start until a new cue is requested', async () => {
  const h = positionedHarness({ delayedDecode: true })
  h.event('urai:audio-cue', { cue: 'orb-confirm' })
  await settleCue()
  h.event('urai:audio-mute', { muted: true })
  h.event('urai:audio-mute', { muted: false })
  h.releaseDecode()
  await settleCue()
  assert.equal(h.sources.filter((source) => source.started).length, 0)
  h.event('urai:audio-cue', { cue: 'orb-confirm' })
  await settleCue()
  assert.equal(h.sources.filter((source) => source.started).length, 1)
})

test('mute, sensory-safe and consent withdrawal stop active positioned cues including room response', async () => {
  for (const [event, detail] of [
    ['urai:audio-mute', { muted: true }],
    ['urai:sensory-safe-changed', { enabled: true }],
    ['urai:audio-consent', { enabled: false }],
  ]) {
    const h = positionedHarness()
    h.event('urai:audio-cue', { cue: 'transition' })
    await settleCue()
    assert.equal(h.sources.filter((source) => source.started).length, 1)
    h.event(event, detail)
    assert.ok(h.sources.every((source) => source.stopped))
    assert.equal(h.gains[0].gain.value, 0, `${event} must silence the shared cue output`)
  }
})

test('unmount cancels a pending cue decode before it can create a sound source', async () => {
  const h = positionedHarness({ delayedDecode: true })
  h.event('urai:audio-cue', { cue: 'error' })
  await settleCue()
  h.unmount()
  h.releaseDecode()
  await settleCue()
  assert.equal(h.sources.filter((source) => source.started).length, 0)
})

