from pathlib import Path
import re

SOURCE = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
REALISM = Path('urai-tier1/tests/home-relic-machine-realism-contract.test.mjs')
PORTAL_PROOF = Path('scripts/capture-natural-home-orb-proof.mjs')
CONTINUOUS_PROOF = Path('scripts/run-continuous-spatial-proof-v22-natural.mjs')

text = SOURCE.read_text()


def replace_function(start_name: str, next_name: str, replacement: str) -> None:
    global text
    pattern = rf"function {re.escape(start_name)}\b[\s\S]*?(?=\nfunction {re.escape(next_name)}\b)"
    text, count = re.subn(pattern, replacement.rstrip() + "\n\n", text, count=1)
    if count != 1:
        raise SystemExit(f'expected exactly one {start_name} -> {next_name} function span, got {count}')


def replace_exact(value: str, old: str, new: str, expected: int = 1, label: str = 'replacement') -> str:
    count = value.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected} occurrence(s), got {count}')
    return value.replace(old, new, expected)


if 'v53-integrated-arch-reliquary-retained-pixel-rebuild' in text:
    print('V53 integrated arch reliquary already materialized')
    raise SystemExit(0)
if 'v52-deep-reliquary-retained-pixel-rebuild' not in text:
    raise SystemExit('expected V52 source marker was not found')

replace_function('cloneOrbModel', 'PouredStone', r'''function cloneOrbModel(source: THREE.Object3D) {
  const root = cloneModel(source)
  root.visible = true
  root.traverse((object) => {
    const retiredDisplay = object.name === 'orb-aura' || object.name.startsWith('orb-orbit-') || object.name.startsWith('orb-filament-') || object.name.startsWith('orb-petal-')
    if (retiredDisplay) {
      object.visible = false
      object.userData.uraiRetiredVisualRole = 'v53-no-aura-no-orbits-no-starburst-filaments-no-petal-clutter'
      return
    }
    if (object.name === 'orb-core') {
      object.visible = true
      object.scale.multiplyScalar(0.24)
      object.userData.uraiIntegratedVisualRole = 'v53-contained-authored-core-inside-engine-heart'
    }
    if (object.name === 'orb-heart') {
      object.visible = true
      object.scale.multiplyScalar(0.38)
      object.userData.uraiIntegratedVisualRole = 'v53-contained-authored-heart-inside-faceted-relic-shell'
    }
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue
      material.color.lerp(new THREE.Color('#2c5148'), 0.5)
      material.emissive.lerp(new THREE.Color('#87cfc0'), 0.12)
      material.emissiveIntensity = Math.min(Math.max(material.emissiveIntensity, 0.02), 0.1)
      material.roughness = Math.max(material.roughness, 0.62)
      material.metalness = Math.min(Math.max(material.metalness, 0.38), 0.62)
      material.envMapIntensity = Math.min(Math.max(material.envMapIntensity, 0.5), 0.72)
      if (material instanceof THREE.MeshPhysicalMaterial) {
        material.transmission = 0
        material.thickness = 0
        material.opacity = 1
        material.transparent = false
      }
      material.needsUpdate = true
    }
  })
  root.userData.uraiTreatment = 'v53-contained-governed-heart-inside-faceted-relic-core-no-starburst'
  return root
}''')

replace_function('SanctuaryCourt', 'ProductionSanctuary', r'''function SanctuaryCourt({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(SANCTUARY)
  const compatibilityModel = useMemo(() => cloneCompatibilitySanctuary(sanctuary.scene), [sanctuary.scene])
  const pack = useStonePack(0.2, 0.25)
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  return <group name="home-authored-terrain" userData={{ treatment: 'v53-finished-sanctuary-floor-banded-inlay-depth', source: HOME_PHOTOGRAPHIC_PBR_V19 }}>
    <primitive object={compatibilityModel} />
    <mesh name="home-v48-walkable-photographic-floor" position={[0,-0.16,-1.45]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[16.5,19.2,28,34]} />
      <meshPhysicalMaterial color="#27302c" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.16,0.16)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={0.004} displacementBias={-0.0018} roughness={0.76} metalness={0.014} clearcoat={0.026} clearcoatRoughness={0.8} envMapIntensity={0.82} />
    </mesh>
    <mesh name="home-v53-central-finished-stone-lane" position={[0,-0.13,-3.1]} rotation={[-Math.PI/2,0,0]} receiveShadow userData={{treatment:'v53-wide-finished-inlaid-processional-lane'}}>
      <planeGeometry args={[9.4,12.4,12,18]} />
      <meshPhysicalMaterial color="#35413b" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.09,0.09)} roughnessMap={pack.arm} roughness={0.68} metalness={0.024} clearcoat={0.055} clearcoatRoughness={0.72} envMapIntensity={0.9} />
    </mesh>
    <group name="home-v53-floor-inlays" userData={{treatment:'v53-recessed-converging-machine-inlays-no-platform-no-grid'}}>
      <mesh position={[-2.4,-0.098,-4.0]} rotation={[-Math.PI/2,0,-0.055]} receiveShadow><planeGeometry args={[0.055,8.4]}/><meshStandardMaterial color="#5b8176" emissive="#17352e" emissiveIntensity={0.1} roughness={0.62} metalness={0.28}/></mesh>
      <mesh position={[2.4,-0.098,-4.0]} rotation={[-Math.PI/2,0,0.055]} receiveShadow><planeGeometry args={[0.055,8.4]}/><meshStandardMaterial color="#8c7958" emissive="#352718" emissiveIntensity={0.08} roughness={0.64} metalness={0.26}/></mesh>
      <mesh position={[0,-0.096,-6.0]} rotation={[-Math.PI/2,0,Math.PI/2]} receiveShadow><planeGeometry args={[0.05,5.2]}/><meshStandardMaterial color="#73988d" emissive="#1c4038" emissiveIntensity={0.14} roughness={0.58} metalness={0.3}/></mesh>
    </group>
    <mesh name="home-walkable-navigation-surface" position={[0,0.18,-1.45]} rotation={[-Math.PI/2,0,0]} onClick={onWalk}>
      <planeGeometry args={[13.4,17.5]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}''')

replace_function('ContinuousVaultSkin', 'CantedWallMass', r'''function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  return <group name="home-v47-reliquary-apse" userData={{treatment:'v53-nested-stone-metal-arches-create-coherent-sanctuary-depth-no-loose-scaffold'}}>
    <mesh position={[0,2.58,-9.55]} castShadow receiveShadow><torusGeometry args={[4.25,.34,10,72,Math.PI]}/><meshPhysicalMaterial color="#33453f" map={pack.color} normalMap={pack.normal} roughness={.71} metalness={.16} clearcoat={.04} clearcoatRoughness={.76}/></mesh>
    <mesh position={[0,2.56,-10.05]} castShadow receiveShadow><torusGeometry args={[3.55,.27,10,72,Math.PI]}/><meshPhysicalMaterial color="#4c4a3f" map={pack.color} normalMap={pack.normal} roughness={.7} metalness={.18} clearcoat={.04} clearcoatRoughness={.74}/></mesh>
    <mesh position={[0,2.5,-10.48]} castShadow receiveShadow><torusGeometry args={[2.92,.2,10,72,Math.PI]}/><meshPhysicalMaterial color="#2c443d" roughness={.64} metalness={.34} clearcoat={.06} clearcoatRoughness={.7}/></mesh>
    <mesh position={[-4.25,1.62,-9.55]} castShadow receiveShadow><cylinderGeometry args={[.42,.62,3.25,10]}/><meshPhysicalMaterial color="#303d38" map={pack.color} normalMap={pack.normal} roughness={.74} metalness={.12}/></mesh>
    <mesh position={[4.25,1.62,-9.55]} castShadow receiveShadow><cylinderGeometry args={[.42,.62,3.25,10]}/><meshPhysicalMaterial color="#4b463a" map={pack.color} normalMap={pack.normal} roughness={.74} metalness={.12}/></mesh>
    <mesh position={[-3.55,1.42,-10.05]} castShadow receiveShadow><cylinderGeometry args={[.32,.48,2.85,10]}/><meshPhysicalMaterial color="#263a34" roughness={.68} metalness={.26}/></mesh>
    <mesh position={[3.55,1.42,-10.05]} castShadow receiveShadow><cylinderGeometry args={[.32,.48,2.85,10]}/><meshPhysicalMaterial color="#4f4434" roughness={.68} metalness={.26}/></mesh>
  </group>
}''')

replace_function('MachineCavityLiner', 'SanctuarySideGallery', r'''function MachineCavityLiner(){
  return <group name="home-v47-reliquary-cavity" userData={{treatment:'v53-recessed-concentric-machine-bay-integrated-with-architecture-no-box-no-beam-tangle'}}>
    <mesh position={[0,2.32,-10.78]} castShadow receiveShadow><torusGeometry args={[2.28,.18,10,64,Math.PI]}/><meshPhysicalMaterial color="#31534a" roughness={.56} metalness={.48} clearcoat={.08} clearcoatRoughness={.64}/></mesh>
    <mesh position={[0,2.18,-11.03]} castShadow receiveShadow><ringGeometry args={[1.55,2.02,64,1,0,Math.PI]}/><meshPhysicalMaterial color="#192823" roughness={.82} metalness={.18} side={THREE.DoubleSide}/></mesh>
    <pointLight position={[0,2.75,-10.2]} color="#85c9bc" intensity={1.05} distance={7.2} decay={2}/>
    <pointLight position={[-2.3,1.6,-9.7]} color="#72a89e" intensity={.5} distance={5.6} decay={2}/>
    <pointLight position={[2.3,1.6,-9.7]} color="#c1a06f" intensity={.48} distance={5.6} decay={2}/>
  </group>
}''')

replace_function('SanctuarySideGallery', 'SanctuaryArchitecture', r'''function SanctuarySideGallery(){
  const pack=useStonePack(.5,.72)
  return <group name="home-v47-side-gallery" userData={{treatment:'v53-low-faceted-buttresses-and-recessed-practicals-no-rectangular-bay-blocks-no-scaffold'}}>
    <mesh position={[-5.18,.72,-4.1]} castShadow receiveShadow><cylinderGeometry args={[.52,.78,1.44,8]}/><meshPhysicalMaterial color="#24322d" map={pack.color} normalMap={pack.normal} roughness={.78} metalness={.08}/></mesh>
    <mesh position={[5.12,.72,-4.48]} castShadow receiveShadow><cylinderGeometry args={[.5,.76,1.44,8]}/><meshPhysicalMaterial color="#39352d" map={pack.color} normalMap={pack.normal} roughness={.78} metalness={.08}/></mesh>
    <mesh position={[-4.68,.55,-7.05]} castShadow receiveShadow><cylinderGeometry args={[.4,.62,1.1,8]}/><meshPhysicalMaterial color="#1e2e29" map={pack.color} roughness={.78} metalness={.1}/></mesh>
    <mesh position={[4.62,.55,-7.28]} castShadow receiveShadow><cylinderGeometry args={[.4,.62,1.1,8]}/><meshPhysicalMaterial color="#353128" map={pack.color} roughness={.78} metalness={.1}/></mesh>
    <RecessedPractical position={[-5.08,.18,-3.15]}/><RecessedPractical position={[5.02,.18,-3.55]} warm={false}/>
    <RecessedPractical position={[-4.62,.18,-6.4]} warm={false}/><RecessedPractical position={[4.55,.18,-6.65]}/>
    <pointLight position={[-4.5,1.3,-6.55]} color="#739f97" intensity={.55} distance={5.8} decay={2}/>
    <pointLight position={[4.45,1.3,-6.75]} color="#b99768" intensity={.5} distance={5.8} decay={2}/>
  </group>
}''')

replace_function('SanctuaryArchitecture', 'SanctuaryGlazing', r'''function SanctuaryArchitecture(){const pack=useStonePack(.38,.54);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'cinematic-integrated-arch-reliquary-v53',construction:'nested-structural-arches-low-buttresses-recessed-machine-bay-and-integrated-faceted-orb',visualTreatment:'v53-integrated-arch-reliquary-retained-pixel-rebuild'}}>
  <SanctuarySideGallery/>
  <ContinuousVaultSkin pack={pack}/>
  <MachineCavityLiner/>
  <group name="home-v53-perspective-practicals" userData={{treatment:'v53-recessed-depth-lights-without-floating-fixtures'}}>
    <RecessedPractical position={[-3.62,.2,-8.15]} warm={false}/><RecessedPractical position={[3.58,.2,-8.3]}/>
  </group>
</group>}''')

replace_function('ReliquaryWing', 'CrownBridge', r'''function ReliquaryWing({side}:{side:-1|1}){
  const s=side
  return <group name={side<0?'home-v47-left-load-arm':'home-v47-right-load-arm'} userData={{treatment:'v53-compact-floor-rooted-machine-jaw-no-long-scaffold-no-display-footing'}}>
    <TaperedLoadBeam from={[s*1.72,.08,-5.62]} to={[s*.82,1.66,-5.18]} width={.24} color={side<0?'#36554b':'#675841'}/>
    <TaperedLoadBeam from={[s*1.38,.12,-6.18]} to={[s*.7,2.16,-5.28]} width={.2} color={side<0?'#2d473f':'#554735'}/>
  </group>
}''')

replace_function('OrbCradle', 'MachineCoreAssembly', r'''function OrbCradle(){return <group name="home-orb-engineered-cradle" userData={{treatment:'v53-compact-four-point-floor-load-path-integrated-into-recessed-machine-bay-no-display-stand'}}>
  <ReliquaryWing side={-1}/><ReliquaryWing side={1}/><CrownBridge/>
  <TaperedLoadBeam from={[-1.2,.08,-6.55]} to={[-.62,1.35,-5.35]} width={.18} color="#2f4a42"/>
  <TaperedLoadBeam from={[1.2,.08,-6.55]} to={[(.62),1.35,-5.35]} width={.18} color="#5c4d39"/>
</group>}''')

replace_function('MachineCoreAssembly', 'OrbArmorPlate', r'''function MachineCoreAssembly(){
  return <group name="home-v47-machine-core-assembly" userData={{treatment:'v53-contained-rear-yoke-and-arch-collar-no-cross-scaffold-no-display-plate'}}>
    <mesh position={[0,2.18,-6.02]} rotation={[0,0,0]} castShadow receiveShadow><torusGeometry args={[1.62,.15,10,56,Math.PI]}/><meshPhysicalMaterial color="#324c44" roughness={.57} metalness={.48} clearcoat={.06} clearcoatRoughness={.66}/></mesh>
    <TaperedLoadBeam from={[-1.62,2.16,-6.02]} to={[-.84,2.42,-5.38]} width={.16} color="#3d5d53"/>
    <TaperedLoadBeam from={[1.62,2.16,-6.02]} to={[(.84),2.42,-5.38]} width={.16} color="#695841"/>
    <pointLight position={[0,2.32,-5.98]} color="#8bd5c7" intensity={.92} distance={5.2} decay={2}/>
  </group>
}''')

replace_function('OrbArmorPlate', 'SacredOrb', r'''function OrbArmorPlate({position,rotation,scale=[1,1,1],warm=false}:{position:Vec3;rotation:Vec3;scale?:Vec3;warm?:boolean}){
  return <RoundedBox args={[.74,.18,.44]} radius={.08} smoothness={5} position={position as [number,number,number]} rotation={rotation as [number,number,number]} scale={scale as [number,number,number]} castShadow receiveShadow>
    <meshPhysicalMaterial color={warm?'#756349':'#3c6257'} roughness={.54} metalness={.58} clearcoat={.04} clearcoatRoughness={.68} envMapIntensity={.8}/>
  </RoundedBox>
}''')

replace_function('SacredOrb', 'HumanPresence', r'''function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null),activeAction=useRef<THREE.AnimationAction|null>(null)
  const orb=useGLTF(ORB_MODEL)
  const authoredOrb=useMemo(()=>cloneOrbModel(orb.scene),[orb.scene])
  const {actions}=useAnimations(orb.animations,authoredOrb)
  const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion])
  useEffect(()=>{const allActions=Object.values(actions).filter((action):action is THREE.AnimationAction=>Boolean(action));if(reducedMotion){allActions.forEach((action)=>action.stop());activeAction.current=null;return}const next=actions[ORB_CLIPS[state]];if(!next)return;const previous=activeAction.current;if(previous&&previous!==next)previous.fadeOut(.2);next.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(.2).play();activeAction.current=next},[actions,reducedMotion,state])
  useEffect(()=>()=>{Object.values(actions).forEach((action)=>action?.stop())},[actions])
  useFrame(({clock})=>{if(!root.current)return;root.current.rotation.y=reducedMotion?0:Math.sin(clock.elapsedTime*.1)*.004;root.current.position.y=ORB.y+(reducedMotion?0:Math.sin(clock.elapsedTime*.32)*.006)})
  const stateColor=state==='warning'?'#d0a06e':state==='thinking'||state==='reflecting'?'#a4b3d6':'#8ce0d4'
  const intensity=state==='speaking'?1.2:state==='listening'?1.1:1.0
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v53-faceted-opaque-relic-core-with-contained-governed-heart-integrated-into-compact-machine-collar-no-starburst-no-glass-sphere'}}>
    <group name="home-orb-engineered-body" userData={{treatment:'v53-faceted-relic-shell-and-four-compact-machine-clamps'}}>
      <mesh castShadow receiveShadow><dodecahedronGeometry args={[1.18,0]}/><meshPhysicalMaterial color="#315d52" emissive="#123c34" emissiveIntensity={.18} roughness={.5} metalness={.58} clearcoat={.08} clearcoatRoughness={.62} envMapIntensity={.88}/></mesh>
      <mesh scale={.72} rotation={[.26,.42,.12]} castShadow><icosahedronGeometry args={[1,1]}/><meshPhysicalMaterial color="#85cdbc" emissive={stateColor} emissiveIntensity={.42} roughness={.44} metalness={.48} clearcoat={.1} clearcoatRoughness={.56}/></mesh>
      <OrbArmorPlate position={[0,1.08,0]} rotation={[.08,0,.02]} scale={[1.08,1,.94]}/>
      <OrbArmorPlate position={[0,-1.08,.02]} rotation={[-.08,0,-.02]} scale={[1.08,1,.94]} warm/>
      <OrbArmorPlate position={[-1.08,.02,0]} rotation={[0,.08,Math.PI/2-.04]} scale={[1.05,1,.94]}/>
      <OrbArmorPlate position={[1.08,.02,-.02]} rotation={[0,-.08,Math.PI/2+.04]} scale={[1.05,1,.94]} warm/>
    </group>
    <group scale={.56} position={[0,0,.08]} rotation={[0,.18,0]} name="home-orb-authored-core" userData={{treatment:'v53-governed-authored-heart-contained-inside-primary-faceted-relic-shell'}}><primitive object={authoredOrb}/></group>
    <pointLight color={stateColor} intensity={intensity*1.35} distance={8.8} decay={2}/>
    <pointLight position={[0,.45,-1.0]} color="#d4b477" intensity={.58} distance={5.2} decay={2}/>
  </group>
}''')

text = replace_exact(text, 'cinematic-pbr-v52-deep-reliquary', 'cinematic-pbr-v53-integrated-arch-reliquary', 1, 'visual grade')
text = replace_exact(text, 'v52-deep-reliquary-candidate', 'v53-integrated-arch-reliquary-candidate', 1, 'art revision')
text = replace_exact(text, 'v52-retained-pixel-candidate-not-certified', 'v53-retained-pixel-candidate-not-certified', 1, 'art certification')
text = replace_exact(text, 'deep-reliquary-v52-plus-governed-living-orb', 'integrated-arch-v53-plus-governed-living-orb', 1, 'animation owner')
text = replace_exact(text, 'pitch=useRef(0.14)', 'pitch=useRef(0.19)', 1, 'camera pitch initializer')
text = replace_exact(text, 'pitch.current=0.14', 'pitch.current=0.19', 1, 'camera pitch reset')
text = replace_exact(text, 'const desiredFov=portrait?52:44', 'const desiredFov=portrait?48:42', 1, 'camera FOV')
text = replace_exact(text, 'gl.toneMappingExposure=2.46', 'gl.toneMappingExposure=2.38', 1, 'tone exposure')

if 'v53-integrated-arch-reliquary-retained-pixel-rebuild' not in text:
    raise SystemExit('V53 marker missing after materialization')
SOURCE.write_text(text)

REALISM.write_text(r'''import assert from 'node:assert/strict'
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
''')

portal = PORTAL_PROOF.read_text()
portal = replace_exact(portal, "runtimeContract: 'v52-deep-reliquary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof'", "runtimeContract: 'v53-integrated-arch-reliquary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof'", 1, 'Portal/Orb runtime contract')
portal = replace_exact(portal, "record.visualGrade === 'cinematic-pbr-v52-deep-reliquary'", "record.visualGrade === 'cinematic-pbr-v53-integrated-arch-reliquary'", 1, 'Portal/Orb visual grade')
portal = replace_exact(portal, "record.artRevision === 'v52-deep-reliquary-candidate'", "record.artRevision === 'v53-integrated-arch-reliquary-candidate'", 1, 'Portal/Orb art revision')
portal = replace_exact(portal, "record.artCertification === 'v52-retained-pixel-candidate-not-certified'", "record.artCertification === 'v53-retained-pixel-candidate-not-certified'", 1, 'Portal/Orb art certification')
PORTAL_PROOF.write_text(portal)

continuous = CONTINUOUS_PROOF.read_text()
continuous = replace_exact(continuous, "const newOwner = \"result.animationOwner === 'deep-reliquary-v52-plus-governed-living-orb'\"", "const newOwner = \"result.animationOwner === 'integrated-arch-v53-plus-governed-living-orb'\"", 1, 'Continuous animation owner')
CONTINUOUS_PROOF.write_text(continuous)

print('materialized V53 integrated arch reliquary from literal V52 scaffold/starburst rejection')
