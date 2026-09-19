import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const worldEvents = fs.readFileSync(new URL('../src/spatial/world/worldEvents.ts', import.meta.url), 'utf8')
const semanticNavigator = fs.readFileSync(new URL('../src/components/lifemap/LifeMapSemanticNavigator.tsx', import.meta.url), 'utf8')
const telemetryBridge = fs.readFileSync(new URL('../src/app/HomeParallaxTelemetryBridge.tsx', import.meta.url), 'utf8')
const focus = fs.readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
const geology = fs.readFileSync(new URL('../src/app/focus/focusMemoryGeology.ts', import.meta.url), 'utf8')

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

test('Focus focal authority is the selected memory star and cannot regress to V321 terrain cavities', () => {
  assert.match(focus, /Locked product authority; V330 is the current literal-pixel implementation/)
  assert.match(focus, /data-focus-composition="selected-memory-star-with-contained-memory"/)
  assert.match(focus, /data-focus-spatial="selected-memory-star"/)
  assert.match(focus, /data-focus-terrain-owner="false"/)
  assert.match(focus, /name="focus-selected-memory-star"/)
  assert.match(focus, /name="focus-memory-star-glass-shell"/)
  assert.match(focus, /<MemoryVisualContent memory=\{memory\} \/>/)
  assert.match(focus, /memory\.sourceMedia\.find/)
  assert.match(focus, /Generated demo visualization/)
  assert.doesNotMatch(focus, /createFocusStrata|createFocusGroundIncision|FocusSanctuaryGround|FocusStoneBank/)
  assert.doesNotMatch(focus, /focus-v321-focal-readable-three-radial-pressure-cavity-bottoms|focus-v251-grounded-living-memory-manifestation/)
  assert.match(geology, /v321-focal-readable-three-radial-terrain-cavities-localized-bottoms-ground-blended-hairline-connector-buried-closed-body/)
})

test('Focus convergence preserves Replay activation, selected-memory semantics, reduced motion, and star interaction safety', () => {
  assert.match(focus, /if \(!memory \|\| !replayHref \|\| committed\) return/)
  assert.match(focus, /'Enter Replay for ' \+ memory\.title/)
  assert.doesNotMatch(focus, /Open Replay for/)
  assert.match(focus, /reducedMotion/)
  assert.match(focus, /requestUraiWorldTravel\(\{/)
  assert.match(focus, /destination: 'replay'/)
  assert.match(focus, /requestUraiWorldReturn\(\)/)
  assert.match(focus, /terrainOwner: false/)
})
