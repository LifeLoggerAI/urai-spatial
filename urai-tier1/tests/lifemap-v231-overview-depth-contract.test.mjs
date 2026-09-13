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
  assert.match(layout, /if \(selected\) \{[\s\S]*scale: portrait \? \[\.98, 1\.08, \.92\] : \[1\.12, 1\.12, 1\.06\]/)
  assert.match(layout, /position: portrait \? \[0, -\.10, 1\.36\] : \[0, -\.14, \.92\]/)
  assert.match(layout, /portrait\s*\? \{ scale: \[\.82, 1\.08, \.86\], position: \[0, -\.46, 2\.0\] \}/)
  assert.match(layout, /: \{ scale: \[1\.24, 1\.18, \.92\], position: \[0, -\.42, \.66\] \}/)
  assert.doesNotMatch(layout, /scale: \[\.58, 1\.02, 1\.18\]|scale: \[\.46, \.82, \.92\]/)
})

test('portrait overview camera preserves the artifact envelope while composing chronology downward', () => {
  assert.match(layout, /2\.35 \* stage\.scale\[0\]/)
  assert.match(layout, /const forward = Math\.max\(30, halfWidth \/ \(horizontalTan \* \.68\)\)/)
  assert.match(layout, /target\[1\] \+ 23/)
  assert.match(layout, /target\[1\] - \.72/)
  assert.match(layout, /target\[2\] - 1\.4/)
  assert.doesNotMatch(layout, /scale: \[\.58, 1\.02, 1\.18\]|scale: \[\.46, \.82, \.92\]/)
})

test('visible terrain authority uses authored masses plus non-periodic weathering instead of repeated bands', () => {
  assert.match(layout, /const chapterMasses/)
  assert.match(layout, /const outcrops/)
  assert.match(layout, /const livedCuts/)
  assert.match(layout, /const authoredScars/)
  assert.match(layout, /const lateralBanks/)
  assert.match(layout, /const warpX/)
  assert.match(layout, /function valueNoise2D/)
  assert.doesNotMatch(layout, /distanceFromRoute|shoulder|Math\.tanh|terraces/)
  assert.doesNotMatch(layout, /weathering\s*=\s*\n\s*\.16 \* Math\.sin/)
})

test('selected world-point authority remains tied to selected staging', () => {
  assert.match(layout, /const stage = lifeMapStage\(true, portrait\)/)
  assert.match(layout, /return local\.map\(\(value, axis\) => value \* stage\.scale\[axis\] \+ stage\.position\[axis\]\) as Point3/)
})
