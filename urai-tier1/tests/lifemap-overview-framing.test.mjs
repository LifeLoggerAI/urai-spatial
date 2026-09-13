import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const cosmic = fs.readFileSync(new URL('../src/components/lifemap/CosmicComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const boundary = fs.readFileSync(new URL('../src/components/lifemap/LifeMapRouteBoundary.tsx', import.meta.url), 'utf8')

test('canonical Life Map overview is framed as a cosmic personal universe rather than terrain', () => {
  assert.match(boundary, /CosmicComposedLifeMapScene/)
  assert.match(cosmic, /data-life-map-visual-authority="v257-cosmic-personal-universe"/)
  assert.match(cosmic, /data-life-map-ground="none"/)
  assert.match(cosmic, /life-map-deep-space/)
  assert.match(cosmic, /life-map-personal-galaxy/)
  assert.match(cosmic, /life-map-memory-stars/)
  assert.match(cosmic, /life-map-constellations/)
  assert.match(cosmic, /life-map-nebula-/)
  assert.match(cosmic, /life-map-nebula-veil-/)
  assert.doesNotMatch(cosmic, /Sparkles/)
  assert.doesNotMatch(cosmic, /LivingMemoryGeography|ChapterTerritories|lifeMapTerrainHeight|lifeMapSpatialLayout|weathered-valley-floor|worn-lineage-path/)
})

test('overview camera has independent portrait and desktop cosmic framing', () => {
  assert.match(cosmic, /const portrait = size\.height > size\.width/)
  assert.match(cosmic, /new THREE\.Vector3\(0,portrait \? 1\.5 : 3\.2,portrait \? 27\.5 : 24\)/)
  assert.match(cosmic, /fov: portrait \? 58 : 53/)
  assert.match(cosmic, /targetOverview = new THREE\.Vector3\(0,\.2,-14\)/)
  assert.match(cosmic, /pointer\.x\*1\.6/)
  assert.match(cosmic, /pointer\.y\*\.7/)
})

test('selected-memory travel remains spatial and celestial until Focus or Replay', () => {
  assert.match(cosmic, /phase === "departure" \? 20/)
  assert.match(cosmic, /phase === "travel" \? 16/)
  assert.match(cosmic, /phase === "approach" \? 13/)
  assert.match(cosmic, /portrait \? 12 : 10\.5/)
  assert.match(cosmic, /phase === "arrival" \? 47 : 51/)
  assert.match(cosmic, /Approaching the selected star/)
  assert.match(cosmic, /Selected memory in orbit/)
  assert.match(cosmic, /life-map-selected-memory-nebula/)
  assert.doesNotMatch(cosmic, /ArrivalSanctuary|IntimateMemoryChamber|memory chamber/)
})

test('portrait/mobile launch UI preserves the celestial viewport instead of recreating a terrain envelope', () => {
  assert.match(cosmic, /@media\(max-width:700px\)/)
  assert.match(cosmic, /\.life-map-thresholds\{bottom:max\(12px,env\(safe-area-inset-bottom\)\);grid-template-columns:1fr 1fr/)
  assert.match(cosmic, /\.life-map-status\{top:max\(15px,env\(safe-area-inset-top\)\);right:12px\}/)
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
})
