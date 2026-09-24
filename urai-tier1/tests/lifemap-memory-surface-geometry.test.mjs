import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../src/components/lifemap/CosmicComposedLifeMapScene.tsx', import.meta.url), 'utf8')

test('mounted Memory Star geometry is stellar pixels plus a bounded invisible interaction volume', () => {
  assert.match(source, /function MemoryStar\(/)
  assert.match(source, /stellarMorphology: "point-photosphere-layered-corona-no-visible-sphere"/)
  assert.match(source, /<sprite scale=\{\[outer \* 1\.24, outer, 1\]\}>/)
  assert.match(source, /<sprite scale=\{\[mid \* 1\.10, mid, 1\]\}>/)
  assert.match(source, /<sprite scale=\{\[hot, hot, 1\]\}>/)
  assert.match(source, /<mesh scale=\{active \? 1\.15 : overview \? 1\.08 : \.92\}>/)
  assert.match(source, /<sphereGeometry args=\{\[\.30, 8, 6\]\} \/>/)
  assert.match(source, /<meshBasicMaterial transparent opacity=\{0\} depthWrite=\{false\} colorWrite=\{false\} \/>/)
  assert.doesNotMatch(source, /memoryMembrane|grounded surface|weathered-memory-outcrop|memoryHeartGeometry|memoryFilamentGeometry/)
})

test('cosmic placement keeps real three-axis depth instead of collapsing memories to one plane', () => {
  assert.match(source, /const radius = 6\.6 \+ Math\.pow\(u, \.72\) \* 17\.5/)
  assert.match(source, /const y = \(seeded\(seed, 11\.7\) - \.5\) \* \(5\.2 \+ radius \* \.17\)/)
  assert.match(source, /const z = -17\.5 - Math\.pow\(seeded\(seed, 14\.9\), \.78\) \* 42/)
  assert.match(source, /depthSpan=\{30\} zOffset=\{-2\}/)
  assert.match(source, /depthSpan=\{58\} zOffset=\{-24\}/)
  assert.match(source, /depthSpan=\{88\} zOffset=\{-58\}/)
})
