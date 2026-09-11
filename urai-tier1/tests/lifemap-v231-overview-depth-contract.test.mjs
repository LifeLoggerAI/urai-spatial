import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const layout = fs.readFileSync(new URL('../src/components/lifemap/lifeMapSpatialLayout.ts', import.meta.url), 'utf8')

test('V231 overview uses distinct desktop and portrait authored geography without changing selected staging', () => {
  assert.match(layout, /if \(selected\) \{[\s\S]*scale: portrait \? \[1\.04, 1\.02, 1\.04\] : \[1\.08, 1\.08, 1\.08\]/)
  assert.match(layout, /position: portrait \? \[0, -\.08, \.58\] : \[0, -\.14, \.72\]/)
  assert.match(layout, /portrait\s*\? \{ scale: \[\.58, 1\.65, 1\.2\], position: \[0, -2, -1\.5\] \}/)
  assert.match(layout, /: \{ scale: \[2\.4, 1\.8, 1\.45\], position: \[0, -2\.3, -3\] \}/)
})

test('selected world-point authority remains tied to selected staging', () => {
  assert.match(layout, /const stage = lifeMapStage\(true, portrait\)/)
  assert.match(layout, /return local\.map\(\(value, axis\) => value \* stage\.scale\[axis\] \+ stage\.position\[axis\]\) as Point3/)
})
