import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')
const visualWrapper = read('../scripts/run-continuous-spatial-proof-v19-portal-stable.mjs')
const mirrorMobile = read('src/app/mirror/mirror-mobile-inspection.css')

test('continuous visual proof measures effective ancestor opacity', () => {
  assert.match(visualWrapper, /let effectiveOpacity = 1/)
  assert.match(visualWrapper, /current = current\.parentElement/)
  assert.match(visualWrapper, /effectiveOpacity \*= Number\.parseFloat\(currentStyle\.opacity/)
  assert.match(visualWrapper, /return effectiveOpacity > 0\.02/)
  assert.match(visualWrapper, /visibilityCount !== 1/)
  assert.match(visualWrapper, /ancestor-opacity visibility repair was not materialized/)
})

test('mobile Mirror inspector removes WebGL hit ownership and pins semantic thresholds above overlays', () => {
  assert.match(mirrorMobile, /> div,/)
  assert.match(mirrorMobile, /canvas \{/)
  assert.match(mirrorMobile, /pointer-events: none !important/)
  assert.match(mirrorMobile, /\.mirrorThresholds \{/)
  assert.match(mirrorMobile, /z-index: 100 !important/)
  assert.match(mirrorMobile, /isolation: isolate/)
  assert.match(mirrorMobile, /\.mirrorThresholds button \{/)
  assert.match(mirrorMobile, /z-index: 101/)
  assert.match(mirrorMobile, /pointer-events: auto/)
})
