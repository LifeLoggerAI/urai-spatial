import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')
const visualWrapper = read('../scripts/run-continuous-spatial-proof-v19-portal-stable.mjs')
const mirrorMobile = read('src/app/mirror/mirror-mobile-inspection.css')
const selectedMemory = read('src/spatial/memory/selectedMemoryContract.ts')
const worldTypes = read('src/spatial/world/worldTypes.ts')
const worldState = read('src/spatial/world/WorldStateProvider.tsx')
const worldTransition = read('src/spatial/world/WorldTransitionController.tsx')

test('continuous visual proof measures effective ancestor opacity', () => {
  assert.match(visualWrapper, /let effectiveOpacity = 1/)
  assert.match(visualWrapper, /current = current\.parentElement/)
  assert.match(visualWrapper, /effectiveOpacity \*= Number\.parseFloat\(currentStyle\.opacity/)
  assert.match(visualWrapper, /return effectiveOpacity > 0\.02/)
  assert.match(visualWrapper, /visibilityCount !== 1/)
  assert.match(visualWrapper, /ancestor-opacity visibility repair was not materialized/)
})

test('mobile Mirror inspector removes all competing hit owners and pins semantic thresholds above overlays', () => {
  assert.match(mirrorMobile, /body:has\(\.mirrorWorld \.mirrorInspection\) \.urai-world-companion/)
  assert.match(mirrorMobile, /display: none !important/)
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

test('selected-memory replay fragments are canonicalized by timestamp and reject invalid chronology', () => {
  assert.match(selectedMemory, /const chronologicalSegments = \[\.\.\.segments\]\.sort/)
  assert.match(selectedMemory, /left\.startsAtMs - right\.startsAtMs/)
  assert.match(selectedMemory, /const hasCanonicalChronology = CANONICAL_REPLAY_PHASES\.every/)
  assert.match(selectedMemory, /const hasNonOverlappingChronology = chronologicalSegments\.every/)
  assert.match(selectedMemory, /segment\.startsAtMs === 0/)
  assert.match(selectedMemory, /segments: chronologicalSegments/)
})

test('world travel preserves explicit demo identity through reverse navigation', () => {
  assert.match(worldTypes, /demo\?: boolean/)
  assert.match(worldTypes, /\| 'demo'/)
  assert.match(worldState, /const demo = params\.get\('demo'\) === '1'/)
  assert.match(worldState, /demo: true/)
  assert.match(worldTransition, /'demo',/)
  assert.match(worldTransition, /if \(context\?\.demo\) target\.searchParams\.set\('demo', '1'\)/)
  assert.match(worldTransition, /demo: currentWorld\.demo/)
})
