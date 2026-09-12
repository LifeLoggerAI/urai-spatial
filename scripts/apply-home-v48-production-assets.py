#!/usr/bin/env python3
from pathlib import Path
import re

SRC = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
TEST = Path('urai-tier1/tests/home-relic-machine-realism-contract.test.mjs')
text = SRC.read_text()

if all(marker in text for marker in (
    'v48-production-asset-sanctuary-candidate',
    'v48-deterministic-intake-glb-provenance-only-never-visible',
    'function ProductionSanctuary()',
    'function ProductionOrbMachine()',
)):
    print('V48 materialization already applied; no mutation required.')
    raise SystemExit(0)


def replace_once(old, new, label):
    global text
    if old not in text:
        raise SystemExit(f'missing V48 live anchor: {label}')
    text = text.replace(old, new, 1)


def regex_once(pattern, replacement, label):
    global text
    new_text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'expected one V48 live replacement for {label}, got {count}')
    text = new_text

replace_once(
"const HOME_HDR = '/assets/urai/home-production/cc0/environment/studio-small-08-1k.hdr'\n",
"const HOME_HDR = '/assets/urai/home-production/cc0/environment/studio-small-08-1k.hdr'\n"
"const V48_ROCK_FACE_01 = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'\n"
"const V48_ROCK_FACE_02 = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'\n"
"const V48_PIPE_SYSTEM = '/assets/urai/home-production/cc0/polyhaven-v48/modular_industrial_pipes_01/asset.gltf'\n"
"const V48_CAGED_SCONCE = '/assets/urai/home-production/cc0/polyhaven-v48/industrial_caged_sconce/asset.gltf'\n",
'production constants')

regex_once(
r"const SANCTUARY_REQUIRED_OBJECTS = \[.*?\] as const",
"""const SANCTUARY_REQUIRED_OBJECTS = [
  'home-authored-terrain', 'home-authored-embodied-self', 'home-orb-sanctuary',
  'home-ground-environmental-threshold', 'home-life-map-sky-lookout', 'home-life-map-physical-portal',
  'home-sanctuary-pavilion', 'home-v48-left-scanned-vault', 'home-v48-right-scanned-vault',
  'home-v48-rear-scanned-apse', 'home-v48-machine-services', 'home-v48-authored-practicals',
  'home-orb-engineered-cradle', 'home-v48-orb-machine-frame',
] as const""",
'required objects')

clone_anchor = """function cloneModel(source: THREE.Object3D) {
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
production_helper = clone_anchor + """
function normalizedProductionModel(source: THREE.Object3D, targetSpan: number) {
  const root = cloneModel(source)
  const bounds = new THREE.Box3().setFromObject(root)
  const center = bounds.getCenter(new THREE.Vector3())
  const size = bounds.getSize(new THREE.Vector3())
  const sourceSpan = Math.max(size.x, size.y, size.z, 0.001)
  root.position.sub(center)
  root.scale.setScalar(targetSpan / sourceSpan)
  root.userData.uraiProductionNormalization = { targetSpan, sourceSpan }
  return root
}

function ProductionAsset({url,name,position,rotation=[0,0,0],span,scale=[1,1,1]}:{url:string;name:string;position:Vec3;rotation?:Vec3;span:number;scale?:Vec3}) {
  const gltf = useGLTF(url)
  const model = useMemo(() => normalizedProductionModel(gltf.scene, span), [gltf.scene, span])
  return <group name={name} position={position as [number,number,number]} rotation={rotation as [number,number,number]} scale={scale as [number,number,number]} userData={{runtimeAsset:url,provenance:'poly-haven-cc0-v48-committed'}}><primitive object={model}/></group>
}
"""
replace_once(clone_anchor, production_helper, 'production model helper')

regex_once(
r"root\.visible = true\n  root\.userData\.governedProductionAsset = true\n  root\.userData\.visibleWorldOwner = 'home-entry-chamber-v1\.glb'\n  root\.userData\.treatment = 'v48-governed-selected-sanctuary-visible-primary-world-owner'",
"""root.visible = false
  root.userData.retainedForGovernedCompatibilityOnly = true
  root.userData.visibleWorldOwner = 'home-v48-committed-production-asset-sanctuary'
  root.userData.treatment = 'v48-deterministic-intake-glb-provenance-only-never-visible'""",
'compatibility GLB visibility')

regex_once(
r"function SanctuaryCourt\(\{ target \}: \{ target: MutableRefObject<THREE.Vector3 \| null> \}\) \{.*?\n\}\n\nfunction RecessedPractical",
"""function SanctuaryCourt({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(SANCTUARY)
  const compatibilityModel = useMemo(() => cloneCompatibilitySanctuary(sanctuary.scene), [sanctuary.scene])
  const pack = useStonePack(0.15, 0.19)
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  return <group name=\"home-authored-terrain\" userData={{ treatment: 'v48-photographic-pbr-floor-under-committed-scanned-sanctuary', source: HOME_PHOTOGRAPHIC_PBR_V19 }}>
    <primitive object={compatibilityModel} />
    <mesh name=\"home-v48-walkable-photographic-floor\" position={[0,-0.16,-1.45]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[16.5,19.2,24,24]} />
      <meshPhysicalMaterial color=\"#262c29\" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.54,0.54)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={0.026} displacementBias={-0.012} roughness={0.8} metalness={0.02} clearcoat={0.035} clearcoatRoughness={0.8} envMapIntensity={0.76} />
    </mesh>
    <mesh name=\"home-walkable-navigation-surface\" position={[0,0.18,-1.45]} rotation={[-Math.PI/2,0,0]} onClick={onWalk}>
      <planeGeometry args={[13.4,17.5]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

function ProductionSanctuary(){return <group name=\"home-sanctuary-pavilion\" userData={{visualOwner:'v48-committed-production-assets',construction:'scanned-rock-architecture-plus-modular-industrial-services',visualTreatment:'v48-production-asset-sanctuary-candidate'}}>
  <ProductionAsset url={V48_ROCK_FACE_01} name=\"home-v48-left-scanned-vault\" position={[-4.75,2.7,-5.35]} rotation={[0.06,1.08,-0.1]} span={7.7} scale={[1.02,1.18,1.2]}/>
  <ProductionAsset url={V48_ROCK_FACE_02} name=\"home-v48-right-scanned-vault\" position={[4.65,2.55,-5.78]} rotation={[-0.05,-1.14,0.1]} span={7.6} scale={[1.08,1.16,1.2]}/>
  <ProductionAsset url={V48_ROCK_FACE_01} name=\"home-v48-rear-scanned-apse\" position={[0,3.32,-9.1]} rotation={[1.5,0.1,0.02]} span={9.2} scale={[1.52,1.0,0.84]}/>
  <ProductionAsset url={V48_ROCK_FACE_02} name=\"home-v48-left-foundation-rock\" position={[-6.1,0.45,-1.75]} rotation={[1.58,0.48,-0.06]} span={4.0} scale={[1.22,0.7,1.0]}/>
  <ProductionAsset url={V48_ROCK_FACE_01} name=\"home-v48-right-foundation-rock\" position={[6.05,0.42,-2.55]} rotation={[1.56,-0.42,0.05]} span={4.15} scale={[1.2,0.72,1.0]}/>
  <group name=\"home-v48-machine-services\" userData={{treatment:'v48-real-modular-industrial-services-rooted-in-scanned-apse'}}>
    <ProductionAsset url={V48_PIPE_SYSTEM} name=\"home-v48-left-machine-service\" position={[-2.8,1.72,-6.25]} rotation={[0.04,0.56,-0.08]} span={4.7} scale={[0.84,1.08,0.9]}/>
    <ProductionAsset url={V48_PIPE_SYSTEM} name=\"home-v48-right-machine-service\" position={[2.85,1.78,-6.5]} rotation={[-0.02,-0.62,0.07]} span={4.7} scale={[-0.84,1.06,0.9]}/>
    <ProductionAsset url={V48_PIPE_SYSTEM} name=\"home-v48-upper-machine-service\" position={[0,3.55,-7.6]} rotation={[0.28,1.57,1.42]} span={5.1} scale={[0.7,0.7,1.0]}/>
  </group>
  <group name=\"home-v48-authored-practicals\" userData={{treatment:'v48-real-caged-industrial-practicals'}}>
    <ProductionAsset url={V48_CAGED_SCONCE} name=\"home-v48-left-sconce\" position={[-4.15,2.52,-4.75]} rotation={[0,0.7,0]} span={0.68}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name=\"home-v48-right-sconce\" position={[4.1,2.45,-5.02]} rotation={[0,-0.72,0]} span={0.68}/>
    <pointLight position={[-4.05,2.5,-4.6]} color=\"#d6ad71\" intensity={0.8} distance={6.8} decay={2}/>
    <pointLight position={[4.0,2.42,-4.88]} color=\"#86bdb7\" intensity={0.74} distance={6.5} decay={2}/>
  </group>
</group>}

function ProductionOrbMachine(){return <group name=\"home-orb-engineered-cradle\" userData={{treatment:'v48-asset-backed-machine-surrounds-authored-core-no-pedestal'}}>
  <ProductionAsset url={V48_PIPE_SYSTEM} name=\"home-v48-orb-machine-frame\" position={[0,2.05,-4.85]} rotation={[0.14,0,1.57]} span={5.0} scale={[0.9,0.9,1.08]}/>
  <ProductionAsset url={V48_PIPE_SYSTEM} name=\"home-v48-orb-machine-left\" position={[-1.75,1.25,-4.42]} rotation={[0.02,0.88,0.3]} span={3.25} scale={[0.7,0.7,0.92]}/>
  <ProductionAsset url={V48_PIPE_SYSTEM} name=\"home-v48-orb-machine-right\" position={[1.75,1.27,-4.46]} rotation={[-0.02,-0.88,-0.3]} span={3.25} scale={[-0.7,0.7,0.92]}/>
</group>}

function RecessedPractical""",
'SanctuaryCourt and production composition')

text = text.replace('v48-engineered-body-owned-by-governed-sanctuary-and-orb-assets', 'v48-engineered-body-owned-by-committed-pipe-machine-frame')

replace_once(
'<SanctuaryCourt target={props.target} /><PlantedEdges reducedMotion={props.reducedMotion} /><AtmosphericDepth /><SacredOrb state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb} />',
'<SanctuaryCourt target={props.target} /><ProductionSanctuary /><ProductionOrbMachine /><PlantedEdges reducedMotion={props.reducedMotion} /><AtmosphericDepth /><SacredOrb state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb} />',
'production scene insertion')

text = text.replace('cinematic-pbr-v48-governed-selected-assets', 'cinematic-pbr-v48-committed-production-assets')
text = text.replace('v48-governed-selected-assets-production-candidate', 'v48-production-asset-sanctuary-candidate')
text = text.replace('v48-retained-pixel-candidate', 'v48-production-assets-retained-pixel-candidate')
text = text.replace('governed-home-entry-chamber-v1-plus-governed-orb-v1', 'committed-polyhaven-production-sanctuary-plus-governed-orb-v1')
text = re.sub(r'data-home-runtime-assets="[^"]*"', 'data-home-runtime-assets="home-human-makehuman-v4.glb urai-orb-avatar-v1.glb portal-ring-master-v1.glb polyhaven-rock-face-01 polyhaven-rock-face-02 polyhaven-modular-industrial-pipes-01 polyhaven-industrial-caged-sconce"', text, count=1)
text = re.sub(r'data-home-scenery-assets="[^"]*"', 'data-home-scenery-assets="polyhaven-rock-face-01 polyhaven-rock-face-02 polyhaven-modular-industrial-pipes-01 polyhaven-industrial-caged-sconce polyhaven-fern-02-geometry-v1.glb polyhaven-rock-tile-floor-pbr-v2-optimized studio-small-08-hdri-v1"', text, count=1)
text = text.replace('const desiredFov=portrait?64:54', 'const desiredFov=portrait?67:58')
text = text.replace('gl.toneMappingExposure=1.72', 'gl.toneMappingExposure=2.08')

replace_once(
'useGLTF.preload(FERN_MODEL)\n',
'useGLTF.preload(FERN_MODEL)\nuseGLTF.preload(V48_ROCK_FACE_01)\nuseGLTF.preload(V48_ROCK_FACE_02)\nuseGLTF.preload(V48_PIPE_SYSTEM)\nuseGLTF.preload(V48_CAGED_SCONCE)\n',
'production asset preloads')

SRC.write_text(text)

TEST.write_text(r'''import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const provenancePath = new URL('../../operations/assets/home-v48-production-asset-provenance.json', import.meta.url)
const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'))
const sceneStart = source.indexOf('function SacredFinalScene(')
const sceneEnd = source.indexOf('export function HomeWorldProductionFinal', sceneStart)
const sceneSource = source.slice(sceneStart, sceneEnd)
const architectureStart = source.indexOf('function ProductionSanctuary')
const architectureEnd = source.indexOf('function RecessedPractical', architectureStart)
const architectureSource = source.slice(architectureStart, architectureEnd)
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
const orbSource = source.slice(orbStart, orbEnd)

test('V48 renders committed external production assets instead of the deterministic intake chamber', () => {
  assert.match(source,/v48-production-asset-sanctuary-candidate/)
  assert.match(source,/root\.visible = false/)
  assert.match(source,/v48-deterministic-intake-glb-provenance-only-never-visible/)
  assert.match(sceneSource,/<ProductionSanctuary \/>/)
  assert.match(sceneSource,/<ProductionOrbMachine \/>/)
  assert.doesNotMatch(sceneSource,/<SanctuaryArchitecture \/>|<SanctuaryCeiling \/>|<OrbCradle \/>/)
})

test('V48 production sanctuary is asset-backed, not hero primitive geometry', () => {
  assert.match(architectureSource,/V48_ROCK_FACE_01/)
  assert.match(architectureSource,/V48_ROCK_FACE_02/)
  assert.match(architectureSource,/V48_PIPE_SYSTEM/)
  assert.match(architectureSource,/V48_CAGED_SCONCE/)
  assert.match(architectureSource,/home-v48-rear-scanned-apse/)
  assert.match(architectureSource,/home-v48-machine-services/)
  assert.doesNotMatch(architectureSource,/ExtrudeGeometry|boxGeometry|RoundedBox|coneGeometry|cylinderGeometry/)
})

test('V48 provenance is complete, local at runtime, CC0 and per-file hashed', () => {
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
      assert.ok(existsSync(file.path), `missing committed dependency ${file.path}`)
    }
  }
})

test('V48 keeps the authored Orb core visible inside a real asset-backed machine frame', () => {
  assert.match(source,/v48-governed-orb-core-heart-restored-no-crystalline-display/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.86\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.62\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.32\)/)
  assert.match(orbSource,/scale=\{1\.12\}/)
  assert.match(source,/home-v48-orb-machine-frame/)
  assert.match(source,/v48-asset-backed-machine-surrounds-authored-core-no-pedestal/)
  assert.doesNotMatch(orbSource,/MachineCoreAssembly/)
})

test('V48 has photographic floor, production framing and no source-level visual PASS claim', () => {
  assert.match(source,/home-v48-walkable-photographic-floor/)
  assert.match(source,/rock-tile-floor-diff-1k\.webp/)
  assert.match(source,/studio-small-08-1k\.hdr/)
  assert.match(source,/desiredFov=portrait\?67:58/)
  assert.match(source,/gl\.toneMappingExposure=2\.08/)
  assert.match(source,/v48-production-assets-retained-pixel-candidate/)
  assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})

test('embodied presence remains privacy-preserving',()=>{
  assert.match(source,/function HumanPresence/)
  assert.match(source,/visible=\{false\}/)
})
''')

print('Applied V48 committed production sanctuary assets to live branch state.')
