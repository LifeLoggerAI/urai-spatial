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


if 'v52-deep-reliquary-retained-pixel-rebuild' in text:
    print('V52 deep reliquary rebuild already materialized')
    raise SystemExit(0)

if 'v51-open-reliquary-retained-pixel-rebuild' not in text:
    raise SystemExit('expected V51 source marker was not found')

replace_function('cloneOrbModel', 'PouredStone', r'''function cloneOrbModel(source: THREE.Object3D) {
  const root = cloneModel(source)
  root.visible = true
  root.traverse((object) => {
    const retiredDisplay = object.name === 'orb-aura' || object.name.startsWith('orb-orbit-')
    if (retiredDisplay) {
      object.visible = false
      object.userData.uraiRetiredVisualRole = 'v52-no-aura-no-orbit-display-language'
      return
    }
    if (object.name === 'orb-core') {
      object.visible = true
      object.scale.multiplyScalar(0.5)
      object.userData.uraiIntegratedVisualRole = 'v52-contained-engine-heart-not-sphere-hero'
    }
    if (object.name === 'orb-heart') {
      object.visible = true
      object.scale.multiplyScalar(0.82)
      object.userData.uraiIntegratedVisualRole = 'v52-emotional-machine-heart'
    }
    if (object.name.startsWith('orb-filament-')) {
      object.visible = true
      object.scale.multiplyScalar(0.58)
      object.userData.uraiIntegratedVisualRole = 'v52-contained-machine-filament'
    }
    if (object.name.startsWith('orb-petal-')) {
      object.visible = true
      object.scale.multiplyScalar(1.08)
      object.userData.uraiIntegratedVisualRole = 'v52-primary-faceted-authored-shell'
    }
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue
      material.color.lerp(new THREE.Color('#25453d'), 0.42)
      material.emissive.lerp(new THREE.Color('#83c7bb'), 0.14)
      material.emissiveIntensity = Math.min(Math.max(material.emissiveIntensity, 0.025), 0.13)
      material.roughness = Math.max(material.roughness, 0.58)
      material.metalness = Math.min(Math.max(material.metalness, 0.36), 0.66)
      material.envMapIntensity = Math.min(Math.max(material.envMapIntensity, 0.5), 0.76)
      if (material instanceof THREE.MeshPhysicalMaterial) {
        material.transmission = 0
        material.thickness = 0
        material.opacity = 1
        material.transparent = false
      }
      material.needsUpdate = true
    }
  })
  root.userData.uraiTreatment = 'v52-large-authored-faceted-heart-integrated-opaque-machine-clamps'
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
  return <group name="home-authored-terrain" userData={{ treatment: 'v52-deep-reliquary-floor-controlled-relief-and-wide-finished-lane', source: HOME_PHOTOGRAPHIC_PBR_V19 }}>
    <primitive object={compatibilityModel} />
    <mesh name="home-v48-walkable-photographic-floor" position={[0,-0.16,-1.45]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[16.5,19.2,28,34]} />
      <meshPhysicalMaterial color="#2c342f" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.23,0.23)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={0.008} displacementBias={-0.0034} roughness={0.79} metalness={0.012} clearcoat={0.018} clearcoatRoughness={0.86} envMapIntensity={0.76} />
    </mesh>
    <mesh name="home-v52-central-finished-stone-lane" position={[0,-0.133,-2.4]} rotation={[-Math.PI/2,0,0]} receiveShadow userData={{treatment:'v52-wide-finished-central-stone-lane-reduces-raw-floor-dominance'}}>
      <planeGeometry args={[8.8,13.2,12,18]} />
      <meshPhysicalMaterial color="#353e39" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.13,0.13)} roughnessMap={pack.arm} roughness={0.72} metalness={0.018} clearcoat={0.045} clearcoatRoughness={0.76} envMapIntensity={0.84} />
    </mesh>
    <group name="home-v52-floor-authored-depth" userData={{treatment:'v52-asymmetric-recessed-service-lines-no-grid-no-platform'}}>
      <mesh position={[-3.12,-0.105,-3.15]} rotation={[-Math.PI/2,0,-0.02]} receiveShadow><planeGeometry args={[0.045,9.4]}/><meshStandardMaterial color="#101614" roughness={0.9} metalness={0.05}/></mesh>
      <mesh position={[2.88,-0.104,-3.7]} rotation={[-Math.PI/2,0,0.025]} receiveShadow><planeGeometry args={[0.04,8.2]}/><meshStandardMaterial color="#151b19" roughness={0.9} metalness={0.04}/></mesh>
      <mesh position={[0.62,-0.102,-5.72]} rotation={[-Math.PI/2,0,Math.PI/2]} receiveShadow><planeGeometry args={[0.035,4.8]}/><meshStandardMaterial color="#52746a" emissive="#1c3730" emissiveIntensity={0.12} roughness={0.6} metalness={0.25}/></mesh>
    </group>
    <mesh name="home-walkable-navigation-surface" position={[0,0.18,-1.45]} rotation={[-Math.PI/2,0,0]} onClick={onWalk}>
      <planeGeometry args={[13.4,17.5]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}''')

replace_function('ContinuousVaultSkin', 'CantedWallMass', r'''function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  return <group name="home-v47-reliquary-apse" userData={{treatment:'v52-deep-layered-sanctuary-open-vault-no-slab-wall-no-front-facade'}}>
    <TaperedLoadBeam from={[-5.55,.12,-6.65]} to={[-3.48,4.58,-9.22]} width={.42} color="#34453f"/>
    <TaperedLoadBeam from={[5.32,.12,-6.82]} to={[3.26,4.66,-9.34]} width={.4} color="#504839"/>
    <TaperedLoadBeam from={[-3.48,4.58,-9.22]} to={[-1.38,5.62,-10.42]} width={.32} color="#43574f"/>
    <TaperedLoadBeam from={[3.26,4.66,-9.34]} to={[1.26,5.66,-10.5]} width={.31} color="#655a45"/>
    <TaperedLoadBeam from={[-1.38,5.62,-10.42]} to={[1.26,5.66,-10.5]} width={.28} color="#3b4d47"/>
    <TaperedLoadBeam from={[-4.62,.2,-9.18]} to={[-2.58,4.36,-10.72]} width={.3} color="#263832"/>
    <TaperedLoadBeam from={[4.5,.2,-9.3]} to={[2.46,4.42,-10.82]} width={.29} color="#4d4436"/>
    <TaperedLoadBeam from={[-2.58,4.36,-10.72]} to={[-.72,5.1,-11.22]} width={.22} color="#31453e"/>
    <TaperedLoadBeam from={[2.46,4.42,-10.82]} to={[.68,5.14,-11.26]} width={.22} color="#574a39"/>
    <ArchitecturalStone pack={pack} position={[-5.42,.7,-8.72]} size={[.92,1.4,1.66]} color="#202a26" roughness={.84}/>
    <ArchitecturalStone pack={pack} position={[5.18,.62,-8.9]} size={[.86,1.24,1.52]} color="#2e2d28" roughness={.84}/>
  </group>
}''')

replace_function('MachineCavityLiner', 'SanctuarySideGallery', r'''function MachineCavityLiner(){
  return <group name="home-v47-reliquary-cavity" userData={{treatment:'v52-deep-open-machine-bay-multi-depth-ribs-no-flat-box-housing'}}>
    <TaperedLoadBeam from={[-2.72,.3,-7.72]} to={[-1.42,4.2,-9.22]} width={.24} color="#2b4039"/>
    <TaperedLoadBeam from={[2.62,.3,-7.82]} to={[1.34,4.26,-9.3]} width={.24} color="#564b3b"/>
    <TaperedLoadBeam from={[-1.42,4.2,-9.22]} to={[-.42,4.92,-10.62]} width={.2} color="#365149"/>
    <TaperedLoadBeam from={[1.34,4.26,-9.3]} to={[(.42),4.94,-10.66]} width={.2} color="#62533f"/>
    <TaperedLoadBeam from={[-2.08,.28,-9.28]} to={[-.92,3.74,-10.68]} width={.18} color="#20332e"/>
    <TaperedLoadBeam from={[2.0,.28,-9.36]} to={[(.86),3.78,-10.76]} width={.18} color="#463d32"/>
    <TaperedLoadBeam from={[-.92,3.74,-10.68]} to={[(.86),3.78,-10.76]} width={.18} color="#293d37"/>
    <pointLight position={[-1.8,2.62,-9.05]} color="#86bcb2" intensity={1.28} distance={7.8} decay={2}/>
    <pointLight position={[1.7,2.5,-9.15]} color="#c6a371" intensity={1.14} distance={7.5} decay={2}/>
    <pointLight position={[0,3.92,-10.35]} color="#6f9f97" intensity={.64} distance={5.6} decay={2}/>
  </group>
}''')

replace_function('SanctuarySideGallery', 'SanctuaryArchitecture', r'''function SanctuarySideGallery(){
  const pack=useStonePack(.5,.72)
  return <group name="home-v47-side-gallery" userData={{treatment:'v52-open-asymmetric-grounded-gallery-frames-no-tall-box-bays-no-solid-house-blocks'}}>
    <ArchitecturalStone pack={pack} position={[-5.35,.62,-1.62]} size={[.86,1.24,1.5]} color="#202b27" roughness={.84}/>
    <ArchitecturalStone pack={pack} position={[-5.02,.78,-5.25]} size={[.72,1.56,1.28]} color="#18231f" roughness={.85}/>
    <ArchitecturalStone pack={pack} position={[5.28,.66,-2.25]} size={[.82,1.32,1.44]} color="#2c2f2b" roughness={.84}/>
    <ArchitecturalStone pack={pack} position={[4.88,.82,-5.86]} size={[.68,1.64,1.22]} color="#2a2924" roughness={.85}/>
    <TaperedLoadBeam from={[-5.34,.28,-1.62]} to={[-4.78,3.62,-4.2]} width={.26} color="#3f514b"/>
    <TaperedLoadBeam from={[-4.78,3.62,-4.2]} to={[-4.35,4.34,-7.25]} width={.21} color="#30443e"/>
    <TaperedLoadBeam from={[5.26,.28,-2.25]} to={[4.7,3.7,-4.75]} width={.25} color="#5b5040"/>
    <TaperedLoadBeam from={[4.7,3.7,-4.75]} to={[4.22,4.42,-7.58]} width={.21} color="#4b4336"/>
    <TaperedLoadBeam from={[-4.36,4.34,-7.25]} to={[-3.4,4.72,-8.7]} width={.17} color="#3b5049"/>
    <TaperedLoadBeam from={[4.22,4.42,-7.58]} to={[3.28,4.78,-8.82]} width={.17} color="#5c4d3b"/>
    <RecessedPractical position={[-4.98,.34,-3.42]}/><RecessedPractical position={[4.9,.36,-4.26]} warm={false}/>
    <pointLight position={[-4.7,1.65,-5.9]} color="#82b7ad" intensity={.74} distance={7.1} decay={2}/>
    <pointLight position={[4.55,1.62,-6.28]} color="#c5a371" intensity={.68} distance={6.9} decay={2}/>
  </group>
}''')

replace_function('SanctuaryArchitecture', 'SanctuaryGlazing', r'''function SanctuaryArchitecture(){const pack=useStonePack(.38,.54);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'cinematic-deep-reliquary-sanctuary-v52',construction:'open-grounded-gallery-frames-multi-depth-vault-deep-machine-yoke-and-integrated-reliquary',visualTreatment:'v52-deep-reliquary-retained-pixel-rebuild'}}>
  <SanctuarySideGallery/>
  <ContinuousVaultSkin pack={pack}/>
  <MachineCavityLiner/>
  <group name="home-v52-depth-practicals" userData={{treatment:'v52-recessed-perspective-lighting-without-floating-fixtures'}}>
    <RecessedPractical position={[-4.64,.42,.35]}/><RecessedPractical position={[4.54,.42,-.4]} warm={false}/>
    <RecessedPractical position={[-3.52,.38,-7.55]} warm={false}/><RecessedPractical position={[3.32,.38,-7.88]}/>
  </group>
</group>}''')

replace_function('ReliquaryWing', 'CrownBridge', r'''function ReliquaryWing({side}:{side:-1|1}){
  const s=side
  return <group name={side<0?'home-v47-left-load-arm':'home-v47-right-load-arm'} userData={{treatment:'v52-wide-floor-rooted-integrated-jaw-no-panel-no-house-silhouette-no-display-feet'}}>
    <TaperedLoadBeam from={[s*3.0,.12,-5.72]} to={[s*1.12,2.16,-5.18]} width={.36} color={side<0?'#30463f':'#594d3b'}/>
    <TaperedLoadBeam from={[s*2.54,.16,-6.18]} to={[s*.92,2.82,-5.28]} width={.3} color={side<0?'#405b52':'#695943'}/>
    <TaperedLoadBeam from={[s*1.12,2.16,-5.18]} to={[s*.66,2.34,-5.03]} width={.24} color={side<0?'#526e64':'#78674d'}/>
    <TaperedLoadBeam from={[s*.92,2.82,-5.28]} to={[s*.64,2.58,-5.04]} width={.21} color={side<0?'#466158':'#706047'}/>
  </group>
}''')

replace_function('OrbCradle', 'MachineCoreAssembly', r'''function OrbCradle(){return <group name="home-orb-engineered-cradle" userData={{treatment:'v52-four-point-wide-floor-rooted-load-paths-integrated-with-large-orb-no-display-stand'}}>
  <ReliquaryWing side={-1}/><ReliquaryWing side={1}/><CrownBridge/>
  <TaperedLoadBeam from={[-3.22,.1,-6.12]} to={[-.86,2.78,-5.18]} width={.28} color="#334940"/>
  <TaperedLoadBeam from={[3.12,.1,-6.22]} to={[(.86),2.8,-5.18]} width={.28} color="#5f503c"/>
  <TaperedLoadBeam from={[-2.4,.12,-6.58]} to={[-.72,1.7,-5.14]} width={.22} color="#2c4039"/>
  <TaperedLoadBeam from={[2.32,.12,-6.62]} to={[(.72),1.72,-5.14]} width={.22} color="#544536"/>
</group>}''')

replace_function('MachineCoreAssembly', 'OrbArmorPlate', r'''function MachineCoreAssembly(){
  return <group name="home-v47-machine-core-assembly" userData={{treatment:'v52-deep-machine-yoke-integrated-with-vault-no-display-plate-no-flat-crosshead'}}>
    <TaperedLoadBeam from={[-2.18,.82,-7.16]} to={[-.94,2.56,-5.72]} width={.24} color="#273d36"/>
    <TaperedLoadBeam from={[2.12,.84,-7.2]} to={[(.94),2.58,-5.74]} width={.24} color="#5a4c3a"/>
    <TaperedLoadBeam from={[-2.02,3.78,-7.34]} to={[-.88,2.92,-5.7]} width={.22} color="#38564d"/>
    <TaperedLoadBeam from={[1.96,3.8,-7.36]} to={[(.88),2.94,-5.7]} width={.22} color="#675541"/>
    <TaperedLoadBeam from={[-2.02,3.78,-7.34]} to={[(1.96),3.8,-7.36]} width={.2} color="#31473f"/>
    <TaperedLoadBeam from={[-2.18,.82,-7.16]} to={[(2.12),.84,-7.2]} width={.19} color="#302f29"/>
    <TaperedLoadBeam from={[-.88,2.92,-5.7]} to={[(.88),2.94,-5.7]} width={.16} color="#466056"/>
    <pointLight position={[0,2.48,-6.08]} color="#84c3b7" intensity={1.02} distance={5.2} decay={2}/>
    <pointLight position={[0,3.82,-7.05]} color="#c3a36f" intensity={.58} distance={4.9} decay={2}/>
  </group>
}''')

replace_function('OrbArmorPlate', 'SacredOrb', r'''function OrbArmorPlate({position,rotation,scale=[1,1,1],warm=false}:{position:Vec3;rotation:Vec3;scale?:Vec3;warm?:boolean}){
  return <RoundedBox args={[.88,.2,.52]} radius={.075} smoothness={4} position={position as [number,number,number]} rotation={rotation as [number,number,number]} scale={scale as [number,number,number]} castShadow receiveShadow>
    <meshPhysicalMaterial color={warm?'#6d6048':'#3a5a50'} roughness={.6} metalness={.56} clearcoat={.018} clearcoatRoughness={.76} envMapIntensity={.74}/>
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
  useFrame(({clock})=>{if(!root.current)return;root.current.rotation.y=reducedMotion?0:Math.sin(clock.elapsedTime*.11)*.006;root.current.position.y=ORB.y+(reducedMotion?0:Math.sin(clock.elapsedTime*.36)*.008)})
  const stateColor=state==='warning'?'#d0a06e':state==='thinking'||state==='reflecting'?'#a4b3d6':'#8ce0d4'
  const intensity=state==='speaking'?1.2:state==='listening'?1.1:1.0
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v52-large-authored-faceted-heart-integrated-into-deep-machine-jaws-no-glass-ball-no-display-case'}}>
    <group name="home-orb-engineered-body" userData={{treatment:'v52-four-substantial-opaque-machine-clamps-integrated-with-large-authored-heart'}}>
      <OrbArmorPlate position={[0,.94,0]} rotation={[.08,0,.04]} scale={[1.08,1,.92]}/>
      <OrbArmorPlate position={[0,-.92,.02]} rotation={[-.08,0,-.04]} scale={[1.06,1,.9]} warm/>
      <OrbArmorPlate position={[-.9,.02,0]} rotation={[0,.1,Math.PI/2-.07]} scale={[1.02,1,.9]}/>
      <OrbArmorPlate position={[.9,.02,-.02]} rotation={[0,-.1,Math.PI/2+.07]} scale={[1.02,1,.9]} warm/>
    </group>
    <group scale={1.55} position={[0,-.02,0]} rotation={[0,.18,0]} name="home-orb-authored-core" userData={{treatment:'v52-large-governed-faceted-authored-heart-primary-inside-integrated-machine-jaws'}}><primitive object={authoredOrb}/></group>
    <pointLight color={stateColor} intensity={intensity*1.52} distance={10.2} decay={2}/>
    <pointLight position={[0,.62,-1.35]} color="#d7b97f" intensity={.88} distance={6.6} decay={2}/>
    <pointLight position={[0,-.44,.72]} color="#79c0b6" intensity={.72} distance={5.7} decay={2}/>
  </group>
}''')

text = replace_exact(text, 'cinematic-pbr-v51-open-reliquary', 'cinematic-pbr-v52-deep-reliquary', 1, 'visual grade')
text = replace_exact(text, 'v51-open-reliquary-candidate', 'v52-deep-reliquary-candidate', 1, 'art revision')
text = replace_exact(text, 'v51-retained-pixel-candidate-not-certified', 'v52-retained-pixel-candidate-not-certified', 1, 'art certification')
text = replace_exact(text, 'open-reliquary-v51-plus-governed-living-orb', 'deep-reliquary-v52-plus-governed-living-orb', 1, 'animation owner')
text = replace_exact(text, 'pitch=useRef(0.08)', 'pitch=useRef(0.14)', 1, 'camera pitch initializer')
text = replace_exact(text, 'pitch.current=0.08', 'pitch.current=0.14', 1, 'camera pitch reset')
text = replace_exact(text, 'const desiredFov=portrait?64:50', 'const desiredFov=portrait?52:44', 1, 'camera FOV')
text = replace_exact(text, 'gl.toneMappingExposure=2.36', 'gl.toneMappingExposure=2.46', 1, 'tone exposure')

if 'v52-deep-reliquary-retained-pixel-rebuild' not in text:
    raise SystemExit('V52 marker missing after materialization')
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
''')

portal = PORTAL_PROOF.read_text()
portal = replace_exact(portal, "runtimeContract: 'v49-authored-reliquary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof'", "runtimeContract: 'v52-deep-reliquary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof'", 1, 'Portal/Orb runtime contract')
portal = replace_exact(portal, "record.visualGrade === 'cinematic-pbr-v49-authored-reliquary'", "record.visualGrade === 'cinematic-pbr-v52-deep-reliquary'", 1, 'Portal/Orb visual grade')
portal = replace_exact(portal, "record.artRevision === 'v49-authored-reliquary-candidate'", "record.artRevision === 'v52-deep-reliquary-candidate'", 1, 'Portal/Orb art revision')
portal = replace_exact(portal, "record.artCertification === 'v49-retained-pixel-candidate-not-certified'", "record.artCertification === 'v52-retained-pixel-candidate-not-certified'", 1, 'Portal/Orb art certification')
PORTAL_PROOF.write_text(portal)

continuous = CONTINUOUS_PROOF.read_text()
continuous = replace_exact(continuous, "const newOwner = \"result.animationOwner === 'authored-reliquary-v49-plus-governed-living-orb'\"", "const newOwner = \"result.animationOwner === 'deep-reliquary-v52-plus-governed-living-orb'\"", 1, 'Continuous animation owner')
CONTINUOUS_PROOF.write_text(continuous)

print('materialized V52 deep reliquary rebuild and exact-candidate proof identities from literal V51 pixel rejection')
