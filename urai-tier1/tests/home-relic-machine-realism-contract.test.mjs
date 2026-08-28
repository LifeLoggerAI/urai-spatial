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

test('V51 is the open reliquary rebuild rather than the rejected V50 house/slab composition', () => {
  assert.match(source,/v51-open-reliquary-retained-pixel-rebuild/)
  assert.match(source,/visualOwner:'cinematic-open-reliquary-sanctuary-v51'/)
  assert.match(source,/v51-open-asymmetric-buttress-galleries-no-solid-house-blocks-no-repeated-bays/)
  assert.match(source,/v51-open-layered-rear-shell-no-house-slabs-no-front-facade/)
  assert.match(source,/v51-open-machine-bay-rear-ribs-and-depth-no-box-housing/)
  assert.doesNotMatch(source,/home-v47-left-apse-mass|home-v47-right-apse-mass/)
  assert.match(sceneSource,/<SanctuaryArchitecture \/>/)
  assert.match(sceneSource,/<ProductionSanctuary \/>/)
  assert.match(sceneSource,/<OrbCradle \/>/)
  assert.match(sceneSource,/<MachineCoreAssembly \/>/)
  assert.doesNotMatch(sceneSource,/<ProductionOrbMachine \/>/)
  assert.doesNotMatch(sceneSource,/<SanctuaryCeiling \/>/)
})

test('V51 keeps rejected third-party hero kitbash out while retaining restrained real practical detail', () => {
  assert.match(detailSource,/home-v49-scanned-detail-layer/)
  assert.match(detailSource,/V48_CAGED_SCONCE/)
  assert.doesNotMatch(detailSource,/V48_ROCK_FACE_01|V48_ROCK_FACE_02|V48_PIPE_SYSTEM/)
  assert.match(source,/home-v47-side-gallery/)
  assert.match(source,/home-v47-reliquary-cavity/)
  assert.match(source,/home-v47-reliquary-apse/)
  assert.match(source,/home-v51-central-finished-stone-lane/)
  assert.match(source,/v51-finished-central-stone-lane-breaks-raw-floor-dominance/)
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

test('V51 rejects panel wings and display plates and keeps the Orb as the primary authored faceted heart', () => {
  assert.match(source,/v51-authored-faceted-heart-with-small-opaque-machine-clamps/)
  assert.match(source,/v51-open-three-member-floor-rooted-jaw-no-panel-no-house-silhouette-no-visible-feet/)
  assert.match(source,/v51-open-four-point-floor-rooted-load-paths-no-display-stand-no-panel-wings/)
  assert.match(source,/v51-open-rear-yoke-and-service-crosshead-no-polygon-display-plate/)
  assert.match(source,/v51-four-small-opaque-machine-clamps-authored-faceted-heart-remains-primary/)
  assert.match(source,/v51-governed-faceted-authored-heart-primary-inside-open-machine-jaws/)
  assert.match(source,/material\.transmission = 0/)
  assert.match(source,/material\.opacity = 1/)
  assert.match(source,/material\.transparent = false/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.42\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.62\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.44\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.92\)/)
  assert.match(orbSource,/scale=\{0\.82\}/)
  assert.doesNotMatch(orbSource,/<sphereGeometry/)
  assert.doesNotMatch(source,/v50-six-plate-opaque-reliquary-armor-no-glass-ball-no-orbit-rings/)
})

test('V51 uses controlled floor relief, tighter framing, and candidate-only telemetry', () => {
  assert.match(source,/displacementScale=\{0\.012\}/)
  assert.match(source,/const desiredFov=portrait\?64:50/)
  assert.match(source,/pitch=useRef\(0\.08\)/)
  assert.match(source,/data-home-visual-grade="cinematic-pbr-v51-open-reliquary"/)
  assert.match(source,/data-home-final-art-revision="v51-open-reliquary-candidate"/)
  assert.match(source,/data-home-art-certification="v51-retained-pixel-candidate-not-certified"/)
  assert.match(source,/data-home-animation-owner="open-reliquary-v51-plus-governed-living-orb"/)
  assert.match(source,/data-home-runtime-assets="home-entry-chamber-v1\.glb /)
  assert.match(source,/rock-tile-floor-diff-1k\.webp/)
  assert.match(source,/studio-small-08-1k\.hdr/)
  assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})

test('embodied presence remains privacy-preserving',()=>{
  assert.match(source,/function HumanPresence/)
  assert.match(source,/visible=\{false\}/)
})