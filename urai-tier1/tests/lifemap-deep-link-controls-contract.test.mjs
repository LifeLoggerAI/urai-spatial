import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const legacyControls = read('src/spatial/lifemap/LifeMapDeepLinkControls.tsx')
const canonical = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')
const boundary = read('src/components/lifemap/LifeMapRouteBoundary.tsx')
const scene = read('src/components/lifemap/ComposedLifeMapScene.tsx')
const navigator = read('src/components/lifemap/LifeMapSemanticNavigator.tsx')
const proof = read('../scripts/capture-lifemap-founder-proof.mjs')

test('canonical Life Map has one spatial selected-memory action owner plus semantic navigation', () => {
  assert.match(canonical, /data-selected-memory-owner="spatial-lens-only"/)
  assert.match(boundary, /<ComposedLifeMapScene \/>/)
  assert.match(boundary, /<LifeMapSemanticNavigator \/>/)
  assert.doesNotMatch(canonical, /LifeMapDeepLinkControls|urai-lifemap-deep-link-controls/)
  assert.match(scene, /className="life-map-actions"/)
  assert.match(scene, /aria-label="Selected memory actions"/)
  assert.match(scene, /router\.push\(destinationHref\("focus"\)\)/)
  assert.match(scene, /router\.push\(destinationHref\("replay"\)\)/)
  assert.match(navigator, /data-life-map-navigator/)
  assert.match(navigator, /aria-label="Search and filter Life Map"/)
  assert.doesNotMatch(navigator, /aria-label="Selected memory actions"/)
})

test('selected-memory identity and Focus Replay destinations remain owned by the spatial scene', () => {
  assert.match(scene, /function safeToken/)
  assert.match(scene, /slice\(0, 120\)/)
  assert.match(scene, /const queryNode = safeToken\(params\.get\("node"\) \|\| params\.get\("memoryId"\)\)/)
  assert.match(scene, /const manifestId = safeToken\(params\.get\("manifestId"\), DEFAULT_MANIFEST_ID\)/)
  assert.match(scene, /next\.set\("memoryId", selected\.id\)/)
  assert.match(scene, /next\.set\("manifestId", manifestId\)/)
  assert.match(scene, /next\.set\("node", selected\.id\)/)
  assert.match(scene, /next\.set\("returnNode", selected\.id\)/)
  assert.match(scene, /next\.set\("from", "life-map"\)/)
  assert.match(scene, /return `\/\$\{route\}\?\$\{next\.toString\(\)\}`/)
})

test('Overview clears selected identity and restores the same universe', () => {
  assert.match(scene, /params\.get\("overview"\) === "1" \? null : queryNode \|\| null/)
  assert.match(scene, /setSelectedId\(null\)/)
  assert.match(scene, /setPhase\("overview"\)/)
  assert.match(scene, /next\.set\("overview", "1"\)/)
  assert.match(scene, /data-life-map-mode=\{selected \? "selected" : "overview"\}/)
})

test('legacy selected-memory card remains unmounted and cannot compete visually', () => {
  assert.match(legacyControls, /data-testid="urai-lifemap-selected-memory-controls"/)
  assert.doesNotMatch(canonical, /<LifeMapDeepLinkControls \/>/)
  assert.doesNotMatch(canonical, /import LifeMapDeepLinkControls/)
  assert.doesNotMatch(scene, /life-map-memory-portals|data-life-map-selected-actions-owner/)
})

test('selected action surface remains contained on desktop and mobile', () => {
  assert.match(scene, /\.life-map-actions\{position:absolute;z-index:8;left:50%;bottom:max\(26px/)
  assert.match(scene, /min-height:48px/)
  assert.match(scene, /@media\(max-width:700px\)/)
  assert.match(scene, /width:calc\(100vw - 32px\)/)
  assert.match(scene, /\.life-map-actions button\{flex:1/)
  assert.match(scene, /className="life-map-help"/)
})

test('founder proof requires Focus Replay overview privacy fallback and recovery evidence', () => {
  for (const marker of [
    'focus-destination', 'replay-destination', 'overview-reset', 'escape-unwind',
    'portrait-mobile-selected', 'reduced-motion-arrival', 'signed-out-private-threshold',
    'explicit-disclosed-sample', 'no-webgl-fallback', 'webgl-context-loss',
    'webgl-recovered', 'context-recovery-state-preserved',
  ]) assert.match(proof, new RegExp(marker))
})
