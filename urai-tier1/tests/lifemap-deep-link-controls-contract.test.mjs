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

test('canonical Life Map mounts semantic memory controls inside Suspense', () => {
  assert.match(canonical, /LifeMapDeepLinkControls/)
  assert.match(canonical, /<LifeMapRouteBoundary \/>/)
  assert.match(canonical, /<LifeMapDeepLinkControls \/>/)
  assert.match(canonical, /<Suspense/)
  assert.match(canonical, /data-life-map-orb-owner="none"/)
  assert.match(canonical, /data-testid="urai-lifemap-orb-free-center"/)
  assert.match(canonical, /data-testid="urai-lifemap-legacy-companion-mask"/)
})

test('semantic memory rail preserves durable private and disclosed-demo identity', () => {
  assert.match(controls, /function safeToken/)
  assert.match(controls, /slice\(0, 120\)/)
  assert.match(controls, /\^\[A-Za-z0-9\._:-\]\+\$/)
  assert.match(controls, /useLifeMapEvents\(\)/)
  assert.match(controls, /rawNodeId/)
  assert.match(controls, /usingSeedData \? `demo:\$\{node\.id\}` : node\.id/)
  assert.match(controls, /query\.set\('memoryId', memoryId\)/)
  assert.match(controls, /query\.set\('manifestId', manifestId\)/)
  assert.match(controls, /query\.set\('node', nodeId\)/)
  assert.match(controls, /query\.set\('from', 'life-map-selected-memory'\)/)
  assert.match(controls, /if \(demo\) query\.set\('demo', '1'\)/)
  assert.match(controls, /router\.replace\(`\/life-map\?\$\{query\.toString\(\)\}`/)
})

test('Life Map-owned controls remain visible and keyboard operable without the Home Orb', () => {
  assert.match(controls, /aria-label="Semantic Life Map"/)
  assert.match(controls, /data-life-map-owner="independent"/)
  assert.match(controls, /aria-label="Available memories"/)
  assert.match(controls, /aria-pressed=\{selected\}/)
  assert.match(controls, /data-urai-audit-action="life-map-focus"/)
  assert.match(controls, /data-urai-audit-action="life-map-replay"/)
  assert.match(controls, /minHeight: 48/)
  assert.match(controls, /Home Orb does not enter this realm/)
  assert.match(css, /\.urai-lifemap-deep-link-controls \{/)
  assert.match(css, /z-index: 80/)
  assert.match(css, /button:focus-visible/)
})

test('selected-memory controls retain visible Focus and Replay doorways', () => {
  assert.match(controls, /data-testid="urai-lifemap-selected-memory-controls"/)
  assert.match(controls, /data-memory-id=\{memoryId\}/)
  assert.match(controls, /data-manifest-id=\{manifestId\}/)
  assert.match(controls, /router\.push\(destination\('focus'\)\)/)
  assert.match(controls, /router\.push\(destination\('replay'\)\)/)
  assert.match(controls, />\s*Enter Focus\s*</)
  assert.match(controls, />\s*Replay\s*</)
  assert.match(proof, /id: 'life-map-selected'/)
  assert.match(proof, /getByRole\('button', \{ name: 'Enter Focus' \}\)/)
  assert.match(proof, /getByRole\('button', \{ name: 'Replay' \}\)/)
  assert.match(proof, /selectedMemoryControlsVisible/)
  assert.match(proof, /replayControlVisible/)
})
