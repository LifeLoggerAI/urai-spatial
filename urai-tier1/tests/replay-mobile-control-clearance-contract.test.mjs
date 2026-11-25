import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const layout = fs.readFileSync('src/app/layout.tsx', 'utf8')
const clearance = fs.readFileSync('src/app/replay-mobile-control-clearance.css', 'utf8')

test('mobile Replay controls reserve the persistent lower-left world-control corner', () => {
  assert.match(layout, /import '\.\/replay-mobile-control-clearance\.css'/)
  assert.match(clearance, /@media \(max-width: 760px\)/)
  assert.match(clearance, /\.uraiAutoReplay \.uraiReplayControls/)
  assert.match(clearance, /left: max\(58px, calc\(env\(safe-area-inset-left, 0px\) \+ 46px\)\)/)
  assert.match(clearance, /right: max\(6px, env\(safe-area-inset-right, 0px\)\)/)
  assert.match(clearance, /width: auto/)
  assert.match(clearance, /transform: none/)
})

test('expanded Replay actions mask memory copy and retain actual browser opacity assertions', () => {
  const actionsRule = clearance.match(/\.replayWorld \.replayProductActions \{([^}]+)\}/)?.[1] ?? ''
  assert.match(actionsRule, /background: #02070e;/)
  assert.match(actionsRule, /backdrop-filter: none;/)
  const capture = fs.readFileSync('../scripts/capture-replay-product-clearance.mjs', 'utf8')
  assert.match(capture, /assert\.equal\(bounds\.actionPanel\.background, 'rgb\(2, 7, 14\)'/)
  assert.match(capture, /assert\.equal\(bounds\.actionPanel\.backdropFilter, 'none'/)
  assert.match(capture, /assert\.equal\(bounds\.actionPanel\.opacity, 1/)
  assert.match(capture, /await verifyControlLayout\('open', true\)/)
  assert.match(capture, /await verifyControlLayout\('history', true\)/)
})
