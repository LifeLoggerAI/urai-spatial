import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const boundary = fs.readFileSync(new URL('../src/components/lifemap/LifeMapRouteBoundary.tsx', import.meta.url), 'utf8')
const cosmic = fs.readFileSync(new URL('../src/components/lifemap/CosmicComposedLifeMapScene.tsx', import.meta.url), 'utf8')

test('canonical Life Map route uses the cosmic personal-universe visual owner', () => {
  assert.match(boundary, /CosmicComposedLifeMapScene/)
  assert.match(cosmic, /data-life-map-visual-authority="v257-cosmic-personal-universe"/)
  assert.match(cosmic, /data-life-map-ground="none"/)
  assert.match(cosmic, /life-map-personal-galaxy/)
  assert.match(cosmic, /life-map-deep-space/)
  assert.match(cosmic, /life-map-nebula-/)
  assert.match(cosmic, /life-map-constellations/)
  assert.match(cosmic, /life-map-memory-stars/)
  assert.match(cosmic, /life-map-selected-memory-nebula/)
  assert.match(cosmic, /life-map-nebula-veil-/)
  assert.doesNotMatch(cosmic, /Sparkles/)
})

test('cosmic Life Map cannot silently regress to a terrestrial overview owner', () => {
  assert.doesNotMatch(cosmic, /LivingMemoryGeography|memoryValley|ChapterTerritories|lifeMapTerrainHeight|weathered-valley-floor|worn-lineage-path/)
  assert.doesNotMatch(cosmic, /from "\.\/lifeMapSpatialLayout"/)
})

test('cosmic visual-owner replacement preserves exact-head proof and route semantics', () => {
  assert.match(cosmic, /useLifeMapEvents/)
  assert.match(cosmic, /LIFE_MAP_SELECTION_EVENT/)
  assert.match(cosmic, /readLifeMapSelection/)
  assert.match(cosmic, /data-testid="urai-true-3d-life-map"/)
  assert.match(cosmic, /data-life-map-render-ready="false"/)
  assert.match(cosmic, /data-life-map-visible-anchors="0"/)
  assert.match(cosmic, /lifeMapRenderCalls/)
  assert.match(cosmic, /lifeMapRenderTriangles/)
  assert.match(cosmic, /className="life-map-thresholds"/)
  assert.match(cosmic, />Enter Focus</)
  assert.match(cosmic, />Replay</)
  assert.match(cosmic, /artifactFamily/)
  assert.match(cosmic, /prefers-reduced-motion:reduce/)
  assert.match(cosmic, /forced-colors:active/)
})

test('memory selection stays celestial until Focus or Replay is entered', () => {
  assert.match(cosmic, /Selected memory in orbit/)
  assert.match(cosmic, /Approaching the selected star/)
  assert.match(cosmic, /life-map-selected-memory-nebula/)
  assert.doesNotMatch(cosmic, /IntimateMemoryChamber|ArrivalSanctuary|memory chamber/)
})
