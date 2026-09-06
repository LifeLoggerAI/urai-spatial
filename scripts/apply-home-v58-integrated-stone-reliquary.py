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
        raise SystemExit(f'expected exactly one {start_name} -> {next_name} span, got {count}')

def replace_exact(old: str, new: str, expected: int = 1, label: str = 'replacement') -> None:
    global text
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected}, got {count}')
    text = text.replace(old, new, expected)

if 'v58-integrated-stone-reliquary-retained-pixel-rebuild' in text:
    print('V58 already materialized')
    raise SystemExit(0)
if 'v57-photogrammetry-service-vault-retained-pixel-rebuild' not in text:
    raise SystemExit('expected V57 source marker not found')

replace_function('ContinuousVaultSkin', 'CantedWallMass', r'''function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  return <group name="home-v47-reliquary-apse" userData={{treatment:'v58-continuous-dark-stone-enclosure-with-embedded-scanned-detail-no-cutout-silhouettes'}}>
    <SanctuaryShellMass pack={pack} position={[0,2.62,-9.25]} width={13.8} height={8.1} depth={2.35} openingWidth={6.25} openingHeight={4.35} color="#101715"/>
    <ProductionAsset url={V48_ROCK_FACE_01} name="home-v58-embedded-rear-rock-left" position={[-2.15,2.25,-7.92]} rotation={[-.02,.18,.03]} span={5.1} scale={[1.46,1.34,.52]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name="home-v58-embedded-rear-rock-right" position={[2.08,2.2,-8.02]} rotation={[.02,-.2,-.02]} span={5.15} scale={[1.46,1.34,.52]}/>
    <ArchitecturalStone pack={pack} position={[0,4.72,-8.04]} size={[7.6,.42,1.62]} color="#111916" roughness={.82} metalness={.015}/>
  </group>
}''')

replace_function('CantedWallMass', 'MachineCavityLiner', r'''function CantedWallMass({pack,side}:{pack:SurfacePack;side:-1|1}){
  return <group name={side<0?'home-v58-left-integrated-return':'home-v58-right-integrated-return'} userData={{treatment:'v58-dark-stone-return-overlaps-camera-edge-no-free-standing-tower'}}>
    <ArchitecturalStone pack={pack} position={[side*5.15,2.18,-5.95]} rotation={[0,side*.16,side*.025]} size={[2.7,4.65,5.5]} color={side<0?'#131a17':'#151a17'} roughness={.84} metalness={.012}/>
    <ProductionAsset url={side<0?V48_ROCK_FACE_02:V48_ROCK_FACE_01} name={side<0?'home-v58-left-inset-rock':'home-v58-right-inset-rock'} position={[side*4.7,1.92,-5.7]} rotation={[0,side*1.18,0]} span={4.15} scale={[.88,1.18,.52]}/>
  </group>
}''')

replace_function('MachineCavityLiner', 'SanctuarySideGallery', r'''function MachineCavityLiner(){
  return <group name="home-v47-reliquary-cavity" userData={{treatment:'v58-deep-dark-recess-no-visible-pipe-rack-no-flat-machine-backboard'}}>
    <RoundedBox args={[3.4,2.7,.54]} radius={.34} smoothness={9} position={[0,2.18,-7.46]} castShadow receiveShadow>
      <meshPhysicalMaterial color="#050908" roughness={.88} metalness={.16} clearcoat={.01} clearcoatRoughness={.94} envMapIntensity={.3}/>
    </RoundedBox>
    <pointLight position={[0,2.22,-6.62]} color="#729d94" intensity={.18} distance={3.6} decay={2}/>
  </group>
}''')

replace_function('SanctuarySideGallery', 'SanctuaryArchitecture', r'''function SanctuarySideGallery(){
  const pack=useStonePack(.42,.58)
  return <group name="home-v47-side-gallery" userData={{treatment:'v58-overlapped-dark-side-enclosure-no-disconnected-photogrammetry-slabs'}}>
    <CantedWallMass pack={pack} side={-1}/><CantedWallMass pack={pack} side={1}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v58-left-recessed-practical" position={[-3.58,2.1,-6.35]} rotation={[0,.72,0]} span={.46}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v58-right-recessed-practical" position={[3.55,2.08,-6.42]} rotation={[0,-.72,0]} span={.46}/>
  </group>
}''')

replace_function('SanctuaryArchitecture', 'SanctuaryGlazing', r'''function SanctuaryArchitecture(){const pack=useStonePack(.34,.5);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'cinematic-integrated-stone-reliquary-v58',construction:'continuous-dark-stone-enclosure-embedded-scanned-detail-deep-recessed-orb-aperture',visualTreatment:'v58-integrated-stone-reliquary-retained-pixel-rebuild'}}>
  <ContinuousVaultSkin pack={pack}/><SanctuarySideGallery/><MachineCavityLiner/>
  <group name="home-v58-floor-depth-practicals" userData={{treatment:'v58-subtle-floor-practicals-guide-depth-without-stage-framing'}}>
    <RecessedPractical position={[-1.62,.15,-6.15]} warm={false}/><RecessedPractical position={[1.72,.15,-6.32]}/>
  </group>
</group>}''')

replace_function('ReliquaryWing', 'CrownBridge', r'''function ReliquaryWing({side}:{side:-1|1}){
  return <group name={side<0?'home-v47-left-load-arm':'home-v47-right-load-arm'} userData={{treatment:'v58-short-recessed-load-cheek-integrated-into-socket'}}>
    <RoundedBox args={[.34,1.18,.48]} radius={.1} smoothness={6} position={[side*.68,2.2,-6.18]} rotation={[0,side*.08,side*.2]} castShadow receiveShadow>
      <meshPhysicalMaterial color={side<0?'#26332e':'#3c382e'} roughness={.62} metalness={.44} clearcoat={.02} clearcoatRoughness={.76}/>
    </RoundedBox>
  </group>
}''')

replace_function('OrbCradle', 'MachineCoreAssembly', r'''function OrbCradle(){return <group name="home-orb-engineered-cradle" userData={{treatment:'v58-recessed-two-cheek-load-path-no-pedestal-no-ring-no-pipe-rack'}}><ReliquaryWing side={-1}/><ReliquaryWing side={1}/></group>}''')

replace_function('MachineCoreAssembly', 'OrbArmorPlate', r'''function MachineCoreAssembly(){
  return <group name="home-v47-machine-core-assembly" userData={{treatment:'v58-compact-recessed-reliquary-socket-no-visible-pipes-no-ring-no-white-ball'}}>
    <RoundedBox args={[1.82,1.58,.44]} radius={.28} smoothness={10} position={[0,2.18,-6.42]} castShadow receiveShadow>
      <meshPhysicalMaterial color="#0c1210" roughness={.6} metalness={.48} clearcoat={.025} clearcoatRoughness={.7} envMapIntensity={.52}/>
    </RoundedBox>
    <OrbArmorPlate position={[-.62,2.58,-6.1]} rotation={[0,-.04,-.36]} scale={[.82,.88,.82]}/>
    <OrbArmorPlate position={[.62,2.58,-6.1]} rotation={[0,.04,.36]} scale={[.82,.88,.82]} warm/>
    <OrbArmorPlate position={[-.62,1.8,-6.1]} rotation={[0,-.04,.36]} scale={[.82,.88,.82]}/>
    <OrbArmorPlate position={[.62,1.8,-6.1]} rotation={[0,.04,-.36]} scale={[.82,.88,.82]} warm/>
  </group>
}''')

replace_function('SacredOrb', 'HumanPresence', r'''function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null),activeAction=useRef<THREE.AnimationAction|null>(null)
  const orb=useGLTF(ORB_MODEL)
  const authoredOrb=useMemo(()=>cloneOrbModel(orb.scene),[orb.scene])
  const {actions}=useAnimations(orb.animations,authoredOrb)
  const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion])
  useEffect(()=>{const allActions=Object.values(actions).filter((action):action is THREE.AnimationAction=>Boolean(action));if(reducedMotion){allActions.forEach((action)=>action.stop());activeAction.current=null;return}const next=actions[ORB_CLIPS[state]];if(!next)return;const previous=activeAction.current;if(previous&&previous!==next)previous.fadeOut(.2);next.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(.2).play();activeAction.current=next},[actions,reducedMotion,state])
  useEffect(()=>()=>{Object.values(actions).forEach((action)=>action?.stop())},[actions])
  useFrame(({clock})=>{if(!root.current)return;root.current.rotation.y=0;root.current.position.y=ORB.y+(reducedMotion?0:Math.sin(clock.elapsedTime*.28)*.0018)})
  const stateColor=state==='warning'?'#a97849':state==='thinking'||state==='reflecting'?'#6f7e9d':'#5f9b8e'
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v58-orb-interaction-anchor-is-recessed-machined-state-aperture-governed-glb-retained-for-animation-identity'}}>
    <group scale={.26} position={[0,0,-.86]} name="home-orb-governed-hidden-animation-identity" userData={{treatment:'v58-governed-glb-animation-identity-behind-recessed-socket'}}><primitive object={authoredOrb}/></group>
    <mesh name="home-v58-orb-state-aperture" position={[0,0,.08]} rotation={[Math.PI/2,0,0]} castShadow receiveShadow>
      <cylinderGeometry args={[.22,.25,.09,10,1,false]}/>
      <meshStandardMaterial color="#111a17" emissive={stateColor} emissiveIntensity={state==='speaking'?.34:.2} metalness={.72} roughness={.4}/>
    </mesh>
    <mesh name="home-v58-orb-state-slit" position={[0,0,.135]}>
      <boxGeometry args={[.22,.045,.025]}/>
      <meshStandardMaterial color={stateColor} emissive={stateColor} emissiveIntensity={state==='speaking'?.72:.42} metalness={.36} roughness={.34}/>
    </mesh>
    <pointLight color={stateColor} intensity={state==='speaking'?.28:.16} distance={2.6} decay={2}/>
  </group>
}''')

replace_exact("const SPAWN = new THREE.Vector3(2.75, 0.04, 5.35)", "const SPAWN = new THREE.Vector3(2.15, 0.04, 4.65)", 1, 'spawn')
replace_exact("const DEFAULT_YAW = 0.29", "const DEFAULT_YAW = 0.255", 1, 'yaw')
replace_exact("pitch=useRef(0.15)", "pitch=useRef(0.18)", 1, 'pitch init')
replace_exact("pitch.current=0.15", "pitch.current=0.18", 1, 'pitch reset')
replace_exact("const desiredFov=portrait?47:40", "const desiredFov=portrait?45:38", 1, 'runtime fov')
replace_exact("camera instanceof THREE.PerspectiveCamera)camera.fov=size.height>size.width?52:44", "camera instanceof THREE.PerspectiveCamera)camera.fov=size.height>size.width?49:41", 1, 'initial fov')
replace_exact("camera={{position:[2.75,1.7,5.35],fov:44,near:0.1,far:140}}", "camera={{position:[2.15,1.68,4.65],fov:41,near:0.1,far:140}}", 1, 'canvas camera')
replace_exact("gl.toneMappingExposure=2.32", "gl.toneMappingExposure=1.72", 1, 'exposure')
replace_exact('home-v57-tight-processional-floor-inset', 'home-v58-finished-reliquary-floor-inset', 1, 'floor name')
replace_exact('v57-tight-processional-inset-guides-oblique-camera-into-service-vault', 'v58-finished-stone-inset-closes-floor-boundaries-around-reliquary', 1, 'floor treatment')
replace_exact("position={[0,-0.125,-3.0]}", "position={[0,-0.125,-3.65]}", 1, 'floor position')
replace_exact("<planeGeometry args={[4.7,8.2,10,14]} />", "<planeGeometry args={[5.6,9.6,12,16]} />", 1, 'floor geometry')
replace_exact('cinematic-pbr-v57-photogrammetry-service-vault', 'cinematic-pbr-v58-integrated-stone-reliquary', 1, 'visual grade')
replace_exact('v57-photogrammetry-service-vault-candidate', 'v58-integrated-stone-reliquary-candidate', 1, 'art revision')
replace_exact('v57-retained-pixel-candidate-not-certified', 'v58-retained-pixel-candidate-not-certified', 1, 'art certification')
replace_exact('photogrammetry-service-v57-plus-governed-orb-identity', 'integrated-stone-v58-plus-governed-orb-identity', 1, 'animation owner')
replace_exact('<ambientLight intensity={0.72} color="#e6efea" />', '<ambientLight intensity={0.38} color="#c5d6d0" />', 1, 'ambient')
replace_exact("<hemisphereLight args={['#c8ddd7','#25312b',0.96]} />", "<hemisphereLight args={['#9fbab2','#18231f',0.5]} />", 1, 'hemi')
replace_exact('<directionalLight position={[-10,15,8]} intensity={1.24} color="#f2e5cf" />', '<directionalLight position={[-10,15,8]} intensity={0.62} color="#d8d0bc" />', 1, 'key')
replace_exact('<directionalLight position={[9,8,-10]} intensity={0.92} color="#91c9c1" />', '<directionalLight position={[9,8,-10]} intensity={0.46} color="#7fa99f" />', 1, 'rim')
replace_exact('<spotLight position={[-1.5,8.8,4.8]} intensity={5.1}', '<spotLight position={[-1.5,8.8,4.8]} intensity={2.1}', 1, 'hero spot')
replace_exact('<pointLight position={[0,2.78,-5.08]} intensity={3.65}', '<pointLight position={[0,2.78,-5.08]} intensity={1.15}', 1, 'center point')
SOURCE.write_text(text)

portal = PORTAL_PROOF.read_text()
for old,new in {
  'v57-photogrammetry-service-vault-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof':'v58-integrated-stone-reliquary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof',
  'cinematic-pbr-v57-photogrammetry-service-vault':'cinematic-pbr-v58-integrated-stone-reliquary',
  'v57-photogrammetry-service-vault-candidate':'v58-integrated-stone-reliquary-candidate',
  'v57-retained-pixel-candidate-not-certified':'v58-retained-pixel-candidate-not-certified',
}.items():
    if old not in portal: raise SystemExit(f'portal marker missing: {old}')
    portal = portal.replace(old,new)
PORTAL_PROOF.write_text(portal)

continuous = CONTINUOUS_PROOF.read_text()
old = "result.animationOwner === 'photogrammetry-service-v57-plus-governed-orb-identity'"
new = "result.animationOwner === 'integrated-stone-v58-plus-governed-orb-identity'"
if continuous.count(old) != 1: raise SystemExit('continuous owner marker changed')
CONTINUOUS_PROOF.write_text(continuous.replace(old,new))

REALISM.write_text(r'''import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const source=readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx',import.meta.url),'utf8')
const architecture=source.slice(source.indexOf('function ContinuousVaultSkin'),source.indexOf('function SanctuaryGlazing'))
const machine=source.slice(source.indexOf('function OrbCradle'),source.indexOf('function SacredOrb'))
const orb=source.slice(source.indexOf('function SacredOrb'),source.indexOf('function HumanPresence'))
test('V58 embeds scanned detail in one continuous dark enclosure',()=>{assert.match(source,/v58-integrated-stone-reliquary-retained-pixel-rebuild/);assert.match(architecture,/v58-continuous-dark-stone-enclosure-with-embedded-scanned-detail-no-cutout-silhouettes/);assert.match(architecture,/home-v58-embedded-rear-rock-left/);assert.doesNotMatch(architecture,/home-v57-rear-rock-left|home-v57-left-near-enclosure/)})
test('V58 removes visible industrial pipe kitbash',()=>{assert.doesNotMatch(architecture,/V48_PIPE_SYSTEM/);assert.doesNotMatch(machine,/V48_PIPE_SYSTEM/);assert.match(machine,/no-visible-pipes-no-ring-no-white-ball/)})
test('V58 Orb is a recessed machined aperture and slit, not a sphere',()=>{assert.match(orb,/home-v58-orb-state-aperture/);assert.match(orb,/home-v58-orb-state-slit/);assert.doesNotMatch(orb,/sphereGeometry|icosahedronGeometry|dodecahedronGeometry|torusGeometry/)})
test('V58 remains fail closed while preserving production contracts',()=>{assert.match(source,/toneMappingExposure=1\.72/);assert.match(source,/data-home-visual-grade="cinematic-pbr-v58-integrated-stone-reliquary"/);assert.match(source,/data-home-art-certification="v58-retained-pixel-candidate-not-certified"/);assert.match(source,/data-home-animation-owner="integrated-stone-v58-plus-governed-orb-identity"/);assert.match(source,/requestUraiWorldTravel/);assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)})
''')
print('Materialized V58 integrated stone reliquary retained-pixel candidate')
