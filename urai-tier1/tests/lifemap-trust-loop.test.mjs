import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const routeSource = readFileSync(new URL('../src/app/life-map/page.tsx', import.meta.url), 'utf8')
const canonicalSource = readFileSync(new URL('../src/spatial/lifemap/SpatialLifeMapCanonical.tsx', import.meta.url), 'utf8')
const boundarySource = readFileSync(new URL('../src/components/lifemap/LifeMapRouteBoundary.tsx', import.meta.url), 'utf8')
const sceneSource = readFileSync(new URL('../src/components/lifemap/AdaptiveLifeMapScene.tsx', import.meta.url), 'utf8')
const universeSource = readFileSync(new URL('../src/spatial/lifemap/lifeMapUniverseData.ts', import.meta.url), 'utf8')
const convergenceCss = readFileSync(new URL('../src/spatial/world/lifeMapConvergence.css', import.meta.url), 'utf8')

test('Life Map route preserves the final canonical adaptive authority', () => {
  assert.ok(routeSource.includes('SpatialLifeMapCanonical'))
  assert.ok(!routeSource.includes('RealLifeMapGalaxy'))
  assert.ok(!routeSource.includes('TierOneExperience'))
  assert.ok(canonicalSource.includes('LifeMapRouteBoundary'))
  assert.ok(boundarySource.includes('AdaptiveLifeMapScene'))
})

test('final galaxy keeps private selected-star state and truth boundaries inside the route owner', () => {
  assert.ok(sceneSource.includes('const [selectedId, setSelectedId]'))
  assert.ok(sceneSource.includes('const selectedNode = useMemo'))
  assert.ok(sceneSource.includes('The Life Map is open. Select a star'))
  assert.ok(!sceneSource.includes('Orb companion'))
  assert.ok(sceneSource.includes('data-home-companion-owned="false"'))
  assert.ok(sceneSource.includes('data-life-map-source={usingSeedData ? "explicit-sample" : "private"}'))
  assert.ok(sceneSource.includes('Sample constellation · not your memories'))
})

test('memory identity is deterministic and private-route safe', () => {
  assert.ok(sceneSource.includes('safeToken(params.get("node") || params.get("nodeId") || params.get("memoryId"))'))
  assert.ok(sceneSource.includes('next.set("memoryId", node.id)'))
  assert.ok(sceneSource.includes('next.set("manifestId", manifestId)'))
  assert.ok(sceneSource.includes('next.set("node", node.id)'))
  assert.ok(sceneSource.includes('next.set("from", "life-map-camera")'))
  assert.ok(universeSource.includes("privacyLevel: 'private'"))
})

test('node selection stays in place before explicit Focus or Replay actions', () => {
  assert.ok(sceneSource.includes('setSelectedId(node.id)'))
  assert.ok(sceneSource.includes('router.replace(`/life-map?${next.toString()}`'))
  assert.ok(sceneSource.includes('router.push(identityHref("focus", selectedNode))'))
  assert.ok(sceneSource.includes('router.push(identityHref("replay", selectedNode))'))
  assert.ok(sceneSource.includes('Enter Focus'))
  assert.ok(sceneSource.includes('Replay'))
})

test('selected-star camera pull and recenter remain user-controlled', () => {
  assert.ok(sceneSource.includes('setCameraIntent(cameraForNode(node))'))
  assert.ok(sceneSource.includes('setCameraIntent(OVERVIEW_CAMERA)'))
  assert.ok(sceneSource.includes('const onWheel = (event: WheelEvent) =>'))
  assert.ok(sceneSource.includes('addEventListener("wheel", onWheel, { passive: false })'))
  assert.ok(sceneSource.includes('const onPointerMove = useCallback'))
  assert.ok(sceneSource.includes('Overview'))
})

test('mobile Life Map controls retain safe-area containment and explicit stacking', () => {
  assert.match(convergenceCss, /\.life-map-accessibility-menu\s*\{[\s\S]*?z-index:\s*28;/)
  assert.match(convergenceCss, /top:\s*max\(14px, env\(safe-area-inset-top\)\)/)
  assert.match(convergenceCss, /right:\s*max\(14px, env\(safe-area-inset-right\)\)/)
  assert.match(convergenceCss, /\.life-map-memory-portals\s*\{[\s\S]*?max-width:\s*min\(320px, calc\(100vw - 32px\)\);/)
  assert.match(convergenceCss, /@media \(max-width: 760px\)/)
  assert.match(convergenceCss, /\.life-map-memory-portals button[\s\S]*?min-height:\s*42px;/)
  assert.match(convergenceCss, /env\(safe-area-inset-bottom\)/)
})
