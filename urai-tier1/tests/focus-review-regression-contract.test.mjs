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

test('hard travel fallback preserves same-memory replay identity but excludes stale cross-memory and neutral context', () => {
  for (const token of [
    'WORLD_TRAVEL_CONTEXT_KEYS',
    "'memoryId'",
    "'node'",
    "'thread'",
    "'personId'",
    "'placeId'",
    "'movieId'",
    "'chapterId'",
    "const selectedMemoryId = context?.memoryId ?? target.searchParams.get('memoryId')",
    "const sameMemory = Boolean(selectedMemoryId && currentMemoryId && selectedMemoryId === currentMemoryId)",
    "if (memoryDestination && context?.memoryId) target.searchParams.set('memoryId', context.memoryId)",
    "if (memoryDestination && context?.replayManifestId && selectedMemoryId) target.searchParams.set('manifestId', context.replayManifestId)",
  ]) assert.ok(worldEvents.includes(token), `world fallback missing ${token}`)

  assert.match(worldEvents, /if \(\(key === 'node' \|\| key === 'manifestId'[\s\S]*?\(!memoryDestination \|\| !sameMemory\)\) continue/)
  assert.match(worldEvents, /if \(\(key === 'thread'[\s\S]*?\(neutralDestination \|\| \(selectedMemoryId && !sameMemory\)\)\) continue/)
  assert.match(worldEvents, /if \(!memoryDestination\) \{[\s\S]*?target\.searchParams\.delete\('memoryId'\)[\s\S]*?target\.searchParams\.delete\('node'\)/)
  assert.match(worldEvents, /if \(neutralDestination\) \{[\s\S]*?target\.searchParams\.delete\('thread'\)/)
  // Preserve portal/camera context for scoped world travel, but never expose
  // a private arrival checkpoint on neutral Home or Infrastructure Hub URLs.
  // world-neutral-route-privacy.test.mjs also executes all three route builders
  // and verifies that explicit private/visual selectors are stripped.
  const contextIndex = worldEvents.indexOf("if (memoryDestination && context?.demo && (!selectedMemoryId || !currentMemoryId || sameMemory)) target.searchParams.set('demo', '1')")
  const entryPortalIndex = worldEvents.indexOf("if (!neutralDestination && request.entryPortal) target.searchParams.set('entryPortal', request.entryPortal)")
  const cameraCheckpointIndex = worldEvents.indexOf("if (!neutralDestination && request.cameraCheckpoint) target.searchParams.set('cameraCheckpoint', request.cameraCheckpoint)")
  assert.ok(contextIndex > -1 && entryPortalIndex > contextIndex && cameraCheckpointIndex > entryPortalIndex)
  assert.match(worldEvents, /for \(const key of \['entryPortal', 'cameraCheckpoint', 'returnNode'\]\) target\.searchParams\.delete\(key\)/)
  assert.match(worldEvents, /if \(neutralDestination\) \{\s*const language = new URLSearchParams\(\)/)
  assert.doesNotMatch(worldEvents, /if \(request\.entryPortal\) target\.searchParams\.set\('entryPortal', request\.entryPortal\)/)
  assert.doesNotMatch(worldEvents, /if \(request\.cameraCheckpoint\) target\.searchParams\.set\('cameraCheckpoint', request\.cameraCheckpoint\)/)
})
