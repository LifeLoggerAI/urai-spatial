import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
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

test('actual Home frame subscriber invokes fallback from measured cost and resets when its renderer pauses', () => {
  const source = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')
  const start = source.indexOf('function HomeRenderCostMonitor(')
  const end = source.indexOf('\nfunction SceneReady(', start)
  assert.ok(start >= 0 && end > start, 'ordinary Home needs an actual render-cost subscriber')
  let frame, cached, now = 0, downgrades = 0
  const sandbox = { createHomeRenderCostMonitor,
    useMemo: factory => cached ??= factory(), useEffect: effect => effect(), useFrame: callback => { frame = callback },
    performance: { now: () => now }, document: { visibilityState: 'visible' } }
  const compiled = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(`${compiled}\nglobalThis.subscribe = HomeRenderCostMonitor`, sandbox)
  const props = { ready: true, continuous: true, visible: true, onSlowRendering: () => { downgrades++ } }
  sandbox.subscribe(props)
  for (now = 0; now <= 1600; now += 80) frame()
  assert.equal(downgrades, 1)
  for (now = 1680; now < 2400; now += 80) frame()
  assert.equal(downgrades, 1)
  // Another mount verifies a paused renderer does not retain a pre-hide streak.
  cached = undefined; downgrades = 0; now = 0; sandbox.subscribe(props); frame()
  now = 1000; frame(); now = 1016; frame()
  for (let i = 1; i < 8; i++) { now = 1016 + i * 80; frame() }
  sandbox.subscribe({ ...props, visible: false })
  sandbox.subscribe(props)
  now = 60000; frame(); now = 60016; frame()
  assert.equal(downgrades, 0)
  assert.match(source, /frameloop=\{quality\.documentVisible \? \(reducedMotion \? 'demand' : 'always'\) : 'never'\}/)
  assert.match(source, /HomeRenderCostMonitor ready=\{sceneReady\} continuous=\{!reducedMotion\} visible=\{quality\.documentVisible\}/)
})
