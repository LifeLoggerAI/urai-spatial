import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const page = fs.readFileSync(new URL('../src/app/life-map/page.tsx', import.meta.url), 'utf8')
const canonical = fs.readFileSync(new URL('../src/spatial/lifemap/SpatialLifeMapCanonical.tsx', import.meta.url), 'utf8')
const boundary = fs.readFileSync(new URL('../src/components/lifemap/LifeMapRouteBoundary.tsx', import.meta.url), 'utf8')
const source = fs.readFileSync(new URL('../src/components/lifemap/AdaptiveLifeMapScene.tsx', import.meta.url), 'utf8')

test('LifeMap route uses the final canonical adaptive scene chain', () => {
  assert.match(page, /SpatialLifeMapCanonical/, 'Life Map route must render SpatialLifeMapCanonical.')
  assert.doesNotMatch(page, /RealLifeMapGalaxy|LifeMapScene/, 'Life Map route must not revert to retired direct owners.')
  assert.match(canonical, /LifeMapRouteBoundary/, 'Canonical owner must keep the route boundary.')
  assert.match(boundary, /AdaptiveLifeMapScene/, 'Route boundary must render the adaptive R3F scene.')
})

test('AdaptiveLifeMapScene preserves memory stars and selected-star camera pull', () => {
  assert.ok(source.includes('useLifeMapEvents()'), 'Life Map must load private or explicit sample-backed memory nodes.')
  assert.ok(source.includes('selectedId, setSelectedId'), 'Life Map must preserve selected star state.')
  assert.ok(source.includes('cameraForNode(node)'), 'Life Map must preserve selected-star camera pull.')
  assert.ok(source.includes('<MemoryStar'), 'Life Map must render interactive memory artifacts.')
  assert.ok(source.includes('setCameraIntent(cameraForNode(node))'), 'Selecting a memory must move the camera toward it.')
})

test('LifeMap stars route into Focus and Replay with selected memory identity', () => {
  assert.ok(source.includes('identityHref("focus", selectedNode)'), 'Life Map must expose Focus entry.')
  assert.ok(source.includes('identityHref("replay", selectedNode)'), 'Life Map must expose Replay entry.')
  assert.ok(source.includes('next.set("memoryId", node.id)'), 'Focus and Replay must carry selected memory identity.')
  assert.ok(source.includes('next.set("manifestId", manifestId)'), 'Focus and Replay must carry manifest identity.')
  assert.ok(source.includes('next.set("node", node.id)'), 'Focus and Replay must preserve node identity.')
  assert.ok(source.includes('router.replace(`/life-map?${next.toString()}`'), 'Selection must remain inside Life Map before explicit navigation.')
})

test('LifeMap visual language remains adaptive, mobile-safe, and more than colored spheres', () => {
  assert.ok(canonical.includes('lifeMapAssets.primary'), 'Life Map must use the registered primary asset stack.')
  assert.ok(canonical.includes('assetCssStack'), 'Life Map must render the canonical asset stack.')
  assert.ok(source.includes('<Canvas'), 'Life Map must keep the true R3F canvas.')
  assert.ok(source.includes('useAdaptiveSpatialQuality'), 'Life Map must adapt rendering quality and reduced motion.')
  assert.ok(source.includes('<LifeCore'), 'Life Map must render a dominant present-time life core.')
  assert.ok(source.includes('<EraRegions'), 'Life Map must render chapter or era regions.')
  assert.ok(source.includes('torusKnotGeometry'), 'Relationships must have a distinct spatial grammar.')
  assert.ok(source.includes('octahedronGeometry'), 'Rituals must have a distinct spatial grammar.')
  assert.ok(source.includes('dodecahedronGeometry'), 'Recovery must have a distinct spatial grammar.')
  assert.ok(source.includes('max-w-[calc(100vw-24px)]'), 'Life Map route navigation must remain viewport-safe.')
  assert.ok(source.includes('w-[min(540px,calc(100vw-34px))]'), 'Life Map selection controls must remain mobile-safe.')
})

test('LifeMap wheel input and WebGL lifecycle remain production-safe', () => {
  assert.ok(source.includes('addEventListener("wheel", onWheel, { passive: false })'), 'Wheel zoom must use an explicit non-passive native listener.')
  assert.doesNotMatch(source, /onWheel=\{onWheel\}/, 'React passive wheel ownership must not return.')
  assert.doesNotMatch(source, /<Canvas[\s\S]*?key=\{/, 'Adaptive quality must not recreate the Canvas through a React key.')
  assert.ok(source.includes('webglcontextlost'), 'Life Map must handle WebGL context loss.')
  assert.ok(source.includes('webglcontextrestored'), 'Life Map must handle WebGL context restoration.')
  assert.ok(source.includes('data-webgl-state={webglState}'), 'Life Map must expose recovery state for browser proof.')
  assert.ok(source.includes('Life Map protected mode'), 'Context loss must preserve an operable semantic experience.')
})

test('LifeMap never lets sample data impersonate private memory', () => {
  assert.ok(source.includes('data-life-map-source={usingSeedData ? "explicit-sample" : "private"}'))
  assert.ok(source.includes('Sample constellation · not your memories'))
  assert.ok(source.includes('explicit sample constellation'))
})
