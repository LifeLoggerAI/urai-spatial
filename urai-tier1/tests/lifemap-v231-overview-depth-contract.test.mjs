import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const layout = fs.readFileSync(new URL('../src/components/lifemap/lifeMapSpatialLayout.ts', import.meta.url), 'utf8')
const authoredLayout = fs.readFileSync(new URL('../src/components/lifemap/lifeMapLayout.ts', import.meta.url), 'utf8')

test('overview consumes the authored five-band memory identity as true celestial volume', () => {
  assert.match(layout, /import \{ lifeMapDisplayPosition \} from '\.\/lifeMapLayout'/)
  const localPoint = layout.match(/export function lifeMapLocalPoint[\s\S]*?\n\}/)?.[0] || ''
  assert.match(localPoint, /lifeMapDisplayPosition\(node\)/)
  assert.doesNotMatch(localPoint, /node\.position/)
  assert.match(localPoint, /const jitterX = .* \* 3\.8/)
  assert.match(localPoint, /const jitterY = .* \* 5\.4/)
  assert.match(localPoint, /const jitterZ = .* \* 9\.0/)
  assert.match(localPoint, /x \* 1\.72 \+ jitterX/)
  assert.match(localPoint, /y \* 1\.34 \+ jitterY \+ 1\.8/)
  assert.match(localPoint, /z \* 1\.82 - 8\.0 \+ jitterZ/)
  assert.doesNotMatch(localPoint, /lifeMapTerrainHeight\(/)
  for (const depth of ['-3.8', '-8.9', '-12.8', '-19.2', '-24.6']) assert.match(authoredLayout, new RegExp(depth.replace('.', '\\.')))
})

test('overview keeps selected staging intimate while portrait compacts only the overview envelope', () => {
  assert.match(layout, /if \(selected\) \{[\s\S]*scale: portrait \? \[\.92, \.92, \.92\] : \[1, 1, 1\]/)
  assert.match(layout, /position: portrait \? \[0, -\.15, \.55\] : \[0, 0, \.25\]/)
  assert.match(layout, /return portrait\s*\n\s*\? \{ scale: \[\.62, \.84, \.92\], position: \[0, -\.15, 1\.0\] \}/)
  assert.match(layout, /: \{ scale: \[1, 1, 1\], position: \[0, 0, \.4\] \}/)
  assert.doesNotMatch(layout, /portrait\s*\? \{ scale: \[\.92, \.92, \.92\], position: \[0, -\.2, 1\.0\] \}/)
  assert.doesNotMatch(layout, /scale: \[\.82, 1\.08, \.86\]|scale: \[\.58, 1\.02, 1\.18\]|scale: \[\.46, \.82, \.92\]/)
})

test('overview camera derives distance from the complete 3D artifact envelope', () => {
  assert.match(layout, /const halfWidth = Math\.max\(Math\.abs\(min\[0\] - target\[0\]\), Math\.abs\(max\[0\] - target\[0\]\)\) \+ 4\.5/)
  assert.match(layout, /const halfHeight = Math\.max\(Math\.abs\(min\[1\] - target\[1\]\), Math\.abs\(max\[1\] - target\[1\]\)\) \+ 3\.6/)
  assert.match(layout, /const widthDistance = halfWidth \/ Math\.max\(horizontalTan \* \.88, \.08\)/)
  assert.match(layout, /const heightDistance = halfHeight \/ Math\.max\(verticalTan \* \.86, \.08\)/)
  assert.match(layout, /const distance = Math\.max\(portrait \? 30 : 24, widthDistance, heightDistance\)/)
  assert.match(layout, /position: \[target\[0\], target\[1\] \+ \(portrait \? 2\.0 : 1\.8\), nearestZ \+ distance\]/)
  assert.match(layout, /target: \[target\[0\], target\[1\], target\[2\] - \(portrait \? 3\.0 : 4\.0\)\]/)
  assert.doesNotMatch(layout, /const distance = Math\.max\(portrait \? 34 : 24, widthDistance, heightDistance\)/)
})

test('historical lower-stratum terrain authority uses authored masses plus non-periodic weathering instead of repeated bands', () => {
  assert.match(layout, /const chapterMasses/)
  assert.match(layout, /const outcrops/)
  assert.match(layout, /const livedCuts/)
  assert.match(layout, /const authoredScars/)
  assert.match(layout, /const lateralBanks/)
  assert.match(layout, /const chapterShelves/)
  assert.match(layout, /const ravines/)
  assert.match(layout, /const warpX/)
  assert.match(layout, /function valueNoise2D/)
  assert.doesNotMatch(layout, /distanceFromRoute|shoulder|Math\.tanh|terraces/)
  assert.doesNotMatch(layout, /weathering\s*=\s*\n\s*\.16 \* Math\.sin/)
})

test('selected world-point authority remains tied to selected staging', () => {
  assert.match(layout, /const stage = lifeMapStage\(true, portrait\)/)
  assert.match(layout, /return local\.map\(\(value, axis\) => value \* stage\.scale\[axis\] \+ stage\.position\[axis\]\) as Point3/)
})
