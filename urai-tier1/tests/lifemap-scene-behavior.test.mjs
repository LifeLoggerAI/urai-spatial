import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const page = fs.readFileSync(new URL('../src/app/life-map/page.tsx', import.meta.url), 'utf8')
const canonical = fs.readFileSync(new URL('../src/spatial/lifemap/SpatialLifeMapCanonical.tsx', import.meta.url), 'utf8')
const boundary = fs.readFileSync(new URL('../src/components/lifemap/LifeMapRouteBoundary.tsx', import.meta.url), 'utf8')
const cosmic = fs.readFileSync(new URL('../src/components/lifemap/CosmicComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const demo = fs.readFileSync(new URL('../src/components/lifemap/canonicalLifeMapDemoNodes.ts', import.meta.url), 'utf8')
const navigator = fs.readFileSync(new URL('../src/components/lifemap/LifeMapSemanticNavigator.tsx', import.meta.url), 'utf8')
const events = fs.readFileSync(new URL('../src/components/lifemap/useLifeMapEvents.ts', import.meta.url), 'utf8')
const shell = fs.readFileSync(new URL('../src/spatial/world/UraiWorldShell.tsx', import.meta.url), 'utf8')
const isolation = fs.readFileSync(new URL('../src/spatial/world/lifeMapProductionIsolation.css', import.meta.url), 'utf8')
const proof = fs.readFileSync(new URL('../../scripts/capture-lifemap-founder-proof-fixed.mjs', import.meta.url), 'utf8')

test('Life Map route has one canonical production scene owner', () => {
  assert.match(page, /SpatialLifeMapCanonical/)
  assert.match(canonical, /LifeMapRouteBoundary/)
  assert.match(boundary, /import ComposedLifeMapScene from ['"]\.\/CosmicComposedLifeMapScene['"]/)
  assert.match(boundary, /<ComposedLifeMapScene \/>/)
  assert.match(boundary, /<LifeMapSemanticNavigator \/>/)
  assert.equal((cosmic.match(/<Canvas\b/g) || []).length, 1)
  assert.doesNotMatch(page, /RealLifeMapGalaxy|LifeMapScene/)
  assert.match(cosmic, /data-home-companion-owned="false"/)
  assert.match(cosmic, /data-spatial-visible="true"/)
  assert.match(cosmic, /data-life-map-production-world="true"/)
  assert.match(cosmic, /data-life-map-ground="none"/)
})

test('canonical Life Map visually isolates the authored galaxy from legacy plates and dashboard chrome', () => {
  assert.match(shell, /lifeMapProductionIsolation\.css/)
  assert.match(isolation, /urai-world-atmosphere/)
  assert.match(isolation, /urai-final-asset-spine-scene-layer/)
  assert.match(isolation, /data-testid='urai-true-3d-life-map'/)
  assert.match(isolation, /opacity: 1 !important/)
  assert.match(isolation, /life-map-search-trigger/)
  assert.match(isolation, /life-map-navigator/)
  assert.doesNotMatch(cosmic, /life-map-journey-rail|life-map-semantic-inspector|PersistentWorldCompanion/)
})

test('Life Map establishes near mid far depth and data-derived personal-universe regions', () => {
  assert.match(cosmic, /function StellarDepthField/)
  assert.match(cosmic, /depthSpan=\{30\} zOffset=\{-2\}/)
  assert.match(cosmic, /depthSpan=\{58\} zOffset=\{-24\}/)
  assert.match(cosmic, /depthSpan=\{88\} zOffset=\{-58\}/)
  assert.match(cosmic, /<LivingGalaxyField tier=\{tier\}/)
  assert.match(cosmic, /life-map-overview-personal-universe-regions/)
  assert.match(cosmic, /visualRole: "data-derived-personal-universe-geography"/)
  assert.match(cosmic, /function PortraitOverviewDepth/)
  assert.match(cosmic, /data-life-map-reference-depth="v294-z-separated-layered-galaxy-and-stellar-review"/)
  assert.doesNotMatch(cosmic, /memoryValley|weathered-valley-floor|worn-lineage-path|lifeMapTerrainHeight/)
})

test('Life Map uses deterministic sequential travel with selected-memory stand-off', () => {
  for (const phase of ['overview', 'departure', 'travel', 'approach', 'arrival']) assert.ok(cosmic.includes(`"${phase}"`))
  assert.match(cosmic, /const PHASE_MS = \{ departure: 900, travel: 1500, approach: 2200 \}/)
  assert.match(cosmic, /setPhase\("departure"\)/)
  assert.match(cosmic, /setPhase\("travel"\)/)
  assert.match(cosmic, /setPhase\("approach"\)/)
  assert.match(cosmic, /setPhase\("arrival"\)/)
  assert.match(cosmic, /const distance = phase === "departure" \? 21 : phase === "travel" \? 16\.5 : phase === "approach" \? 11\.2/)
  assert.match(cosmic, /THREE\.MathUtils\.damp\(camera\.fov/)
  assert.match(cosmic, /data-life-map-phase=\{phase\}/)
  assert.match(cosmic, /data-life-map-scale=\{selected \? phase === "arrival" \? "intimate" : "regional" : "cosmic"\}/)
})

test('visible memories are stellar rather than generic graph nodes or geological artifacts', () => {
  assert.match(cosmic, /function MemoryStar/)
  assert.match(cosmic, /visualAuthority: "stellar-memory-not-node-graph"/)
  assert.match(cosmic, /stellarMorphology: "point-photosphere-layered-corona-no-visible-sphere"/)
  assert.match(cosmic, /life-map-memory-stars/)
  assert.match(cosmic, /life-map-selected-memory-dust/)
  assert.match(cosmic, /function Constellations\(\) \{ return <group name="life-map-constellations" visible=\{false\}/)
  assert.doesNotMatch(cosmic, /function MemoryLens|life-map-anchored-paths|weathered-memory-outcrop|grounded-semantic-outcrops/)
})

test('Selection Focus Replay Overview and Escape preserve exact memory identity', () => {
  assert.match(cosmic, /next\.set\("memoryId", node\.id\)/)
  assert.match(cosmic, /next\.set\("node", node\.id\)/)
  assert.match(cosmic, /next\.set\("returnNode", selected\.id\)/)
  assert.match(cosmic, /next\.set\("artifactFamily", resolveArtifactFamily\(selected\)\)/)
  assert.match(cosmic, /router\.push\(destinationHref\("focus"\)\)/)
  assert.match(cosmic, /router\.push\(destinationHref\("replay"\)\)/)
  assert.match(cosmic, /if \(selectedId\) overview\(\); else router\.push\("\/home"\)/)
  assert.match(cosmic, /next\.set\("overview", "1"\)/)
  assert.match(cosmic, /aria-label="Selected memory actions"/)
})

test('Semantic navigator supports search filters keyboard travel and connected destinations', () => {
  assert.match(navigator, /Search memories, people, dates, places, themes, and eras/)
  assert.match(navigator, /TYPE_FILTERS/)
  assert.match(navigator, /event\.key === 'ArrowRight'|event\.key === "ArrowRight"/)
  assert.match(navigator, /event\.key === 'ArrowLeft'|event\.key === "ArrowLeft"/)
  assert.match(navigator, /event\.key === 'Home'|event\.key === "Home"/)
  assert.match(navigator, /event\.key === '\/'|event\.key === "\/"/)
  assert.match(navigator, /requestLifeMapSelection\(node\.id, source\)/)
  assert.match(navigator, /data-visible-count=/)
  assert.match(navigator, /min-height:48px/)
  assert.match(navigator, /env\(safe-area-inset-bottom\)/)
})

test('Only explicit demo identity can load the coherent disclosed sample universe', () => {
  assert.match(cosmic, /useLifeMapEvents\(explicitDemo \? "demo-user" : undefined\)/)
  assert.match(cosmic, /if \(explicitDemo\) next\.set\("demo", "1"\)/)
  assert.match(navigator, /const explicitDemo = params\.get\('demo'\) === '1'|const explicitDemo = params\.get\("demo"\) === "1"/)
  assert.match(events, /function explicitDemoEnabled\(explicitUserId\?: string\) \{\s*return explicitUserId === "demo-user";/)
  assert.doesNotMatch(events, /NEXT_PUBLIC_URAI_EXPLICIT_DEMO/)
  for (const id of ['voice-note-home', 'home-place-fragment', 'relationship-repair-orbit', 'recurring-pressure-loop', 'earned-ground-monument', 'active-goal-structure', 'future-bridge', 'sealed-private-chapter']) {
    assert.ok(demo.includes(`id: "${id}"`), `missing coherent demo node ${id}`)
  }
})

test('Signed-out threshold never mounts private memory data', () => {
  assert.match(canonical, /data-testid="urai-life-map-signed-out-threshold"/)
  assert.match(canonical, /data-private-memory-mounted="false"/)
  assert.match(canonical, /Signed out · no personal data displayed/)
  assert.match(canonical, /Open disclosed sample/)
  assert.match(canonical, /current\.get\("demo"\) === "1"/)
})

test('Reduced motion portrait adaptive quality and high contrast retain equivalent journeys', () => {
  assert.match(cosmic, /profile\.reducedMotion/)
  assert.match(cosmic, /const portrait = size\.height > size\.width/)
  assert.match(cosmic, /@media\(max-width:700px\)/)
  assert.match(cosmic, /@media\(prefers-reduced-motion:reduce\)/)
  assert.match(cosmic, /@media\(forced-colors:active\)/)
  assert.match(navigator, /@media\(max-width:760px\)/)
  assert.match(navigator, /@media\(prefers-reduced-motion:reduce\)/)
})

test('Founder proof rejects blank duplicate or state-incomplete WebGL evidence using the mounted scene', () => {
  assert.match(proof, /waitForRenderedWorld/)
  assert.match(proof, /data-life-map-visible-anchors/)
  assert.match(proof, /parallax proof produced duplicate captures/)
  assert.match(proof, /WebGL pixel variance is below the visible-world minimum/)
  assert.match(proof, /selectQuietResetAtFrozenPhase/)
  assert.match(proof, /phaseLocked: targetPhase/)
  assert.match(proof, /Emulation\.setVirtualTimePolicy/)
  assert.match(proof, /requestfailed/)
  assert.match(proof, /pageerror/)
})

test('WebGL context loss preserves truthful semantic recovery', () => {
  assert.match(cosmic, /webglcontextlost/)
  assert.match(cosmic, /webglcontextrestored/)
  assert.match(cosmic, /data-webgl-state=\{webglState\}/)
  assert.match(cosmic, /Your selected memory, privacy state, and return position remain preserved\./)
  assert.match(cosmic, /Open semantic overview/)
  assert.match(canonical, /data-testid="urai-life-map-authored-fallback"/)
})
