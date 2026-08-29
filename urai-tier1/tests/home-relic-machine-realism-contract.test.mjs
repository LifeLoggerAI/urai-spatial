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
const vaultSource = source.slice(source.indexOf('function ContinuousVaultSkin'), source.indexOf('function CantedWallMass'))
const cavitySource = source.slice(source.indexOf('function MachineCavityLiner'), source.indexOf('function SanctuarySideGallery'))
const gallerySource = source.slice(source.indexOf('function SanctuarySideGallery'), source.indexOf('function SanctuaryArchitecture'))
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
const orbSource = source.slice(orbStart, orbEnd)

test('V52 replaces the rejected V51 slab-wall composition with an open multi-depth sanctuary structure', () => {
  assert.match(source,/v52-deep-reliquary-retained-pixel-rebuild/)
  assert.match(source,/visualOwner:'cinematic-deep-reliquary-sanctuary-v52'/)
  assert.match(vaultSource,/v52-deep-layered-sanctuary-open-vault-no-slab-wall-no-front-facade/)
  assert.match(cavitySource,/v52-deep-open-machine-bay-multi-depth-ribs-no-flat-box-housing/)
  assert.match(gallerySource,/v52-open-asymmetric-grounded-gallery-frames-no-tall-box-bays-no-solid-house-blocks/)
  assert.doesNotMatch(vaultSource,/<SanctuaryShellMass/)
  assert.doesNotMatch(cavitySource,/boxGeometry args=\{\[4\.9,4\.2,\.16\]\}/)
  assert.doesNotMatch(gallerySource,/size=\{\[\.62,3\.45,\.82\]\}|size=\{\[\.52,3\.9,\.74\]\}|size=\{\[\.46,4\.3,\.66\]\}/)
  assert.match(sceneSource,/<SanctuaryArchitecture \/>/)
  assert.match(sceneSource,/<ProductionSanctuary \/>/)
  assert.match(sceneSource,/<OrbCradle \/>/)
  assert.match(sceneSource,/<MachineCoreAssembly \/>/)
  assert.doesNotMatch(sceneSource,/<ProductionOrbMachine \/>/)
  assert.doesNotMatch(sceneSource,/<SanctuaryCeiling \/>/)
})

test('V52 retains governed real production assets while avoiding rejected third-party hero kitbash', () => {
  assert.match(source,/home-v49-scanned-detail-layer/)
  assert.match(source,/V48_CAGED_SCONCE/)
  assert.match(source,/home-v47-side-gallery/)
  assert.match(source,/home-v47-reliquary-cavity/)
  assert.match(source,/home-v47-reliquary-apse/)
  assert.match(source,/home-v52-central-finished-stone-lane/)
  assert.match(source,/v52-wide-finished-central-stone-lane-reduces-raw-floor-dominance/)
})

test('committed V48 third-party provenance remains complete', () => {
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

test('V52 makes the governed authored Orb materially larger and structurally integrated without display language', () => {
  assert.match(source,/v52-large-authored-faceted-heart-integrated-opaque-machine-clamps/)
  assert.match(source,/v52-wide-floor-rooted-integrated-jaw-no-panel-no-house-silhouette-no-display-feet/)
  assert.match(source,/v52-four-point-wide-floor-rooted-load-paths-integrated-with-large-orb-no-display-stand/)
  assert.match(source,/v52-deep-machine-yoke-integrated-with-vault-no-display-plate-no-flat-crosshead/)
  assert.match(source,/v52-four-substantial-opaque-machine-clamps-integrated-with-large-authored-heart/)
  assert.match(source,/material\.transmission = 0/)
  assert.match(source,/material\.opacity = 1/)
  assert.match(source,/material\.transparent = false/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.5\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.82\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.58\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(1\.08\)/)
  assert.match(orbSource,/scale=\{1\.55\}/)
  assert.doesNotMatch(orbSource,/<sphereGeometry/)
})

test('V52 reduces raw-floor dominance, tightens composition, and remains candidate-only until literal pixels pass', () => {
  assert.match(source,/displacementScale=\{0\.008\}/)
  assert.match(source,/const desiredFov=portrait\?52:44/)
  assert.match(source,/pitch=useRef\(0\.14\)/)
  assert.match(source,/data-home-visual-grade="cinematic-pbr-v52-deep-reliquary"/)
  assert.match(source,/data-home-final-art-revision="v52-deep-reliquary-candidate"/)
  assert.match(source,/data-home-art-certification="v52-retained-pixel-candidate-not-certified"/)
  assert.match(source,/data-home-animation-owner="deep-reliquary-v52-plus-governed-living-orb"/)
  assert.match(source,/data-home-runtime-assets="home-entry-chamber-v1\.glb /)
  assert.match(source,/rock-tile-floor-diff-1k\.webp/)
  assert.match(source,/studio-small-08-1k\.hdr/)
  assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})

test('embodied presence remains privacy-preserving',()=>{
  assert.match(source,/function HumanPresence/)
  assert.match(source,/visible=\{false\}/)
})
