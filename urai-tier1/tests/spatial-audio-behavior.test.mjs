import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

function load(file, globals = {}) {
  const cleanup = []
  const react = { useRef: value => ({ current: value }), useCallback: fn => fn, useMemo: fn => fn(), useEffect: fn => { const end = fn(); if (end) cleanup.push(end) } }
  const exports = {}
  const source = ts.transpileModule(fs.readFileSync(new URL(`../src/spatial/audio/${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  vm.runInNewContext(source, { exports, require: id => id === 'react' ? react : { jsx: () => null }, ...globals })
  return { exports, cleanup }
}
function ambientHarness() {
  let now = 0, sequence = 0
  const frames = new Map(), audios = []
  class Audio { volume = 0; currentTime = 0; paused = false; constructor(src) { this.src = src; audios.push(this) } play() { this.paused = false; return Promise.resolve() } pause() { this.paused = true } }
  const { exports } = load('useAudioController.ts', { Audio, window: { dispatchEvent() {} }, CustomEvent: class {}, performance: { now: () => now }, requestAnimationFrame: fn => { frames.set(++sequence, fn); return sequence }, cancelAnimationFrame: id => frames.delete(id) })
  return { api: exports.useAudioController(), audios, tick(time) { now = time; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()) } }
}
test('ambient fades depend on elapsed time, not render cadence', () => {
  const a = ambientHarness(), b = ambientHarness()
  for (const h of [a,b]) { h.api.setAmbientPhase('HOME'); h.tick(1300); h.api.setAmbientPhase('GROUND') }
  a.tick(1950)
  for (let t = 1310; t <= 1950; t += 10) b.tick(t)
  assert.equal(a.audios[0].volume, b.audios[0].volume)
  assert.ok(a.audios[0].volume > 0)
})
test('interrupted fades keep continuity, reuse a returning bed, and mute clears all layers', () => {
  const h = ambientHarness()
  h.api.setAmbientPhase('HOME'); h.tick(1300); h.api.setAmbientPhase('GROUND'); h.tick(1600)
  const before = h.audios.map(a => a.volume)
  h.api.setAmbientPhase('HOME'); h.tick(1600)
  assert.deepEqual(h.audios.map(a => a.volume), before)
  assert.equal(h.audios.length, 2)
  h.tick(2900)
  assert.equal(h.audios[1].paused, true)
  h.api.stopAmbient()
  assert.ok(h.audios.every(a => a.paused && a.volume === 0 && a.src === ''))
})

function cueHarness() {
  const events = new Map(), sources = [], decodes = [], gains = []
  class Node { connect() { return this } disconnect() {} }
  class Context {
    state = 'running'; sampleRate = 10; destination = new Node()
    createConvolver() { return new Node() }
    createBuffer() { return { numberOfChannels: 2, getChannelData: () => new Float32Array(4) } }
    resume() { return Promise.resolve() }
    close() { this.state = 'closed'; return Promise.resolve() }
    decodeAudioData() { return new Promise(resolve => decodes.push(resolve)) }
    createGain() { const node = Object.assign(new Node(), { gain: { value: 1 } }); gains.push(node); return node }
    createBufferSource() { const source = Object.assign(new Node(), { started: false, stopped: false, start() { this.started = true }, stop() { this.stopped = true; this.onended?.() } }); sources.push(source); return source }
  }
  const { exports, cleanup } = load('SpatialPositionedAudioRuntime.tsx', { window: { AudioContext: Context, addEventListener: (key, fn) => events.set(key, fn), removeEventListener: key => events.delete(key) }, sessionStorage: { getItem: () => null }, PannerNode: Node, fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }) })
  exports.default()
  return { sources, decodes, gains, cleanup, emit: (key, detail) => events.get(`urai:audio-${key}`)({ detail }) }
}
const settle = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }
for (const [event, detail] of [['mute', { muted: true }], ['consent', { enabled: false }]]) {
  test(`${event} cancels a pending decoded cue and active playback`, async () => {
    const h = cueHarness(); h.emit('consent', { enabled: true }); h.emit('cue', { cue: 'transition' }); await settle()
    assert.equal(h.decodes.length, 1)
    h.emit(event, detail); h.decodes.shift()({}); await settle()
    assert.equal(h.sources.length, 0, 'revoked pending cue must not start')
    h.emit('consent', { enabled: true }); h.emit('cue', { cue: 'transition' }); await settle()
    assert.equal(h.sources[0].started, true)
    h.emit(event, detail)
    assert.equal(h.sources[0].stopped, true)
    assert.equal(h.gains[0].gain.value, 0, 'master output must silence the reverb tail too')
    h.cleanup.forEach(fn => fn())
  })
}
