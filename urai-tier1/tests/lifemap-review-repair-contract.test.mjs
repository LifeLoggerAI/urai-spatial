import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const scene = fs.readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const overlay = fs.readFileSync(new URL('../src/components/lifemap/LifeMapGoldMasterOverlay.tsx', import.meta.url), 'utf8')
const legacyOverlay = fs.readFileSync(new URL('../src/components/lifemap/LifeMapGoldMasterOverlayV249.tsx', import.meta.url), 'utf8')
const lifeMapSource = `${overlay}\n${legacyOverlay}`
const canvasProof = fs.readFileSync(new URL('../../scripts/verify-lifemap-canvas-proof.mjs', import.meta.url), 'utf8')
const workflow = fs.readFileSync(new URL('../../.github/workflows/lifemap-founder-visual-proof.yml', import.meta.url), 'utf8')
const layoutSource = fs.readFileSync(new URL('../src/components/lifemap/lifeMapSpatialLayout.ts', import.meta.url), 'utf8')
const authoredLayoutSource = fs.readFileSync(new URL('../src/components/lifemap/lifeMapLayout.ts', import.meta.url), 'utf8')
const focusSource = fs.readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
const focusPolish = fs.readFileSync(new URL('../src/app/focus/focus-launch-visual-polish.css', import.meta.url), 'utf8')
const focusGeology = fs.readFileSync(new URL('../src/app/focus/focusMemoryGeology.ts', import.meta.url), 'utf8')

test('selected camera goals use the same indexed world transform as rendered memories', () => {
  assert.match(scene, /lifeMapWorldPoint\(node, selectedIndex, portrait\)/)
  assert.match(scene, /goalForNode\(selected, phase, portrait, selectedIndex\)/)
  const world = fs.readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8')
  assert.match(world, /lifeMapLocalPoint as celestialNodePosition, lifeMapStage/)
  assert.match(world, /lifeMapStage\(Boolean\(selected\), portrait\)/)
  assert.match(world, /celestialNodePosition\(selected, selectedIndex\)/)
})

test('desktop and portrait cameras target the same authored memory transform as the rendered artifact', () => {
  assert.match(layoutSource, /import \{ lifeMapDisplayPosition \} from '\.\/lifeMapLayout'/)
  assert.match(layoutSource, /const \[x, y, z\] = lifeMapDisplayPosition\(node\)/)
  assert.match(layoutSource, /const local = lifeMapLocalPoint\(node, index\)/)
  assert.match(layoutSource, /const stage = lifeMapStage\(true, portrait\)/)
  assert.match(layoutSource, /return local\.map\(\(value, axis\) => value \* stage\.scale\[axis\] \+ stage\.position\[axis\]\) as Point3/)
  assert.match(authoredLayoutSource, /const CHAPTER_CENTERS/)
  assert.match(authoredLayoutSource, /export function lifeMapDisplayPosition/)
})

test('reduced motion forces an in-flight selected journey to arrival', () => {
  assert.match(scene, /if \(profile\.reducedMotion\) \{\s*journeyToken\.current \+= 1;\s*setPhase\("arrival"\);\s*return;/s)
})

test('selected arrival preserves surrounding personal-universe geography instead of isolating one node', () => {
  assert.match(lifeMapSource, /life-map-v249-personal-universe-geography/)
  assert.match(lifeMapSource, /all-sites-remain-grounded-geography-selected-site-rises-without-isolating-context/)
  assert.match(lifeMapSource, /nodes\.map\(/)
  assert.match(lifeMapSource, /life-map-v249-grounded-memory-places/)
  assert.match(lifeMapSource, /arrivalMeaning: 'inside-history-not-node-zoom'/)
  assert.doesNotMatch(lifeMapSource, /const visibleNodes\s*=\s*arrival\s*&&\s*selected\s*\?\s*\[selected\]/)
})

test('retired hidden Life Map visual owners lose pointer authority and restore it only on cleanup', () => {
  assert.match(legacyOverlay, /const RETIRED_VISUAL_GROUPS = new Set/)
  assert.match(legacyOverlay, /'life-map-v237-weathered-valley-floor'/)
  assert.match(legacyOverlay, /object\.raycast = \(\) => undefined/)
  assert.match(legacyOverlay, /child\.raycast = \(\) => undefined/)
  assert.match(legacyOverlay, /raycasts\.current\.forEach\(\(raycast, object\) => \{ object\.raycast = raycast \}\)/)
})

test('V256 semantic memory families cannot collapse back to one repeated manifestation', () => {
  assert.match(legacyOverlay, /function semanticFamilyParts\(/)
  for (const family of ['memory', 'season', 'ritual', 'forecast', 'threshold', 'relationship', 'recovery']) assert.match(legacyOverlay, new RegExp(`node\\.type === '${family}'`))
  assert.match(legacyOverlay, /const spiralPoints/)
  assert.match(legacyOverlay, /semanticFamilies: 'memory-season-ritual-forecast-threshold-relationship-recovery-legacy'/)
  assert.match(legacyOverlay, /semanticFamily: node\.type/)
  assert.doesNotMatch(legacyOverlay, /nodes\.map\([^)]*=>\s*<mesh[^>]*<sphereGeometry/s)
})

test('visible terrain authority rejects repeated procedural banding in source and pixels', () => {
  assert.match(legacyOverlay, /life-map-v256-authored-memory-terrain/)
  assert.match(legacyOverlay, /visualAuthority: 'authored-chapter-geography'/)
  assert.match(legacyOverlay, /life-map-v256-authored-chapter-territories/)
  for (const marker of ['const chapterMasses','const outcrops','const livedCuts','const authoredScars','const lateralBanks','const chapterShelves','const ravines','function valueNoise2D']) assert.match(layoutSource, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.doesNotMatch(layoutSource, /distanceFromRoute|shoulder|Math\.tanh|terraces/)
  assert.doesNotMatch(layoutSource, /weathering\s*=\s*\n\s*\.16 \* Math\.sin/)
})

test('relationship language stays contextual and never becomes the overview visual grammar', () => {
  assert.match(overlay, /const contextualTypes = new Set<LifeMapNode\['type'\]>/)
  assert.match(overlay, /const incident = Boolean\(selected &&/)
  assert.match(overlay, /const overviewContext = !selected && source\.eraId !== target\.node\.eraId/)
  assert.match(overlay, /const visible = selected \? candidates\.slice\(0, 1\) : \[\]/)
  assert.match(overlay, /overview-no-explicit-graph-edges/)
  assert.match(overlay, /selected-memory-only-max-one-subtle/)
  assert.match(overlay, /opacity=\{selected \? \.025 : 0\}/)
  assert.doesNotMatch(overlay, /selected \? 3 : 4/)
})

test('portrait overview composes the full celestial memory volume without dead-sky collapse', () => {
  assert.match(layoutSource, /const jitterY = .* \* 5\.4/)
  assert.match(layoutSource, /z \* 1\.82 - 8\.0 \+ jitterZ/)
  assert.match(layoutSource, /\? \{ scale: \[\.92, \.92, \.92\], position: \[0, -\.2, 1\.0\] \}/)
  assert.match(layoutSource, /const widthDistance = halfWidth \/ Math\.max\(horizontalTan \* \.88, \.08\)/)
  assert.match(layoutSource, /const heightDistance = halfHeight \/ Math\.max\(verticalTan \* \.86, \.08\)/)
  assert.match(layoutSource, /const distance = Math\.max\(portrait \? 34 : 24, widthDistance, heightDistance\)/)
  assert.match(layoutSource, /nearestZ \+ distance/)
  assert.doesNotMatch(layoutSource, /lifeMapTerrainHeight\(x, worldZ\) \+ \.62 \+ narrativeLift/)
  assert.doesNotMatch(layoutSource, /scale: \[\.94, 2\.20, \.72\], position: \[0, -\.18, 3\.65\]/)
  assert.doesNotMatch(layoutSource, /scale: \[\.82, 1\.08, \.86\]|scale: \[\.58, 1\.02, 1\.18\]|scale: \[\.46, \.82, \.92\]/)
})

test('V255 history enrichment remains visual-only and preserves legacy semantic ownership', () => {
  assert.match(overlay, /LifeMapGoldMasterOverlay as LegacyLifeMapGoldMasterOverlay/)
  assert.match(overlay, /life-map-v255-contextual-history-constellation/)
  assert.match(overlay, /life-map-v255-selected-history-sanctuary/)
  assert.match(overlay, /visualOnly: true, interactionOwner: false/)
  assert.match(overlay, /raycast=\{\(\) => null\}/)
  assert.match(overlay, /<LegacyLifeMapGoldMasterOverlay \{\.\.\.props\} \/>/)
})

test('Founder proof samples retained WebGL canvas pixels only', () => {
  assert.match(canvasProof, /canvas\.screenshot\(/)
  assert.match(canvasProof, /sampleCount !== 3456/)
  assert.match(canvasProof, /retained-webgl-canvas-png/)
  assert.match(canvasProof, /distributed-grid-24x16-3x3/)
  assert.match(canvasProof, /receipt\.captures\.length === 4/)
  assert.match(workflow, /scripts\/verify-lifemap-canvas-proof\.mjs/)
  assert.match(workflow, /lifemap-review-repair-contract\.test\.mjs/)
})

test('Focus final composition gives live WebGL memory geometry pixel authority and rejects stale static sphere/ring dominance', () => {
  assert.match(focusSource, /focus-v251-grounded-living-memory-manifestation/)
  assert.match(focusSource, /createFocusStrata, createFocusSurfaceMaps/)
  assert.doesNotMatch(focusSource, /focus-v249-memory-root-cradle/)
  assert.doesNotMatch(focusSource, /new THREE\.IcosahedronGeometry\(|<torusGeometry|<ringGeometry|wireframe/)
  assert.match(focusPolish, /V266 literal-pixel convergence/)
  assert.match(focusPolish, /\.focusWorld \.focusBackdrop \{[\s\S]*display: none !important;/)
  assert.match(focusPolish, /\.focusWorld \.focusCanvas canvas \{[\s\S]*opacity: 1 !important;[\s\S]*filter: none !important;[\s\S]*mix-blend-mode: normal !important;/)
  assert.doesNotMatch(focusPolish, /opacity: \.30|opacity: \.22|mix-blend-mode: screen|var\(--focus-asset\)/)
  assert.match(focusGeology, /seven staggered thin luminous lamellae|seven staggered|length: 7/)
  assert.match(focusGeology, /Subdued weathered mineral texture/)
  assert.doesNotMatch(focusGeology, /history \* 92|Math\.pow\(vein, 3\.0\)/)
})
