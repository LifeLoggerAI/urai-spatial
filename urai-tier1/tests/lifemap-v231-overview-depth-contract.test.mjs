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
  assert.match(layout, /portrait\s*\? \{ scale: \[\.78, \.90, \.88\], position: \[0, -\.68, \.72\] \}/)
  assert.match(layout, /: \{ scale: \[1\.18, 1\.12, 1\], position: \[0, -\.55, 0\] \}/)
  assert.doesNotMatch(layout, /scale: \[\.46, \.82, \.92\]/)
})

test('portrait overview camera is explicitly composed instead of fitting every chapter into a tiny world', () => {
  assert.match(layout, /if \(portrait\) \{/)
  assert.match(layout, /const distance = Math\.min\(25, Math\.max\(17\.5,/)
  assert.match(layout, /target\[2\] - 2\.8/)
  assert.doesNotMatch(layout, /const overlook = portrait \? 5\.2 : 7\.1/)
})

test('visible terrain authority uses broad chapter masses instead of repeated terrace bands', () => {
  assert.match(layout, /const chapterMasses/)
  assert.match(layout, /const livedCuts/)
  assert.doesNotMatch(layout, /Math\.tanh/)
  assert.doesNotMatch(layout, /terraces/)
})

test('selected world-point authority remains tied to selected staging', () => {
  assert.match(layout, /const stage = lifeMapStage\(true, portrait\)/)
  assert.match(layout, /return local\.map\(\(value, axis\) => value \* stage\.scale\[axis\] \+ stage\.position\[axis\]\) as Point3/)
})
