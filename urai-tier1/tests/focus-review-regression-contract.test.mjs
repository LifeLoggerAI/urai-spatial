import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const worldEvents = fs.readFileSync(new URL('../src/spatial/world/worldEvents.ts', import.meta.url), 'utf8')
const semanticNavigator = fs.readFileSync(new URL('../src/components/lifemap/LifeMapSemanticNavigator.tsx', import.meta.url), 'utf8')
const telemetryBridge = fs.readFileSync(new URL('../src/app/HomeParallaxTelemetryBridge.tsx', import.meta.url), 'utf8')

test('deep-travel fallback cannot preempt the canonical transition controller', () => {
  const fallback = worldEvents.match(/WORLD_TRAVEL_FALLBACK_MS\s*=\s*(\d+)/)
  assert.ok(fallback)
  assert.ok(Number(fallback[1]) > 1900)
})

test('overview mode clears semantic selection without discarding route identity', () => {
  assert.match(semanticNavigator, /const overviewRequested = params\.get\("overview"\) === "1"/)
  assert.match(semanticNavigator, /const selectedId = overviewRequested \? null : params\.get\("node"\) \|\| params\.get\("memoryId"\)/)
})

test('home telemetry synchronizes from mutations and input without perpetual document polling', () => {
  assert.match(telemetryBridge, /new MutationObserver\(scheduleSynchronization\)/)
  assert.doesNotMatch(telemetryBridge, /requestAnimationFrame\(synchronize\)/)
  assert.doesNotMatch(telemetryBridge, /const synchronize = \(\) =>/)
})
