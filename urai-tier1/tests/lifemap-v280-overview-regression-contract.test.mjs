import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const cosmic = fs.readFileSync(new URL('../src/components/lifemap/CosmicComposedLifeMapScene.tsx', import.meta.url), 'utf8')

function sliceBetween(source, start, end) {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from + start.length)
  assert.notEqual(from, -1, `missing start marker: ${start}`)
  assert.notEqual(to, -1, `missing end marker: ${end}`)
  return source.slice(from, to)
}

test('V280 overview owns data-derived celestial regions without wallpaper or graph geometry', () => {
  assert.match(cosmic, /data-life-map-overview-authority="v280-data-derived-personal-universe-regions"/)
  const overview = sliceBetween(cosmic, 'function OverviewRegions', 'function SelectedTravelWeather')
  assert.match(overview, /node\.eraId \|\| node\.clusterId \|\| node\.type/)
  assert.match(overview, /cosmicPoint\(node, index\)/)
  assert.match(overview, /slice\(0, 6\)/)
  assert.match(overview, /life-map-overview-personal-universe-regions/)
  assert.match(overview, /data-derived-personal-universe-geography/)
  assert.match(overview, /pointWallpaper: false, graphEdges: false/)
  assert.match(overview, /personal-universe-region/)
  assert.doesNotMatch(overview, /<points\b|pointsMaterial|StellarDepthField|<line\b|lineSegments|ChapterTerritories|memoryValley/)
})

test('V280 preserves V279 departure authority while V281 owns the overview hierarchy without active-state drift', () => {
  assert.match(cosmic, /data-life-map-art-revision="v279-departure-volumetric-bridge"/)
  assert.match(cosmic, /life-map-departure-selected-memory-volumetric-bridge/)
  assert.match(cosmic, /data-life-map-overview-polish="v281-literal-pixel-authored-geography"/)
  assert.match(cosmic, /const overviewWeather = phase === "overview" \? \.38 : \.20/)
  assert.match(cosmic, /const overviewBoost = overview \? 1\.48 : 1/)
  assert.match(cosmic, /const outer = \(active \? 1\.08 : related \? \.82 : \.74\) \* overviewBoost/)
  assert.match(cosmic, /const mid = \(active \? \.52 : related \? \.40 : \.36\) \* overviewBoost/)
  assert.match(cosmic, /const hot = \(active \? \.20 : related \? \.17 : \.16\) \* \(overview \? 1\.24 : 1\)/)
})
