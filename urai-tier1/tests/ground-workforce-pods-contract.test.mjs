import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const css = fs.readFileSync(path.join(process.cwd(), 'src/app/urai-autonomous-v1-workforce.css'), 'utf8')

test('Ground provider assets are normalized inside cinematic pods', () => {
  assert.match(css, /\.uraiGroundHelper::before \{[^}]*border-radius: 24px 24px 18px 18px/s)
  assert.match(css, /\.uraiGroundHelperArt \{[^}]*clip-path: inset\(0 round 19px 19px 14px 14px\)/s)
  assert.match(css, /\.uraiGroundCouncil > div \{[^}]*backdrop-filter: blur\(11px\)/s)
  assert.match(css, /\.uraiGroundCouncil figure i \{[^}]*clip-path: inset\(0 round 11px\)/s)
})

test('mobile Ground keeps one clean council rail instead of scattered avatar cutouts', () => {
  assert.match(css, /@media \(max-width: 760px\)/)
  assert.match(css, /\.uraiAutoGround\[data-workforce-art="provider-final"\] \.uraiGroundHelper \{\s*display: none;/s)
  assert.match(css, /\.uraiGroundCouncil \{\s*top: 22%;\s*width: calc\(100vw - 28px\);/s)
})

test('workforce pods remain reduced-motion safe', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(css, /transition: none/)
})
