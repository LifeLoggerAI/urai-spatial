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
  assert.match(world, /V226 literal-pixel authority: a suspended living memory galaxy/)
  assert.doesNotMatch(world, /authored-v215\/life-map-memory-sanctuary-v215\.glb/)
})

test('V226 runtime keeps retired V215 strata out while the V227 pixel repair uses open braided memories', () => {
  assert.match(world, /function memoryHeartGeometry\(/)
  assert.match(world, /function memoryFilamentGeometry\(/)
  assert.match(world, /life-map-v227-open-braided-arrival-chamber/)
  assert.doesNotMatch(world, /function smoothMemoryGeometry\(/)
  assert.match(world, /<primitive object=\{hiddenAsset\} visible=\{false\} \/>/)
  assert.match(world, /life-map-smooth-memory-star-/)
  assert.doesNotMatch(world, /function MemorySeed\(|life-map-v215-rooted-strata-memory|function memoryLedgerGeometry\(/)
})

test('Life Map selection routing cannot let stale overview state cancel the journey', () => {
  assert.match(scene, /selectionRoutePending\.current = true/)
  assert.match(scene, /if \(selectionRoutePending\.current\) return/)
  assert.match(scene, /setPhase\("approach"\)/)
})

test('Focus formation runs horizontally and Replay preserves readable media', () => {
  assert.match(focus, /const centerX = -1\.32 \+ t \* 2\.64/)
  assert.match(focus, /Math\.sin\(t \* Math\.PI\) \* 0\.72/)
  assert.match(replay, /new THREE\.PlaneGeometry\(13\.8, 7\.4/)
  assert.match(replay, /texture2D\(uMap,vUv\)/)
  assert.doesNotMatch(replay, /sampleUv|p\.z\+=sin/)
})

test('the companion remains a connected branching silhouette, not a smooth capsule', () => {
  assert.match(companion, /width: 154px/)
  assert.match(companion, /height: 78px/)
  assert.match(companion, /clip-path: polygon/)
})
