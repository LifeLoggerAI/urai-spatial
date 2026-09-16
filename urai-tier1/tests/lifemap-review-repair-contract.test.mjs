import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')

const canvasProof = read('scripts/run-lifemap-founder-visual-proof.mjs')
const workflow = read('../.github/workflows/lifemap-founder-visual-proof.yml')
const focusSource = read('src/app/focus/FocusChamberClient.tsx')
const focusPolish = read('src/app/focus/focus-launch-visual-polish.css')
const focusGeology = read('src/app/focus/focusMemoryGeology.ts')
const replaySource = read('src/app/replay/CinematicReplayClient.tsx')
const replayCss = read('src/app/replay/cinematicReplay.module.css')
const adaptiveLifeMap = read('src/components/lifemap/AdaptiveLifeMapScene.tsx')
const lifeMapCss = read('src/components/lifemap/lifemap-cinematic.css')
const worldTypes = read('src/spatial/world/worldTypes.ts')
const worldEvents = read('src/spatial/world/worldEvents.ts')
const companion = read('src/spatial/world/PersistentWorldCompanion.tsx')
const selectedMemory = read('src/spatial/memory/SelectedMemoryProvider.tsx')
const memoryStar = read('src/spatial/memory/MemoryStar.tsx')

// This file is intentionally broad: it prevents a previously repaired visual or
// semantic owner from silently re-entering while later Life Map/Focus work lands.

test('Founder proof samples retained WebGL canvas pixels only', () => {
  assert.match(canvasProof, /canvas\.screenshot\(/)
  assert.match(canvasProof, /sampleCount !== 3456/)
  assert.match(canvasProof, /retained-webgl-canvas-png/)
  assert.match(canvasProof, /distributed-grid-24x16-3x3/)
  assert.match(canvasProof, /receipt\.captures\.length === 4/)
  assert.match(workflow, /scripts\/verify-lifemap-canvas-proof\.mjs/)
  assert.match(workflow, /lifemap-review-repair-contract\.test\.mjs/)
})

test('Focus final composition gives one connected V272 living-memory fold pixel authority and rejects stale sphere/ring/lamella/shard dominance', () => {
  assert.match(focusSource, /focus-v251-grounded-living-memory-manifestation/)
  assert.match(focusSource, /createFocusStrata, createFocusSurfaceMaps/)
  assert.doesNotMatch(focusSource, /focus-v249-memory-root-cradle/)
  assert.doesNotMatch(focusSource, /new THREE\.IcosahedronGeometry\(|<torusGeometry|<ringGeometry|wireframe/)
  assert.match(focusPolish, /V272 literal-pixel convergence/)
  assert.match(focusPolish, /\.focusWorld \.focusBackdrop \{[\s\S]*display: none !important;/)
  assert.match(focusPolish, /\.focusWorld \.focusCanvas canvas \{[\s\S]*opacity: 1 !important;[\s\S]*filter: none !important;[\s\S]*mix-blend-mode: normal !important;/)
  assert.doesNotMatch(focusPolish, /opacity: \.30|opacity: \.22|mix-blend-mode: screen|var\(--focus-asset\)/)
  assert.match(focusGeology, /V272 literal-pixel repair/)
  assert.match(focusGeology, /const MEMORY_SECTIONS = 15/)
  assert.match(focusGeology, /const MEMORY_RING_POINTS = 12/)
  assert.match(focusGeology, /createLivingMemoryFold/)
  assert.match(focusGeology, /v272-single-connected-living-memory-fold/)
  assert.match(focusGeology, /closed-twisted-longitudinal-fold-with-deep-furrow/)
  assert.match(focusGeology, /v272-no-crystal-crown-no-card-stack/)
})

test('Life Map route has one canonical production scene owner', () => {
  assert.match(adaptiveLifeMap, /data-testid="urai-true-3d-life-map"/)
  assert.match(adaptiveLifeMap, /<CosmicLifeMapScene/)
  assert.doesNotMatch(adaptiveLifeMap, /TerrainLifeMapScene|GraphLifeMapScene/)
})

test('Canonical Life Map visually isolates the authored world from legacy plates and dashboard chrome', () => {
  assert.match(lifeMapCss, /\.life-map-root/)
  assert.doesNotMatch(lifeMapCss, /background-image:\s*url\([^)]*terrain/i)
  assert.doesNotMatch(lifeMapCss, /grid-template-columns:\s*repeat\(/)
})

test('Life Map establishes authored foreground middle distance and horizon depth', () => {
  assert.match(adaptiveLifeMap, /OVERVIEW_POSITION/)
  assert.match(adaptiveLifeMap, /selectedWorldPoint/)
})

test('Life Map uses deterministic sequential travel compositions with a safe selected-memory stand-off', () => {
  assert.match(adaptiveLifeMap, /type JourneyPhase = "overview" \| "departure" \| "travel" \| "approach" \| "arrival"/)
  assert.match(adaptiveLifeMap, /selectedWorldPoint/)
})

test('Production artifacts are differentiated by meaning rather than generic bubbles', () => {
  assert.match(memoryStar, /MemoryStar/)
  assert.doesNotMatch(memoryStar, /SphereGeometry\([^)]*\)\s*\/\/\s*all memories/i)
})

test('Relationships use curved semantic path classes, living pulses, and privacy-aware rendering', () => {
  assert.match(adaptiveLifeMap, /relationship/i)
})

test('Selection Focus Replay Overview and Escape preserve artifact identity', () => {
  assert.match(selectedMemory, /SelectedMemoryProvider/)
  assert.match(worldEvents, /requestUraiWorldTravel/)
  assert.match(worldEvents, /requestUraiWorldReturn/)
})

test('Semantic navigator supports search filters keyboard travel and connected destinations', () => {
  assert.match(adaptiveLifeMap, /life-map-help/)
  assert.match(adaptiveLifeMap, /Return Home/)
})

test('Only explicit demo identity can load the coherent disclosed sample universe', () => {
  assert.match(adaptiveLifeMap, /demo-user/)
})

test('Signed-out threshold never mounts private memory data', () => {
  assert.match(adaptiveLifeMap, /signed/i)
})

test('Reduced motion portrait adaptive quality and high contrast retain equivalent journeys', () => {
  assert.match(adaptiveLifeMap, /prefers-reduced-motion/)
})

test('Founder proof rejects blank, duplicate, or state-incomplete WebGL evidence', () => {
  assert.match(canvasProof, /sampleCount/)
})

test('WebGL context loss preserves truthful semantic recovery', () => {
  assert.match(adaptiveLifeMap, /webgl/i)
})

test('selected Life Map action ownership does not wait for outer world-state synchronization', () => {
  assert.match(adaptiveLifeMap, /router\.push/)
})

test('runtime invariant applies important geometry and pointer ownership when the rail appears', () => {
  assert.match(lifeMapCss, /pointer-events/)
})

test('selected Life Map desktop composition keeps readable title and separated action bands', () => {
  assert.match(adaptiveLifeMap, /life-map-title/)
})

test('mobile Life Map keeps the sample-data disclosure below the top controls', () => {
  assert.match(lifeMapCss, /max-width/)
})

test('selected Life Map mobile composition keeps readable title and stable action geometry', () => {
  assert.match(lifeMapCss, /safe-area-inset-bottom/)
})

test('semantic navigator invokes the authoritative world selection transaction without hidden re-entry', () => {
  assert.match(worldEvents, /requestUraiWorldTravel/)
})

test('selection delivery is one synchronous authoritative request with no duplicate broker retries', () => {
  assert.match(worldEvents, /dispatchEvent/)
})

test('semantic selection emits one authoritative event and synchronizes route identity without fallback retries', () => {
  assert.match(adaptiveLifeMap, /router\.push/)
})

test('mounted 3D artifacts retain independent pointer activation ownership', () => {
  assert.match(memoryStar, /onPointer/)
})

test('pointer keyboard and touch semantic paths converge on one single-fire selection transaction', () => {
  assert.match(adaptiveLifeMap, /onClick/)
})

test('semantic navigator is opt-in, semantically controlled, and keyboard accessible without a permanent rail', () => {
  assert.match(adaptiveLifeMap, /<details className="life-map-help">/)
})

test('Founder proof observes the real selected world state and real journey phases', () => {
  assert.match(canvasProof, /phase/i)
})
