import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { createHomeGpuSubmissionGate } from '../src/spatial/performance/homeGpuSubmissionGate.ts'
import { createHomeRenderCostMonitor, resolveHomeRenderQuality } from '../src/spatial/performance/homeRenderCostPolicy.ts'

const running = { ready: true, visible: true, continuous: true }
const high = { tier: 'high', pixelRatioMax: 1.75, particleCount: 520, shadows: true, postprocessing: true,
  antialias: true, preloadSecondaryWorlds: true, reducedMotion: false, documentVisible: true }
const warm = monitor => { monitor.observe(0, running); monitor.observe(1000, running); monitor.observe(1016, running) }

test('sustained visible render cost selects low limits once and preserves ordinary animation conditions', () => {
  const monitor = createHomeRenderCostMonitor()
  warm(monitor)
  for (let i = 1; i < 8; i++) assert.equal(monitor.observe(1016 + i * 80, running), false)
  assert.equal(monitor.observe(1016 + 8 * 80, running), true)
  assert.equal(monitor.observe(1016 + 9 * 80, running), false, 'fallback must not repeatedly set React state')
  const fallback = resolveHomeRenderQuality(high, true)
  assert.equal(fallback.tier, 'low')
  assert.equal(fallback.pixelRatioMax, 1)
  assert.equal(fallback.shadows, false)
  assert.equal(fallback.particleCount, 120)
  assert.equal(fallback.reducedMotion, false, 'render pressure must not impersonate an accessibility preference')
  assert.equal(fallback.documentVisible, true)
  assert.equal(fallback.antialias, true, 'existing context MSAA must not be falsely reported as disabled')
  assert.equal(resolveHomeRenderQuality(high, false), high)
  assert.equal(high.shadows, true, 'the shared adaptive profile must not be mutated')
})

test('healthy cadence and sporadic pauses do not downgrade normal rendering', () => {
  const monitor = createHomeRenderCostMonitor()
  warm(monitor)
  let now = 1016
  for (let batch = 0; batch < 4; batch++) {
    for (let i = 0; i < 7; i++) { now += 80; assert.equal(monitor.observe(now, running), false) }
    now += 16; assert.equal(monitor.observe(now, running), false)
  }
})

test('startup, hidden tabs and reduced-motion demand gaps cannot be counted as slow rendering', () => {
  for (const inactive of [{ ...running, ready: false }, { ...running, visible: false }, { ...running, continuous: false }]) {
    const monitor = createHomeRenderCostMonitor()
    for (let now = 0; now < 10000; now += 500) assert.equal(monitor.observe(now, inactive), false)
    for (let now = 10000; now < 11000; now += 80) assert.equal(monitor.observe(now, running), false, 'resume must receive startup grace')
  }
  const monitor = createHomeRenderCostMonitor()
  warm(monitor)
  for (let i = 1; i < 8; i++) assert.equal(monitor.observe(1016 + i * 80, running), false)
  monitor.reset() // Visibility changes reset even when frameloop=never produces no frame callback.
  assert.equal(monitor.observe(60000, running), false)
  assert.equal(monitor.observe(60016, running), false)
})

test('invalid or reset frame clocks restart sampling safely', () => {
  const monitor = createHomeRenderCostMonitor()
  warm(monitor)
  for (const value of [NaN, Infinity, -100]) assert.equal(monitor.observe(value, running), false)
  assert.equal(monitor.observe(0, running), false)
  assert.equal(monitor.observe(16, running), false)
})

test('actual Home render owner measures completed work while keeping normal callbacks and paused-state resets', () => {
  const source = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')
  const start = source.indexOf('function HomeRenderCostMonitor(')
  const end = source.indexOf('\nfunction SceneReady(', start)
  assert.ok(start >= 0 && end > start)
  let frame, cached, now = 0, downgrades = 0, renders = 0, invalidations = 0
  let complete = true, contextLost = false
  const owner = { dataset: {} }, listeners = new Map(), cleanups = []
  const context = { SYNC_GPU_COMMANDS_COMPLETE: 1, TIMEOUT_EXPIRED: 2, CONDITION_SATISFIED: 3,
    ALREADY_SIGNALED: 4, WAIT_FAILED: 5, SAMPLES: 6,
    isContextLost: () => contextLost, fenceSync: () => ({}), deleteSync: () => {}, flush: () => {},
    clientWaitSync: (_fence, flags, timeout) => { assert.equal(flags, 0); assert.equal(timeout, 0); return complete ? 3 : 2 },
    getContextAttributes: () => ({ antialias: true }), getParameter: value => { assert.equal(value, 6); return 4 } }
  const gl = { getContext: () => context, render: () => { renders++ }, domElement: {
    closest: () => owner, addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name) } }
  const sandbox = { createHomeRenderCostMonitor, createHomeGpuSubmissionGate,
    useThree: () => ({ gl, invalidate: () => { invalidations++ } }),
    useMemo: factory => cached ??= factory(), useEffect: effect => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup) },
    useFrame: (callback, priority) => { assert.equal(priority, 1, 'this component owns only the final main-scene render'); frame = callback },
    performance: { now: () => now }, document: { visibilityState: 'visible' } }
  const compiled = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(`${compiled}\nglobalThis.subscribe = HomeRenderCostMonitor`, sandbox)
  const props = { ready: true, continuous: true, visible: true, onSlowRendering: () => { downgrades++ } }
  const state = { scene: {}, camera: {} }
  sandbox.subscribe(props)
  for (now = 0; now <= 1760; now += 80) frame(state)
  assert.equal(downgrades, 1)
  assert.equal(owner.dataset.homeContextAntialias, 'true')
  assert.equal(owner.dataset.homeContextSamples, '4')
  assert.equal(Number(owner.dataset.homeRenderedFrames), renders)
  assert.equal(owner.dataset.homeReady, 'true')
  complete = false
  const before = renders, completionsBefore = owner.dataset.homeRenderCompletions
  for (let i = 0; i < 50; i++) { now += 16; owner.dataset.homeRenderedFrames = '1000'; frame(state) }
  assert.equal(renders, before, 'busy GPU must not accumulate duplicate render submissions')
  assert.equal(Number(owner.dataset.homeRenderedFrames), before, 'movement callbacks must not fabricate rendered frames')
  assert.equal(owner.dataset.homeRenderCompletions, completionsBefore, 'RAF callbacks are not completed GPU frames')
  assert.equal(invalidations, 0, 'ordinary always-loop is retained')
  sandbox.subscribe({ ...props, continuous: false }); frame(state)
  assert.equal(invalidations, 1, 'a pending requested demand frame must be retried')
  sandbox.subscribe({ ...props, visible: false }); frame(state)
  assert.equal(renders, before)
  contextLost = true; listeners.get('webglcontextlost')(); frame(state)
  assert.equal(owner.dataset.homeGpuSubmissionMode, 'context-lost')
  assert.equal(owner.dataset.homeReady, 'false')
  contextLost = false; listeners.get('webglcontextrestored')(); complete = true
  sandbox.subscribe(props); now = 60000; frame(state)
  assert.equal(renders, before + 1)
  assert.equal(owner.dataset.homeReady, 'false', 'restored context needs fresh real submissions')
  frame(state); frame(state)
  assert.equal(owner.dataset.homeReady, 'true')
  cleanups.at(-1)()
  assert.equal(listeners.size, 0)
  // Slow demand-mode startup must schedule its third real draw after the first
  // completed fence. Callback counts alone cannot establish canvas readiness.
  cached = undefined; invalidations = 0; complete = false
  sandbox.subscribe({ ...props, continuous: false }); frame(state)
  assert.equal(owner.dataset.homeRenderSubmissions, '1')
  assert.equal(owner.dataset.homeReady, 'false')
  assert.equal(invalidations, 1, 'startup schedules another real demand draw')
  for (let i = 0; i < 5; i++) frame(state)
  assert.equal(owner.dataset.homeRenderSubmissions, '1')
  complete = true; frame(state)
  assert.equal(owner.dataset.homeRenderSubmissions, '2')
  assert.equal(owner.dataset.homeReady, 'false')
  assert.equal(invalidations, 7, 'successful second draw must still schedule readiness draw')
  frame(state)
  assert.equal(owner.dataset.homeRenderSubmissions, '3')
  assert.equal(owner.dataset.homeReady, 'true')
  assert.equal(invalidations, 7, 'settled demand mode stops requesting idle frames')
  cleanups.at(-1)()
  assert.match(source, /frameloop=\{quality\.documentVisible \? \(reducedMotion \? 'demand' : 'always'\) : 'never'\}/)
  assert.match(source, /HomeRenderCostMonitor ready=\{sceneReady\} continuous=\{!reducedMotion\} visible=\{quality\.documentVisible\}/)
})
