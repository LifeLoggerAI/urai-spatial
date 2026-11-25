import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const appFile = (path) => fs.readFileSync(new URL(`../src/app/${path}`, import.meta.url), 'utf8')
const spatialFile = (path) => fs.readFileSync(new URL(`../src/spatial/${path}`, import.meta.url), 'utf8')

function productionHomeSource() {
  // The app adapter delegates composition; inspect the actual rendered owner.
  assert.match(appFile('AssetDrivenHomeWorld.tsx'), /<HomeWorldProduction /)
  assert.match(spatialFile('layout/HomeWorldProduction.tsx'), /HomeWorldProductionPolished as HomeWorldProduction/)
  return spatialFile('layout/HomeWorldProductionPolished.tsx')
}

test('permanent movement proof prompt is absent', () => {
  const source = appFile('HomeSpatialRuntimeLayer.tsx')
  assert.doesNotMatch(source, /function HomeMovementPrompt/)
  assert.doesNotMatch(source, /<HomeMovementPrompt \/>/)
})

test('desktop does not mount mobile controls', () => {
  const source = productionHomeSource()
  assert.match(source, /const \[mobileControls, setMobileControls\] = useState\(false\)/)
  assert.match(source, /window\.matchMedia\('\(pointer: coarse\), \(max-width: 700px\)'\)/)
  assert.match(source, /setMobileControls\(mobile\.matches\)/)
  assert.match(source, /!transitioning && mobileControls \? <MobileMovementPad/)
})

test('canonical camera preserves terrain-relative bodyless first-person framing', () => {
  const source = productionHomeSource()
  assert.match(source, /SPAWN = new THREE\.Vector3\(-0\.85, 0, 8\.4\)/)
  assert.match(source, /position:\[SPAWN\.x,1\.68,SPAWN\.z\], fov:50/)
  assert.match(source, /position\.current\.y = homeWalkSurfaceHeight\(position\.current\.x, position\.current\.z\)/)
  assert.match(source, /copy\(position\.current\)\.add\(new THREE\.Vector3\(0, portrait \? 1\.58 : 1\.68, \.14\)\)/)
  assert.match(source, /data-home-embodied-self="privacy-preserving-shadow"/)
})

test('Home is source-owned as a personal sanctuary rather than proof geometry', () => {
  const source = appFile('HomeSanctuaryWorld.tsx')
  assert.match(source, /worldIdentity: 'personal-sanctuary'/)
  assert.match(source, /visualLanguage: 'moonlit-obsidian-jade-sanctuary'/)
  assert.match(source, /directVisualReviewRequired: true/)
  assert.match(source, /home-grounded-horizon/)
  assert.match(source, /home-calm-orb-approach-path/)
  assert.match(source, /home-orb-sanctum-primary-focal-anchor/)
  assert.match(source, /home-embodied-self-silhouette/)
  assert.match(source, /living-place-not-icon-bubble/)
})

test('Orb hierarchy is primary and side destinations remain supporting', () => {
  const source = appFile('HomeSanctuaryWorld.tsx')
  assert.match(source, /visualPriority: 'primary'/)
  assert.match(source, /worldRole: 'emotional-core'/)
  assert.match(source, /visualPriority: 'supporting'/)
  assert.match(source, /destinationHierarchy: 'supporting'/)
  assert.doesNotMatch(source, /home-memory-vignette-/)
  assert.doesNotMatch(source, /<torusGeometry/)
  assert.doesNotMatch(source, /<capsuleGeometry/)
  assert.doesNotMatch(source, /SanctuaryRib/)
})

test('sanctuary materials and atmosphere are grounded and restrained', () => {
  const source = appFile('HomeSanctuaryWorld.tsx')
  assert.match(source, /roughness=\{\.9\}/)
  assert.match(source, /home-restrained-living-atmosphere/)
  assert.match(source, /home-moonlit-living-sky/)
  assert.match(source, /GroundMist/)
  assert.doesNotMatch(source, /transparent opacity=\{\.52\} transmission=\{\.18\}/)
})

test('Home explains WebGL and renderer failures and leaves semantic navigation and opted-in audio with their owners', () => {
  const runtime = appFile('HomeSpatialRuntimeLayer.tsx')
  const audio = spatialFile('audio/SpatialAmbientRuntime.tsx')
  assert.doesNotMatch(appFile('AssetDrivenHomeWorld.tsx'), /<HomeSemanticNavigation|<HomeFallback/)
  assert.match(runtime, /webglAvailable === false \|\| rendererState === 'failed'/)
  assert.match(runtime, /data-testid="urai-home-accessible-fallback"/)
  assert.match(runtime, /data-webgl-ready="false"/)
  assert.match(runtime, /data-home-assets-ready="false"/)
  assert.match(runtime, /role="status" aria-live="polite"[\s\S]*WebGL is unavailable[\s\S]*Home assets could not load[\s\S]*spatial renderer could not recover/)
  assert.match(runtime, /<HomeSemanticNavigation spatialAvailable=\{false\} spatialReady=\{false\} \/>/)
  assert.match(runtime, /aria-label="Open Life Map directly without WebGL"/)
  assert.match(runtime, /@media\(prefers-reduced-motion:reduce\).*animation:none/)
  assert.match(spatialFile('world/UraiWorldShell.tsx'), /<SpatialAmbientRuntime onPlayback=\{setAmbientPlayback\} retryRef=\{retryAmbient\} \/>/)
  assert.match(audio, /useState\(false\); const \[muted,setMuted\]=useState\(true\)/)
  assert.match(audio, /if\(consented&&!muted&&!sensorySafe\)audio\.setAmbientPhase\(spatialPhase\);else audio\.stopAmbient\(\)/)
})

test('Home offers a user-facing explanation of the displayed scene and its sources', () => {
  const mountedHome = [
    appFile('HomeSpatialRuntimeLayer.tsx'), appFile('HomeSpatialWorldFinal.tsx'),
    appFile('AssetDrivenHomeWorld.tsx'), productionHomeSource(),
  ].join('\n')
  assert.ok(/Why am I seeing this\?/.test(mountedHome), 'The active Home owners lack their scene-source explanation control')
  assert.ok(/Home source explanation/.test(mountedHome), 'The control must open the per-scene source explanation')
})

test('the mounted sound control exposes an unavailable ambient track as disabled', () => {
  const shell = spatialFile('world/UraiWorldShell.tsx')
  assert.match(shell, /<PersistentWorldCompanion ambientPlayback=\{ambientPlayback\} onRetryAmbient=\{retryPlayback\} \/>/)
  const companion = spatialFile('world/PersistentWorldCompanion.tsx')
  const toggle = companion.match(/<button\b[^<>]*data-world-target="spatial-audio-toggle"[^<>]*>[\s\S]*?<\/button>/)?.[0]
  assert.ok(toggle, 'The world companion must expose its spatial sound control')
  assert.ok(toggle.includes('aria-disabled=') && /unavailable/i.test(toggle),
    'The active sound control lacks accessible disabled feedback for an unavailable ambient track')
})
