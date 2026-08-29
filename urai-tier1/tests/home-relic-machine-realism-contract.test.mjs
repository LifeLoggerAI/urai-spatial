import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const homeState = readFileSync(new URL('../../scripts/capture-home-state-proof.mjs', import.meta.url), 'utf8')
const provenancePath = new URL('../../operations/assets/home-v48-production-asset-provenance.json', import.meta.url)
const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'))
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url))
const sceneStart = source.indexOf('function SacredFinalScene(')
const sceneEnd = source.indexOf('export function HomeWorldProductionFinal', sceneStart)
const sceneSource = source.slice(sceneStart, sceneEnd)
const vaultSource = source.slice(source.indexOf('function ContinuousVaultSkin'), source.indexOf('function CantedWallMass'))
const gallerySource = source.slice(source.indexOf('function SanctuarySideGallery'), source.indexOf('function SanctuaryArchitecture'))
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
const orbSource = source.slice(orbStart, orbEnd)

test('V54 removes V53 torus tunnel and bollard composition in favor of one sculpted rear shell plus asymmetric side alcoves', () => {
  assert.match(source,/v54-authored-relic-sanctuary-retained-pixel-rebuild/)
  assert.match(source,/visualOwner:'cinematic-authored-relic-sanctuary-v54'/)
  assert.match(vaultSource,/v54-single-sculpted-rear-shell-with-asymmetric-side-returns-no-torus-tunnel-no-scaffold/)
  assert.match(gallerySource,/v54-two-asymmetric-side-alcoves-and-integrated-practicals-no-bollards-no-repeated-bays/)
  assert.doesNotMatch(vaultSource,/torusGeometry/)
  assert.doesNotMatch(gallerySource,/cylinderGeometry/)
  assert.match(sceneSource,/<SanctuaryArchitecture \/>/)
  assert.match(sceneSource,/<ProductionSanctuary \/>/)
})

test('V54 makes the governed authored Orb the primary visible body and removes the rejected synthetic polyhedron shell', () => {
  assert.match(source,/v54-governed-authored-orb-primary-no-synthetic-polyhedron-shell/)
  assert.match(orbSource,/scale=\{1\.24\}/)
  assert.match(orbSource,/v54-governed-authored-orb-primary-visible-body-inside-wall-integrated-machine-seat/)
  assert.doesNotMatch(orbSource,/dodecahedronGeometry|icosahedronGeometry|sphereGeometry|torusGeometry/)
  assert.doesNotMatch(orbSource,/OrbArmorPlate/)
  assert.match(source,/object\.name\.startsWith\('orb-filament-'\)/)
  assert.match(source,/object\.name\.startsWith\('orb-petal-'\)/)
})

test('V54 removes four floor legs and frames the Orb from the rear wall instead of a display stand', () => {
  assert.match(source,/v54-wall-integrated-rear-shoulder-cradle-no-pedestal-no-four-floor-legs/)
  assert.match(source,/v54-rear-wall-load-paths-frame-authored-orb-without-ring-collar-or-display-plate/)
  assert.match(source,/home-v54-central-finished-stone-lane/)
  assert.match(source,/v54-dark-side-shoulders-frame-processional-lane-without-platform-or-grid/)
})

test('V54 preserves governed production assets and committed CC0 provenance', () => {
  assert.match(source,/home-v49-scanned-detail-layer/)
  assert.match(source,/V48_CAGED_SCONCE/)
  assert.equal(provenance.schema, 'urai.home.v48-production-assets.v1')
  assert.equal(provenance.runtimeFetchesPolyHavenApi, false)
  for (const asset of provenance.sourceAssets) for (const file of asset.files) assert.ok(existsSync(resolve(repositoryRoot, file.path)))
})

test('V54 Home State proof keeps the real lifecycle but makes static-export provider behavior deterministic', () => {
  assert.match(homeState,/open-air-sacred-tech-reliquary/)
  assert.match(homeState,/page\.route\('\*\*\/api\/orb-companion'/)
  assert.match(homeState,/fixtureRequests\[0\]\?\.message === 'Give me a short grounded reflection\.'/)
  assert.match(homeState,/data-home-orb-state/)
  assert.match(homeState,/listening/)
  assert.match(homeState,/thinking/)
  assert.match(homeState,/speaking/)
  assert.match(homeState,/privacy/)
})

test('V54 widens framing for environmental context and remains candidate-only until literal pixels pass', () => {
  assert.match(source,/const desiredFov=portrait\?54:48/)
  assert.match(source,/pitch=useRef\(0\.26\)/)
  assert.match(source,/data-home-visual-grade="cinematic-pbr-v54-authored-relic-sanctuary"/)
  assert.match(source,/data-home-final-art-revision="v54-authored-relic-sanctuary-candidate"/)
  assert.match(source,/data-home-art-certification="v54-retained-pixel-candidate-not-certified"/)
  assert.match(source,/data-home-animation-owner="authored-relic-v54-plus-governed-living-orb"/)
  assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})

test('embodied presence remains privacy-preserving',()=>{
  assert.match(source,/function HumanPresence/)
  assert.match(source,/visible=\{false\}/)
})
