import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const controls = read('src/spatial/lifemap/LifeMapDeepLinkControls.tsx')
const canonical = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')
const css = read('src/app/continuous-spatial-proof-defects.css')
const proof = read('../scripts/capture-continuous-spatial-proof.mjs')

test('canonical Life Map mounts selected-memory controls inside Suspense', () => {
  assert.match(canonical, /LifeMapDeepLinkControls/)
  assert.match(canonical, /<LifeMapRouteBoundary \/>/)
  assert.match(canonical, /<LifeMapDeepLinkControls \/>/)
  assert.match(canonical, /<Suspense/)
})

test('memoryId and node deep links preserve exact identity across Focus and Replay', () => {
  assert.match(controls, /function safeToken/)
  assert.match(controls, /slice\(0, 120\)/)
  assert.match(controls, /\^\[A-Za-z0-9\._:-\]\+\$/)
  assert.match(controls, /safeToken\(searchParams\.get\('memoryId'\) \?\? searchParams\.get\('node'\)\)/)
  assert.match(controls, /safeToken\(searchParams\.get\('manifestId'\), 'replay-recovery-thread'\)/)
  assert.match(controls, /data-testid="urai-lifemap-selected-memory-controls"/)
  assert.match(controls, /data-memory-id=\{memoryId\}/)
  assert.match(controls, /data-manifest-id=\{manifestId\}/)
  assert.match(controls, /query\.set\('memoryId', memoryId\)/)
  assert.match(controls, /query\.set\('manifestId', manifestId\)/)
  assert.match(controls, /query\.set\('node', memoryId\)/)
  assert.match(controls, /query\.set\('from', 'life-map-selected-memory'\)/)
  assert.match(controls, /router\.push\(destination\('focus'\)\)/)
  assert.match(controls, /router\.push\(destination\('replay'\)\)/)
  assert.match(controls, />\s*Enter Focus\s*</)
  assert.match(controls, />\s*Replay\s*</)
  assert.match(controls, /if \(!memoryId\) return null/)
})

test('selected-memory controls are visible, responsive and keyboard focused', () => {
  assert.match(css, /\.urai-lifemap-deep-link-controls \{/)
  assert.match(css, /z-index: 80/)
  assert.match(css, /width: min\(320px, calc\(100vw - 40px\)\)/)
  assert.match(css, /\.urai-lifemap-deep-link-controls__actions button/)
  assert.match(css, /min-height: 38px/)
  assert.match(css, /button:focus-visible/)
  assert.match(css, /@media \(max-width: 760px\)/)
})

test('schema-7 selected route still requires visible Focus and Replay controls', () => {
  assert.match(proof, /id: 'life-map-selected'/)
  assert.match(proof, /getByRole\('button', \{ name: 'Enter Focus' \}\)/)
  assert.match(proof, /getByRole\('button', \{ name: 'Replay' \}\)/)
  assert.match(proof, /selectedMemoryControlsVisible/)
  assert.match(proof, /replayControlVisible/)
})
