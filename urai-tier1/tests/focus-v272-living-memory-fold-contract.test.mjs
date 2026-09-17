import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const geology = fs.readFileSync(new URL('../src/app/focus/focusMemoryGeology.ts', import.meta.url), 'utf8')

test('V272 selected memory is one connected living-memory fold rather than discrete shards or cards', () => {
  assert.match(geology, /V272 literal-pixel repair/)
  assert.match(geology, /const MEMORY_SECTIONS = 15/)
  assert.match(geology, /const MEMORY_RING_POINTS = 12/)
  assert.match(geology, /function createLivingMemoryFold\(/)
  assert.match(geology, /deep longitudinal furrow/)
  assert.match(geology, /focusMemoryRole = 'v272-single-connected-living-memory-fold'/)
  assert.match(geology, /focusMemoryTopology = 'closed-twisted-longitudinal-fold-with-deep-furrow'/)
  assert.match(geology, /focusLiteralPixelRepair = 'v272-no-crystal-crown-no-card-stack'/)
  assert.match(geology, /focusSilhouetteRule = 'one-coherent-memory-phenomenon-not-discrete-objects'/)
  assert.match(geology, /return \[createLivingMemoryFold\(\)\]/)

  assert.doesNotMatch(geology, /const MEMORY_FACETS:/)
  assert.doesNotMatch(geology, /function createMemoryFacet\(/)
  assert.doesNotMatch(geology, /v271-interlocked-volumetric-memory-facet/)
  assert.doesNotMatch(geology, /createMemoryLamella/)
  assert.doesNotMatch(geology, /v269-living-luminous-memory-lamella/)
  assert.doesNotMatch(geology, /Array\.from\(\{ length: 7 \}/)
})

test('living-memory palette stays weathered and restrained rather than cyan crystal or paper-white', () => {
  assert.match(geology, /const deep = new THREE\.Color\(\)\.setRGB/)
  assert.match(geology, /const mineral = new THREE\.Color\(\)\.setRGB/)
  assert.match(geology, /const weathered = new THREE\.Color\(\)\.setRGB/)
  assert.match(geology, /const warm = new THREE\.Color\(\)\.setRGB/)
  assert.match(geology, /focusMemoryEnergy = 'weathered-mineral-restrained-warm-cool-response'/)
  assert.match(geology, /focusLiteralPixelRefinement = 'v278-knotted-spine-recessed-one-sided-fold-warm-mineral-no-boulder-no-cloth-no-mouth'/)
  assert.match(geology, /color\.r = Math\.min\(\.96, color\.r\)/)
  assert.match(geology, /color\.g = Math\.min\(\.84, color\.g\)/)
  assert.match(geology, /color\.b = Math\.min\(\.60, color\.b\)/)
  assert.doesNotMatch(geology, /setRGB\(\.125, \.405, \.485\)|setRGB\(\.72, \.86, \.82\)|setRGB\(\.92, \.38, \.12\)/)
})