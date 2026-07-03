import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const pageSource = fs.readFileSync(new URL('../src/app/life-map/page.tsx', import.meta.url), 'utf8')
const homeSource = fs.readFileSync(new URL('../src/app/HomeSpatialWorldFinal.tsx', import.meta.url), 'utf8')
const transitionCss = fs.readFileSync(new URL('../src/app/urai-canon-camera-transitions.css', import.meta.url), 'utf8')
const galaxySource = fs.readFileSync(new URL('../src/components/lifemap/RealLifeMapGalaxy.tsx', import.meta.url), 'utf8')

test('Life Map route resolves directly to the final galaxy after Home ascent', () => {
  assert.match(pageSource, /RealLifeMapGalaxy/)
  assert.doesNotMatch(pageSource, /LifeMapAscentGate|TierOneExperience/)
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

test('destination becomes interactive as the final galaxy owner', () => {
  assert.match(galaxySource, /onPointerMove/)
  assert.match(galaxySource, /onPointerLeave/)
  assert.match(galaxySource, /aria-label="Private memory constellation"/)
  assert.match(galaxySource, /Enter Focus/)
})
