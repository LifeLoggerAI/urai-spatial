import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

function harness(enabled) {
  const events = new EventTarget(), cleanup = [], vibrations = [], audios = [], modules = new Map()
  let stateIndex = 0
  const storage = new Map([['urai:haptics:enabled-v1', String(enabled)]])
  const react = { useRef: value => ({ current: value }), useCallback: fn => fn, useMemo: fn => fn(),
    useState: () => [[true, false, ''][stateIndex++], () => {}],
    useEffect: fn => { const dispose = fn(); if (dispose) cleanup.push(dispose) } }
  class Audio {
    volume = 0; currentTime = 0; paused = true
    constructor(src) { this.src = src; audios.push(this) }
    load() {} play() { this.paused = false; return Promise.resolve() } pause() { this.paused = true }
  }
  const window = Object.assign(events, {
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    clearTimeout, setTimeout, speechSynthesis: { cancel() {} },
  })
  const root = path.resolve('src')
  function load(relative) {
    const filename = path.resolve(root, relative)
    if (modules.has(filename)) return modules.get(filename)
    const exports = {}; modules.set(filename, exports)
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
    vm.runInNewContext(source, { exports, window, navigator: { vibrate: pattern => { vibrations.push(pattern); return true } },
      Audio, CustomEvent, performance: { now: () => 0 }, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
      sessionStorage: { getItem: key => key.includes('consent') ? 'true' : 'false' },
      require: id => {
        if (id.endsWith('/worldEvents')) return { URAI_WORLD_TRAVEL_EVENT: 'urai:world-travel', URAI_WORLD_RETURN_EVENT: 'urai:world-return' }
        if (id === 'react') return react
        if (id === 'react/jsx-runtime') return { jsx: () => null }
        if (id.endsWith('/WorldStateProvider')) return { useUraiWorldState: () => ({ world: { destination: 'home' }, phase: 'idle' }) }
        const target = id.startsWith('@/') ? path.join(root, id.slice(2)) : path.resolve(path.dirname(filename), id)
        const resolved = ['.ts', '.tsx'].map(ext => target + ext).find(file => fs.existsSync(file))
        if (!resolved) throw new Error(`Unmocked import ${id}`)
        return load(path.relative(root, resolved))
      },
    })
    return exports
  }
  const haptics = load('spatial/haptics/HapticRuntime.tsx'); haptics.HapticRuntime()
  load('spatial/audio/SpatialAmbientRuntime.tsx').SpatialAmbientRuntime()
  return { vibrations, audios, haptics, cleanup: () => cleanup.reverse().forEach(fn => fn()), emit: (name, detail) => events.dispatchEvent(new CustomEvent(`urai:audio-${name}`, { detail })) }
}

test('audio cue haptics honor hard-off and re-enable through governed runtime', async () => {
  const h = harness(false)
  try {
    for (const cue of ['error', 'permission', 'confirm', 'orb-confirm']) h.emit('cue', { cue })
    await Promise.resolve()
    assert.equal(h.vibrations.length, 0, 'haptics off must suppress every audio-cue vibration')
    h.haptics.setHapticsEnabled(true)
    for (const cue of ['error', 'permission', 'confirm', 'orb-confirm']) h.emit('cue', { cue })
    assert.equal(JSON.stringify(h.vibrations), JSON.stringify([[18, 35, 18], [12], [8], [8]]))
    h.haptics.setHapticsEnabled(false)
    const count = h.vibrations.length
    h.emit('cue', { cue: 'error' })
    assert.equal(h.vibrations.length, count)
  } finally { h.cleanup() }
})
for (const cue of ['permission', 'confirm']) {
  test(`mute immediately stops active ${cue} audio and ambience`, () => {
    const h = harness(false)
    try {
      h.emit('cue', { cue })
      const playing = h.audios.filter(audio => !audio.paused)
      assert.ok(playing.length >= 2, 'fixture must have active ambience and local cue')
      h.emit('mute', { muted: true })
      assert.ok(playing.every(audio => audio.paused && audio.src === ''), 'mute must release local cue and ambience')
    } finally { h.cleanup() }
  })
}
