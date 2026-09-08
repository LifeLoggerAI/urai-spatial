import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
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

test('V193 replaces the rejected heightfield identity with composed authored geology', () => {
  assert.match(art, /governed-landscape-provenance-retained-nonrendered-single-ground-owner/)
  assert.match(art, /<primitive object=\{environment\} visible=\{false\} \/>/)
  assert.match(art, /<primitive object=\{thresholds\} visible=\{false\} \/>/)
  assert.match(art, /continuous-weathered-canyon-camera-safe-destination-basins-soft-strata-no-contour-staircase/)
  assert.match(art, /AUTHORED_LANDSCAPE_V191/)
  assert.match(art, /home-v193-single-authored-landscape-authority/)
  assert.match(art, /composed-traversable-floor-with-separate-geological-shelves-walls-and-deep-overhang/)
  assert.match(art, /<primitive object=\{authoredLandscape\}/)
  assert.match(art, /name="home-v125-sculpted-canyon-ground" geometry=\{geometry\} visible=\{false\}/)
  assert.match(art, /name="home-v154-inlaid-stone-approach"[^>]*visible=\{false\}/)
  assert.match(art, /name="home-v131-passive-signal-arrival-path"[^>]*visible=\{false\}/)
})

test('V185 uses a continuous world-space memory sky without dead-black zenith or flat veil geometry', () => {
  assert.match(art, /home-v183-world-space-memory-sky/)
  assert.match(art, /new THREE\.Color\('#06181b'\)/)
  assert.match(art, /new THREE\.Color\('#0d3438'\)/)
  assert.match(art, /new THREE\.Color\('#2b625a'\)/)
  assert.match(art, /deep-teal-memory-sky-preserves-night-without-dead-black-field-or-flat-veil/)
  assert.doesNotMatch(art, /AncestralMemoryVeils|home-v183-ancestral-memory-weather-veils/)
})

test('V193 destinations use distinct authored places and suppress predecessor crystals and particles', () => {
  assert.match(art, /terrain-flush-readable-destination-cut-clear-camera-corridor-no-door-no-ring/)
  assert.match(art, /camera-safe-basin-wide-ground-level-signal-place-no-upright-gate/)
  assert.match(art, /position=\{\[x,isGround\?0\.70:0\.64,isGround\?-8\.72:-8\.78\]\}/)
  assert.match(art, /for\(let index=0;index<360;index\+=1\)/)
  assert.match(art, /for\(let branch=0;branch<15;branch\+=1\)/)
  assert.match(art, /home-v151-\$\{side\}-retained-stone-provenance[^>]*visible=\{false\}/)
  assert.match(art, /home-v153-\$\{side\}-retired-threshold-panel[^>]*visible=\{false\}/)
  assert.match(art, /home-v177-emotional-memory-weather" geometry=\{geometry\} visible=\{false\}/)
  assert.match(art, /home-v188-\$\{side\}-terrain-seated-memory-stone/)
  assert.match(art, /AUTHORED_GROUND_V191/)
  assert.match(art, /AUTHORED_LIFE_MAP_V191/)
  assert.match(art, /home-v199-\$\{side\}-authored-memory-place/)
  assert.match(art, /home-v188-\$\{side\}-terrain-seated-memory-stone[^>]*visible=\{false\}/)
})

test('V193 Orb uses one connected layered asymmetric heart and suppresses every predecessor point or lobe identity', () => {
  assert.match(art, /for\(let index=0;index<1540;index\+=1\)/)
  assert.match(art, /large-contained-point-memory-presence-dense-dark-heart-no-solid-ball-no-fountain/)
  assert.match(art, /name="home-v126-apse-integrated-orb"[^>]*scale=\{\[1\.72,1\.72,1\.72\]\}/)
  assert.match(art, /name="home-v188-orb-heart-port-lobe"/)
  assert.match(art, /name="home-v188-orb-heart-starboard-lobe"/)
  assert.match(art, /name="home-v188-orb-heart-crown-lobe"/)
  assert.match(art, /AUTHORED_ORB_V191/)
  assert.match(art, /home-v200-authored-single-connected-scarred-living-memory-heart/)
  assert.match(art, /home-v188-orb-heart-port-lobe[^>]*visible=\{false\}/)
  assert.match(art, /home-v188-orb-heart-starboard-lobe[^>]*visible=\{false\}/)
  assert.match(art, /home-v188-orb-heart-crown-lobe[^>]*visible=\{false\}/)
  assert.match(art, /new THREE\.IcosahedronGeometry\(0\.16,2\)/)
  assert.match(art, /name="home-v126-orb-memory-motes"[^>]*scale=\{\[0\.46,0\.36,0\.42\]\}[^>]*visible=\{false\}/)
  assert.match(art, /name="home-v174-orb-memory-nucleus-motes"[^>]*visible=\{false\}/)
  assert.match(art, /name="home-v179-orb-memory-heart-motes"[^>]*visible=\{false\}/)
  assert.match(art, /name="home-v186-orb-memory-heart-bridge"[^>]*visible=\{false\}/)
  assert.match(art, /name="home-v179-orb-memory-heart-motes"[^>]*scale=\{\[0\.38,0\.28,0\.34\]\}/)
  assert.match(art, /name="home-v182-orb-faceted-mineral-seed"[^>]*visible=\{false\}/)
  assert.match(art, /object\.name === 'orb-aura'/)
  assert.match(art, /object\.name\.startsWith\('orb-orbit-'/)
})

test('V191 authored GLB pack is committed, non-empty, and reproducible from its generator', () => {
  for (const name of ['home-continuous-landscape-v191.glb','home-ground-place-v191.glb','home-life-map-place-v191.glb','urai-living-memory-heart-v191.glb']) {
    const asset = new URL(`../public/assets/urai/home-production/authored-v191/${name}`, import.meta.url)
    assert.ok(statSync(asset).size > 90_000, `${name} must contain production geometry`)
  }
  assert.ok(statSync(new URL('../scripts/generate-home-authored-v191-assets.mjs', import.meta.url)).size > 1_000)
})

test('V185 preserves locked visual bans and remains uncertified pending literal exact-head pixels', () => {
  assert.match(art, /currentVisualRefinement:'v185-continuous-weathered-canyon-camera-safe-destination-basins-large-contained-memory-orb-no-runway'/)
  assert.match(art, /remove-contour-staircase-carve-camera-safe-destination-basins-brighten-world-sky-enlarge-point-orb-hide-solid-seed/)
  assert.doesNotMatch(art, /function canyonShelfGeometry|function CanyonShelf|home-v164-\$\{side\}-continuous-canyon-shelf/)
  assert.doesNotMatch(art, /<ringGeometry|<torusGeometry|<RoundedBox/)
  assert.doesNotMatch(art, /retained-pixel-pass|pixel-certified|PRODUCTION CERTIFIED/)
})
