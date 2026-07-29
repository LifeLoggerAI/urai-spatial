import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const canonical = (source) => source.replace(/\r\n/g, '\n').replace(/"/g, "'").replace(/\s+/g, ' ').trim()
const includesCanonical = (source, marker) => canonical(source).includes(canonical(marker))
const template = read('src/app/template.tsx')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const assetHome = read('src/app/AssetDrivenHomeWorld.tsx')
const finalHome = read('src/app/FinalHomeWorld.tsx')
const companion = read('src/spatial/world/PersistentWorldCompanion.tsx')
const css = read('src/app/spatial-runtime-restoration.css')
const structuralCss = read('src/app/continuous-spatial-proof-defects.css')
const proof = read('../scripts/capture-continuous-spatial-proof-v18.mjs')
const stateProof = read('../scripts/capture-home-state-proof.mjs')
const proofWorkflow = read('../.github/workflows/continuous-spatial-visual-proof.yml')
const stateProofWorkflow = read('../.github/workflows/home-state-proof.yml')
const hostStableProof = read('../scripts/run-continuous-spatial-proof-v18-host-stable.mjs')
const groundOwner = read('src/app/ground/page.tsx')
const ground = read('src/app/GroundSpatialWorldClean.tsx')
const groundModel = read('src/app/ground/GroundWorldModel.ts')
const groundScene = read('src/app/ground/EmbodiedGroundScene.tsx')
const groundArchitecture = read('src/app/ground/GroundContinuityArchitecture.tsx')
const lifeMapOwner = read('src/app/life-map/page.tsx')
const groundGateway = read('src/spatial/world/GroundGateway.tsx')
const homeGraph = `${homeRuntime}\n${assetHome}\n${finalHome}`
const groundGraph = `${ground}\n${groundModel}\n${groundScene}\n${groundArchitecture}`
const groundCanonical = canonical(ground)

test('app template mounts current WebGL owners without certified-route redirects', () => {
  for (const marker of ['HomeSpatialRuntimeLayer', 'spatial-runtime-restoration.css', 'continuous-spatial-proof-defects.css']) assert.match(template, new RegExp(marker.replace('.', '\\.')))
  for (const marker of ['asset-driven-primary-with-procedural-degraded-fallback', 'asset-driven-personalized-sanctuary', 'data-home-exploration="walkable"', 'AssetDrivenHomeWorld']) assert.ok(homeRuntime.includes(marker))
  assert.match(assetHome, /data-home-primary-owner="asset-driven"/)
  assert.match(assetHome, /HomeFallback/)
  assert.match(groundOwner, /GroundSpatialWorldClean/)
  assert.match(lifeMapOwner, /SpatialLifeMapCanonical/)
  assert.doesNotMatch(template, /focus|replay/i)
})

test('Home remains one living sanctuary with accessible thresholds and recovery', () => {
  for (const marker of ['FinalHomeWorld', 'Stars', 'SanctuaryWorld', 'data-home-spatial-renderer="webgl"', 'data-home-visible-world="final-physical-sanctuary-memory-rooms"', 'data-home-movement="walk-keyboard-click-touch"', 'data-home-pointer-lock="false"', 'data-testid="urai-home-walkable-surface"', 'data-testid="urai-home-webgl-orb"', 'data-testid="urai-home-embodied-avatar"', 'home-authored-entry-chamber', 'home-embodied-presence-interaction']) assert.ok(homeGraph.includes(marker), `missing Home marker: ${marker}`)
  assert.match(groundGateway, /Open the ground and descend into Hidden Infrastructure/)
  assert.doesNotMatch(homeGraph, /requestPointerLock|OrbitControls|EffectComposer|<Bloom\b|<Vignette\b/)
  assert.match(homeRuntime, /requestUraiWorldOrbOpen/)
  assert.match(homeRuntime, /webglcontextlost/)
  assert.match(homeRuntime, /webglcontextrestored/)
  assert.match(companion, /URAI_WORLD_ORB_OPEN_EVENT/)
  assert.match(assetHome, /Your private world is forming/)
})

test('visual overrides cannot veil active spatial owners', () => {
  assert.match(css, /html:has\(\.urai-home-spatial-runtime-layer\)/)
  assert.match(structuralCss, /living Home canvas owns the painted world/i)
  for (const marker of ['content: none !important', 'border-radius: 0 !important', 'clip-path: none !important', 'filter: none !important', 'backdrop-filter: none !important']) assert.ok(structuralCss.includes(marker))
})

test('Ground keeps procedural workforce ownership and contained navigation', () => {
  for (const marker of ["id: 'reception'", "id: 'privacy'", "id: 'mirror'", "id: 'passport'", "id: 'focus'", "id: 'replay'", 'data-ground-destination', 'data-testid="urai-ground-private-workforce-world"', 'GroundContinuityArchitecture', 'EmbodiedGroundScene']) assert.ok(includesCanonical(groundGraph, marker), `missing Ground marker: ${marker}`)
  assert.doesNotMatch(groundGraph, /authored-provider-art|ground-authored-art/)
  assert.ok(includesCanonical(ground, 'useMovementInput({'))
  assert.ok(includesCanonical(ground, '<MobileMovementPad'))
  assert.match(groundCanonical, /min-height:48px/)
})

test('browser proof and supplemental state proof cover required exact-head evidence', () => {
  for (const marker of ["schemaVersion: 'urai-continuous-spatial-visual-proof-18'", "id: 'home-normal-root'", "id: 'home-normal-home'", 'portrait-mobile', 'landscape-mobile', 'homeOrbState', 'Orb_Resting', 'Orb_Transition', 'recordVideo', 'home-pointer-look-desktop', 'capturePortal', 'home-no-webgl-fallback', 'receipt.json']) assert.ok(proof.includes(marker), `missing primary proof marker: ${marker}`)
  for (const marker of ['homeState=permission-limited', 'homeState=unavailable', 'homeState=offline', 'reducedMotion', 'forcedColors', 'home-real-offline-transition', '--enable-unsafe-swiftshader']) assert.ok(stateProof.includes(marker), `missing supplemental state proof marker: ${marker}`)
  assert.doesNotMatch(`${proof}\n${stateProof}`, /waitForTimeout/)
  assert.match(proofWorkflow, /capture-continuous-spatial-proof-v18\.mjs/)
  assert.match(stateProofWorkflow, /capture-home-state-proof\.mjs/)
})

test('Life Map owner and legacy veil suppression remain full viewport', () => {
  assert.match(structuralCss, /data-testid="urai-true-3d-life-map"/)
  assert.match(structuralCss, /position: fixed !important/)
  assert.match(structuralCss, /height: 100svh !important/)
  assert.match(css, /\.ground-provider-art\s*\{\s*display: none !important;/s)
  assert.match(css, /prefers-reduced-motion: reduce/)
})

test('Home portal phases and generated manifest filter remain observable on a saturated host', () => {
  assert.match(assetHome, /const traversalHold = reducedMotion \? 80 : 560/)
  assert.match(assetHome, /const closingHold = reducedMotion \? 60 : 360/)
  assert.match(assetHome, /schedule\(traversalDelay,[\s\S]*setPhase\('traversal'\)[\s\S]*schedule\(traversalHold,[\s\S]*setPhase\('closing'\)[\s\S]*schedule\(closingHold,[\s\S]*requestUraiWorldTravel/)
  assert.doesNotMatch(assetHome, /const closingDelay =|const travelDelay =/)
  assert.ok(hostStableProof.includes('const manifestRegexSource = String.raw`&& /^\\/assets\\/urai'))
  assert.ok(hostStableProof.includes('const escapedManifestRegexSource = String.raw`&& /^\\\\/assets\\\\/urai'))
  assert.ok(hostStableProof.includes('.replace(manifestRegexSource, escapedManifestRegexSource)'))
})
