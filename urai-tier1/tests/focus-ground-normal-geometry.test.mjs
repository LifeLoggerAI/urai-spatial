import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const focus = readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
const geology = readFileSync(new URL('../src/app/focus/focusMemoryGeology.ts', import.meta.url), 'utf8')

test('Focus runtime has no walkable terrain or seated geology owner', () => {
  assert.match(focus, /data-focus-terrain-owner="false"/)
  assert.match(focus, /data-focus-spatial="selected-memory-star"/)
  assert.match(focus, /data-focus-composition="selected-memory-star-with-contained-memory"/)
  assert.doesNotMatch(focus, /FocusSanctuaryGround|FocusStoneBank|seatFocusStoneGeometry|focusGroundHeight|focusSelectedMemoryCavityDepth/)
  assert.doesNotMatch(focus, /createFocusStrata|createFocusSurfaceMaps|createFocusGroundIncision/)
})

test('Focus star geometry owns the close-range spatial silhouette', () => {
  assert.match(focus, /name="focus-selected-memory-star"/)
  assert.match(focus, /name="focus-memory-star-corona-glow"/)
  assert.match(focus, /name="focus-memory-star-explicit-corona-rays"/)
  assert.match(focus, /name="focus-memory-star-photosphere-rays"/)
  assert.match(focus, /name="focus-memory-star-photosphere-rays-secondary"/)
  assert.match(focus, /name="focus-memory-star-photosphere-surface"/)
  assert.match(focus, /name="focus-memory-star-photosphere-core"/)
  assert.match(focus, /name="focus-memory-star-glass-shell"/)
  assert.match(focus, /name="focus-memory-star-interior-depth"/)
  assert.match(focus, /function makeFocusPhotosphereGeometry\(\)/)
  assert.match(focus, /geometry=\{photosphereGeometry\}/)
  assert.match(focus, /terrainOwner: false/)
  assert.match(focus, /same-selected-star-resolved-at-close-range/)
})

test('retired Focus geology remains historical source only and is not mounted by runtime', () => {
  assert.match(geology, /focusCurrentVisualAuthority = 'v321-focal-readable-three-radial-terrain-cavities-localized-bottoms-ground-blended-hairline-connector-buried-closed-body'/)
  assert.doesNotMatch(focus, /focusCurrentVisualAuthority|focusIncisionAuthority|v321-focal-readable-three-radial-terrain-cavities/)
})
