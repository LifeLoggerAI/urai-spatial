import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const legacyControls = read('src/spatial/lifemap/LifeMapDeepLinkControls.tsx')
const canonical = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')
const boundary = read('src/components/lifemap/LifeMapRouteBoundary.tsx')
const adaptive = read('src/components/lifemap/AdaptiveLifeMapScene.tsx')
const proof = read('../scripts/capture-lifemap-founder-proof.mjs')

test('canonical Life Map has one selected-memory action owner', () => {
  assert.match(canonical, /data-selected-memory-owner="spatial-lens-only"/)
  assert.match(boundary, /return <AdaptiveLifeMapScene \/>/)
  assert.doesNotMatch(canonical, /LifeMapDeepLinkControls|urai-lifemap-deep-link-controls/)
  assert.match(adaptive, /className="life-map-actions"/)
  assert.match(adaptive, /aria-label="Selected memory actions"/)
  assert.match(adaptive, /router\.push\(destinationHref\("focus"\)\)/)
  assert.match(adaptive, /router\.push\(destinationHref\("replay"\)\)/)
})

test('selected-memory identity and Focus Replay destinations remain owned by the spatial scene', () => {
  assert.match(adaptive, /function safeToken/)
  assert.match(adaptive, /slice\(0, 120\)/)
  assert.match(adaptive, /const queryNode = safeToken\(params\.get\("node"\) \|\| params\.get\("memoryId"\)\)/)
  assert.match(adaptive, /const manifestId = safeToken\(params\.get\("manifestId"\), DEFAULT_MANIFEST_ID\)/)
  assert.match(adaptive, /next\.set\("memoryId", selected\.id\)/)
  assert.match(adaptive, /next\.set\("manifestId", manifestId\)/)
  assert.match(adaptive, /next\.set\("node", selected\.id\)/)
  assert.match(adaptive, /next\.set\("returnNode", selected\.id\)/)
  assert.match(adaptive, /next\.set\("from", "life-map"\)/)
  assert.match(adaptive, /return `\/\$\{route\}\?\$\{next\.toString\(\)\}`/)
})

test('Overview clears selected identity and restores the same universe', () => {
  assert.match(adaptive, /params\.get\("overview"\) === "1" \? null : queryNode \|\| null/)
  assert.match(adaptive, /setSelectedId\(null\)/)
  assert.match(adaptive, /setPhase\("overview"\)/)
  assert.match(adaptive, /next\.set\("overview", "1"\)/)
  assert.match(adaptive, /data-life-map-mode=\{selected \? "selected" : "overview"\}/)
})

test('legacy selected-memory card remains unmounted and cannot compete visually', () => {
  assert.match(legacyControls, /data-testid="urai-lifemap-selected-memory-controls"/)
  assert.doesNotMatch(canonical, /<LifeMapDeepLinkControls \/>/)
  assert.doesNotMatch(canonical, /import LifeMapDeepLinkControls/)
  assert.doesNotMatch(adaptive, /life-map-memory-portals|data-life-map-selected-actions-owner/)
})

test('selected action surface remains contained on desktop and mobile', () => {
  assert.match(adaptive, /\.life-map-actions\{position:absolute;z-index:8;left:50%;bottom:max\(26px/)
  assert.match(adaptive, /min-height:48px/)
  assert.match(adaptive, /@media\(max-width:700px\)/)
  assert.match(adaptive, /width:calc\(100vw - 32px\)/)
  assert.match(adaptive, /\.life-map-actions button\{flex:1/)
  assert.match(adaptive, /className="life-map-help"/)
})

test('founder proof requires Focus Replay overview privacy fallback and recovery evidence', () => {
  for (const marker of [
    'focus-destination', 'replay-destination', 'overview-reset', 'escape-unwind',
    'portrait-mobile-selected', 'reduced-motion-arrival', 'signed-out-private-threshold',
    'explicit-disclosed-sample', 'no-webgl-fallback', 'webgl-context-loss',
    'webgl-recovered', 'context-recovery-state-preserved',
  ]) assert.match(proof, new RegExp(marker))
})
