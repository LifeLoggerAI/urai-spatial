import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const css = fs.readFileSync(
  new URL('../src/app/location-map/geographic-route-bridge.css', import.meta.url),
  'utf8',
)

test('mobile geographic bridge stays above atlas overview and controls', () => {
  const mobile = css.match(/@media \(max-width: 760px\) \{([\s\S]*?)\n\}/)?.[1] ?? ''
  assert.match(mobile, /top: calc\(env\(safe-area-inset-top, 0px\) \+ 6\.25rem\);/)
  assert.match(mobile, /bottom: auto;/)
  assert.doesNotMatch(mobile, /bottom: calc\(env\(safe-area-inset-bottom/)
  assert.match(mobile, /width: min\(17rem, calc\(100vw - 1\.5rem\)\);/)
})

test('geographic bridge retains keyboard and reduced-motion boundaries', () => {
  assert.match(css, /\.locationMapGeographicBridge a:focus-visible/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(css, /scroll-behavior: auto;/)
})
