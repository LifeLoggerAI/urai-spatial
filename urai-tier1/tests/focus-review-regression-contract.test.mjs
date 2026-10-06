import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const worldEvents = fs.readFileSync(new URL('../src/spatial/world/worldEvents.ts', import.meta.url), 'utf8')
const semanticNavigator = fs.readFileSync(new URL('../src/components/lifemap/LifeMapSemanticNavigator.tsx', import.meta.url), 'utf8')
const telemetryBridge = fs.readFileSync(new URL('../src/app/HomeParallaxTelemetryBridge.tsx', import.meta.url), 'utf8')
const focusClient = fs.readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
const lifeMapScene = fs.readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')

test('deep-travel fallback cannot preempt the canonical transition controller', () => {
  const fallback = worldEvents.match(/WORLD_TRAVEL_FALLBACK_MS\s*=\s*(\d+)/)
  assert.ok(fallback)
  assert.ok(Number(fallback[1]) > 1900)
})

test('overview mode clears semantic selection without discarding route identity', () => {
  assert.match(semanticNavigator, /const overviewRequested = params\.get\((?:'overview'|"overview")\) === ['"]1['"]/)
  assert.match(semanticNavigator, /const selectedId = overviewRequested \? null : params\.get\((?:'node'|"node")\) \|\| params\.get\((?:'memoryId'|"memoryId")\)/)
})

test('home telemetry synchronizes from mutations and input without perpetual document polling', () => {
  assert.match(telemetryBridge, /new MutationObserver\(scheduleSynchronization\)/)
  assert.doesNotMatch(telemetryBridge, /requestAnimationFrame\(synchronize\)/)
  assert.doesNotMatch(telemetryBridge, /const synchronize = \(\) =>/)
})

test('Focus keyboard readiness reflects installed input listeners and resets during teardown', () => {
  assert.match(focusClient, /data-focus-input-ready="false"/)
  assert.match(focusClient, /addEventListener\('keydown', down\)[\s\S]*dataset\.focusInputReady = 'true'/)
  assert.match(focusClient, /dataset\.focusInputReady = 'false'[\s\S]*removeEventListener\('keydown', down\)/)
  assert.match(focusClient, /@media\(forced-colors:active\)[\s\S]*outline:3px solid Highlight/)
})


test('selected Memory Star arrival framing is carried into Focus without a hard camera reset', () => {
  for (const token of ['entryCamera', 'entryTarget', 'entryFov', 'life-map-arrival:']) assert.ok(lifeMapScene.includes(token), `Life Map handoff missing ${token}`)
  assert.match(lifeMapScene, /dataset\.lifeMapCameraX/)
  assert.match(lifeMapScene, /dataset\.lifeMapTargetX/)
  assert.match(focusClient, /parseEntryCameraFrame/)
  assert.match(focusClient, /cameraCheckpoint.*startsWith\('life-map-arrival:'\)/)
  assert.match(focusClient, /entryBlendActive/)
  assert.match(focusClient, /THREE\.MathUtils\.damp\(camera\.position\.x, defaultCamera\.x/)
  assert.match(focusClient, /reducedMotion.*DEFAULT_CAMERA|useEntryFrame = recenterSignal === 0 && entryFrame && !reducedMotion/)
})

test('hard travel fallback preserves canonical replay identity and context', () => {
  for (const token of [
    'WORLD_TRAVEL_CONTEXT_KEYS',
    "'thread'",
    "'personId'",
    "'placeId'",
    "'movieId'",
    "'chapterId'",
    "target.searchParams.set('memoryId', nodeId)",
    "target.searchParams.set('node', memoryId)",
  ]) assert.ok(worldEvents.includes(token), `world fallback missing ${token}`)
  assert.match(worldEvents, /context\?\.demo\) target\.searchParams\.set\('demo', '1'\)/)
})
