import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const focusGeology = fs.readFileSync(new URL('../src/app/focus/focusMemoryGeology.ts', import.meta.url), 'utf8')
const lifeMap = fs.readFileSync(new URL('../src/components/lifemap/CosmicComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const isolation = fs.readFileSync(new URL('../src/spatial/world/lifeMapProductionIsolation.css', import.meta.url), 'utf8')
const focusPolish = fs.readFileSync(new URL('../src/app/focus/focus-launch-visual-polish.css', import.meta.url), 'utf8')

test('Focus threshold cannot regress to arbitrary point clouds rendered as black mesh spikes', () => {
  assert.match(focusGeology, /function createThresholdBranch/)
  assert.match(focusGeology, /geometry\.setIndex\(indices\)/)
  assert.match(focusGeology, /geometry\.computeVertexNormals\(\)/)
  assert.match(focusGeology, /return \[createThresholdBranch\(-1\), createThresholdBranch\(1\)\]/)
  assert.doesNotMatch(focusGeology, /MEMORY_THRESHOLD_POINTS/)
  assert.doesNotMatch(focusGeology, /const count = 18[\s\S]*positions\.set\(\[cx/)
})

test('Focus surface authority cannot regress to repeated topographic sine bands', () => {
  assert.match(focusGeology, /function valueNoise/)
  assert.match(focusGeology, /const broad = valueNoise/)
  assert.match(focusGeology, /const medium = valueNoise/)
  assert.match(focusGeology, /const fine = valueNoise/)
  assert.doesNotMatch(focusGeology, /Math\.sin\(u\*72/)
  assert.doesNotMatch(focusGeology, /Math\.sin\(v\*91/)
})

test('Life Map remains graph-free and its selected actions stay one subordinate horizontal rail', () => {
  assert.match(lifeMap, /stellar-memory-not-node-graph/)
  assert.match(lifeMap, /v260-no-explicit-graph-edges/)
  assert.doesNotMatch(lifeMap, /<Line\b|lineSegments|dodecahedronGeometry|icosahedronGeometry/)
  assert.match(isolation, /\.life-map-thresholds \{ display:flex !important; flex-direction:row !important;/)
  assert.match(isolation, /data-life-map-phase='arrival'\] \.life-map-thresholds \{ display: flex !important;/)
  assert.doesNotMatch(isolation, /data-life-map-phase='arrival'\] \.life-map-thresholds \{ display: grid !important;/)
})

test('Focus chrome remains intentionally subordinate to the spatial memory field', () => {
  assert.match(focusPolish, /product chrome recedes until the user asks for it/)
  assert.match(focusPolish, /\.focusWorld \.focusControls \{[\s\S]*opacity: \.70/)
  assert.match(focusPolish, /\.focusWorld \.focusControls:hover/)
  assert.match(focusPolish, /\.focusWorld \.focusHeading h2 \{ font-size: clamp\(2\.1rem, 4\.1vw, 4\.8rem\)/)
})
