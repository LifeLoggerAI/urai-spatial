import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const route = read('src/app/life-map/page.tsx')
const canonical = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')
const boundary = read('src/components/lifemap/LifeMapRouteBoundary.tsx')
const scene = read('src/components/lifemap/ComposedLifeMapScene.tsx')
const world = read('src/components/lifemap/LifeMapProductionWorld.tsx')
const navigator = read('src/components/lifemap/LifeMapSemanticNavigator.tsx')
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
  assert.match(boundary, /<ComposedLifeMapScene \/>/)
  assert.match(boundary, /<LifeMapSemanticNavigator \/>/)
  assert.equal((scene.match(/<Canvas\b/g) || []).length, 1)
  assert.match(navigator, /aria-label="Search and navigate Life Map"/)
  assert.match(navigator, /aria-expanded=\{open\}/)
  assert.match(navigator, /className="life-map-navigator" aria-label="Search and filter Life Map"/)
  assert.match(scene, /data-testid="urai-true-3d-life-map"/)
})

test('memory lenses select in place before Focus or Replay navigation', () => {
  includesAll(scene, [
    'selectedId, setSelectedId',
    'setSelectedId(node.id)',
    'function selectedStagePoint(node: LifeMapNode, portrait: boolean)',
    'goalForNode(selected, phase, portrait)',
    'destinationHref("focus")',
    'destinationHref("replay")',
    'Enter Focus',
    'Replay',
    'Overview',
  ])
  assert.match(scene, /const target = selectedStagePoint\(node, portrait\)/)
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

test('Life Map adapts expensive rendering for software GPUs without weakening proof ownership', () => {
  includesAll(scene, [
    'function isSoftwareWebGLRenderer',
    'swiftshader|llvmpipe|lavapipe|software',
    'softwareRenderer ? "low" as const',
    'frameloop={profile.documentVisible ? "always" : "never"}',
    'data-software-renderer={softwareRenderer ? "true" : "false"}',
    'function SoftwareRendererCadence',
    'setFrameloop("demand")',
    'window.setInterval(() =>',
    '}, 100)',
    'data-software-render-cadence={softwareRenderer ? "bounded-demand-10fps" : "continuous"}',
    '<SoftwareRendererCadence active={softwareRenderer} documentVisible={profile.documentVisible} />',
  ])
  includesAll(canonical, [
    'context?.getExtension("WEBGL_lose_context")?.loseContext()',
    'canvas.width = 1',
    'canvas.height = 1',
    'setAvailable(supported)',
  ])
  assert.equal((scene.match(/LifeMapRenderProofBridge/g) || []).length, 0)
  includesAll(world, [
    'invalidate: requestRender',
    'lastSampleFrame',
    'frames.current - lastSampleFrame.current < 30',
    'requestRender()',
  ])
  assert.equal((world.match(/function RenderProofRepublisher/g) || []).length, 1)
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