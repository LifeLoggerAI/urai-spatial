import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const runtime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV70.tsx', import.meta.url), 'utf8')
const art = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/spatial/layout/HomeWorldProduction.module.css', import.meta.url), 'utf8')

test('V165 keeps one opaque responsive Canvas with the proven responsive framing', () => {
  assert.doesNotMatch(runtime, /backgroundImage:/)
  assert.match(runtime, /data-home-desktop-mobile-world="same-scene"/)
  assert.match(runtime, /alpha: false/)
  assert.match(runtime, /gl\.setClearColor\(0x080b0b, 1\)/)
  assert.match(runtime, /camera=\{\{ position: \[SPAWN\.x, 1\.60, SPAWN\.z\], fov: 42/)
  assert.match(runtime, /const fov = portrait \? 50 : 40/)
  assert.doesNotMatch(runtime, /const fov = portrait \? 58 : 42/)
  assert.doesNotMatch(runtime, /const fov = portrait \? 86 : 42/)
  assert.match(styles, /\.canvas/)
})

test('V165 removes V164 slab and capsule regressions while preserving no-runway, no-gate, and no-pedestal contracts', () => {
  assert.match(art, /function SculptedCanyonGround/)
  assert.match(art, /smoothed-open-basin-clear-camera-corridors-no-road-groove/)
  assert.match(art, /const xSegments = 64/)
  assert.match(art, /const zSegments = 88/)
  assert.match(art, /normalScale=\{new THREE\.Vector2\(0\.38, 0\.38\)\}/)
  assert.match(art, /name="home-v154-inlaid-stone-approach"[^>]*visible=\{false\}/)
  assert.match(art, /name="home-v131-passive-signal-arrival-path"[^>]*visible=\{false\}/)
  assert.match(art, /<primitive object=\{thresholds\} visible=\{false\} \/>/)
  assert.match(art, /legacy-alcove-meshes-remain-disabled-no-gate-facade/)

  assert.doesNotMatch(art, /function canyonShelfGeometry/)
  assert.doesNotMatch(art, /function CanyonShelf/)
  assert.doesNotMatch(art, /home-v164-\$\{side\}-continuous-canyon-shelf/)
  assert.match(art, /scan-provenance-pushed-beyond-clear-navigation-corridors-no-card-slabs/)
  assert.match(art, /low-broad-canyon-silhouettes-clear-destination-camera-corridors-no-piles/)
  assert.match(art, /far-port-weathered-ridge[^\n]*scale: \[4\.20, 0\.88, 1\.50\]/)
  assert.match(art, /far-starboard-weathered-ridge[^\n]*scale: \[4\.46, 0\.94, 1\.56\]/)
  assert.match(art, /mid-port-canyon-shoulder[^\n]*scale: \[2\.72, 0\.54, 1\.14\]/)
  assert.match(art, /mid-starboard-canyon-shoulder[^\n]*scale: \[2\.84, 0\.54, 1\.18\]/)

  assert.match(art, /terrain-flush-readable-destination-cut-clear-camera-corridor-no-door-no-ring/)
  assert.match(art, /scale=\{isGround \? \[0\.38, 0\.58, 0\.34\] : \[0\.37, 0\.59, 0\.34\]\}/)
  assert.match(art, /low-lateral-apse-geology-clear-under-orb-air-gap-no-pedestal/)

  assert.match(art, /name="home-v126-apse-integrated-orb"[^>]*scale=\{\[1\.18, 1\.18, 1\.18\]\}/)
  assert.match(art, /contained-memory-mote-heart-primary-presence-no-capsule-no-aura-no-pedestal/)
  assert.match(art, /name="home-v132-orb-memory-volume"[^>]*scale=\{\[0\.58, 0\.64, 0\.56\]\}/)
  assert.match(art, /transparent opacity=\{0\.15\}/)
  assert.match(art, /name="home-v126-orb-memory-motes"[^>]*scale=\{\[0\.92, 0\.94, 0\.90\]\}/)
  assert.match(art, /name="home-v154-orb-memory-depth-motes"[^>]*scale=\{\[0\.99, 1\.00, 0\.96\]\}/)
  assert.match(art, /name="home-v133-orb-memory-seed"[^>]*scale=\{\[0\.38, 0\.44, 0\.34\]\}/)
  assert.match(art, /<primitive object=\{orb\} visible=\{false\} \/>/)

  assert.match(art, /bounded-depth-motes-reduced-render-load-no-screen-overlay/)
  assert.match(art, /currentVisualRefinement: 'v165-smoothed-canyon-corridors-contained-orb-no-runway'/)
  assert.match(art, /remove-v164-jagged-connected-shelves-clear-camera-corridors-contain-orb-shell/)
  assert.match(art, /const rejectedHorizonRepeat = object\.name\.startsWith\('horizon-mountain-'\)/)
  assert.match(art, /object\.name === 'orb-aura'/)
  assert.match(art, /object\.name\.startsWith\('orb-orbit-'/)
  assert.doesNotMatch(art, /function layeredSanctuaryWingGeometry|function cradleSupportGeometry/)
  assert.doesNotMatch(art, /<ringGeometry|<torusGeometry|<RoundedBox/)
  assert.doesNotMatch(art, /retained-pixel-pass|pixel-certified|PRODUCTION CERTIFIED/)
})
