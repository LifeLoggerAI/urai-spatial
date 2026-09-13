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

test('overview uses the V250 portrait projection while preserving indexed selected staging authority', () => {
  assert.match(layout, /if \(selected\) \{[\s\S]*scale: portrait \? \[1\.08, 1\.04, 1\.08\] : \[1\.08, 1\.08, 1\.08\]/)
  assert.match(layout, /position: portrait \? \[0, -\.26, \.84\] : \[0, -\.14, \.72\]/)
  assert.match(layout, /portrait\s*\n\s*\? \{ scale: \[\.58, \.96, \.94\], position: \[0, -\.16, \.92\] \}/)
  assert.match(layout, /: \{ scale: \[1\.18, 1\.12, 1\], position: \[0, -\.55, 0\] \}/)
})

test('overview camera fills portrait with authored geography while preserving the desktop envelope', () => {
  assert.match(layout, /2\.2 \* stage\.scale\[0\]/)
  assert.match(layout, /const overlook = portrait \? 3\.7 : 7\.1/)
  assert.match(layout, /const retreat = portrait \? 1\.18 : 1\.14/)
  assert.match(layout, /target: \[target\[0\], target\[1\] - \(portrait \? 1\.38 : \.65\), target\[2\] - \(portrait \? 2\.0 : 1\.2\)\]/)
})

test('selected world-point authority remains tied to selected staging', () => {
  assert.match(layout, /const stage = lifeMapStage\(true, portrait\)/)
  assert.match(layout, /return local\.map\(\(value, axis\) => value \* stage\.scale\[axis\] \+ stage\.position\[axis\]\) as Point3/)
})
