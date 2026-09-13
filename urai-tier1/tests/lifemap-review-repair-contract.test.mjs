import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const scene = fs.readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const overlay = fs.readFileSync(new URL('../src/components/lifemap/LifeMapGoldMasterOverlay.tsx', import.meta.url), 'utf8')
const canvasProof = fs.readFileSync(new URL('../../scripts/verify-lifemap-canvas-proof.mjs', import.meta.url), 'utf8')
const workflow = fs.readFileSync(new URL('../../.github/workflows/lifemap-founder-visual-proof.yml', import.meta.url), 'utf8')
const layoutSource = fs.readFileSync(new URL('../src/components/lifemap/lifeMapSpatialLayout.ts', import.meta.url), 'utf8')
const authoredLayoutSource = fs.readFileSync(new URL('../src/components/lifemap/lifeMapLayout.ts', import.meta.url), 'utf8')

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
  assert.match(scene, /return new THREE\.Vector3\(\.\.\.lifeMapWorldPoint\(node, selectedIndex, portrait\)\)/)
  assert.match(authoredLayoutSource, /const CHAPTER_CENTERS/)
  assert.match(authoredLayoutSource, /export function lifeMapDisplayPosition/)
})

test('reduced motion forces an in-flight selected journey to arrival', () => {
  assert.match(scene, /if \(profile\.reducedMotion\) \{\s*journeyToken\.current \+= 1;\s*setPhase\("arrival"\);\s*return;/s)
})

test('selected arrival preserves surrounding personal-universe geography instead of isolating one node', () => {
  assert.match(overlay, /life-map-v249-personal-universe-geography/)
  assert.match(overlay, /surrounding-geography-remains-visible-through-selection-and-arrival/)
  assert.match(overlay, /nodes\.map\(\(node\)=>/)
  assert.doesNotMatch(overlay, /const visibleNodes=arrival&&selected\?\[selected\]:nodes/)
  assert.match(overlay, /life-map-v249-grounded-memory-places/)
  assert.match(overlay, /all-sites-remain-grounded-geography-selected-site-rises-without-isolating-context/)
})

test('retired hidden Life Map visual owners lose pointer authority and restore it only on cleanup', () => {
  assert.match(overlay, /const raycasts=useRef\(new Map<THREE\.Object3D,RaycastFn>\(\)\)/)
  assert.match(overlay, /object\.raycast=\(\)=>undefined/)
  assert.match(overlay, /child\.raycast=\(\)=>undefined/)
  assert.match(overlay, /raycasts\.current\.forEach\(\(raycast,object\)=>\{object\.raycast=raycast\}\)/)
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
