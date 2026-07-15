import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const cssPath = path.join(process.cwd(), 'src/app/continuous-spatial-proof-defects.css')
assert.ok(fs.existsSync(cssPath), 'missing mobile spatial framing CSS')
const css = fs.readFileSync(cssPath, 'utf8')

test('mobile Home widens the WebGL render aspect inside the clipped device viewport', () => {
  assert.match(css, /@media \(max-width: 760px\)/)
  assert.match(css, /\.urai-home-spatial-canvas-shell\s*\{[^}]*left: -20vw !important;[^}]*width: 140vw !important;/s)
  assert.match(css, /max-width: none !important/)
})

test('mobile Ground widens the actual R3F wrapper so side chambers remain visible', () => {
  assert.match(css, /\.ground-spatial-root > div:has\(> canvas\)/)
  assert.match(css, /left: -18vw !important/)
  assert.match(css, /width: 136vw !important/)
  assert.match(css, /height: 100% !important/)
})

test('wide rendering stays mobile-scoped and leaves Life Map full-height guarantees intact', () => {
  const mediaIndex = css.indexOf('@media (max-width: 760px)')
  const homeWideIndex = css.indexOf('width: 140vw !important')
  const groundWideIndex = css.indexOf('width: 136vw !important')
  assert.ok(mediaIndex >= 0 && homeWideIndex > mediaIndex && groundWideIndex > mediaIndex)
  assert.match(css, /\[data-testid="urai-true-3d-life-map"\][\s\S]*height: 100dvh !important/)
})
