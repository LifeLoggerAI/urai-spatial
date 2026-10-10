import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const separation = fs.readFileSync(
  new URL('../src/spatial/world/homeMobileControlSeparation.css', import.meta.url),
  'utf8',
)

test('mobile control separation cannot override the compact semantic navigation rail', () => {
  assert.doesNotMatch(separation, /home-semantic-navigation/)
  assert.doesNotMatch(separation, /data-home-navigation-owner/)
})

test('mobile discreet controls and provenance keep their independent safe-area regions', () => {
  assert.match(separation, /@media \(max-width: 900px\), \(pointer: coarse\)/)
  assert.match(separation, /\.home-discreet-controls \{[\s\S]*top: max\(12px, env\(safe-area-inset-top\)\) !important;/)
  assert.match(separation, /\.home-provenance \{[\s\S]*top: max\(118px, calc\(env\(safe-area-inset-top\) \+ 108px\)\) !important;/)
})
