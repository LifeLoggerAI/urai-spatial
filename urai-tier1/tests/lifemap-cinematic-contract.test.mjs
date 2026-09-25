import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const route = read('src/app/life-map/page.tsx')
const canonical = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')
const boundary = read('src/components/lifemap/LifeMapRouteBoundary.tsx')
const scene = read('src/components/lifemap/CosmicComposedLifeMapScene.tsx')
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
  assert.match(canonical, /useWebGLCapability/)
  assert.match(boundary, /import ComposedLifeMapScene from ['"]\.\/CosmicComposedLifeMapScene['"]/)
  assert.match(boundary, /<ComposedLifeMapScene \/>/)
  assert.match(boundary, /<LifeMapSemanticNavigator \/>/)
  assert.equal((scene.match(/<Canvas\b/g) || []).length, 1)
  assert.match(navigator, /aria-label="Search and navigate Life Map"/)
  assert.match(scene, /data-testid="urai-true-3d-life-map"/)
  assert.match(scene, /data-life-map-production-world="true"/)
})

test('Memory Stars select in place before Focus or Replay navigation', () => {
  includesAll(scene, [
    'selectedId, setSelectedId',
    'setSelectedId(node.id)',
    'cosmicPoint(selected)',
    'destinationHref("focus")',
    'destinationHref("replay")',
    'Enter Focus',
    'Replay',
    'Overview',
  ])
  assert.match(scene, /name=\{`life-map-memory-star-\$\{node\.id\}`\}/)
  assert.match(scene, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); onSelect\(node\); \}\}/)
  assert.match(scene, /const destinationHref = useCallback/)
  assert.match(scene, /next\.set\("memoryId", selected\.id\)/)
  assert.match(scene, /next\.set\("node", selected\.id\)/)
  assert.match(scene, /next\.set\("returnNode", selected\.id\)/)
  assert.match(scene, /next\.set\("artifactFamily", resolveArtifactFamily\(selected\)\)/)
})

test('Life Map keeps deterministic camera travel Escape recovery reduced motion and safe routes', () => {
  includesAll(scene, [
    'type Phase = "overview" | "departure" | "travel" | "approach" | "arrival"',
    'THREE.MathUtils.damp',
    'event.key !== "Escape"',
    'profile.reducedMotion',
    'const returnHome = useCallback',
    'router.push(explicitDemo ? "/home?demo=1" : "/home")',
    'webglcontextlost',
    'webglcontextrestored',
  ])
  assert.match(scene, /const PHASE_MS = \{ departure: 900, travel: 1500, approach: 2200 \}/)
  assert.match(scene, /setPhase\(profile\.reducedMotion \? "arrival" : "departure"\)/)
  assert.match(scene, /if \(profile\.reducedMotion\) \{ journey\.current \+= 1; setPhase\("arrival"\); return; \}/)
  assert.match(scene, /phase === "departure"\) setPhase\("travel"\)/)
  assert.match(scene, /phase === "travel"\) setPhase\("approach"\)/)
  assert.match(scene, /phase === "approach"\) setPhase\("arrival"\)/)
  assert.doesNotMatch(scene, /window\.localStorage\.setItem|requestPointerLock/)
})

test('Life Map adapts density and rendering without weakening proof ownership', () => {
  includesAll(scene, [
    'function isSoftwareRenderer',
    'swiftshader|llvmpipe|lavapipe|software',
    'useAdaptiveSpatialQuality()',
    'data-software-renderer={software === null ? "detecting" : software ? "true" : "false"}',
    'data-life-map-render-ready="false"',
    'data-life-map-visible-anchors="0"',
    'data-life-map-render-calls="0"',
    'data-life-map-render-triangles="0"',
  ])
  assert.match(scene, /const starCount = tier === "low" \? 650 : tier === "medium" \? 1100 : 1700/)
  assert.match(scene, /frameloop=\{profile\.documentVisible \? "always" : "never"\}/)
  assert.match(scene, /dpr=\{\[1, profile\.pixelRatioMax\]\}/)
  assert.match(scene, /const ready = gl\.info\.render\.calls > 0 && objects > 20 && anchors >= 8/)
})

test('Focus and Replay keep final static-export-safe cinematic owners', () => {
  assert.match(focusPage, /FinalFocusChamber/)
  assert.match(replayPage, /FinalReplayFilm/)
  assert.match(memorySurfaces, /selected-memory-camera-chamber/)
  assert.match(memorySurfaces, /cinematic-memory-camera-film/)
  assert.doesNotMatch(focusPage, /\[memoryId\]/)
  assert.doesNotMatch(replayPage, /\[memoryId\]/)
})
