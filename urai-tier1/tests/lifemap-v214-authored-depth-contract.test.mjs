import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const world = read('src/components/lifemap/LifeMapProductionWorld.tsx')
const scene = read('src/components/lifemap/ComposedLifeMapScene.tsx')
const focus = read('src/app/focus/FocusChamberClient.tsx')
const replay = read('src/app/replay/CinematicReplayClient.tsx')
const companion = read('src/spatial/world/persistentWorldCompanion.css')
const generator = read('scripts/blender/generate-life-map-sanctuary-v214.py')

test('V214 consumes the regenerated textured sanctuary and exports authored depth', () => {
  const asset = new URL('../public/assets/urai/life-map-production/authored-v214/life-map-memory-sanctuary-v214.glb', import.meta.url)
  assert.ok(statSync(asset).size > 1_000_000)
  assert.match(world, /authored-v214\/life-map-memory-sanctuary-v214\.glb/)
  assert.match(generator, /life-map-v214-west-lineage-scarp/)
  assert.match(generator, /life-map-v214-deep-history-terrace/)
  assert.match(generator, /life-map-v214-narrow-worn-memory-trace/)
  assert.doesNotMatch(generator, /primitive_cube_add\([^\n]*hide_render=False/)
})

test('V214 manifestations are grounded interlocking strata rather than colored shards', () => {
  const seed = world.slice(world.indexOf('function MemorySeed'), world.indexOf('function AuthoredLifeMapPlace'))
  assert.match(seed, /grounded-interlocking-authored-memory-strata/)
  assert.match(seed, /color="#24473f"/)
  assert.ok((seed.match(/geometry=\{ledger\}/g) || []).length >= 3)
  assert.doesNotMatch(seed, /color=\{aura\} roughness/)
})

test('V214 portrait and pointer compositions materially traverse authored depth', () => {
  assert.match(world, /portrait \? \[1\.02, 1\.02, 1\.02\]/)
  assert.match(scene, /positionGoal\.current\.set\(0, 3\.0, 10\.2\)/)
  assert.match(scene, /pointer\.x \* \(portrait \? 1\.25 : 4\.2\)/)
})

test('V214 Focus has a continuous textured sanctuary and layered memory body', () => {
  assert.match(focus, /focus-v214-continuous-eroded-memory-ground/)
  assert.match(focus, /new THREE\.DataTexture/)
  assert.ok((focus.match(/geometry=\{seedGeometry\}/g) || []).length >= 3)
  assert.match(focus, /<Suspense fallback=\{null\}><AuthoredFocusChamber/)
})

test('V214 Replay samples real memory media and companion uses an elongated living silhouette', () => {
  assert.match(replay, /texture2D\(uMap,sampleUv\)/)
  assert.match(replay, /vUv\.x\*257\.0-vUv\.y\*193\.0/)
  assert.match(companion, /width: 142px/)
  assert.match(companion, /height: 72px/)
  assert.doesNotMatch(companion, /clip-path:\s*polygon/)
})
