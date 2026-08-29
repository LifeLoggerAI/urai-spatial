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
const gallerySource = source.slice(source.indexOf('function SanctuarySideGallery'), source.indexOf('function SanctuaryArchitecture'))
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
const orbSource = source.slice(orbStart, orbEnd)

test('V53 replaces V52 loose scaffold with coherent nested structural arches and grounded buttresses', () => {
  assert.match(source,/v53-integrated-arch-reliquary-retained-pixel-rebuild/)
  assert.match(source,/visualOwner:'cinematic-integrated-arch-reliquary-v53'/)
  assert.match(vaultSource,/v53-nested-stone-metal-arches-create-coherent-sanctuary-depth-no-loose-scaffold/)
  assert.match(gallerySource,/v53-low-faceted-buttresses-and-recessed-practicals-no-rectangular-bay-blocks-no-scaffold/)
  assert.match(vaultSource,/torusGeometry args=\{\[4\.25,\.34,10,72,Math\.PI\]\}/)
  assert.doesNotMatch(vaultSource,/from=\{\[-5\.55|from=\{\[5\.32|from=\{\[-4\.62|from=\{\[4\.5/)
  assert.match(sceneSource,/<SanctuaryArchitecture \/>/)
  assert.match(sceneSource,/<ProductionSanctuary \/>/)
  assert.match(sceneSource,/<OrbCradle \/>/)
  assert.match(sceneSource,/<MachineCoreAssembly \/>/)
})

test('V53 keeps governed production assets and committed CC0 provenance', () => {
  assert.match(source,/home-v49-scanned-detail-layer/)
  assert.match(source,/V48_CAGED_SCONCE/)
  assert.match(source,/home-v47-side-gallery/)
  assert.match(source,/home-v47-reliquary-cavity/)
  assert.match(source,/home-v47-reliquary-apse/)
  assert.equal(provenance.schema, 'urai.home.v48-production-assets.v1')
  assert.equal(provenance.runtimeFetchesPolyHavenApi, false)
  for (const asset of provenance.sourceAssets) for (const file of asset.files) assert.ok(existsSync(resolve(repositoryRoot, file.path)))
})

test('V53 eliminates V52 starburst and petal clutter while preserving governed authored heart inside an engineered faceted relic core', () => {
  assert.match(source,/v53-no-aura-no-orbits-no-starburst-filaments-no-petal-clutter/)
  assert.match(source,/object\.name\.startsWith\('orb-filament-'\)/)
  assert.match(source,/object\.name\.startsWith\('orb-petal-'\)/)
  assert.match(orbSource,/dodecahedronGeometry args=\{\[1\.18,0\]\}/)
  assert.match(orbSource,/icosahedronGeometry args=\{\[1,1\]\}/)
  assert.match(orbSource,/scale=\{\.56\}/)
  assert.match(orbSource,/v53-governed-authored-heart-contained-inside-primary-faceted-relic-shell/)
  assert.doesNotMatch(orbSource,/<sphereGeometry/)
  assert.doesNotMatch(orbSource,/orbit/i)
})

test('V53 keeps load paths compact and physically tied to the integrated machine bay rather than spanning the room as scaffold', () => {
  assert.match(source,/v53-compact-floor-rooted-machine-jaw-no-long-scaffold-no-display-footing/)
  assert.match(source,/v53-compact-four-point-floor-load-path-integrated-into-recessed-machine-bay-no-display-stand/)
  assert.match(source,/v53-contained-rear-yoke-and-arch-collar-no-cross-scaffold-no-display-plate/)
  assert.match(source,/home-v53-central-finished-stone-lane/)
  assert.match(source,/displacementScale=\{0\.004\}/)
})

test('V53 tightens desktop and portrait framing and remains candidate-only until literal pixels pass', () => {
  assert.match(source,/const desiredFov=portrait\?48:42/)
  assert.match(source,/pitch=useRef\(0\.19\)/)
  assert.match(source,/data-home-visual-grade="cinematic-pbr-v53-integrated-arch-reliquary"/)
  assert.match(source,/data-home-final-art-revision="v53-integrated-arch-reliquary-candidate"/)
  assert.match(source,/data-home-art-certification="v53-retained-pixel-candidate-not-certified"/)
  assert.match(source,/data-home-animation-owner="integrated-arch-v53-plus-governed-living-orb"/)
  assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})

test('embodied presence remains privacy-preserving',()=>{
  assert.match(source,/function HumanPresence/)
  assert.match(source,/visible=\{false\}/)
})
