import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const css = fs.readFileSync('src/app/premium-spatial-atmosphere.css', 'utf8')

test('mobile Ground navigation exposes every destination without horizontal clipping', () => {
  assert.match(css, /@media \(max-width: 760px\)/)
  assert.match(css, /\.ground-rail \{[\s\S]*width: calc\(100vw - 20px\) !important;/)
  assert.match(css, /\.ground-rail \{[\s\S]*justify-content: center;/)
  assert.match(css, /\.ground-rail \{[\s\S]*overflow-x: hidden !important;/)
  assert.match(css, /\.ground-rail a \{[\s\S]*min-height: 40px !important;/)
  assert.match(css, /\.ground-rail a \{[\s\S]*font-size: 10px !important;/)
})
