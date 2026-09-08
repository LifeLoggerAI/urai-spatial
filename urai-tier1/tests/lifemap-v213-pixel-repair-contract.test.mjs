import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const world = read('src/components/lifemap/LifeMapProductionWorld.tsx')
const scene = read('src/components/lifemap/ComposedLifeMapScene.tsx')
const focus = read('src/app/focus/FocusChamberClient.tsx')
const replay = read('src/app/replay/CinematicReplayClient.tsx')
const companion = read('src/spatial/world/persistentWorldCompanion.css')

test('V213 removes detached emissions and monolithic upright memory staging', () => {
  assert.match(world, /v213-no-detached-ground-strokes/)
  assert.match(world, /rotation=\{\[-0\.62 \+ seeded/)
  assert.doesNotMatch(world.slice(world.indexOf('function MemorySeed'), world.indexOf('function AuthoredLifeMapPlace')), /<Line/)
})

test('V213 keeps portrait content large and intentionally framed', () => {
  assert.match(world, /portrait \? \[0\.72, 1\.0, 0\.86\]/)
  assert.match(scene, /positionGoal\.current\.set\(0, 3\.6, 14\.0\)/)
  assert.match(scene, /phase === "overview" \? 50 : 54/)
})

test('V213 renders Focus before the authored GLB suspense boundary resolves', () => {
  assert.match(focus, /<Suspense fallback=\{null\}><AuthoredFocusChamber \/><\/Suspense>/)
  assert.doesNotMatch(focus, /<Suspense fallback=\{<div className="focusFallback"[^>]*>Opening spatial chamber/)
})

test('V213 Replay is a large opaque eroded material surface and companion is non-faceted', () => {
  assert.match(replay, /new THREE\.PlaneGeometry\(15\.8, 9\.2, 72, 36\)/)
  assert.match(replay, /gl_FragColor=vec4\(color\*mask,1\.0\)/)
  assert.doesNotMatch(replay, /transparent depthWrite=\{false\}/)
  assert.doesNotMatch(companion, /clip-path:\s*polygon/)
  assert.match(companion, /width: 112px/)
})
