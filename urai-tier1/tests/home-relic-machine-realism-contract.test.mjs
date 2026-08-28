import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const provenancePath = new URL('../../operations/assets/home-v48-production-asset-provenance.json', import.meta.url)
const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'))
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url))
const sceneStart = source.indexOf('function SacredFinalScene(')
const sceneEnd = source.indexOf('export function HomeWorldProductionFinal', sceneStart)
const sceneSource = source.slice(sceneStart, sceneEnd)
const detailStart = source.indexOf('function ProductionSanctuary')
const detailEnd = source.indexOf('function ProductionOrbMachine', detailStart)
const detailSource = source.slice(detailStart, detailEnd)
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
const orbSource = source.slice(orbStart, orbEnd)

test('V50 preserves authored sanctuary massing with restrained real practical detail', () => {
  assert.match(source,/v49-authored-reliquary-candidate/)
  assert.match(source,/v50-retained-pixel-rebuild/)
  assert.match(sceneSource,/<SanctuaryArchitecture \/>/)
  assert.match(sceneSource,/<ProductionSanctuary \/>/)
  assert.match(sceneSource,/<OrbCradle \/>/)
  assert.match(sceneSource,/<MachineCoreAssembly \/>/)
  assert.doesNotMatch(sceneSource,/<ProductionOrbMachine \/>/)
  assert.doesNotMatch(sceneSource,/<SanctuaryCeiling \/>/)
})

test('V50 keeps giant raw rock and modular pipe kitbash out of the visible hero detail layer', () => {
  assert.match(detailSource,/home-v49-scanned-detail-layer/)
  assert.match(detailSource,/V48_CAGED_SCONCE/)
  assert.doesNotMatch(detailSource,/V48_ROCK_FACE_01|V48_ROCK_FACE_02|V48_PIPE_SYSTEM/)
  assert.match(source,/home-v47-side-gallery/)
  assert.match(source,/home-v47-reliquary-cavity/)
  assert.match(source,/home-v47-reliquary-apse/)
  assert.match(source,/v50-long-perspective-side-returns/)
  assert.match(source,/v50-machine-bay-three-layer-depth/)
  assert.match(source,/v50-retained-pixel-depth-shell/)
})

test('committed V48 third-party provenance remains complete even though rejected hero assets are no longer visible', () => {
  assert.equal(provenance.schema, 'urai.home.v48-production-assets.v1')
  assert.equal(provenance.runtimeFetchesPolyHavenApi, false)
  assert.equal(provenance.sourceAssets.length, 4)
  for (const asset of provenance.sourceAssets) {
    assert.equal(asset.license, 'CC0-1.0')
    assert.equal(asset.provider, 'Poly Haven')
    for (const file of asset.files) {
      assert.match(file.sha256,/^[a-f0-9]{64}$/)
      assert.ok(file.bytes > 0)
      assert.ok(existsSync(resolve(repositoryRoot, file.path)), `missing committed dependency ${file.path}`)
    }
  }
})

test('V50 replaces the glass-ball display read with opaque engineered Orb armor and grounded load paths', () => {
  assert.match(source,/v50-retained-pixel-rebuild-opaque-governed-heart/)
  assert.match(source,/v50-six-plate-opaque-reliquary-armor-no-glass-ball-no-orbit-rings/)
  assert.match(source,/function OrbArmorPlate/)
  assert.match(source,/material\.transmission = 0/)
  assert.match(source,/material\.opacity = 1/)
  assert.match(source,/material\.transparent = false/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.54\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.58\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.34\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.72\)/)
  assert.match(orbSource,/scale=\{0\.64\}/)
  assert.match(source,/const ORB = new THREE\.Vector3\(0, 2\.22, -5\.05\)/)
  assert.match(source,/position=\{\[side\*1\.42,1\.72,-5\.06\]\}/)
  assert.match(source,/position=\{\[0,2\.22,-5\.22\]\}/)
  assert.match(source,/v50-four-point-structural-capture/)
  assert.match(source,/v50-grounded-orb-load-path/)
  assert.doesNotMatch(orbSource,/<sphereGeometry/)
})

test('V50 preserves candidate-only telemetry until retained pixels are actually certified', () => {
  assert.match(source,/v50-retained-pixel-rebuild/)
  assert.match(source,/data-home-animation-owner="authored-reliquary-v49-plus-governed-living-orb"/)
  assert.match(source,/data-home-runtime-assets="home-entry-chamber-v1\.glb /)
  assert.match(source,/v49-retained-pixel-candidate-not-certified/)
  assert.match(source,/rock-tile-floor-diff-1k\.webp/)
  assert.match(source,/studio-small-08-1k\.hdr/)
  assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})

test('embodied presence remains privacy-preserving',()=>{
  assert.match(source,/function HumanPresence/)
  assert.match(source,/visible=\{false\}/)
})