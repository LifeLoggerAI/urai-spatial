import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const routeSource = readFileSync(new URL('../src/app/life-map/page.tsx', import.meta.url), 'utf8')
const canonicalSource = readFileSync(new URL('../src/spatial/lifemap/SpatialLifeMapCanonical.tsx', import.meta.url), 'utf8')
const boundarySource = readFileSync(new URL('../src/components/lifemap/LifeMapRouteBoundary.tsx', import.meta.url), 'utf8')
const sceneSource = readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const universeSource = readFileSync(new URL('../src/spatial/lifemap/lifeMapUniverseData.ts', import.meta.url), 'utf8')

test('Life Map route preserves the final canonical composed authority', () => {
  assert.ok(routeSource.includes('SpatialLifeMapCanonical'))
  assert.ok(!routeSource.includes('RealLifeMapGalaxy'))
  assert.ok(canonicalSource.includes('LifeMapRouteBoundary'))
  assert.ok(boundarySource.includes('ComposedLifeMapScene'))
})

test('private selected-memory state and truth boundaries remain inside the route owner', () => {
  assert.ok(sceneSource.includes('const [selectedId, setSelectedId]'))
  assert.ok(sceneSource.includes('const selected = useMemo'))
  assert.ok(!sceneSource.includes('Orb companion'))
  assert.ok(sceneSource.includes('data-home-companion-owned="false"'))
  assert.ok(sceneSource.includes('data-life-map-source={sourceMode}'))
  assert.ok(sceneSource.includes('Sample constellation · not your memories'))
  assert.ok(canonicalSource.includes('data-private-memory-mounted="false"'))
})

test('memory identity is deterministic and explicit-demo safe', () => {
  assert.ok(sceneSource.includes('safeToken(params.get("node") || params.get("memoryId"))'))
  assert.ok(sceneSource.includes('next.set("memoryId", node.id)'))
  assert.ok(sceneSource.includes('next.set("manifestId", manifestId)'))
  assert.ok(sceneSource.includes('next.set("node", node.id)'))
  assert.ok(sceneSource.includes('if (explicitDemoRequested) next.set("demo", "1")'))
  assert.ok(universeSource.includes("privacyLevel: 'private'"))
})

test('node selection stays in Life Map before explicit Focus or Replay actions', () => {
  assert.ok(sceneSource.includes('setSelectedId(node.id)'))
  assert.ok(sceneSource.includes('router.replace(`/life-map?${next.toString()}`'))
  assert.ok(sceneSource.includes('router.push(destinationHref("focus"))'))
  assert.ok(sceneSource.includes('router.push(destinationHref("replay"))'))
})

test('selected-memory travel and recenter remain user controlled', () => {
  assert.ok(sceneSource.includes('goalForNode'))
  assert.ok(sceneSource.includes('setPhase("departure")'))
  assert.ok(sceneSource.includes('setPhase("arrival")'))
  assert.ok(sceneSource.includes('setSelectedId(null)'))
  assert.ok(sceneSource.includes('Overview'))
  assert.ok(sceneSource.includes('if (selectedId) overview(); else router.push("/home")'))
})

test('mobile controls retain safe areas and 48px touch targets', () => {
  assert.match(sceneSource, /@media\(max-width:700px\)/)
  assert.match(sceneSource, /env\(safe-area-inset-bottom\)/)
  assert.match(sceneSource, /min-height:48px/)
  assert.match(sceneSource, /width:calc\(100vw - 32px\)/)
})
