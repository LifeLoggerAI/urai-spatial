from pathlib import Path

SOURCE = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
TEST = Path('urai-tier1/tests/home-relic-machine-realism-contract.test.mjs')
CONTINUOUS = Path('scripts/run-continuous-spatial-proof-v22-natural.mjs')
MARKER = 'v49-authored-reliquary-candidate'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


source = SOURCE.read_text()
if MARKER in source:
    print('V49 authored reliquary is already materialized; no mutation required.')
    raise SystemExit(0)

old_required = """  'home-sanctuary-pavilion', 'home-v48-left-scanned-vault', 'home-v48-right-scanned-vault',
  'home-v48-rear-scanned-apse', 'home-v48-machine-services', 'home-v48-authored-practicals',
  'home-orb-engineered-cradle', 'home-v48-orb-machine-frame',
"""
new_required = """  'home-sanctuary-pavilion', 'home-v47-side-gallery', 'home-v47-reliquary-cavity',
  'home-v47-reliquary-apse', 'home-v49-scanned-detail-layer', 'home-v49-authored-practicals',
  'home-orb-engineered-cradle', 'home-v47-machine-core-assembly',
"""
source = replace_once(source, old_required, new_required, 'scene readiness ownership')

start = source.index('function ProductionSanctuary(){')
end = source.index('\n\nfunction ProductionOrbMachine()', start)
production_detail = '''function ProductionSanctuary(){return <group name="home-v49-scanned-detail-layer" userData={{visualOwner:'v49-authored-sanctuary-detail-only',construction:'restrained-cc0-practicals-over-authored-load-bearing-sanctuary',visualTreatment:'v49-no-raw-rock-shell-no-pipe-kitbash'}}>
  <group name="home-v49-authored-practicals" userData={{treatment:'v49-real-caged-practicals-integrated-into-authored-apse'}}>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v49-left-sconce" position={[-4.42,2.18,-5.92]} rotation={[0,0.72,0]} span={0.56}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v49-right-sconce" position={[4.34,2.12,-6.08]} rotation={[0,-0.74,0]} span={0.56}/>
    <pointLight position={[-4.28,2.12,-5.72]} color="#d1aa73" intensity={0.54} distance={5.8} decay={2}/>
    <pointLight position={[4.2,2.08,-5.88]} color="#7db0a9" intensity={0.5} distance={5.6} decay={2}/>
  </group>
</group>}'''
source = source[:start] + production_detail + source[end:]

source = replace_once(
    source,
    "visualOwner:'cinematic-integrated-reliquary-sanctuary-v47',construction:'asymmetric-apse-side-galleries-and-deep-machine-bay',visualTreatment:'v47-sanctuary-depth-production-candidate'",
    "visualOwner:'cinematic-integrated-reliquary-sanctuary-v49',construction:'asymmetric-apse-side-galleries-deep-machine-bay-and-restrained-real-practicals',visualTreatment:'v49-authored-reliquary-production-candidate'",
    'authored sanctuary ownership',
)
source = replace_once(source, "position={[side*1.48,1.35,-6.2]}", "position={[side*1.24,1.82,-3.74]}", 'reliquary wing registration')
source = replace_once(source, "position={[0,0,-2.88]}", "position={[0,2.16,-3.66]}", 'machine core registration')
source = replace_once(source, "const retiredDisplay = object.name === 'orb-aura' || object.name.startsWith('orb-orbit-') || object.name.startsWith('orb-petal-')", "const retiredDisplay = object.name === 'orb-aura' || object.name.startsWith('orb-orbit-')", 'Orb visible shell ownership')
source = replace_once(source, "object.scale.multiplyScalar(0.86)", "object.scale.multiplyScalar(0.72)", 'Orb core scale')
source = replace_once(source, "object.scale.multiplyScalar(0.62)", "object.scale.multiplyScalar(0.76)", 'Orb heart scale')
source = replace_once(source, "object.scale.multiplyScalar(0.32)", "object.scale.multiplyScalar(0.42)", 'Orb filament scale')
orb_model_start = source.index('function cloneOrbModel(source: THREE.Object3D)')
orb_model_end = source.index('\n\nfunction PouredStone(', orb_model_start)
orb_model = source[orb_model_start:orb_model_end]
orb_model = replace_once(
    orb_model,
    "    if (!(object instanceof THREE.Mesh)) return\n",
    "    if (object.name.startsWith('orb-petal-')) {\n      object.visible = true\n      object.scale.multiplyScalar(0.78)\n      object.userData.uraiIntegratedVisualRole = 'v49-governed-faceted-armor-shell'\n    }\n    if (!(object instanceof THREE.Mesh)) return\n",
    'Orb faceted shell',
)
source = source[:orb_model_start] + orb_model + source[orb_model_end:]
source = replace_once(source, "scale={1.12} position={[0,-.12,0]}", "scale={0.96} position={[0,-.12,0]}", 'Orb reliquary scale')
source = replace_once(source, "treatment:'v48-governed-orb-core-heart-visible-primary-reliquary-content'", "treatment:'v49-governed-faceted-orb-heart-primary-reliquary-content'", 'Orb scene treatment')
source = replace_once(source, "treatment:'v48-governed-orb-core-heart-restored-at-reliquary-scale'", "treatment:'v49-governed-faceted-shell-heart-at-reliquary-scale'", 'Orb authored treatment')
source = replace_once(source, "root.userData.uraiTreatment = 'v48-governed-orb-core-heart-restored-no-crystalline-display'", "root.userData.uraiTreatment = 'v49-governed-faceted-armor-heart-no-orbit-display'", 'Orb model treatment')

old_scene = '<SanctuaryCourt target={props.target} /><ProductionSanctuary /><ProductionOrbMachine /><PlantedEdges reducedMotion={props.reducedMotion} />'
new_scene = '<SanctuaryCourt target={props.target} /><SanctuaryArchitecture /><ProductionSanctuary /><OrbCradle /><MachineCoreAssembly /><PlantedEdges reducedMotion={props.reducedMotion} />'
source = replace_once(source, old_scene, new_scene, 'visible final scene composition')

source = replace_once(source, "data-home-visible-world=\"moonlit-sacred-tech-sanctuary\"", "data-home-visible-world=\"open-air-sacred-tech-reliquary\"", 'visible world telemetry')
source = replace_once(source, "data-home-physical-base=\"built-obsidian-glass-stone-sanctuary\"", "data-home-physical-base=\"authored-stone-machine-reliquary\"", 'physical base telemetry')
source = replace_once(source, "data-home-visual-grade=\"cinematic-pbr-v48-committed-production-assets\"", "data-home-visual-grade=\"cinematic-pbr-v49-authored-reliquary\"", 'visual grade telemetry')
source = replace_once(source, "data-home-final-art-revision=\"v48-production-asset-sanctuary-candidate\"", "data-home-final-art-revision=\"v49-authored-reliquary-candidate\"", 'art revision telemetry')
source = replace_once(source, "data-home-art-certification=\"v48-production-assets-retained-pixel-candidate\"", "data-home-art-certification=\"v49-retained-pixel-candidate-not-certified\"", 'candidate certification telemetry')
source = replace_once(source, "data-home-animation-owner=\"committed-polyhaven-production-sanctuary-plus-governed-orb-v1\"", "data-home-animation-owner=\"authored-reliquary-v49-plus-governed-living-orb\"", 'animation owner telemetry')
source = replace_once(
    source,
    "data-home-runtime-assets=\"home-human-makehuman-v4.glb urai-orb-avatar-v1.glb portal-ring-master-v1.glb polyhaven-rock-face-01 polyhaven-rock-face-02 polyhaven-modular-industrial-pipes-01 polyhaven-industrial-caged-sconce\"",
    "data-home-runtime-assets=\"home-entry-chamber-v1.glb home-human-makehuman-v4.glb urai-orb-avatar-v1.glb portal-ring-master-v1.glb polyhaven-industrial-caged-sconce\"",
    'runtime asset telemetry',
)
source = replace_once(
    source,
    "data-home-scenery-assets=\"polyhaven-rock-face-01 polyhaven-rock-face-02 polyhaven-modular-industrial-pipes-01 polyhaven-industrial-caged-sconce polyhaven-fern-02-geometry-v1.glb polyhaven-rock-tile-floor-pbr-v2-optimized studio-small-08-hdri-v1\"",
    "data-home-scenery-assets=\"polyhaven-industrial-caged-sconce polyhaven-fern-02-geometry-v1.glb polyhaven-rock-tile-floor-pbr-v2-optimized studio-small-08-hdri-v1\"",
    'scenery asset telemetry',
)
source = replace_once(source, "treatment: 'v48-photographic-pbr-floor-under-committed-scanned-sanctuary'", "treatment: 'v49-photographic-pbr-floor-under-authored-reliquary'", 'floor treatment')
source = source.replace("useGLTF.preload(V48_ROCK_FACE_01)\n", '')
source = source.replace("useGLTF.preload(V48_ROCK_FACE_02)\n", '')
source = source.replace("useGLTF.preload(V48_PIPE_SYSTEM)\n", '')
SOURCE.write_text(source)

TEST.write_text(r'''import assert from 'node:assert/strict'
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

test('V49 visible Home is authored sanctuary massing with restrained real practical detail', () => {
  assert.match(source,/v49-authored-reliquary-candidate/)
  assert.match(sceneSource,/<SanctuaryArchitecture \/>/)
  assert.match(sceneSource,/<ProductionSanctuary \/>/)
  assert.match(sceneSource,/<OrbCradle \/>/)
  assert.match(sceneSource,/<MachineCoreAssembly \/>/)
  assert.doesNotMatch(sceneSource,/<ProductionOrbMachine \/>/)
  assert.doesNotMatch(sceneSource,/<SanctuaryCeiling \/>/)
})

test('V49 removes giant raw rock and modular pipe kitbash from the visible hero detail layer', () => {
  assert.match(detailSource,/home-v49-scanned-detail-layer/)
  assert.match(detailSource,/V48_CAGED_SCONCE/)
  assert.doesNotMatch(detailSource,/V48_ROCK_FACE_01|V48_ROCK_FACE_02|V48_PIPE_SYSTEM/)
  assert.match(source,/home-v47-side-gallery/)
  assert.match(source,/home-v47-reliquary-cavity/)
  assert.match(source,/home-v47-reliquary-apse/)
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

test('V49 restores a faceted governed Orb shell and physically registered authored reliquary', () => {
  assert.match(source,/v49-governed-faceted-armor-heart-no-orbit-display/)
  assert.match(source,/v49-governed-faceted-armor-shell/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.72\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.76\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.42\)/)
  assert.match(orbSource,/scale=\{0\.96\}/)
  assert.match(source,/position=\{\[side\*1\.24,1\.82,-3\.74\]\}/)
  assert.match(source,/position=\{\[0,2\.16,-3\.66\]\}/)
})

test('V49 telemetry stays candidate-only and reports the actually loaded authored chamber identity', () => {
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
''')

continuous = CONTINUOUS.read_text()
continuous = replace_once(
    continuous,
    "const newOwner = \"result.animationOwner === 'built-physical-sanctuary-v20-plus-cc0-fern-plus-authored-living-orb'\"",
    "const newOwner = \"result.animationOwner === 'authored-reliquary-v49-plus-governed-living-orb'\"",
    'continuous proof exact owner',
)
CONTINUOUS.write_text(continuous)

print('Materialized V49 authored reliquary correction and aligned exact proof ownership without certifying pixels.')
