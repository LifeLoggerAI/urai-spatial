import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const scene = read('src/components/lifemap/CosmicComposedLifeMapScene.tsx')
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
  assert.match(scene, /data-life-map-production-world="true"/)
  assert.match(scene, /data-life-map-ground="none"/)
  assert.doesNotMatch(scene, /authored-v215\/life-map-memory-sanctuary-v215\.glb|continuous-eroded-memory-sanctuary/)
})

test('current runtime keeps retired V215 strata out while Memory Stars use stellar authority', () => {
  assert.match(scene, /function MemoryStar\(/)
  assert.match(scene, /visualAuthority: "stellar-memory-not-node-graph"/)
  assert.match(scene, /stellarMorphology: "point-photosphere-layered-corona-no-visible-sphere"/)
  assert.match(scene, /const photosphere = useMemo\(\(\) => makeDiscTexture\(5\.4, true\), \[\]\)/)
  assert.doesNotMatch(scene, /life-map-weathered-memory-outcrop-|function MemorySeed\(|life-map-v215-rooted-strata-memory|function memoryLedgerGeometry\(/)
})

test('Life Map selection routing reaches every real journey phase without stale overview ownership', () => {
  assert.match(scene, /journey\.current \+= 1; setSelectedId\(node\.id\); setPhase\(profile\.reducedMotion \? "arrival" : "departure"\)/)
  assert.match(scene, /if \(phase === "departure"\) setPhase\("travel"\)/)
  assert.match(scene, /else if \(phase === "travel"\) setPhase\("approach"\)/)
  assert.match(scene, /else if \(phase === "approach"\) setPhase\("arrival"\)/)
  assert.match(scene, /if \(overviewRequested \|\| !queryNode \|\| !nodes\.length\) return/)
})

test('Focus resolves the selected Life Map star while Replay preserves readable organic-edged media', () => {
  assert.match(focus, /Locked product authority; V395 is the current literal-pixel implementation/)
  assert.match(focus, /data-focus-composition="selected-memory-star-with-contained-memory"/)
  assert.match(focus, /data-focus-visual-revision="v395-stellar-photosphere-visible-contained-memory-no-orb"/)
  assert.match(focus, /data-focus-spatial="selected-memory-star"/)
  assert.match(focus, /data-focus-terrain-owner="false"/)
  assert.match(focus, /name="focus-selected-memory-star"/)
  assert.match(focus, /<MemoryVisualContent memory=\{memory\} \/>/)
  assert.match(focus, /memory\.sourceMedia\.find/)
  assert.doesNotMatch(focus, /FocusSanctuaryGround|FocusStoneBank|focusSelectedMemoryCavityDepth|createFocusGroundIncision|FOCUS_CHAMBER_MODEL/)
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
