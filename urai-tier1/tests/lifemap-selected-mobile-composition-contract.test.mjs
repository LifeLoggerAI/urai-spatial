import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const css = fs.readFileSync(
  path.join(root, 'src/spatial/world/lifeMapSelectedActionHardening.css'),
  'utf8',
)

test('selected Life Map desktop composition keeps readable title and separated action bands', () => {
  assert.match(css, /@media \(min-width: 761px\)/)
  assert.match(css, /data-life-map-mode='selected'\]::after/)
  assert.match(css, /top: 48vh/)
  assert.match(css, /z-index: 2147482000/)
  assert.match(css, /> \.life-map-whisper\[data-selected='true'\]/)
  assert.match(css, /bottom: max\(168px, calc\(env\(safe-area-inset-bottom\) \+ 158px\)\) !important/)
  assert.match(css, /font-size: clamp\(30px, 3\.2vw, 46px\) !important/)
  assert.match(css, /text-transform: none !important/)
  assert.match(css, /max-width: 58ch !important/)
  assert.match(css, /> \.life-map-memory-portals/)
  assert.match(css, /top: auto !important/)
  assert.match(css, /bottom: max\(96px, calc\(env\(safe-area-inset-bottom\) \+ 86px\)\) !important/)
  assert.match(css, /max-width: 960px !important/)
})

test('selected Life Map mobile composition keeps readable title and separated action bands', () => {
  assert.match(css, /@media \(max-width: 760px\)/)
  assert.match(css, /data-life-map-mode='selected'\]::after/)
  assert.match(css, /top: 50svh/)
  assert.match(css, /z-index: 2147482000/)
  assert.match(css, /> \.life-map-whisper\[data-selected='true'\]/)
  assert.match(css, /bottom: max\(196px, calc\(env\(safe-area-inset-bottom\) \+ 186px\)\) !important/)
  assert.match(css, /font-size: clamp\(21px, 6\.8vw, 29px\) !important/)
  assert.match(css, /text-transform: none !important/)
  assert.match(css, /overflow-wrap: anywhere/)
  assert.match(css, /> \.life-map-memory-portals/)
  assert.match(css, /top: auto !important/)
  assert.match(css, /bottom: max\(126px, calc\(env\(safe-area-inset-bottom\) \+ 116px\)\) !important/)
})
