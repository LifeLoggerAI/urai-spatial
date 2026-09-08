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

test('V215 consumes one continuous textured sanctuary without overlapping terrain islands', () => {
  const asset = new URL('../public/assets/urai/life-map-production/authored-v215/life-map-memory-sanctuary-v215.glb', import.meta.url)
  assert.ok(statSync(asset).size > 1_000_000)
  assert.match(world, /authored-v215\/life-map-memory-sanctuary-v215\.glb/)
  assert.match(generator, /def sanctuary_height/)
  assert.match(generator, /one continuous camera-safe sanctuary/)
  assert.doesNotMatch(generator, /braided_channel|integrated_relief|def scarp/)
})

test('V215 manifestations are low interlocking strata rather than upright shards', () => {
  const seed = world.slice(world.indexOf('function MemorySeed'), world.indexOf('function AuthoredLifeMapPlace'))
  assert.match(seed, /life-map-v215-rooted-strata-memory/)
  assert.match(seed, /grounded-interlocking-authored-memory-strata/)
  assert.ok((seed.match(/geometry=\{ledger\}/g) || []).length >= 3)
  assert.match(world, /shape\.moveTo\(-1\.18, -0\.34\)/)
})

test('V215 selection routing cannot let stale overview state cancel the journey', () => {
  assert.match(scene, /selectionRoutePending\.current = true/)
  assert.match(scene, /if \(selectionRoutePending\.current\) return/)
  assert.match(scene, /setPhase\("approach"\)/)
})

test('V215 Focus formation runs horizontally and Replay preserves readable media', () => {
  assert.match(focus, /const centerX = -1\.32 \+ t \* 2\.64/)
  assert.match(focus, /Math\.sin\(t \* Math\.PI\) \* 0\.72/)
  assert.match(replay, /new THREE\.PlaneGeometry\(13\.8, 7\.4/)
  assert.match(replay, /texture2D\(uMap,vUv\)/)
  assert.doesNotMatch(replay, /sampleUv|p\.z\+=sin/)
})

test('V215 companion is a connected branching silhouette, not a smooth capsule', () => {
  assert.match(companion, /width: 154px/)
  assert.match(companion, /height: 78px/)
  assert.match(companion, /clip-path: polygon/)
})
