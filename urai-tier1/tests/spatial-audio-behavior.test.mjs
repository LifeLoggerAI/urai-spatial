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
  const outcomes = []
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
  const audio = driver.render(() => owner.useAudioController(outcome => outcomes.push(outcome)))
  const advance = (milliseconds) => {
    now += milliseconds
    const queued = [...frames.values()]
    frames.clear()
    queued.forEach((callback) => callback(now))
  }
  return { audio, elements, frames, advance, outcomes }
}

function ambientHarness({ consented = true, muted = false, safe = false, controller } = {}) {
  const driver = hookDriver()
  const listeners = new Map()
  const storage = new Map([
    ['urai:spatial-audio-consent-v1', String(consented)],
    ['urai:spatial-audio-muted-v1', String(muted)],
  ])
  const plays = []
  const state = { destination: 'home', phase: 'idle' }
  let stops = 0
  const retryRef = { current: null }
  const audio = controller ?? { setAmbientPhase: (phase) => plays.push(phase), stopAmbient: () => stops++, stopAllAudio: () => stops++ }
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
  const render = () => driver.render(() => owner.SpatialAmbientRuntime({ onPlayback: () => {}, retryRef }))
  render()
  return {
    plays, state, render, retry: () => retryRef.current?.(), stops: () => stops,
    dispatch(name, detail) { listeners.get(name)?.forEach((listener) => listener({ detail })) },
    event(name, detail) { this.dispatch(name, detail); return render() },
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

test('rapid Home, Focus, Replay requests finish with only Replay ambience', () => {
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

function soundControls(ambientPlayback, { enabled = true, retry = () => {}, toggle = () => {} } = {}) {
  const jsx = (type, props) => ({ type, props })
  const owner = loadOwner('../world/PersistentWorldCompanion.tsx', {
    react: {}, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/navigation': {},
    '@/app/home/orbStateController': {}, '@/spatial/orb/OrbConversationPanel': {},
    '@/spatial/scenario/PossibleFuturesOrbEntry': {},
    './destinationRegistry': {}, './worldEvents': {}, './WorldStateProvider': {},
  })
  const controls = owner.SpatialSoundControls({ ambientPlayback, onRetryAmbient: retry,
    hydrated: true, audioEnabled: enabled, toggleAudio: toggle })
  return controls.props.children.filter(Boolean)
}

function mediaFailure(name) {
  return Object.assign(new Error('synthetic media boundary'), { name })
}

test('a browser activation rejection offers a user gesture retry without changing consent', async () => {
  let attempts = 0
  const h = controllerHarness({ playResult: () => ++attempts === 1
    ? Promise.reject(mediaFailure('NotAllowedError')) : Promise.resolve() })
  const runtime = ambientHarness({ controller: h.audio, consented: false, muted: true })
  assert.equal(attempts,0)
  assert.equal(soundControls('unattempted',{enabled:false})[1].props.children,'Sound is off.')
  runtime.event('urai:audio-consent',{enabled:true})
  await settleCue()
  assert.equal(h.outcomes.at(-1),'blocked')
  const [preference, status, retry] = soundControls('blocked',{retry:runtime.retry})
  assert.match(status.props.children,/browser blocked/i)
  assert.equal(preference.props['aria-disabled'],false)
  assert.equal(retry.props.children,'Retry spatial sound')
  retry.props.onClick()
  assert.equal(attempts,2)
  await settleCue()
  assert.equal(h.outcomes.at(-1),'playing')
  assert.equal(soundControls('playing')[1].props.children,'Ambience is playing.')
})

for (const [name, code, expected] of [
  ['network error',2,'unavailable'], ['decode error',3,'unavailable'],
  ['unsupported source',4,'unavailable'], ['aborted media',1,'interrupted'],
]) test(name + ' from the active media element is reflected after successful play', async () => {
  const h = controllerHarness()
  h.audio.setAmbientPhase('HOME')
  await settleCue()
  assert.equal(h.outcomes.at(-1),'playing')
  const active = h.elements.find(element => element.src.endsWith('home-ambient-v1.opus'))
  active.error = {code}
  active.onerror()
  assert.equal(h.outcomes.at(-1),expected)
  assert.equal(h.frames.size,0)
  let retries = 0, toggles = 0
  const [primary,status,retry,off] = soundControls(expected,{retry:()=>retries++,toggle:()=>toggles++})
  assert.equal(status.props.role,'status')
  assert.equal(status.props['aria-live'],'polite')
  assert.equal(primary.props['aria-disabled'],expected==='unavailable')
  if (expected === 'unavailable') {
    assert.equal(primary.props.onClick,undefined)
    assert.match(status.props.children,/track is unavailable/i)
    off.props.onClick()
    assert.equal(toggles,1)
  }
  retry.props.onClick()
  assert.equal(retries,1)
})

test('unsupported playback or interrupted playback uses only the observed error', async () => {
  for (const [name,outcome] of [['NotSupportedError','unavailable'],['AbortError','interrupted'],['Error','interrupted']]) {
    const h = controllerHarness({playResult:()=>Promise.reject(mediaFailure(name))})
    h.audio.setAmbientPhase('HOME')
    await settleCue()
    assert.deepEqual(h.outcomes,['starting',outcome])
  }
})

test('a retired play success, media error, or rejection cannot relabel a successor or a muted session', async () => {
  let resolveOld
  const h = controllerHarness({playResult:element=>element.src.includes('home-ambient')
    ? new Promise(resolve=>{resolveOld=resolve}) : Promise.resolve()})
  h.audio.setAmbientPhase('HOME')
  const old = h.elements.find(element=>element.src.includes('home-ambient'))
  const oldError = old.onerror
  h.audio.setAmbientPhase('FOCUS')
  await settleCue()
  const before = h.outcomes.length
  old.error = {code:3}
  oldError()
  resolveOld()
  await settleCue()
  assert.equal(h.outcomes.length,before)
  assert.equal(h.outcomes.at(-1),'playing')
  const current = h.elements.find(element=>element.src.includes('focus-ambient'))
  const lateError = current.onerror
  h.audio.stopAmbient()
  current.error={code:2}
  lateError()
  assert.equal(h.outcomes.at(-1),'unattempted')
})

test('pending playback and unavailable states preserve the preference and its explicit off control', () => {
  for (const outcome of ['unattempted','starting','blocked','unavailable','interrupted']) {
    const [primary,status] = soundControls(outcome)
    assert.equal(primary.props['aria-pressed'],true)
    assert.doesNotMatch(status.props.children,/is playing/i)
  }
})

test('retry is synchronously fenced by mute, withdrawal and sensory-safe before rerender', () => {
  for (const [name,detail] of [['urai:audio-mute',{muted:true}],['urai:audio-consent',{enabled:false}],['urai:sensory-safe-changed',{enabled:true}]]) {
    const h = ambientHarness()
    const count=h.plays.length
    h.dispatch(name,detail)
    h.retry()
    assert.equal(h.plays.length,count)
    h.render()
    h.retry()
    assert.equal(h.plays.length,count)
  }
})
