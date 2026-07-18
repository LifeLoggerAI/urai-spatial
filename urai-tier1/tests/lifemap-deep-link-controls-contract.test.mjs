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
const proofWrapper = read('../scripts/run-continuous-spatial-proof-fixed.mjs')

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
  assert.match(controls, /const requestedDemo = searchParams\.get\('demo'\) === '1'/)
  assert.match(controls, /useLifeMapEvents\(requestedDemo \? 'demo-user' : undefined\)/)
  assert.match(controls, /rawNodeId/)
  assert.match(controls, /disclosedDemo \? `demo:\$\{selectedNode\.id\}` : selectedNode\.id/)
  assert.match(controls, /query\.set\('memoryId', memoryId\)/)
  assert.match(controls, /if \(manifestId\) query\.set\('manifestId', manifestId\)/)
  assert.match(controls, /query\.set\('node', nodeId\)/)
  assert.match(controls, /query\.set\('from', 'life-map-selected-memory'\)/)
  assert.match(controls, /if \(demo\) query\.set\('demo', '1'\)/)
  assert.match(controls, /router\.replace\(`\/life-map\?\$\{query\.toString\(\)\}`/)
})

test('Life Map-owned controls remain visible and keyboard operable without the Home Orb', () => {
  assert.match(controls, /aria-label="Semantic Life Map"/)
  assert.match(controls, /data-life-map-owner="independent"/)
  assert.match(controls, /<ul[\s\S]*aria-label="Available memories"/)
  assert.match(controls, /<li key=\{node\.id\}>[\s\S]*<button/)
  assert.doesNotMatch(controls, /role="listitem"/)
  assert.match(controls, /aria-pressed=\{selected\}/)
  assert.match(controls, /data-urai-audit-action="life-map-focus"/)
  assert.match(controls, /data-urai-audit-action="life-map-replay"/)
  assert.match(controls, /minHeight: 48/)
  assert.match(controls, /Home Orb does not enter this realm/)
  assert.match(css, /\.urai-lifemap-deep-link-controls \{/)
  assert.match(css, /z-index: 80/)
  assert.match(css, /button:focus-visible/)
})

test('selected-memory controls retain visible Focus and gated Replay doorways', () => {
  assert.match(controls, /data-testid="urai-lifemap-selected-memory-controls"/)
  assert.match(controls, /data-memory-id=\{memoryId\}/)
  assert.match(controls, /data-manifest-id=\{manifestId \|\| undefined\}/)
  assert.match(controls, /router\.push\(destination\('focus'\)\)/)
  assert.match(controls, /router\.push\(destination\('replay'\)\)/)
  assert.match(controls, /disabled=\{!replayAvailable\}/)
  assert.match(controls, /aria-label=\{replayAvailable \? 'Replay' : 'Replay unavailable for this memory'\}/)
  assert.match(controls, /replayAvailable=\{selectedNode\.replayAvailable && !selectedNode\.locked\}/)
  assert.match(controls, />\s*Enter Focus\s*</)
  assert.match(controls, /\{replayAvailable \? 'Replay' : 'Replay unavailable'\}/)
  assert.match(proof, /id: 'life-map-selected'/)
  assert.match(proof, /getByRole\('button', \{ name: 'Enter Focus' \}\)/)
  assert.match(proof, /getByRole\('button', \{ name: 'Replay' \}\)/)
  assert.match(proof, /selectedMemoryControlsVisible/)
  assert.match(proof, /replayControlVisible/)
})

test('selecting a different node replaces stale demo manifests and omits unknown private manifests', () => {
  assert.match(controls, /function disclosedDemoManifestId\(node: LifeMapNode\)/)
  assert.match(controls, /DEMO_REPLAY_MANIFEST_ID/)
  assert.match(controls, /DEMO_REPLAY_UNAVAILABLE_ID/)
  assert.match(controls, /const selectedManifestId = demoSelection \? disclosedDemoManifestId\(node\) : ''/)
  assert.match(controls, /if \(selectedManifestId\) query\.set\('manifestId', selectedManifestId\)/)
  assert.doesNotMatch(controls, /query\.set\('manifestId', requestedManifestId\)/)
})

test('visual proof initializes a real disclosed Life Map node before measuring selected controls', () => {
  assert.match(proofWrapper, /explicitDemo: true/)
  assert.match(proofWrapper, /memoryId=demo%3Amemory-thread/)
  assert.match(proofWrapper, /node=memory-thread/)
  assert.match(proofWrapper, /demo=1/)
  assert.doesNotMatch(proofWrapper, /memoryId=demo%3Aquiet-reset/)
  assert.match(proofWrapper, /route\.explicitDemo/)
  assert.match(proofWrapper, /localStorage\.setItem\('urai:lifeMapDemoMode', 'true'\)/)
  assert.match(proofWrapper, /localStorage\.removeItem\('urai:userId'\)/)
  assert.match(proofWrapper, /urai-continuous-spatial-visual-proof-14/)
})
