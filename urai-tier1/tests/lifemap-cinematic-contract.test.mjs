import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read(relativePath) {
  const absolute = path.join(root, relativePath)
  assert.ok(fs.existsSync(absolute), `missing expected file: ${relativePath}`)
  return fs.readFileSync(absolute, 'utf8')
}

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

test('Life Map route uses the final canonical R3F private galaxy owner chain', () => {
  assert.match(route, /SpatialLifeMapCanonical/)
  assert.doesNotMatch(route, /RealLifeMapGalaxy|LifeMapAscentGate|TierOneExperience|CinematicLifeMapScene/)
  assert.match(canonical, /LifeMapRouteBoundary/)
  assert.match(canonical, /data-testid="urai-r3f-canonical-lifemap"/)
  assert.match(boundary, /AdaptiveLifeMapScene/)
  assert.match(scene, /data-testid="urai-true-3d-life-map"/)
  assert.match(scene, /Step inside the map\./)
})

test('memory stars select in place before Focus or Replay navigation', () => {
  includesAll(scene, [
    'selectedId, setSelectedId',
    'setSelectedId(node.id)',
    'setCameraIntent(cameraForNode(node))',
    'identityHref("focus", selectedNode)',
    'identityHref("replay", selectedNode)',
    'Enter Focus',
    'Replay',
    'Overview',
  ])
  assert.match(scene, /const identityHref = useCallback/)
  assert.match(scene, /next\.set\("memoryId", node\.id\)/)
  assert.match(scene, /next\.set\("manifestId", manifestId\)/)
  assert.match(scene, /next\.set\("node", node\.id\)/)
})

test('Life Map keeps camera, keyboard, motion, and safe route contracts', () => {
  includesAll(scene, [
    'onPointerMove',
    'onPointerDown',
    'onWheel',
    'event.key !== "Escape"',
    'profile.reducedMotion',
    'router.push("/home")',
    'router.push("/ground")',
  ])
  assert.match(scene, /THREE\.MathUtils\.clamp/)
  assert.match(scene, /window\.localStorage\.setItem/)
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
