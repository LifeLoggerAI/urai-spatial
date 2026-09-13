import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const layout = fs.readFileSync(new URL('../src/components/lifemap/lifeMapSpatialLayout.ts', import.meta.url), 'utf8')
const authoredLayout = fs.readFileSync(new URL('../src/components/lifemap/lifeMapLayout.ts', import.meta.url), 'utf8')

test('overview consumes the authored five-band memory geography instead of legacy shallow positions', () => {
  assert.match(layout, /import \{ lifeMapDisplayPosition \} from '\.\/lifeMapLayout'/)
  const localPoint = layout.match(/export function lifeMapLocalPoint[\s\S]*?\n\}/)?.[0] || ''
  assert.match(localPoint, /lifeMapDisplayPosition\(node\)/)
  assert.doesNotMatch(localPoint, /node\.position/)
  assert.match(localPoint, /const worldZ = z - 3\.4/)
  assert.match(localPoint, /lifeMapTerrainHeight\(x, worldZ\) \+ \.58 \+ narrativeLift/)
  for (const depth of ['-3.8', '-8.9', '-12.8', '-19.2', '-24.6']) assert.match(authoredLayout, new RegExp(depth.replace('.', '\\.')))
})

test('overview keeps selected staging stable while portrait gets deliberate world occupancy', () => {
  assert.match(layout, /if \(selected\) \{[\s\S]*scale: portrait \? \[1\.04, 1\.02, 1\.04\] : \[1\.08, 1\.08, 1\.08\]/)
  assert.match(layout, /position: portrait \? \[0, -\.08, \.58\] : \[0, -\.14, \.72\]/)
  assert.match(layout, /portrait\s*\? \{ scale: \[\.58, 1\.02, 1\.18\], position: \[0, -\.68, \.72\] \}/)
  assert.match(layout, /: \{ scale: \[1\.18, 1\.12, 1\], position: \[0, -\.55, 0\] \}/)
  assert.doesNotMatch(layout, /scale: \[\.46, \.82, \.92\]/)
})

test('portrait overview camera preserves the artifact envelope while composing chronology downward', () => {
  assert.match(layout, /2\.2 \* stage\.scale\[0\]/)
  assert.match(layout, /const forward = Math\.max\(55, halfWidth \/ \(horizontalTan \* \.78\)\)/)
  assert.match(layout, /target\[1\] \+ 30/)
  assert.match(layout, /target\[2\] - 5\.5/)
  assert.doesNotMatch(layout, /scale: \[\.46, \.82, \.92\]/)
})

test('visible terrain authority uses asymmetric chapter masses instead of repeated terrace bands', () => {
  assert.match(layout, /const chapterMasses/)
  assert.match(layout, /const outcrops/)
  assert.match(layout, /const livedCuts/)
  assert.match(layout, /const warpX/)
  assert.doesNotMatch(layout, /distanceFromRoute|shoulder|Math\.tanh|terraces/)
})

test('selected world-point authority remains tied to selected staging', () => {
  assert.match(layout, /const stage = lifeMapStage\(true, portrait\)/)
  assert.match(layout, /return local\.map\(\(value, axis\) => value \* stage\.scale\[axis\] \+ stage\.position\[axis\]\) as Point3/)
})
