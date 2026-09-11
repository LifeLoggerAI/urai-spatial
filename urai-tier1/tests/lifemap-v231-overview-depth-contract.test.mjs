import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const layout = fs.readFileSync(new URL('../src/components/lifemap/lifeMapSpatialLayout.ts', import.meta.url), 'utf8')

test('overview uses compact desktop and portrait projection without changing selected staging', () => {
  assert.match(layout, /if \(selected\) \{[\s\S]*scale: portrait \? \[1\.04, 1\.02, 1\.04\] : \[1\.08, 1\.08, 1\.08\]/)
  assert.match(layout, /position: portrait \? \[0, -\.08, \.58\] : \[0, -\.14, \.72\]/)
  assert.match(layout, /portrait\s*\? \{ scale: \[\.46, \.82, \.92\], position: \[0, -\.42, \.3\] \}/)
  assert.match(layout, /: \{ scale: \[1\.18, 1\.12, 1\], position: \[0, -\.55, 0\] \}/)
  assert.match(layout, /Projection only[\s\S]*must not manufacture composition/)
})

test('overview camera preserves the artifact envelope and authored depth target', () => {
  assert.match(layout, /2\.2 \* stage\.scale\[0\]/)
  assert.match(layout, /return \{ position: \[target\[0\], target\[1\], target\[2\] \+ distance\], target \}/)
})

test('selected world-point authority remains tied to selected staging', () => {
  assert.match(layout, /const stage = lifeMapStage\(true, portrait\)/)
  assert.match(layout, /return local\.map\(\(value, axis\) => value \* stage\.scale\[axis\] \+ stage\.position\[axis\]\) as Point3/)
})
