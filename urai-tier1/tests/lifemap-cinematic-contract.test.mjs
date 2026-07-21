import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const route = read('src/app/life-map/page.tsx')
const canonical = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')
const boundary = read('src/components/lifemap/LifeMapRouteBoundary.tsx')
const scene = read('src/components/lifemap/AdaptiveLifeMapScene.tsx')
const focusPage = read('src/app/focus/page.tsx')
const replayPage = read('src/app/replay/page.tsx')
const memorySurfaces = read('src/app/FinalMemorySurfaces.tsx')

function includesAll(source, terms) {
  for (const term of terms) assert.ok(source.includes(term), `missing contract term: ${term}`)
}

test('Life Map route uses one canonical R3F private-universe owner chain', () => {
  assert.match(route, /SpatialLifeMapCanonical/)
  assert.doesNotMatch(route, /RealLifeMapGalaxy|LifeMapAscentGate|TierOneExperience|CinematicLifeMapScene/)
  assert.match(canonical, /data-testid="urai-r3f-canonical-lifemap"/)
  assert.match(canonical, /data-selected-memory-owner="spatial-lens-only"/)
  assert.match(canonical, /useWebGLCapability/)
  assert.match(boundary, /return <AdaptiveLifeMapScene \/>/)
  assert.match(scene, /data-testid="urai-true-3d-life-map"/)
})

test('memory lenses select in place before Focus or Replay navigation', () => {
  includesAll(scene, [
    'selectedId, setSelectedId',
    'setSelectedId(node.id)',
    'goalForNode(selected)',
    'destinationHref("focus")',
    'destinationHref("replay")',
    'Enter Focus',
    'Replay',
    'Overview',
  ])
  assert.match(scene, /const destinationHref = useCallback/)
  assert.match(scene, /next\.set\("memoryId", selected\.id\)/)
  assert.match(scene, /next\.set\("manifestId", manifestId\)/)
  assert.match(scene, /next\.set\("node", selected\.id\)/)
  assert.match(scene, /next\.set\("returnNode", selected\.id\)/)
})

test('Life Map keeps deterministic camera travel, Escape recovery, reduced motion, and safe routes', () => {
  includesAll(scene, [
    'type JourneyPhase = "overview" | "departure" | "travel" | "approach" | "arrival"',
    'THREE.MathUtils.damp',
    'event.key !== "Escape"',
    'profile.reducedMotion',
    'router.push("/home")',
    'webglcontextlost',
    'webglcontextrestored',
  ])
  assert.match(scene, /setPhase\("departure"\)/)
  assert.match(scene, /setPhase\("travel"\)/)
  assert.match(scene, /setPhase\("approach"\)/)
  assert.match(scene, /setPhase\("arrival"\)/)
  assert.doesNotMatch(scene, /window\.localStorage\.setItem|requestPointerLock/)
})

test('Focus and Replay use final static-export-safe cinematic owners', () => {
  assert.match(focusPage, /FinalFocusChamber/)
  assert.match(replayPage, /FinalReplayFilm/)
  assert.match(memorySurfaces, /selected-memory-camera-chamber/)
  assert.match(memorySurfaces, /cinematic-memory-camera-film/)
  assert.match(memorySurfaces, /Camera into Replay/)
  assert.match(memorySurfaces, /Film beats/)
  assert.doesNotMatch(focusPage, /\[memoryId\]/)
  assert.doesNotMatch(replayPage, /\[memoryId\]/)
})
