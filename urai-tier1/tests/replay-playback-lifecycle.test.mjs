import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import * as THREE from 'three'
import { jsx, jsxs } from 'react/jsx-runtime'
import * as cameraMotion from '../src/spatial/canon/cameraMotion.ts'
import * as replayMotion from '../src/app/replay/replayMotion.ts'
import * as narrativeClock from '../src/app/replay/replayNarrativeClock.ts'
import * as mediaSession from '../src/app/replay/replayMediaSession.ts'
import * as admission from '../src/app/replay/replayVisualAdmission.ts'

const source = readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source + '\nexport { ReplayMemoryExperience, ReplayCameraRig }', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText

function fixture({ video = false, webglReady = false, entrySearch = '', reducedMotion = false } = {}) {
  // Synthetic adapters execute the actual component and handlers. This is not
  // provider acceptance or a claim that an autobiographical world is admitted.
  const cells = [], pending = [], timers = new Map()
  let cursor = 0, nextTimer = 0, time = 0, phase = 'idle', frameCallback, returns = 0
  const memo = (fn, deps) => {
    const index = cursor++, previous = cells[index]
    if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) cells[index] = { deps, value: fn() }
    return cells[index].value
  }
  const hooks = {
    Component: class {},
    useRef(value) { const i = cursor++; return cells[i] ??= { current: value } },
    useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = { value: typeof initial === 'function' ? initial() : initial }
      return [cells[i].value, (next) => { cells[i].value = typeof next === 'function' ? next(cells[i].value) : next }] },
    useMemo: memo,
    useCallback: (fn, deps) => memo(() => fn, deps),
    useEffect(fn, deps) { const i = cursor++, previous = cells[i]
      if (!previous || deps.some((dep, index) => !Object.is(dep, previous.deps[index]))) {
        cells[i] = { deps, cleanup: previous?.cleanup }
        pending.push(() => { previous?.cleanup?.(); cells[i].cleanup = fn() })
      }
    },
  }
  const window = Object.assign(new EventTarget(), { location: { search: entrySearch },
    setInterval: (fn) => { const id = ++nextTimer; timers.set(id, fn); return id }, clearInterval: (id) => timers.delete(id) })
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible', createElement: () => ({ getContext: () => webglReady ? { getExtension: () => null } : null }) })
  const memory = { id: 'synthetic-memory', ownerId: 'synthetic-owner', demo: false, privacy: 'private', authorization: 'owner',
    title: 'Synthetic transport fixture', sourceMedia: video ? [{ kind: 'video', url: 'blob:synthetic-only' }] : [],
    star: { id: 'synthetic-star' }, narrator: { replay: 'Synthetic text' },
    replayManifest: { id: 'synthetic-manifest', version: 1, durationMs: 3000, segments: [] },
    visuals: { accent: '#70dcec', light: '#bff8ff', sky: '#02060d', ground: '#07121d' } }
  const quality = { documentVisible: true, reducedMotion: false }
  const recordedSource = () => null
  const canvasComponent = () => null
  const modules = {
    react: hooks, 'react/jsx-runtime': { jsx, jsxs }, three: THREE,
    '@react-three/fiber': { Canvas: canvasComponent, useFrame: (fn) => { frameCallback = fn } },
    '@/spatial/canon/cameraMotion': cameraMotion,
    '@/spatial/assets/uraiAssets': { replayAssets: { primary: { src: '/disclosed-synthetic-fixture.png' } } },
    '@/spatial/hooks/useReducedMotion': { useReducedMotion: () => reducedMotion },
    '@/spatial/memory/useSelectedMemory': { useSelectedMemory: () => ({ memory, status: 'ready' }) },
    '@/spatial/memory/useOwnedMemoryMediaPlayback': { useOwnedMemoryMediaPlayback: () => ({ status: 'ready', media: [] }) },
    '@/spatial/memory/useReplayMemoryVisibility': { useReplayMemoryVisibility: () => 'visible' },
    '@/spatial/life-model/useReplayLifeModelAuthority': { useReplayLifeModelAuthority: () => ({ available: false, status: 'unavailable' }) },
    '@/spatial/captured-reality/useCapturedRealityReplayEntry': { useCapturedRealityReplayLookup: () => ({ entry: null }) },
    '@/spatial/interpretive-world/useInterpretiveWorldReplayEntry': { useInterpretiveWorldReplayEntry: () => null },
    '@/spatial/memory-world/memoryWorldReplay': { memoryWorldReplayHref: () => null },
    '@/spatial/performance/useAdaptiveSpatialQuality': { useAdaptiveSpatialQuality: () => quality },
    '@/spatial/world/worldEvents': { URAI_WORLD_RETURN_EVENT: 'urai:world-return', URAI_WORLD_TRAVEL_EVENT: 'urai:world-travel',
      requestUraiWorldReturn: () => { returns++; window.dispatchEvent(new Event('urai:world-return')) }, requestUraiWorldTravel: () => window.dispatchEvent(new Event('urai:world-travel')) },
    '@/spatial/world/WorldStateProvider': { useUraiWorldState: () => ({ world: { destination: 'replay' }, phase }) },
    '@/lib/i18n/useUraiLocale': { useUraiLocale: () => ({ locale: 'en', text: (id) => id, props: () => ({}) }) },
    './ReplayProductControls': { ReplayProductControls: () => null },
    '@/spatial/adam/AdamLauncherSlot': { default: () => null }, '@/lib/i18n/JourneyOfflineNotice': { default: () => null },
    './ReplayPersonPresence': { ReplayPersonPresence: () => null }, './ReplayRecordedSource': { ReplayRecordedSource: recordedSource },
    './replayMediaSession': mediaSession, './replayVisualAdmission': admission, './replayMotion': replayMotion, './replayNarrativeClock': narrativeClock,
  }
  const module = { exports: {} }
  vm.runInNewContext(compiled, { exports: module.exports, module, require: (id) => { assert.ok(id in modules, id); return modules[id] },
    window, document, performance: { now: () => time }, URLSearchParams, Element: class {}, Event })
  const render = () => { cursor = 0; const tree = module.exports.ReplayMemoryExperience({ memory, memoryStatus: 'ready', quality }); while (pending.length) pending.shift()(); return tree }
  const find = (predicate) => {
    const visit = (node) => { if (Array.isArray(node)) { for (const child of node) { const found = visit(child); if (found) return found } }
      else if (node?.props) return predicate(node) ? node : visit(node.props.children)
      return null }
    return visit(render())
  }
  return { render, find, window, document, timers, recordedSource, canvasComponent, returns: () => returns,
    advance(ms) { time += ms; for (const tick of [...timers.values()]) tick() }, setPhase(next) { phase = next; render() },
    rig(props) { cursor = 0; module.exports.ReplayCameraRig({ onArrivalReady: () => {}, ...props }); return frameCallback },
    unmount() { for (const cell of cells) cell?.cleanup?.() },
  }
}

test('Departure stops the actual narrative clock immediately and prevents stale-control restart before render', () => {
  const f = fixture()
  f.render() // Resolve the initial WebGL check into the accessible static fallback.
  const play = f.find((node) => node.props.className === 'memoryPulse').props.onClick
  play(); f.advance(270)
  assert.equal(f.render().props['data-playing'], 'true')
  f.window.dispatchEvent(new Event('urai:world-travel'))
  assert.equal(f.timers.size, 0)
  play() // The previously rendered handler is still held during the event turn.
  assert.equal(f.timers.size, 0)
  assert.equal(f.render().props['data-playing'], 'false')
  f.setPhase('travelling'); f.setPhase('idle')
  assert.equal(f.render().props['data-playing'], 'false', 'cancellation must not autoplay')
  f.find((node) => node.props.className === 'memoryPulse').props.onClick()
  assert.equal(f.timers.size, 1)
  f.unmount(); assert.equal(f.timers.size, 0)
})

test('Recorded playback pauses on departure, hidden and already-consumed Escape without duplicate unwind', () => {
  const f = fixture({ video: true })
  const sourceNode = f.find((node) => node.type === f.recordedSource)
  let pauses = 0, plays = 0
  sourceNode.props.onVideoSession({ pause: () => { pauses++ }, play: async () => { plays++ } })
  sourceNode.props.onVideoSnapshot({ ...mediaSession.initialReplayVideoSnapshot(), status: 'ready', ready: true, durationMs: 3000 })
  f.find((node) => node.props.className === 'memoryPulse').props.onClick()
  assert.equal(plays, 1)
  f.window.dispatchEvent(new Event('urai:world-return'))
  assert.equal(pauses, 1)
  const escape = new Event('keydown', { cancelable: true }); Object.defineProperty(escape, 'key', { value: 'Escape' }); escape.preventDefault()
  f.window.dispatchEvent(escape)
  assert.equal(pauses, 2)
  assert.equal(f.returns(), 0)
  f.document.visibilityState = 'hidden'; f.document.dispatchEvent(new Event('visibilitychange'))
  assert.equal(pauses, 3)
  f.unmount()
})

test('The actual Replay camera settles at paused memory time while render-clock time advances', () => {
  const f = fixture()
  const camera = new THREE.PerspectiveCamera(50)
  camera.position.set(0, 0.28, 7.25)
  const canvas = { dataset: {} }
  const frame = f.rig({ timeMs: 700, durationMs: 3000, reducedMotion: false, entryFrame: null })
  for (let index = 0; index < 900; index++) frame({ camera, gl: { domElement: canvas }, clock: { elapsedTime: index / 60 } }, 1 / 60)
  const paused = camera.position.toArray()
  for (let index = 0; index < 120; index++) frame({ camera, gl: { domElement: canvas }, clock: { elapsedTime: 100 + index / 60 } }, 1 / 60)
  assert.deepEqual(camera.position.toArray(), paused)
  assert.equal(canvas.dataset.replayCameraSettled, 'true')
  assert.equal(canvas.dataset.replayCameraTimeMs, '700')
})

test('The actual Replay camera preserves the Focus view on the first admitted Canvas frame', () => {
  const f = fixture()
  const entryFrame = { position: [-3, 1.6, 8.2], target: [0, 0.45, -1.3], fov: 48 }
  const camera = new THREE.PerspectiveCamera(entryFrame.fov)
  camera.position.set(...entryFrame.position); camera.lookAt(...entryFrame.target)
  const before = [...camera.position.toArray(), ...camera.quaternion.toArray(), camera.fov]
  const frame = f.rig({ timeMs: 0, durationMs: 3000, reducedMotion: false, entryFrame })
  frame({ camera, gl: { domElement: { dataset: {} } } }, 1 / 60)
  assert.deepEqual([...camera.position.toArray(), ...camera.quaternion.toArray(), camera.fov], before)
})

test('Replay playback and seeking wait for measured incoming-camera arrival, then stay unlocked during playback motion', () => {
  const entrySearch = new URLSearchParams({ cameraCheckpoint: 'focus:synthetic-star', entryCamera: '-3,1.6,8.2', entryTarget: '0,0.45,-1.3', entryFov: '48' }).toString()
  const f = fixture({ webglReady: true, entrySearch })
  const play = () => f.find((node) => node.props.className === 'memoryPulse')
  assert.equal(play().props.disabled, true)
  play().props.onClick()
  f.find((node) => node.props.className === 'memorySeek').props.onChange({ currentTarget: { value: '2000' } })
  assert.equal(f.render().props['data-current-time-ms'], 0)
  assert.equal(f.timers.size, 0)
  assert.ok(f.find((node) => node.props.className === 'unwind'), 'return remains available during arrival')
  const scene = f.find((node) => node.type === f.canvasComponent).props.children
  const stableCallback = scene.props.onArrivalReady
  assert.equal(f.find((node) => node.type === f.canvasComponent).props.children.props.onArrivalReady, stableCallback)
  const camera = new THREE.PerspectiveCamera(scene.props.entryFrame.fov)
  camera.position.set(...scene.props.entryFrame.position); camera.lookAt(...scene.props.entryFrame.target)
  const rig = fixture()
  const canvas = { dataset: {} }
  let calls = 0
  const props = { timeMs: 0, durationMs: 3000, reducedMotion: false, entryFrame: scene.props.entryFrame,
    onArrivalReady: () => { calls++; stableCallback() } }
  let frame = rig.rig(props)
  frame({ camera, gl: { domElement: canvas } }, 1 / 60)
  assert.equal(calls, 0)
  assert.equal(play().props.disabled, true)
  for (let index = 0; index < 450; index++) frame({ camera, gl: { domElement: canvas } }, 1 / 60)
  assert.equal(calls, 1)
  assert.equal(f.render().props['data-replay-arrival-ready'], 'true')
  assert.equal(play().props.disabled, false)
  play().props.onClick(); f.advance(500)
  frame = rig.rig({ ...props, timeMs: 500 })
  for (let index = 0; index < 120; index++) frame({ camera, gl: { domElement: canvas } }, 1 / 60)
  assert.equal(calls, 1, 'playback-owned camera travel cannot re-announce or re-lock arrival')
  assert.equal(play().props.disabled, false)
  f.unmount()
})

test('Recorded-source controls wait for decoded source readiness and keep Pause reachable while buffering', () => {
  const f = fixture({ video: true, webglReady: true })
  const sourceNode = f.find((node) => node.type === f.recordedSource)
  let plays = 0, pauses = 0
  sourceNode.props.onVideoSession({ play: async () => { plays++ }, pause: () => { pauses++ } })
  sourceNode.props.onVideoSnapshot({ ...mediaSession.initialReplayVideoSnapshot(), status: 'ready', durationMs: 3000 })
  let button = f.find((node) => node.props.className === 'memoryPulse')
  assert.equal(button.props.disabled, true)
  button.props.onClick(); assert.equal(plays, 0)
  sourceNode.props.onVideoSnapshot({ ...mediaSession.initialReplayVideoSnapshot(), status: 'ready', ready: true, durationMs: 3000 })
  button = f.find((node) => node.props.className === 'memoryPulse')
  assert.equal(button.props.disabled, false)
  button.props.onClick(); assert.equal(plays, 1)
  sourceNode.props.onVideoSnapshot({ ...mediaSession.initialReplayVideoSnapshot(), status: 'buffering', ready: false, playing: true, durationMs: 3000 })
  button = f.find((node) => node.props.className === 'memoryPulse')
  assert.equal(button.props.disabled, false)
  const before = pauses; button.props.onClick(); assert.equal(pauses, before + 1)
  f.unmount()
})

test('Reduced-motion arrival releases from its measured static frame without a demand-render deadlock', () => {
  const f = fixture({ webglReady: true, reducedMotion: true })
  assert.equal(f.render().props['data-replay-arrival-ready'], 'false')
  const scene = f.find((node) => node.type === f.canvasComponent).props.children
  const camera = new THREE.PerspectiveCamera(50); camera.position.set(0, 0.28, 7.25)
  const rig = fixture()
  const frame = rig.rig({ timeMs: 0, durationMs: 3000, reducedMotion: true, entryFrame: null, onArrivalReady: scene.props.onArrivalReady })
  frame({ camera, gl: { domElement: { dataset: {} } } }, 0)
  assert.equal(f.render().props['data-replay-arrival-ready'], 'true')
  assert.equal(f.find((node) => node.props.className === 'memoryPulse').props.disabled, false)
  f.unmount()
})
