import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const cosmic = fs.readFileSync(new URL('../src/components/lifemap/CosmicComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const boundary = fs.readFileSync(new URL('../src/components/lifemap/LifeMapRouteBoundary.tsx', import.meta.url), 'utf8')

test('canonical Life Map overview is framed as a deep stellar personal universe rather than terrain or graph grammar', () => {
  assert.match(boundary, /CosmicComposedLifeMapScene/)
  assert.match(cosmic, /data-life-map-visual-authority="v260-deep-stellar-personal-universe"/)
  assert.match(cosmic, /data-life-map-art-revision="v272-authored-overview-occupancy"/)
  assert.match(cosmic, /data-life-map-ground="none"/)
  assert.match(cosmic, /life-map-deep-space/)
  assert.match(cosmic, /life-map-deep-stellar-field/)
  assert.match(cosmic, /life-map-memory-stars/)
  assert.match(cosmic, /life-map-constellations/)
  assert.match(cosmic, /life-map-nebula-veil-/)
  assert.match(cosmic, /v260-no-explicit-graph-edges/)
  assert.match(cosmic, /stellar-memory-not-node-graph/)
  assert.match(cosmic, /spriteMaterial/)
  assert.doesNotMatch(cosmic, /Sparkles/)
  assert.doesNotMatch(cosmic, /LivingMemoryGeography|ChapterTerritories|lifeMapTerrainHeight|lifeMapSpatialLayout|weathered-valley-floor|worn-lineage-path/)
  assert.doesNotMatch(cosmic, /<Line\b|lineSegments|dodecahedronGeometry|icosahedronGeometry/)
  assert.doesNotMatch(cosmic, /scale=\{active \? 10\.8|scale=\{active \? 5\.4/)
})

test('overview camera is tighter and independent from selected-memory travel origin', () => {
  assert.match(cosmic, /const portrait = size\.height > size\.width/)
  assert.match(cosmic, /const overview = new THREE\.Vector3\(0, portrait \? \.9 : 2\.2, portrait \? 21\.5 : 22\.5\)/)
  assert.match(cosmic, /const targetOverview = new THREE\.Vector3\(0, portrait \? -\.35 : \.15, portrait \? -21 : -19\)/)
  assert.match(cosmic, /fov: portrait \? 44 : 47/)
  assert.match(cosmic, /const travelOrigin = new THREE\.Vector3\(0, portrait \? 1\.2 : 2\.7, portrait \? 29 : 25\.5\)/)
  assert.match(cosmic, /dir = travelOrigin\.clone\(\)\.sub\(target\)\.normalize\(\)/)
  assert.match(cosmic, /pointer\.x \* 1\.1/)
  assert.match(cosmic, /pointer\.y \* \.45/)
})

test('overview memory destinations remain stellar but have readable hierarchy', () => {
  assert.match(cosmic, /const outer = active \? 1\.08 : related \? \.76 : \.62/)
  assert.match(cosmic, /const mid = active \? \.52 : related \? \.37 : \.31/)
  assert.match(cosmic, /const hot = active \? \.20 : related \? \.16 : \.145/)
  assert.match(cosmic, /active \? \.20 : related \? \.18 : \.13/)
  assert.match(cosmic, /active \? \.50 : related \? \.42 : \.34/)
  assert.match(cosmic, /active \? \.94 : related \? \.90 : \.88/)
  assert.match(cosmic, /fog attach="fog" args=\{\["#020611", 78, 170\]\}/)
})

test('selected-memory travel remains spatial and celestial until Focus or Replay', () => {
  assert.match(cosmic, /phase === "departure" \? 21/)
  assert.match(cosmic, /phase === "travel" \? 16\.5/)
  assert.match(cosmic, /phase === "approach" \? 12\.5/)
  assert.match(cosmic, /portrait \? 10\.5 : 8\.8/)
  assert.match(cosmic, /phase === "arrival" \? 44 : 49/)
  assert.match(cosmic, /Approaching memory/)
  assert.match(cosmic, /Memory selected/)
  assert.match(cosmic, /life-map-selected-memory-dust/)
  assert.doesNotMatch(cosmic, /ArrivalSanctuary|IntimateMemoryChamber|memory chamber/)
})

test('portrait/mobile launch UI preserves the celestial viewport instead of recreating a terrain envelope', () => {
  assert.match(cosmic, /@media\(max-width:700px\)/)
  assert.match(cosmic, /\.life-map-thresholds\{bottom:max\(10px,env\(safe-area-inset-bottom\)\)!important/)
  assert.match(cosmic, /\.life-map-status\{top:max\(12px,env\(safe-area-inset-top\)\);right:12px\}/)
  assert.match(cosmic, /\.life-map-status small\{display:none\}/)
  assert.match(cosmic, /height:100svh/)
})

test('framing keeps reduced-motion, exact-head render proof, and semantic thresholds fail closed', () => {
  assert.match(cosmic, /prefers-reduced-motion:reduce/)
  assert.match(cosmic, /data-life-map-render-ready="false"/)
  assert.match(cosmic, /data-life-map-visible-anchors="0"/)
  assert.match(cosmic, /lifeMapRenderReady/)
  assert.match(cosmic, /lifeMapVisibleAnchors/)
  assert.match(cosmic, /gl\.info\.render\.calls > 0 && objects > 20 && anchors >= 8/)
  assert.match(cosmic, /className="life-map-thresholds"/)
  assert.match(cosmic, />Enter Focus</)
  assert.match(cosmic, />Replay</)
  assert.match(cosmic, /flex-direction:row!important/)
})
