import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const css = fs.readFileSync(path.join(process.cwd(), 'src/app/spatial/ar-vr/review-fixes.css'), 'utf8')

test('XR keeps the capability signal and removes the duplicate details card', () => {
  assert.match(css, /\.urai-xr-portal__manual-proof \{\s*display: none !important;/s)
  assert.match(css, /\[data-xr-capability-signal='true'\]/)
})

test('XR fills desktop and mobile width', () => {
  assert.match(css, /\.urai-xr-route-shell \{[^}]*width: 100%;/s)
  assert.match(css, /\.urai-xr-portal \{[^}]*width: 100% !important;/s)
  assert.match(css, /overflow-x: hidden !important/)
})

test('XR mobile heading and scrolling remain safe', () => {
  assert.match(css, /@media \(max-width: 980px\)/)
  assert.match(css, /min-height: 100svh !important/)
  assert.match(css, /line-height: 1\.1 !important/)
})
