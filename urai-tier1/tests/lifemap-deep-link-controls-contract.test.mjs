import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const legacyControls = read('src/spatial/lifemap/LifeMapDeepLinkControls.tsx')
const canonical = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')
const adaptive = read('src/components/lifemap/AdaptiveLifeMapScene.tsx')
const shell = read('src/spatial/world/UraiWorldShell.tsx')
const selectedCinematic = read('src/spatial/world/lifeMapSelectedCinematic.css')
const proof = read('../scripts/capture-continuous-spatial-proof.mjs')

test('canonical Life Map has one selected-memory owner inside the spatial lens scene', () => {
  assert.match(canonical, /<LifeMapRouteBoundary \/>/)
  assert.match(canonical, /<Suspense/)
  assert.match(canonical, /data-selected-memory-owner="spatial-lens-only"/)
  assert.doesNotMatch(canonical, /LifeMapDeepLinkControls|urai-lifemap-deep-link-controls/)
  assert.match(adaptive, /className="life-map-memory-portals"/)
  assert.match(adaptive, /onClick=\{\(\) => onEnterFocus\(node\)\}/)
  assert.match(adaptive, /onClick=\{\(\) => onEnterReplay\(node\)\}/)
})

test('selected-memory identity and Focus Replay destinations remain owned by the spatial scene', () => {
  assert.match(adaptive, /function safeToken/)
  assert.match(adaptive, /slice\(0, 120\)/)
  assert.match(adaptive, /const queryNodeId = safeToken\(params\.get\("node"\) \|\| params\.get\("nodeId"\) \|\| params\.get\("memoryId"\)\)/)
  assert.match(adaptive, /const manifestId = safeToken\(params\.get\("manifestId"\), DEFAULT_MANIFEST_ID\)/)
  assert.match(adaptive, /next\.set\("memoryId", node\.id\)/)
  assert.match(adaptive, /next\.set\("manifestId", manifestId\)/)
  assert.match(adaptive, /next\.set\("node", node\.id\)/)
  assert.match(adaptive, /next\.set\("returnNode", node\.id\)/)
  assert.match(adaptive, /next\.set\("lifeMapOrigin"/)
  assert.match(adaptive, /return `\/\$\{route\}\?\$\{next\.toString\(\)\}`/)
  assert.match(adaptive, />Enter Focus<\/button>/)
  assert.match(adaptive, />Replay<\/button>/)
})

test('Overview preserves identity while suppressing selected spatial portals', () => {
  assert.match(adaptive, /const overviewRequested = params\.get\("overview"\) === "1"/)
  assert.match(adaptive, /overviewRequested \? null : queryNodeId/)
  assert.match(adaptive, /\{selected \? \(/)
  assert.match(adaptive, /className="life-map-memory-portals"/)
})

test('legacy selected-memory card remains unmounted and cannot compete visually', () => {
  assert.match(legacyControls, /data-testid="urai-lifemap-selected-memory-controls"/)
  assert.match(legacyControls, /Continue directly into this memory/)
  assert.doesNotMatch(canonical, /<LifeMapDeepLinkControls \/>/)
  assert.doesNotMatch(canonical, /import LifeMapDeepLinkControls/)
})

test('selected mode raises the spatial realm above the authored overview artwork', () => {
  assert.match(shell, /import '\.\/lifeMapSelectedCinematic\.css'/)
  assert.match(selectedCinematic, /data-life-map-mode='selected'/)
  assert.match(selectedCinematic, /> \.life-map-independent-realm/)
  assert.match(selectedCinematic, /z-index: 70/)
  assert.match(selectedCinematic, /data-life-map-authored-universe='primary'/)
  assert.match(selectedCinematic, /opacity: \.04 !important/)
  assert.match(selectedCinematic, /\.life-map-memory-portals/)
  assert.match(selectedCinematic, /z-index: 90/)
})

test('schema-7 selected route requires visible spatial Focus and Replay portals', () => {
  assert.match(proof, /id: 'life-map-selected'/)
  assert.match(proof, /getByRole\('button', \{ name: 'Enter Focus' \}\)/)
  assert.match(proof, /getByRole\('button', \{ name: 'Replay' \}\)/)
  assert.match(proof, /selectedMemoryControlsVisible/)
  assert.match(proof, /replayControlVisible/)
})
