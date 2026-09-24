import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const scene = fs.readFileSync(new URL('../src/components/lifemap/CosmicComposedLifeMapScene.tsx', import.meta.url), 'utf8')

test('overview uses deterministic memory identity to build true celestial volume', () => {
  assert.match(scene, /const COSMIC_LAYOUT_VERSION = 3/)
  assert.match(scene, /const COSMIC_SEED_VERSION = 1/)
  assert.match(scene, /hash\(`v\$\{COSMIC_LAYOUT_VERSION\}:s\$\{COSMIC_SEED_VERSION\}:\$\{node\.id\}:\$\{node\.eraId \|\| "era"\}:\$\{node\.clusterId \|\| node\.type\}`\)/)
  assert.match(scene, /const radius = 6\.6 \+ Math\.pow\(u, \.72\) \* 17\.5/)
  assert.match(scene, /const y = \(seeded\(seed, 11\.7\) - \.5\) \* \(5\.2 \+ radius \* \.17\)/)
  assert.match(scene, /const z = -17\.5 - Math\.pow\(seeded\(seed, 14\.9\), \.78\) \* 42/)
  assert.doesNotMatch(scene, /lifeMapTerrainHeight|memoryValley|weathered-valley-floor/)
})

test('overview and selected staging have explicit portrait-aware camera envelopes', () => {
  assert.match(scene, /const overview = new THREE\.Vector3\(0, portrait \? \.65 : 1\.55, portrait \? 18\.5 : 19\.5\)/)
  assert.match(scene, /targetOverview = new THREE\.Vector3\(0, portrait \? -\.45 : \.10, portrait \? -26 : -25\)/)
  assert.match(scene, /if \(!selected \|\| phase === "overview"\) return \{ position: overview\.toArray\(\) as Point3, target: targetOverview\.toArray\(\) as Point3, fov: portrait \? 42 : 44 \}/)
  assert.match(scene, /const distance = phase === "departure" \? 21 : phase === "travel" \? 16\.5 : phase === "approach" \? 11\.2 : portrait \? 8\.6 : 7\.2/)
  assert.match(scene, /fov: portrait \? phase === "arrival" \? 50 : 56 : phase === "arrival" \? 40 : 49/)
})

test('overview renders separate near mid and far stellar depth fields', () => {
  assert.match(scene, /depthSpan=\{30\} zOffset=\{-2\}/)
  assert.match(scene, /depthSpan=\{58\} zOffset=\{-24\}/)
  assert.match(scene, /depthSpan=\{88\} zOffset=\{-58\}/)
  assert.match(scene, /const nearCount = Math\.round\(starCount \* \.30\), midCount = Math\.round\(starCount \* \.40\)/)
  assert.match(scene, /<LivingGalaxyField tier=\{tier\} reducedMotion=\{reducedMotion\} selected=\{Boolean\(selected\)\} \/>/)
})

test('historical terrain grammar remains absent from current visual authority', () => {
  assert.match(scene, /data-life-map-ground="none"/)
  assert.match(scene, /graphEdges: false/)
  assert.match(scene, /retiredVisualRole: "v260-no-explicit-graph-edges"/)
  assert.doesNotMatch(scene, /chapterMasses|outcrops|livedCuts|authoredScars|lateralBanks|chapterShelves|ravines|valueNoise2D|distanceFromRoute|terraces/)
})

test('selected world point and rendered Memory Star share the same cosmic placement function', () => {
  assert.match(scene, /const point = useMemo\(\(\) => positionOverride \?\? cosmicPoint\(node, index\)/)
  assert.match(scene, /const target = new THREE\.Vector3\(\.\.\.cosmicPoint\(selected, selectedIndex\)\)/)
  assert.match(scene, /const selectedPoint = selected \? cosmicPoint\(selected, selectedIndex\) : null/)
})
