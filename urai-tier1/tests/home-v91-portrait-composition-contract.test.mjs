import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const runtime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV70.tsx', import.meta.url), 'utf8')
const art = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/spatial/layout/HomeWorldProduction.module.css', import.meta.url), 'utf8')

test('V185 preserves the single opaque responsive Canvas owner', () => {
  assert.doesNotMatch(runtime, /backgroundImage:/)
  assert.match(runtime, /data-home-desktop-mobile-world="same-scene"/)
  assert.match(runtime, /alpha: false/)
  assert.match(runtime, /gl\.setClearColor\(0x080b0b, 1\)/)
  assert.match(runtime, /const fov = portrait \? 50 : 40/)
  assert.match(styles, /\.canvas/)
})

test('V185 removes the contour-staircase and carves camera-safe destination basins while preserving one road-free terrain authority', () => {
  assert.match(art, /governed-landscape-provenance-retained-nonrendered-single-ground-owner/)
  assert.match(art, /<primitive object=\{environment\} visible=\{false\} \/>/)
  assert.match(art, /<primitive object=\{thresholds\} visible=\{false\} \/>/)
  assert.match(art, /const xSegments = 96/)
  assert.match(art, /const zSegments = 128/)
  assert.match(art, /const groundCameraBasin = Math\.exp/)
  assert.match(art, /const lifeCameraBasin = Math\.exp/)
  assert.match(art, /const cameraSafeCarve = groundCameraBasin\*1\.42 \+ lifeCameraBasin\*1\.50/)
  assert.match(art, /const terraceHeight = 0\.14/)
  assert.match(art, /const ridgeMask = THREE\.MathUtils\.clamp\([^\n]+,0,0\.16\)/)
  assert.match(art, /continuous-weathered-canyon-camera-safe-destination-basins-soft-strata-no-contour-staircase/)
  assert.match(art, /normalScale=\{new THREE\.Vector2\(1\.46,1\.46\)\}/)
  assert.match(art, /name="home-v154-inlaid-stone-approach"[^>]*visible=\{false\}/)
  assert.match(art, /name="home-v131-passive-signal-arrival-path"[^>]*visible=\{false\}/)
})

test('V185 uses a continuous world-space memory sky without dead-black zenith or flat veil geometry', () => {
  assert.match(art, /home-v183-world-space-memory-sky/)
  assert.match(art, /new THREE\.Color\('#06181b'\)/)
  assert.match(art, /new THREE\.Color\('#0d3438'\)/)
  assert.match(art, /new THREE\.Color\('#2b625a'\)/)
  assert.match(art, /deep-teal-memory-sky-preserves-night-without-dead-black-field-or-flat-veil/)
  assert.doesNotMatch(art, /ancestral-weather-veil|weather-veil-/)
})

test('V185 destinations are broad ground-level signal places in camera-safe basins, never gates or slabs', () => {
  assert.match(art, /terrain-flush-readable-destination-cut-clear-camera-corridor-no-door-no-ring/)
  assert.match(art, /camera-safe-basin-wide-ground-level-signal-place-no-upright-gate/)
  assert.match(art, /position=\{\[x,isGround\?0\.70:0\.64,isGround\?-8\.72:-8\.78\]\}/)
  assert.match(art, /for\(let index=0;index<360;index\+=1\)/)
  assert.match(art, /for\(let branch=0;branch<15;branch\+=1\)/)
  assert.match(art, /home-v151-\$\{side\}-retained-stone-provenance[^>]*visible=\{false\}/)
  assert.match(art, /home-v153-\$\{side\}-retired-threshold-panel[^>]*visible=\{false\}/)
})

test('V185 Orb is a larger contained point-memory presence with the solid seed suppressed', () => {
  assert.match(art, /for\(let index=0;index<1540;index\+=1\)/)
  assert.match(art, /large-contained-point-memory-presence-dense-dark-heart-no-solid-ball-no-fountain/)
  assert.match(art, /name="home-v126-apse-integrated-orb"[^>]*scale=\{\[1\.72,1\.72,1\.72\]\}/)
  assert.match(art, /name="home-v126-orb-memory-motes"[^>]*scale=\{\[1\.34,0\.92,1\.18\]\}/)
  assert.match(art, /name="home-v179-orb-memory-heart-motes"[^>]*scale=\{\[0\.38,0\.28,0\.34\]\}/)
  assert.match(art, /name="home-v182-orb-faceted-mineral-seed"[^>]*visible=\{false\}/)
  assert.match(art, /object\.name === 'orb-aura'/)
  assert.match(art, /object\.name\.startsWith\('orb-orbit-'/)
})

test('V185 preserves locked visual bans and remains uncertified pending literal exact-head pixels', () => {
  assert.match(art, /currentVisualRefinement:'v185-continuous-weathered-canyon-camera-safe-destination-basins-large-contained-memory-orb-no-runway'/)
  assert.match(art, /remove-contour-staircase-carve-camera-safe-destination-basins-brighten-world-sky-enlarge-point-orb-hide-solid-seed/)
  assert.doesNotMatch(art, /function canyonShelfGeometry|function CanyonShelf|home-v164-\$\{side\}-continuous-canyon-shelf/)
  assert.doesNotMatch(art, /<ringGeometry|<torusGeometry|<RoundedBox/)
  assert.doesNotMatch(art, /retained-pixel-pass|pixel-certified|PRODUCTION CERTIFIED/)
})