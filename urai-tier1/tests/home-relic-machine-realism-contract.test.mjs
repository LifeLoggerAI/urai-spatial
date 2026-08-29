import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const source=readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx',import.meta.url),'utf8')
const architecture=source.slice(source.indexOf('function ContinuousVaultSkin'),source.indexOf('function SanctuaryGlazing'))
const machine=source.slice(source.indexOf('function OrbCradle'),source.indexOf('function SacredOrb'))
const orb=source.slice(source.indexOf('function SacredOrb'),source.indexOf('function HumanPresence'))

test('V57 visible architecture is owned by committed photogrammetry instead of the rejected primitive towers and backboard',()=>{
  assert.match(source,/v57-photogrammetry-service-vault-retained-pixel-rebuild/)
  assert.match(architecture,/home-v57-rear-rock-left/)
  assert.match(architecture,/home-v57-rear-rock-right/)
  assert.match(architecture,/home-v57-upper-rock-crown/)
  assert.match(architecture,/home-v57-left-near-enclosure/)
  assert.match(architecture,/home-v57-right-near-enclosure/)
  assert.doesNotMatch(architecture,/SanctuaryShellMass pack=/)
  assert.doesNotMatch(architecture,/RoundedBox args=\{\[5\.8,3\.95,\.22\]\}/)
  assert.doesNotMatch(architecture,/v56-left-tapered-load-bearing-sanctuary-return|v56-right-tapered-load-bearing-sanctuary-return/)
})

test('V57 machine uses real industrial depth and contains no polygon aperture or primitive clamp constellation',()=>{
  assert.match(machine,/home-v57-orb-machine-depth-frame/)
  assert.match(machine,/home-v57-orb-machine-emitter-housing/)
  assert.match(machine,/v57-real-industrial-service-machine-depth-with-embedded-state-emitter-no-backboard-no-polygon-ring/)
  assert.doesNotMatch(machine,/cylinderGeometry args=\{\[1\.72,1\.86,\.58,12,1,false\]\}/)
  assert.doesNotMatch(machine,/OrbArmorPlate position=/)
  assert.doesNotMatch(machine,/RoundedBox args=\{\[3\.55,\.34,\.58\]\}|RoundedBox args=\{\[3\.2,\.3,\.54\]\}/)
})

test('V57 keeps the Orb interaction core compact and embedded while retaining governed animation identity',()=>{
  assert.match(orb,/home-v57-orb-state-emitter/)
  assert.match(orb,/v57-governed-glb-animation-identity-behind-service-machine/)
  assert.match(orb,/icosahedronGeometry args=\{\[\.17,1\]\}/)
  assert.doesNotMatch(orb,/sphereGeometry|torusGeometry|dodecahedronGeometry/)
})

test('V57 tightens the camera and floor composition instead of hiding unfinished work',()=>{
  assert.match(source,/const SPAWN = new THREE\.Vector3\(2\.75, 0\.04, 5\.35\)/)
  assert.match(source,/const DEFAULT_YAW = 0\.29/)
  assert.match(source,/const desiredFov=portrait\?47:40/)
  assert.match(source,/home-v57-tight-processional-floor-inset/)
})

test('V57 preserves interaction/governance contracts and remains fail-closed until literal pixel review',()=>{
  assert.match(source,/const ORB = new THREE\.Vector3\(0, 2\.18, -6\.0\)/)
  assert.match(source,/data-home-visual-grade="cinematic-pbr-v57-photogrammetry-service-vault"/)
  assert.match(source,/data-home-final-art-revision="v57-photogrammetry-service-vault-candidate"/)
  assert.match(source,/data-home-art-certification="v57-retained-pixel-candidate-not-certified"/)
  assert.match(source,/data-home-animation-owner="photogrammetry-service-v57-plus-governed-orb-identity"/)
  assert.match(source,/requestUraiWorldTravel/)
  assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
