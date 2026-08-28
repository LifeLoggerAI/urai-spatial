#!/usr/bin/env python3
from pathlib import Path
import re

SRC = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
TEST = Path('urai-tier1/tests/home-relic-machine-realism-contract.test.mjs')
text = SRC.read_text()


def must_replace(old, new, label):
    global text
    if old not in text:
        raise SystemExit(f'missing V48 replacement anchor: {label}')
    text = text.replace(old, new, 1)


def regex_replace(pattern, replacement, label, flags=re.S):
    global text
    new_text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'expected one V48 regex replacement for {label}, got {count}')
    text = new_text

must_replace(
"const HOME_HDR = '/assets/urai/home-production/cc0/environment/studio-small-08-1k.hdr'\n",
"const HOME_HDR = '/assets/urai/home-production/cc0/environment/studio-small-08-1k.hdr'\n"
"const V48_ROCK_FACE_01 = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'\n"
"const V48_ROCK_FACE_02 = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'\n"
"const V48_PIPE_SYSTEM = '/assets/urai/home-production/cc0/polyhaven-v48/modular_industrial_pipes_01/asset.gltf'\n"
"const V48_CAGED_SCONCE = '/assets/urai/home-production/cc0/polyhaven-v48/industrial_caged_sconce/asset.gltf'\n",
'production asset constants')

regex_replace(
r"const SANCTUARY_REQUIRED_OBJECTS = \[.*?\] as const",
"""const SANCTUARY_REQUIRED_OBJECTS = [
  'home-authored-terrain', 'home-authored-embodied-self', 'home-orb-sanctuary',
  'home-ground-environmental-threshold', 'home-life-map-sky-lookout', 'home-life-map-physical-portal',
  'home-sanctuary-pavilion', 'home-v48-left-scanned-vault', 'home-v48-right-scanned-vault',
  'home-v48-rear-scanned-apse', 'home-v48-machine-services', 'home-v48-authored-practicals',
  'home-v48-orb-machine-frame', 'home-orb-engineered-cradle',
] as const""",
'required object list')

# Add a normalized production-model helper immediately after cloneModel.
anchor = """function cloneModel(source: THREE.Object3D) {
  const root = source.clone(true)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.material = Array.isArray(object.material) ? object.material.map(cloneMaterial) : cloneMaterial(object.material)
    object.castShadow = true
    object.receiveShadow = true
  })
  return root
}
"""
helper = anchor + """
function normalizedProductionModel(source: THREE.Object3D, targetSpan: number) {
  const root = cloneModel(source)
  const bounds = new THREE.Box3().setFromObject(root)
  const center = bounds.getCenter(new THREE.Vector3())
  const size = bounds.getSize(new THREE.Vector3())
  const span = Math.max(size.x, size.y, size.z, 0.001)
  const scale = targetSpan / span
  root.position.sub(center)
  root.scale.setScalar(scale)
  root.userData.uraiProductionNormalization = { targetSpan, sourceSpan: span }
  return root
}

function ProductionAsset({url,name,position,rotation=[0,0,0],span,scale=[1,1,1]}:{url:string;name:string;position:Vec3;rotation?:Vec3;span:number;scale?:Vec3}) {
  const gltf = useGLTF(url)
  const model = useMemo(() => normalizedProductionModel(gltf.scene, span), [gltf.scene, span])
  return <group name={name} position={position as [number,number,number]} rotation={rotation as [number,number,number]} scale={scale as [number,number,number]} userData={{runtimeAsset:url,provenance:'poly-haven-cc0-v48-committed'}}><primitive object={model}/></group>
}
"""
must_replace(anchor, helper, 'production model helper')

# Make the legacy deterministic chamber explicitly provenance-only, never visible.
must_replace("root.userData.visibleWorldOwner = 'home-built-sanctuary-envelope-v29'", "root.userData.visibleWorldOwner = 'home-v48-production-asset-sanctuary'", 'compatibility owner')
must_replace("root.userData.treatment = 'v29-compatibility-glb-provenance-only-no-visible-fantasy-shell'", "root.userData.treatment = 'v48-deterministic-intake-glb-provenance-only-never-visible'", 'compatibility treatment')

# Replace the visible floor box with a textured walkable floor only; perimeter scanned assets will carry visible weight.
regex_replace(
r"function SanctuaryCourt\(\{ target \}: \{ target: MutableRefObject<THREE.Vector3 \| null> \}\) \{.*?\n\}\n\nfunction RecessedPractical",
"""function SanctuaryCourt({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(SANCTUARY)
  const compatibilityModel = useMemo(() => cloneCompatibilitySanctuary(sanctuary.scene), [sanctuary.scene])
  const pack = useStonePack(0.14, 0.18)
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  return <group name=\"home-authored-terrain\" userData={{ treatment: 'v48-photographic-pbr-floor-with-scanned-architectural-perimeter', source: HOME_PHOTOGRAPHIC_PBR_V19 }}>
    <primitive object={compatibilityModel} />
    <mesh name=\"home-v48-walkable-photographic-floor\" position={[0,-0.15,-1.45]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[16.5,19.2,24,24]} />
      <meshPhysicalMaterial color=\"#252b28\" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.52,0.52)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={0.025} displacementBias={-0.012} roughness={0.8} metalness={0.02} clearcoat={0.035} clearcoatRoughness={0.8} envMapIntensity={0.74} />
    </mesh>
    <mesh name=\"home-walkable-navigation-surface\" position={[0,0.18,-1.45]} rotation={[-Math.PI/2,0,0]} onClick={onWalk}>
      <planeGeometry args={[13.4,17.5]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

function RecessedPractical""",
'SanctuaryCourt')

# Replace all procedural sanctuary architecture from ContinuousVaultSkin through SanctuaryGlazing with production composition.
regex_replace(
r"function ContinuousVaultSkin\(.*?\nfunction SanctuaryGlazing\(\)\{.*?\n\}\n\nfunction SanctuaryCeiling",
"""function SanctuaryArchitecture(){
  return <group name=\"home-sanctuary-pavilion\" userData={{visualOwner:'v48-committed-production-assets',construction:'scanned-rock-architecture-plus-modular-industrial-machine-system',visualTreatment:'v48-production-asset-sanctuary-candidate'}}>
    <ProductionAsset url={V48_ROCK_FACE_01} name=\"home-v48-left-scanned-vault\" position={[-4.65,2.62,-5.45]} rotation={[0.08,1.02,-0.12]} span={7.8} scale={[1.0,1.16,1.24]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name=\"home-v48-right-scanned-vault\" position={[4.55,2.48,-5.82]} rotation={[-0.04,-1.18,0.1]} span={7.5} scale={[1.08,1.12,1.2]}/>
    <ProductionAsset url={V48_ROCK_FACE_01} name=\"home-v48-rear-scanned-apse\" position={[0,3.15,-9.25]} rotation={[1.48,0.12,0.04]} span={9.4} scale={[1.48,1.0,0.82]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name=\"home-v48-left-foreground-foundation\" position={[-6.15,0.48,-1.5]} rotation={[1.62,0.44,-0.08]} span={4.2} scale={[1.24,0.68,1.0]}/>
    <ProductionAsset url={V48_ROCK_FACE_01} name=\"home-v48-right-foreground-foundation\" position={[6.12,0.42,-2.45]} rotation={[1.54,-0.38,0.06]} span={4.4} scale={[1.22,0.7,1.0]}/>
    <group name=\"home-v48-machine-services\" userData={{treatment:'v48-real-modular-industrial-service-system-integrated-into-apse'}}>
      <ProductionAsset url={V48_PIPE_SYSTEM} name=\"home-v48-left-machine-service\" position={[-2.82,1.72,-6.34]} rotation={[0.04,0.56,-0.08]} span={4.9} scale={[0.82,1.08,0.9]}/>
      <ProductionAsset url={V48_PIPE_SYSTEM} name=\"home-v48-right-machine-service\" position={[2.9,1.78,-6.55]} rotation={[-0.02,-0.62,0.07]} span={4.8} scale={[-0.82,1.06,0.9]}/>
      <ProductionAsset url={V48_PIPE_SYSTEM} name=\"home-v48-rear-machine-service\" position={[0,3.05,-8.1]} rotation={[0.22,1.57,1.42]} span={5.6} scale={[0.72,0.72,1.05]}/>
    </group>
    <group name=\"home-v48-authored-practicals\" userData={{treatment:'v48-real-caged-industrial-practicals'}}>
      <ProductionAsset url={V48_CAGED_SCONCE} name=\"home-v48-left-sconce\" position={[-4.3,2.5,-4.9]} rotation={[0,0.72,0]} span={0.7}/>
      <ProductionAsset url={V48_CAGED_SCONCE} name=\"home-v48-right-sconce\" position={[4.25,2.42,-5.15]} rotation={[0,-0.74,0]} span={0.7}/>
      <pointLight position={[-4.15,2.45,-4.7]} color=\"#d6ad71\" intensity={0.72} distance={6.8} decay={2}/>
      <pointLight position={[4.08,2.38,-4.95]} color=\"#86bdb7\" intensity={0.68} distance={6.4} decay={2}/>
    </group>
  </group>
}

function SanctuaryGlazing(){return <group name=\"home-architectural-glazing\" userData={{treatment:'v48-no-hero-glass-panels-scanned-architecture-owns-depth'}} />}

function SanctuaryCeiling""",
'procedural sanctuary replacement')

# Retire the old raw ceiling slabs from the rendered scene by making the component semantic only.
regex_replace(
r"function SanctuaryCeiling\(\) \{.*?\n\}\n\nfunction FloorPanelJoints",
"""function SanctuaryCeiling() { return <group name=\"home-architectural-canopy\" userData={{treatment:'v48-open-scanned-rock-vault-no-raw-box-ceiling'}} /> }

function FloorPanelJoints""",
'ceiling')

# Replace procedural reliquary arms/core with production pipe machine frame. Keep semantic cradle name for interaction/proof contracts.
regex_replace(
r"function ReliquarySpine\(\).*?\nfunction SacredOrb\(",
"""function ReliquarySpine(){return <group name=\"home-orb-reliquary-spine\" userData={{treatment:'v48-production-machine-spine-is-asset-backed'}} />}

function OrbCradle(){return <group name=\"home-orb-engineered-cradle\" userData={{treatment:'v48-asset-backed-machine-physically-surrounds-core-no-pedestal'}}> 
  <ProductionAsset url={V48_PIPE_SYSTEM} name=\"home-v48-orb-machine-frame\" position={[0,2.05,-5.95]} rotation={[0.18,0,1.57]} span={5.2} scale={[0.86,0.86,1.08]}/>
  <ProductionAsset url={V48_PIPE_SYSTEM} name=\"home-v48-orb-machine-frame-left\" position={[-1.72,1.4,-5.72]} rotation={[0.02,0.84,0.32]} span={3.4} scale={[0.68,0.68,0.9]}/>
  <ProductionAsset url={V48_PIPE_SYSTEM} name=\"home-v48-orb-machine-frame-right\" position={[1.72,1.42,-5.76]} rotation={[-0.02,-0.84,-0.32]} span={3.4} scale={[-0.68,0.68,0.9]}/>
</group>}

function OrbPlatform(){return <group name=\"home-v48-foundation-integration\" userData={{treatment:'v48-no-display-platform-machine-services-cross-floor-and-apse'}}/>}

function SacredOrb(""",
'reliquary machinery')

# Increase the authored functional heart enough to read while keeping crystalline display families hidden.
must_replace("object.scale.multiplyScalar(0.14)", "object.scale.multiplyScalar(0.32)", 'orb heart scale')
must_replace("object.scale.multiplyScalar(0.065)", "object.scale.multiplyScalar(0.14)", 'orb filament scale')
must_replace("v47-small-authored-heart-deep-in-machined-aperture", "v48-authored-heart-functional-core-inside-production-machine", 'heart role')
must_replace("v47-minimal-authored-filament-deep-inside-machine-core", "v48-authored-filament-functional-trace-inside-production-machine", 'filament role')
must_replace("v47-authored-heart-filament-trace-deep-behind-machined-aperture-no-crystal-display", "v48-authored-heart-filament-functional-core-no-crystal-display", 'orb treatment')

regex_replace(
r"return <group ref=\{root\} name=\"home-orb-sanctuary\".*?\n  </group>\n\}",
"""return <group ref={root} name=\"home-orb-sanctuary\" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v48-governed-authored-core-inside-committed-production-machine'}}>
    <group scale={0.64} position={[0,-0.04,-2.38]} rotation={[0,.18,0]} name=\"home-orb-authored-core\" userData={{treatment:'v48-authored-heart-filament-functional-core-no-crystal-display'}}><primitive object={authoredOrb}/></group>
    <group name=\"home-orb-engineered-body\" userData={{treatment:'v48-production-pipe-machine-frame-is-rendered-by-orb-cradle'}} />
    <pointLight color={stateColor} intensity={intensity*2.65} distance={12.5} decay={2}/>
    <pointLight position={[0,.5,-1.55]} color=\"#d7ba82\" intensity={1.7} distance={8.2} decay={2}/>
    <pointLight position={[0,-.36,.68]} color=\"#75bdb5\" intensity={1.15} distance={6.4} decay={2}/>
  </group>
}""",
'SacredOrb render')

# Remove visible ceiling box component from final scene invocation; asset composition owns the upper frame.
must_replace("<SanctuaryArchitecture /><SanctuaryCeiling /><SanctuaryGlazing />", "<SanctuaryArchitecture /><SanctuaryGlazing />", 'final scene architecture invocation')

# V48 markers and runtime provenance.
text = text.replace('v47-sanctuary-depth-production-candidate', 'v48-production-asset-sanctuary-candidate')
text = text.replace('cinematic-pbr-v47-sanctuary-depth', 'cinematic-pbr-v48-committed-production-assets')
text = text.replace('v47-retained-pixel-candidate', 'v48-production-assets-retained-pixel-candidate')
text = text.replace(
'data-home-runtime-assets="home-entry-chamber-v1.glb home-human-makehuman-v4.glb urai-orb-avatar-v1.glb portal-ring-master-v1.glb built-sacred-tech-sanctuary-v19"',
'data-home-runtime-assets="home-human-makehuman-v4.glb urai-orb-avatar-v1.glb portal-ring-master-v1.glb polyhaven-rock-face-01 polyhaven-rock-face-02 polyhaven-modular-industrial-pipes-01 polyhaven-industrial-caged-sconce"')
text = text.replace(
'data-home-scenery-assets="polyhaven-fern-02-geometry-v1.glb polyhaven-rock-tile-floor-pbr-v2-optimized studio-small-08-hdri-v1 architectural-depth-v25-volumetric-only-no-card"',
'data-home-scenery-assets="polyhaven-rock-face-01 polyhaven-rock-face-02 polyhaven-modular-industrial-pipes-01 polyhaven-industrial-caged-sconce polyhaven-fern-02-geometry-v1.glb polyhaven-rock-tile-floor-pbr-v2-optimized studio-small-08-hdri-v1"')

# Slightly wider production framing and stronger physical environment response.
text = text.replace('const desiredFov=portrait?64:54', 'const desiredFov=portrait?67:58')
text = text.replace('gl.toneMappingExposure=2.05', 'gl.toneMappingExposure=2.18')

# Preload all committed production assets.
must_replace(
"useGLTF.preload(FERN_MODEL)\n",
"useGLTF.preload(FERN_MODEL)\nuseGLTF.preload(V48_ROCK_FACE_01)\nuseGLTF.preload(V48_ROCK_FACE_02)\nuseGLTF.preload(V48_PIPE_SYSTEM)\nuseGLTF.preload(V48_CAGED_SCONCE)\n",
'preloads')

SRC.write_text(text)

TEST.write_text(r'''import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const provenancePath = new URL('../../operations/assets/home-v48-production-asset-provenance.json', import.meta.url)
const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'))
const architectureStart = source.indexOf('function SanctuaryArchitecture')
const architectureEnd = source.indexOf('function SanctuaryGlazing', architectureStart)
const architectureSource = source.slice(architectureStart, architectureEnd)
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
const orbSource = source.slice(orbStart, orbEnd)

test('V48 is committed production-asset integration, not a V47 primitive polish', () => {
  assert.match(source,/v48-production-asset-sanctuary-candidate/)
  assert.match(source,/polyhaven-v48\/rock_face_01\/asset\.gltf/)
  assert.match(source,/polyhaven-v48\/rock_face_02\/asset\.gltf/)
  assert.match(source,/polyhaven-v48\/modular_industrial_pipes_01\/asset\.gltf/)
  assert.match(source,/polyhaven-v48\/industrial_caged_sconce\/asset\.gltf/)
  assert.doesNotMatch(architectureSource,/ExtrudeGeometry|boxGeometry|RoundedBox|coneGeometry|cylinderGeometry/)
  assert.doesNotMatch(architectureSource,/home-v47-left-apse-mass|home-v47-side-gallery|home-v47-reliquary-cavity/)
})

test('V48 provenance is complete, local at runtime, CC0 and hashed', () => {
  assert.equal(provenance.schema, 'urai.home.v48-production-assets.v1')
  assert.equal(provenance.runtimeFetchesPolyHavenApi, false)
  assert.equal(provenance.sourceAssets.length, 4)
  for (const asset of provenance.sourceAssets) {
    assert.equal(asset.license, 'CC0-1.0')
    assert.equal(asset.provider, 'Poly Haven')
    assert.ok(asset.entrypoint.startsWith('/assets/urai/home-production/cc0/polyhaven-v48/'))
    assert.ok(asset.files.length >= 1)
    for (const file of asset.files) {
      assert.match(file.sha256,/^[a-f0-9]{64}$/)
      assert.ok(file.bytes > 0)
      assert.ok(existsSync(file.path), `missing committed production asset dependency ${file.path}`)
    }
  }
})

test('V48 Orb is the authored functional core of an asset-backed machine, not a display object', () => {
  assert.match(source,/home-v48-orb-machine-frame/)
  assert.match(source,/v48-asset-backed-machine-physically-surrounds-core-no-pedestal/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.32\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.14\)/)
  assert.match(orbSource,/scale=\{0\.64\}/)
  assert.match(orbSource,/v48-authored-heart-filament-functional-core-no-crystal-display/)
  assert.doesNotMatch(orbSource,/torusGeometry|sphereGeometry|dodecahedronGeometry|icosahedronGeometry|octahedronGeometry|coneGeometry/)
})

test('V48 removes raw visible ceiling slabs and keeps procedural primitives to floor/navigation support', () => {
  assert.match(source,/v48-open-scanned-rock-vault-no-raw-box-ceiling/)
  assert.doesNotMatch(source,/<SanctuaryCeiling \/>/)
  assert.match(source,/home-v48-walkable-photographic-floor/)
  assert.match(source,/home-walkable-navigation-surface/)
  assert.match(source,/desiredFov=portrait\?67:58/)
  assert.match(source,/gl\.toneMappingExposure=2\.18/)
})

test('V48 source does not claim retained-pixel certification before literal inspection', () => {
  assert.match(source,/v48-production-assets-retained-pixel-candidate/)
  assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})

test('embodied presence remains privacy-preserving',()=>{
  assert.match(source,/function HumanPresence/)
  assert.match(source,/visible=\{false\}/)
})
''')

print('Applied V48 committed-production-asset sanctuary integration and realism contract.')
