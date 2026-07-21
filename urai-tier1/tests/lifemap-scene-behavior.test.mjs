import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const page = fs.readFileSync(new URL('../src/app/life-map/page.tsx', import.meta.url), 'utf8')
const canonical = fs.readFileSync(new URL('../src/spatial/lifemap/SpatialLifeMapCanonical.tsx', import.meta.url), 'utf8')
const boundary = fs.readFileSync(new URL('../src/components/lifemap/LifeMapRouteBoundary.tsx', import.meta.url), 'utf8')
const source = fs.readFileSync(new URL('../src/components/lifemap/AdaptiveLifeMapScene.tsx', import.meta.url), 'utf8')
const navigator = fs.readFileSync(new URL('../src/components/lifemap/LifeMapSemanticNavigator.tsx', import.meta.url), 'utf8')
const events = fs.readFileSync(new URL('../src/components/lifemap/useLifeMapEvents.ts', import.meta.url), 'utf8')

test('Life Map route has one canonical scene owner', () => {
  assert.match(page, /SpatialLifeMapCanonical/)
  assert.match(canonical, /LifeMapRouteBoundary/)
  assert.match(boundary, /AdaptiveLifeMapScene/)
  assert.match(boundary, /LifeMapSemanticNavigator/)
  assert.equal((source.match(/<Canvas\b/g) || []).length, 1)
  assert.doesNotMatch(page, /RealLifeMapGalaxy|LifeMapScene/)
  assert.ok(source.includes('data-home-companion-owned="false"'))
  assert.ok(source.includes('data-spatial-visible="true"'))
})

test('Life Map establishes real near middle and far depth', () => {
  for (const marker of ['data-depth-band="near"', 'data-depth-band="middle"', 'data-depth-band="far"', 'fog attach="fog"', 'data-depth-anchor="true"']) assert.ok(source.includes(marker))
  assert.ok(source.includes('camera.position.x * 0.42'))
  assert.ok(source.includes('camera.position.x * 0.18'))
})

test('Life Map keeps deterministic bounded travel and selected-memory stand-off', () => {
  for (const phase of ['overview', 'departure', 'travel', 'approach', 'arrival']) assert.ok(source.includes(`"${phase}"`))
  assert.ok(source.includes('goalForNode'))
  assert.ok(source.includes('const SELECTED_MEMORY_STANDOFF = 5.6'))
  assert.ok(source.includes('direction.multiplyScalar(SELECTED_MEMORY_STANDOFF)'))
  assert.ok(source.includes('THREE.MathUtils.damp'))
  assert.ok(source.includes('data-life-map-phase={phase}'))
})

test('Life Map atmosphere and memory paths remain spatial', () => {
  const atmosphere = source.slice(source.indexOf('function createRadialTexture'), source.indexOf('function CameraRig'))
  assert.match(atmosphere, /createRadialGradient/)
  assert.match(atmosphere, /CanvasTexture/)
  assert.match(atmosphere, /life-map-soft-weather-veil/)
  assert.doesNotMatch(atmosphere, /planeGeometry|boxGeometry/)
  assert.ok(source.includes('function MemoryLens'))
  assert.ok(source.includes('position={node.position}'))
  assert.ok(source.includes('function MemoryPaths'))
  assert.ok(source.includes('points={[node.position, target.position]}'))
})

test('Selection Focus Replay Overview and Escape preserve identity', () => {
  for (const marker of ['next.set("memoryId", node.id)', 'next.set("node", node.id)', 'next.set("returnNode", selected.id)', 'router.push(destinationHref("focus"))', 'router.push(destinationHref("replay"))', 'if (selectedId) overview(); else router.push("/home")', 'next.set("overview", "1")']) assert.ok(source.includes(marker))
})

test('Semantic navigator supports current search filters keyboard travel and connected paths', () => {
  assert.match(navigator, /Search memories, people, dates, places, themes, and eras/)
  assert.match(navigator, /TYPE_FILTERS/)
  assert.match(navigator, /typeFilter === "all" \|\| node\.type === typeFilter/)
  assert.match(navigator, /eraFilter === "all" \|\| node\.eraId === eraFilter/)
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home']) assert.ok(navigator.includes(`event.key === "${key}"`))
  assert.match(navigator, /event\.key === "\/"/)
  assert.match(navigator, /router\.replace\(`\/life-map\?\$\{next\.toString\(\)\}`/)
  assert.match(navigator, /Focus, Replay, and Overview remain in the single spatial action rail/)
  assert.match(navigator, /Connected path/)
  assert.match(navigator, /data-visible-count=/)
  assert.match(navigator, /min-height:48px/)
  assert.match(navigator, /env\(safe-area-inset-bottom\)/)
})

test('Only explicit demo identity can load sample memories', () => {
  assert.ok(source.includes('const explicitDemoRequested = params.get("demo") === "1"'))
  assert.ok(source.includes('useLifeMapEvents(explicitDemoRequested ? "demo-user" : undefined)'))
  assert.match(navigator, /const explicitDemo = params\.get\("demo"\) === "1"/)
  assert.match(events, /return explicitUserId === "demo-user"/)
  assert.doesNotMatch(events, /NEXT_PUBLIC_URAI_EXPLICIT_DEMO|lifeMapDemoMode/)
})

test('Signed-out threshold never mounts private memory data', () => {
  assert.ok(canonical.includes('data-testid="urai-life-map-signed-out-threshold"'))
  assert.ok(canonical.includes('data-private-memory-mounted="false"'))
  assert.ok(canonical.includes('Signed out · no personal data displayed'))
  assert.ok(canonical.includes('Open disclosed sample'))
})

test('Reduced motion mobile and WebGL recovery remain truthful', () => {
  assert.ok(source.includes('if (profile.reducedMotion) setPhase("arrival")'))
  assert.match(source, /@media\(max-width:700px\)/)
  assert.match(source, /@media\(prefers-reduced-motion:reduce\)/)
  assert.match(navigator, /@media\(max-width:760px\)/)
  assert.ok(source.includes('webglcontextlost'))
  assert.ok(source.includes('webglcontextrestored'))
  assert.ok(source.includes('Your selected memory and privacy state remain preserved.'))
  assert.ok(canonical.includes('data-testid="urai-life-map-authored-fallback"'))
})
