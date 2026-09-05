import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const runtime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV70.tsx', import.meta.url), 'utf8')
const art = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/spatial/layout/HomeWorldProduction.module.css', import.meta.url), 'utf8')

test('V105 uses one opaque responsive Canvas with balanced portrait hierarchy', () => {
  assert.doesNotMatch(runtime, /backgroundImage:/)
  assert.match(runtime, /data-home-desktop-mobile-world="same-scene"/)
  assert.match(runtime, /alpha: false/)
  assert.match(runtime, /gl\.setClearColor\(0x080b0b, 1\)/)
  assert.match(runtime, /camera=\{\{ position: \[SPAWN\.x, 1\.60, SPAWN\.z\], fov: 42/)
  assert.match(runtime, /const fov = portrait \? 58 : 42/)
  assert.doesNotMatch(runtime, /const fov = portrait \? 86 : 42/)
  assert.match(styles, /\.canvas/)
})

test('V148 keeps geology bounded and opens portrait threshold framing around the ground, fissures, apse, and Orb', () => {
  assert.doesNotMatch(art, /SANCTUARY_BACKDROP|scene\.userData\.sanctuaryBackdrop/)
  assert.match(art, /function SculptedCanyonGround/)
  assert.match(art, /name="home-v125-sculpted-canyon-ground"/)
  assert.match(art, /function SanctuaryTerraces/)
  assert.match(art, /home-v126-continuous-walkable-terrace-network/)
  assert.match(art, /function GeologicalFrame/)
  assert.match(art, /name="home-v126-bounded-geological-edge-masses"/)
  assert.match(art, /function FramedFissure/)
  assert.match(art, /home-v126-\$\{side\}-framed-fissure/)
  assert.match(art, /v148-wide-smooth-recessed-threshold-inside-open-buttress-wing/)
  assert.match(art, /scale=\{isGround \? \[0\.90, 0\.86, 0\.68\] : \[0\.84, 0\.82, 0\.64\]\}/)
  assert.match(art, /const portalScaleX = left \? 0\.96 : 0\.90/)
  assert.match(art, /const portalScaleY = left \? 0\.88 : 0\.84/)
  assert.match(art, /home-v148-open-buttress-threshold-sanctuary/)
  assert.match(art, /function ApseAndOrbCradle/)
  assert.match(art, /home-v126-layered-apse-orb-cradle/)
  assert.match(art, /function LivingOrb/)
  assert.match(art, /name="home-v126-apse-integrated-orb"/)
  assert.match(art, /name="home-v125-atmospheric-depth-motes"/)
  assert.match(art, /activeArtRevision: 'v148-open-buttress-thresholds-wide-smooth-apertures'/)
  assert.match(art, /object\.name === 'orb-aura'/)
  assert.match(art, /object\.name\.startsWith\('orb-orbit-'/)
  assert.doesNotMatch(art, /<ringGeometry|<torusGeometry/)
})
