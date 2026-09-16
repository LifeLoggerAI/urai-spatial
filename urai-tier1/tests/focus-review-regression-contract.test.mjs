import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const worldEvents = fs.readFileSync(new URL('../src/spatial/world/worldEvents.ts', import.meta.url), 'utf8')
const semanticNavigator = fs.readFileSync(new URL('../src/components/lifemap/LifeMapSemanticNavigator.tsx', import.meta.url), 'utf8')
const telemetryBridge = fs.readFileSync(new URL('../src/app/HomeParallaxTelemetryBridge.tsx', import.meta.url), 'utf8')
const focus = fs.readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')

test('deep-travel fallback cannot preempt the canonical transition controller', () => {
  const fallback = worldEvents.match(/WORLD_TRAVEL_FALLBACK_MS\s*=\s*(\d+)/)
  assert.ok(fallback)
  assert.ok(Number(fallback[1]) > 1900)
})

test('overview mode clears semantic selection without discarding route identity', () => {
  assert.match(semanticNavigator, /const overviewRequested = params\.get\(['"]overview['"]\) === ['"]1['"]/)
  assert.match(semanticNavigator, /const selectedId = overviewRequested \? null : params\.get\(['"]node['"]\) \|\| params\.get\(['"]memoryId['"]\)/)
})

test('home telemetry synchronizes from mutations and input without perpetual document polling', () => {
  assert.match(telemetryBridge, /new MutationObserver\(scheduleSynchronization\)/)
  assert.doesNotMatch(telemetryBridge, /requestAnimationFrame\(synchronize\)/)
  assert.doesNotMatch(telemetryBridge, /const synchronize = \(\) =>/)
})

test('Focus focal authority is a grounded living-memory manifestation, not the rejected giant dark icosahedron', () => {
  assert.match(focus, /createFocusStrata, createFocusSurfaceMaps/)
  assert.match(focus, /focus-v251-grounded-living-memory-manifestation/)
  assert.match(focus, /v251-fractured-rooted-memory-strata/)
  assert.doesNotMatch(focus, /new THREE\.IcosahedronGeometry\(/)
  assert.doesNotMatch(focus, /new THREE\.SphereGeometry\(1, 72, 48\)/)
  assert.doesNotMatch(focus, /focus-v217-single-connected-memory-manifestation/)
})

test('Focus convergence preserves Replay activation, selected-memory semantics, reduced motion, and retired geometry pointer safety', () => {
  assert.match(focus, /if \(memory\) onActivate\(\)/)
  assert.match(focus, /aria-label=\{memory \? `Enter Replay for \$\{memory\.title\}`/)
  assert.doesNotMatch(focus, /Open Replay for/)
  assert.doesNotMatch(focus, /reducedMotion \? 1 : 1 \+ Math\.sin/)
  assert.match(focus, /object\.raycast = \(\) => undefined/)
  assert.match(focus, /requestUraiWorldTravel\(\{ destination: 'replay'/)
  assert.match(focus, /requestUraiWorldReturn\(\)/)
})
