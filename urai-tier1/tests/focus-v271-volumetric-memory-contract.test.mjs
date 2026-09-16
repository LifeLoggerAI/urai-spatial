import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const geology = fs.readFileSync(new URL('../src/app/focus/focusMemoryGeology.ts', import.meta.url), 'utf8')

test('V271 selected memory is built from closed volumetric facets rather than thin lamella cards', () => {
  assert.match(geology, /V271 literal-pixel repair/)
  assert.match(geology, /const MEMORY_FACETS:/)
  assert.match(geology, /function createMemoryFacet\(/)
  assert.match(geology, /Five irregular equatorial vertices create a closed asymmetric bipyramid/)
  assert.match(geology, /const radialZ = depth \* \(\.76 \+ \.17 \* Math\.cos/)
  assert.match(geology, /indices\.push\(0, current, next\)/)
  assert.match(geology, /indices\.push\(1, next, current\)/)
  assert.match(geology, /indexed\.toNonIndexed\(\)/)
  assert.match(geology, /focusFacetRole = 'v271-interlocked-volumetric-memory-facet'/)
  assert.match(geology, /focusDepthRule = 'closed-volume-depth-comparable-to-width'/)
  assert.match(geology, /focusLiteralPixelRepair = 'v271-no-card-slab-silhouette'/)
  assert.match(geology, /return MEMORY_FACETS\.map\(\(spec, facet\) => createMemoryFacet\(spec, facet\)\)/)

  assert.doesNotMatch(geology, /createMemoryLamella/)
  assert.doesNotMatch(geology, /thickness = \.040|thickness = \.05|frontZ = depth \+ thickness|backZ = depth - thickness/)
  assert.doesNotMatch(geology, /Array\.from\(\{ length: 7 \}/)
  assert.doesNotMatch(geology, /v269-living-luminous-memory-lamella/)
  assert.doesNotMatch(geology, /v270-sdr-energy-depth-separation/)
})

test('V271 palette remains dark mineral with restrained accents rather than paper-white energy', () => {
  assert.match(geology, /const deep = new THREE\.Color\(\)\.setRGB\(\.030, \.092, \.104\)/)
  assert.match(geology, /const mineral = new THREE\.Color\(\)\.setRGB\(\.105, \.285, \.315\)/)
  assert.match(geology, /const cool = new THREE\.Color\(\)\.setRGB\(\.125, \.405, \.485\)/)
  assert.match(geology, /const warm = new THREE\.Color\(\)\.setRGB\(\.47, \.205, \.075\)/)
  assert.doesNotMatch(geology, /setRGB\(\.72, \.86, \.82\)|setRGB\(\.92, \.38, \.12\)/)
})
