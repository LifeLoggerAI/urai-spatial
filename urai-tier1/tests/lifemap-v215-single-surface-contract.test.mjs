import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const world = read('src/components/lifemap/LifeMapProductionWorld.tsx')
const scene = read('src/components/lifemap/ComposedLifeMapScene.tsx')
const focus = read('src/app/focus/FocusChamberClient.tsx')
const replay = read('src/app/replay/CinematicReplayClient.tsx')
const companion = read('src/spatial/world/persistentWorldCompanion.css')
const generator = read('scripts/blender/generate-life-map-sanctuary-v215.py')

test('historical V215 single-surface source remains reproducible but is not runtime-mounted', () => {
  const asset = new URL('../public/assets/urai/life-map-production/authored-v215/life-map-memory-sanctuary-v215.glb', import.meta.url)
  assert.ok(statSync(asset).size > 1_000_000)
  assert.match(generator, /def sanctuary_height/)
  assert.match(generator, /one continuous camera-safe sanctuary/)
  assert.doesNotMatch(generator, /braided_channel|integrated_relief|def scarp/)
  assert.match(world, /V237 literal-pixel authority: a continuous illuminated memory valley/)
  assert.doesNotMatch(world, /authored-v215\/life-map-memory-sanctuary-v215\.glb/)
})

test('V237 runtime keeps retired V215 strata out while grounded outcrops inhabit continuous geography', () => {
  assert.match(world, /function memoryHeartGeometry\(/)
  assert.match(world, /function memoryFilamentGeometry\(/)
  assert.match(world, /life-map-v229-open-branching-memory-grove/)
  assert.doesNotMatch(world, /function smoothMemoryGeometry\(/)
  assert.match(world, /<primitive object=\{hiddenAsset\} visible=\{false\} \/>/)
  assert.match(world, /life-map-weathered-memory-outcrop-/)
  assert.match(world, /life-map-v237-continuous-illuminated-memory-geography/)
  assert.match(world, /life-map-v237-root-system-/)
  assert.doesNotMatch(world, /function MemorySeed\(|life-map-v215-rooted-strata-memory|function memoryLedgerGeometry\(/)
})

test('Life Map selection routing cannot let stale overview state cancel the journey', () => {
  assert.match(scene, /selectionRoutePending\.current = true/)
  assert.match(scene, /if \(selectionRoutePending\.current\) return/)
  assert.match(scene, /setPhase\("approach"\)/)
})

test('Focus formation is rooted in its vault and Replay preserves readable organic-edged media', () => {
  assert.match(focus, /const centerX = -1\.32 \+ t \* 2\.64/)
  assert.match(focus, /const centerY = -0\.66 \+ Math\.sin\(t \* Math\.PI\) \* 0\.72/)
  assert.match(focus, /focus-v216-memory-root-cradle/)
  assert.match(focus, /focus-v216-continuous-weathered-vault/)
  assert.match(replay, /new THREE\.PlaneGeometry\(13\.8, 7\.4/)
  assert.match(replay, /texture2D\(uMap,vUv\)/)
  assert.match(replay, /function replayMemoryWallGeometry\(\)/)
  assert.match(replay, /replay-v216-embedded-memory-cove/)
  assert.doesNotMatch(replay, /sampleUv|p\.z\+=sin/)
})

test('the companion has an authored memory glyph and an unclipped accessible control', () => {
  assert.match(companion, /width: 64px/)
  assert.match(companion, /height: 64px/)
  assert.doesNotMatch(companion, /clip-path/)
  assert.match(companion, /outline: 3px/)
  const markup = read('src/spatial/world/PersistentWorldCompanion.tsx')
  assert.match(markup, /<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">/)
  assert.match(markup, /strokeLinecap="round"/)
})
