import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const appFile = (path) => fs.readFileSync(new URL(`../src/app/${path}`, import.meta.url), 'utf8')

test('permanent movement proof prompt is absent', () => {
  const source = appFile('HomeSpatialRuntimeLayer.tsx')
  assert.doesNotMatch(source, /function HomeMovementPrompt/)
  assert.doesNotMatch(source, /<HomeMovementPrompt \/>/)
})

test('desktop does not mount mobile controls', () => {
  const source = appFile('AssetDrivenHomeWorld.tsx')
  assert.match(source, /mobileControlsVisible/)
  assert.match(source, /coarsePointer\.matches \|\| narrowViewport\.matches/)
  assert.match(source, /mobileControlsVisible \? <MobileMovementPad/)
})

test('canonical camera preserves safe embodied framing', () => {
  const source = appFile('AssetDrivenHomeWorld.tsx')
  assert.match(source, /SPAWN = new THREE\.Vector3\(0, 0, 8\.0\)/)
  assert.match(source, /position: \[0, 1\.82, 8\.0\], fov: 48/)
  assert.match(source, /camera\.position\.set\(position\.current\.x, 1\.82, position\.current\.z\)/)
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

test('accessibility and semantic fallback ownership remain outside visual composition', () => {
  const world = appFile('AssetDrivenHomeWorld.tsx')
  assert.match(world, /HomeFallback reason="no-webgl"/)
  assert.match(world, /prefers-reduced-motion: reduce/)
  assert.match(world, /Why am I seeing this\?/)
  assert.match(world, /aria-disabled=\{!ambientAudioPath\}/)
})
