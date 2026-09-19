import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const world = read('src/components/lifemap/LifeMapProductionWorld.tsx')
const scene = read('src/components/lifemap/ComposedLifeMapScene.tsx')
const focus = read('src/app/focus/FocusChamberClient.tsx')
const geology = read('src/app/focus/focusMemoryGeology.ts')
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

test('Focus resolves the selected Life Map star while Replay preserves readable organic-edged media', () => {
  assert.match(focus, /Locked product authority; V334 is the current literal-pixel implementation/)
  assert.match(focus, /data-focus-composition="selected-memory-star-with-contained-memory"/)
  assert.match(focus, /data-focus-spatial="selected-memory-star"/)
  assert.match(focus, /data-focus-terrain-owner="false"/)
  assert.match(focus, /name="focus-selected-memory-star"/)
  assert.match(focus, /name="focus-memory-star-glass-shell"/)
  assert.match(focus, /<MemoryVisualContent memory=\{memory\} \/>/)
  assert.match(focus, /memory\.sourceMedia\.find/)
  assert.doesNotMatch(focus, /FocusSanctuaryGround|FocusStoneBank|focusSelectedMemoryCavityDepth|createFocusGroundIncision/)
  assert.doesNotMatch(focus, /focus-v251-grounded-living-memory-manifestation|focus-v321-focal-readable-three-radial-pressure-cavity-bottoms/)
  assert.doesNotMatch(focus, /FOCUS_CHAMBER_MODEL/)
  assert.match(geology, /focusCurrentVisualAuthority = 'v321-focal-readable-three-radial-terrain-cavities-localized-bottoms-ground-blended-hairline-connector-buried-closed-body'/)
  assert.match(replay, /new THREE\.PlaneGeometry\(15\.2, 8\.6, 88, 48\)/)
  assert.match(replay, /positions\.setZ\(index, depth\)/)
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
