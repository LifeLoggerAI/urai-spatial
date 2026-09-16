import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const boundary = fs.readFileSync(new URL('../src/components/lifemap/LifeMapRouteBoundary.tsx', import.meta.url), 'utf8')
const cosmic = fs.readFileSync(new URL('../src/components/lifemap/CosmicComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const stellarPolish = fs.readFileSync(new URL('../src/app/life-map/life-map-stellar-retained-pixel-polish.css', import.meta.url), 'utf8')

test('canonical Life Map route uses the deep-stellar personal-universe visual owner', () => {
  assert.match(boundary, /CosmicComposedLifeMapScene/)
  assert.match(cosmic, /data-life-map-visual-authority="v260-deep-stellar-personal-universe"/)
  assert.match(cosmic, /data-life-map-ground="none"/)
  assert.match(cosmic, /life-map-deep-space/)
  assert.match(cosmic, /life-map-deep-stellar-field/)
  assert.match(cosmic, /life-map-emotional-weather/)
  assert.match(cosmic, /life-map-nebula-veil-/)
  assert.match(cosmic, /life-map-constellations/)
  assert.match(cosmic, /retiredVisualRole: "v260-no-explicit-graph-edges"/)
  assert.match(cosmic, /life-map-memory-stars/)
  assert.match(cosmic, /life-map-selected-memory-dust/)
  assert.doesNotMatch(cosmic, /Sparkles/)
})

test('cosmic Life Map cannot silently regress to a terrestrial or graph overview owner', () => {
  assert.doesNotMatch(cosmic, /LivingMemoryGeography|memoryValley|ChapterTerritories|lifeMapTerrainHeight|weathered-valley-floor|worn-lineage-path/)
  assert.doesNotMatch(cosmic, /from "\.\/lifeMapSpatialLayout"/)
  assert.doesNotMatch(cosmic, /<line>|<lineSegments>|LineSegments|CatmullRomCurve3|TubeGeometry/)
})

test('retained route polish cannot synthesize repeated CSS star wallpaper over WebGL', () => {
  assert.match(stellarPolish, /V274 literal-pixel convergence/)
  assert.match(stellarPolish, /overview-depth-extension-v271/)
  assert.match(stellarPolish, /WebGL stellar volume is the only star owner/)
  assert.match(stellarPolish, /background-repeat:\s*no-repeat/)
  assert.doesNotMatch(stellarPolish, /background-size\s*:/)
  assert.doesNotMatch(stellarPolish, /61px 59px|101px 97px|149px 137px|47px 45px|79px 73px|119px 109px/)
  assert.doesNotMatch(stellarPolish, /radial-gradient\(circle at center,[^\n]*0 \.\d+px,[^\n]*transparent \d+\.\d+px\)/)
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
  assert.match(cosmic, /Memory selected/)
  assert.match(cosmic, /Approaching memory/)
  assert.match(cosmic, /life-map-selected-memory-dust/)
  assert.match(cosmic, /stellar-memory-not-node-graph/)
  assert.doesNotMatch(cosmic, /IntimateMemoryChamber|ArrivalSanctuary|memory chamber/)
})