import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const source=readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx',import.meta.url),'utf8')
const orb=source.slice(source.indexOf('function SacredOrb('),source.indexOf('function HumanPresence'))
const clone=source.slice(source.indexOf('function cloneOrbModel'),source.indexOf('function PouredStone'))
const architecture=source.slice(source.indexOf('function ContinuousVaultSkin'),source.indexOf('function SanctuaryGlazing'))

test('V55 hides every rejected celestial GLB visual child while retaining governed identity and animation',()=>{
  assert.match(source,/v55-governed-orb-glb-retained-for-identity-and-animation-not-visible-glass-starburst/)
  assert.match(clone,/object\.name === 'orb-core'/)
  assert.match(clone,/object\.name === 'orb-heart'/)
  assert.match(clone,/object\.name\.startsWith\('orb-petal-'\)/)
  assert.match(clone,/object\.name\.startsWith\('orb-filament-'\)/)
  assert.match(clone,/object\.visible = false/)
  assert.match(orb,/home-orb-governed-hidden-animation-identity/)
})

test('V55 visible Orb is an authored industrial aperture embedded in a real CC0 machine network',()=>{
  assert.match(source,/home-v55-orb-machine-core-network/)
  assert.match(source,/home-v55-orb-machine-luminous-aperture/)
  assert.match(orb,/home-v55-visible-orb-aperture/)
  assert.match(architecture,/V48_PIPE_SYSTEM/)
  assert.match(architecture,/V48_ROCK_FACE_01/)
  assert.match(architecture,/V48_ROCK_FACE_02/)
  assert.doesNotMatch(orb,/dodecahedronGeometry|icosahedronGeometry|sphereGeometry|torusGeometry|OrbArmorPlate/)
})

test('V55 removes V54 disconnected bars and repeated side arches from the hero composition',()=>{
  assert.match(source,/v55-authored-industrial-pipe-bay-recessed-into-rear-shell-no-floating-load-bars/)
  assert.match(source,/v55-scanned-asymmetric-rock-returns-and-practicals-no-repeated-side-arches-no-bollards/)
  assert.match(source,/v55-recessed-wall-machine-seat-no-pedestal-no-floor-legs-no-disconnected-bars/)
  assert.match(source,/v55-real-cc0-industrial-machine-core-integrated-in-rear-bay-no-starburst-no-floating-struts/)
  assert.doesNotMatch(architecture,/TaperedLoadBeam/)
})

test('V55 camera reduces raw floor dominance and remains candidate-only pending literal pixel review',()=>{
  assert.match(source,/pitch=useRef\(0\.10\)/)
  assert.match(source,/const desiredFov=portrait\?52:47/)
  assert.match(source,/data-home-visual-grade="cinematic-pbr-v55-integrated-industrial-reliquary"/)
  assert.match(source,/data-home-final-art-revision="v55-integrated-industrial-reliquary-candidate"/)
  assert.match(source,/data-home-art-certification="v55-retained-pixel-candidate-not-certified"/)
  assert.doesNotMatch(source,/retained-pixel-pass|pixel-certified|PRODUCTION CERTIFIED/)
})
