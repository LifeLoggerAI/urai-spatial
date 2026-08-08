import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const pageSource = fs.readFileSync(new URL('../src/app/life-map/page.tsx', import.meta.url), 'utf8')
const canonicalSource = fs.readFileSync(new URL('../src/spatial/lifemap/SpatialLifeMapCanonical.tsx', import.meta.url), 'utf8')
const boundarySource = fs.readFileSync(new URL('../src/components/lifemap/LifeMapRouteBoundary.tsx', import.meta.url), 'utf8')
const sceneSource = fs.readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const worldSource = fs.readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8')
const homeSource = fs.readFileSync(new URL('../src/app/HomeSpatialWorldFinal.tsx', import.meta.url), 'utf8')
const transitionCss = fs.readFileSync(new URL('../src/app/urai-canon-camera-transitions.css', import.meta.url), 'utf8')

 test('Life Map route resolves directly to the final canonical galaxy after Home ascent', () => {
  assert.match(pageSource, /SpatialLifeMapCanonical/)
  assert.doesNotMatch(pageSource, /RealLifeMapGalaxy|LifeMapAscentGate|TierOneExperience/)
  assert.match(canonicalSource, /LifeMapRouteBoundary/)
  assert.match(boundarySource, /ComposedLifeMapScene/)
  assert.match(homeSource, /\/life-map\?from=home-sky/)
  assert.match(homeSource, /HOME_CAMERA_ASCENT_MS/)
  assert.match(homeSource, /navigateThroughThreshold/)
})

test('Home ascent truth and camera state remain separate from destination readiness', () => {
  assert.match(homeSource, /data-transition-target=\{transitionTarget \?\? 'idle'\}/)
  assert.match(homeSource, /transitionTarget === 'sky'/)
  assert.match(homeSource, /urai-genesis-home__camera-ascent-signal/)
  assert.match(homeSource, /data-home-avatar-orb="anchored-at-home"/)
  assert.match(homeSource, /The orb stays anchored at Home\. Ground and Life Map are camera moves\./)
})

test('ascent copy stays cinematic and avoids obsolete loading overlays', () => {
  assert.match(homeSource, /<span style=\{thresholdEyebrowStyle\}>Sky<\/span>/)
  assert.match(homeSource, /<strong style=\{thresholdLabelStyle\}>Ascend<\/strong>/)
  assert.match(homeSource, /Ground below · memory above/)
  assert.doesNotMatch(pageSource, /ASCENT ACTIVE|Preparing your memory map|Opening your Life Map\./)
})

test('ascent transition has a bounded timer and reduced-motion escape hatch', () => {
  assert.match(homeSource, /window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)/)
  assert.match(homeSource, /target === 'sky' \? HOME_CAMERA_ASCENT_MS : HOME_GROUND_DESCENT_MS/)
  assert.match(transitionCss, /uraiCanonHomeAscendToLifeMap/)
  assert.match(transitionCss, /uraiCanonSkyGateIgnites/)
})

test('destination becomes interactive through canonical Life Map-owned controls', () => {
  assert.match(sceneSource, /data-testid="urai-true-3d-life-map"/)
  assert.match(worldSource, /const semanticLabel = artifactFamilyLabel\(node\)/)
  assert.match(worldSource, /userData=\{\{[^}]*artifactFamily: resolveArtifactFamily\(node\)[^}]*semanticLabel[^}]*runtimeAsset: MEMORY_STAR_MODEL[^}]*\}\}/s)
  assert.doesNotMatch(worldSource, /data-semantic-label|data-artifact-family/)
  assert.match(worldSource, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); onSelect\(node\); \}\}/)
  assert.match(sceneSource, /aria-label="Selected memory actions"/)
  assert.match(sceneSource, /Enter Focus/)
  assert.match(sceneSource, /Replay/)
  assert.match(sceneSource, /Overview/)
  assert.match(sceneSource, /router\.push\("\/home"\)/)
  assert.doesNotMatch(sceneSource, /Orb companion|life-map-embodied-controls/)
})
