import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const source=readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx',import.meta.url),'utf8')
const architecture=source.slice(source.indexOf('function ContinuousVaultSkin'),source.indexOf('function SanctuaryGlazing'))
const cavity=source.slice(source.indexOf('function MachineCavityLiner'),source.indexOf('function SanctuarySideGallery'))
const machine=source.slice(source.indexOf('function OrbCradle'),source.indexOf('function SacredOrb'))
const orb=source.slice(source.indexOf('function SacredOrb'),source.indexOf('function HumanPresence'))

test('V56 removes the detached scanned-rock slab composition from visible sanctuary ownership',()=>{
  assert.match(source,/v56-wall-integrated-reliquary-retained-pixel-rebuild/)
  assert.match(architecture,/v56-deep-continuous-sanctuary-shell-no-detached-rock-slabs-no-facade-stage/)
  assert.match(architecture,/v56-continuous-tapered-side-returns-rooted-floor-to-vault-no-detached-scanned-slabs/)
  assert.doesNotMatch(architecture,/home-v55-left-near-rock-return|home-v55-right-near-rock-return|home-v55-left-scanned-reliquary-return|home-v55-right-scanned-reliquary-return/)
  assert.doesNotMatch(architecture,/V48_ROCK_FACE_01|V48_ROCK_FACE_02/)
})

test('V56 keeps real industrial service detail recessed instead of making a pipe rack the focal object',()=>{
  assert.match(cavity,/home-v56-recessed-service-network/)
  assert.match(cavity,/v56-recessed-service-cavity-behind-machine-face-no-exposed-pipe-rack-focal/)
  assert.match(cavity,/V48_PIPE_SYSTEM/)
  assert.doesNotMatch(machine,/V48_PIPE_SYSTEM/)
  assert.doesNotMatch(machine,/home-v55-orb-machine-core-network/)
})

test('V56 machine is a wall-integrated faceted aperture with overlapping load paths and no pedestal or crossbars',()=>{
  assert.match(machine,/v56-wall-integrated-two-jaw-load-path-no-pedestal-no-crossbars-no-floor-legs/)
  assert.match(machine,/v56-faceted-wall-integrated-machine-aperture-with-recessed-service-network-no-pipe-rack-no-display-stand/)
  assert.match(machine,/cylinderGeometry args=\{\[1\.72,1\.86,\.58,12,1,false\]\}/)
  assert.match(machine,/OrbArmorPlate position=\{\[-1\.24,2\.92,-5\.95\]\}/)
  assert.doesNotMatch(machine,/args=\{\[3\.55,\.34,\.58\]\}|args=\{\[3\.2,\.3,\.54\]\}/)
})

test('V56 visible Orb is a compact engineered state core rather than a glass sphere starburst or orbit-ring object',()=>{
  assert.match(orb,/home-v56-visible-orb-machine-core/)
  assert.match(orb,/home-v56-orb-state-emitter/)
  assert.match(orb,/v56-governed-glb-animation-identity-behind-machine-aperture/)
  assert.doesNotMatch(orb,/sphereGeometry|torusGeometry|dodecahedronGeometry|icosahedronGeometry/)
  assert.doesNotMatch(orb,/V48_CAGED_SCONCE/)
})

test('V56 retains exact Home runtime interaction and governed identity contracts while remaining fail-closed on pixel certification',()=>{
  assert.match(source,/const ORB = new THREE\.Vector3\(0, 2\.18, -6\.0\)/)
  assert.match(source,/data-home-visual-grade="cinematic-pbr-v56-wall-integrated-reliquary"/)
  assert.match(source,/data-home-final-art-revision="v56-wall-integrated-reliquary-candidate"/)
  assert.match(source,/data-home-art-certification="v56-retained-pixel-candidate-not-certified"/)
  assert.match(source,/data-home-animation-owner="wall-integrated-v56-plus-governed-orb-identity"/)
  assert.match(source,/home-orb-governed-hidden-animation-identity/)
  assert.match(source,/requestUraiWorldTravel/)
  assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
