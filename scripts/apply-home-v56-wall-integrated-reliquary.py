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


def replace_exact(old: str, new: str, expected: int = 1, label: str = 'replacement') -> None:
    global text
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected} occurrence(s), got {count}')
    text = text.replace(old, new, expected)


if 'v56-wall-integrated-reliquary-retained-pixel-rebuild' in text:
    print('V56 already materialized')
    raise SystemExit(0)
if 'v55-integrated-industrial-orb-retained-pixel-rebuild' not in text:
    raise SystemExit('expected V55 source marker not found')

replace_function('cloneOrbModel', 'PouredStone', r'''function cloneOrbModel(source: THREE.Object3D) {
  const root = cloneModel(source)
  root.visible = true
  root.traverse((object) => {
    const governedIdentityOnly = object.name === 'orb-aura'
      || object.name === 'orb-core'
      || object.name === 'orb-heart'
      || object.name.startsWith('orb-orbit-')
      || object.name.startsWith('orb-filament-')
      || object.name.startsWith('orb-petal-')
    if (governedIdentityOnly) {
      object.visible = false
      object.userData.uraiRetiredVisualRole = 'v56-governed-orb-animation-identity-retained-behind-wall-integrated-machine-aperture'
    }
  })
  root.userData.uraiTreatment = 'v56-governed-orb-glb-retained-for-identity-and-animation-behind-engineered-aperture'
  return root
}''')

replace_function('ContinuousVaultSkin', 'CantedWallMass', r'''function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  return <group name="home-v47-reliquary-apse" userData={{treatment:'v56-deep-continuous-sanctuary-shell-no-detached-rock-slabs-no-facade-stage'}}>
    <SanctuaryShellMass pack={pack} position={[0,2.72,-9.18]} width={12.7} height={7.35} depth={1.72} openingWidth={7.35} openingHeight={4.82} color="#18201e"/>
    <ArchitecturalStone pack={pack} position={[0,4.72,-7.82]} size={[6.9,.54,2.15]} color="#171e1c" roughness={.77} metalness={.04}/>
  </group>
}''')

replace_function('CantedWallMass', 'MachineCavityLiner', r'''function CantedWallMass({pack,side}:{pack:SurfacePack;side:-1|1}){
  const geometry=useMemo(()=>{
    const width=side<0?2.72:2.42
    const height=side<0?4.92:4.56
    const depth=side<0?4.7:4.18
    const shape=new THREE.Shape()
    shape.moveTo(-width*.54,-height/2)
    shape.lineTo(width*.5,-height/2)
    shape.lineTo(width*.4,height*.34)
    shape.lineTo(width*.08,height/2)
    shape.lineTo(-width*.34,height*.43)
    shape.closePath()
    const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,curveSegments:8,bevelEnabled:true,bevelSegments:4,bevelSize:.1,bevelThickness:.1})
    g.center()
    g.computeVertexNormals()
    return g
  },[side])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry} position={[side*(side<0?4.55:4.46),2.28,-6.42]} rotation={[0,side*.1,side*.018]} castShadow receiveShadow userData={{treatment:side<0?'v56-left-tapered-load-bearing-sanctuary-return':'v56-right-tapered-load-bearing-sanctuary-return'}}>
    <meshPhysicalMaterial color={side<0?'#202a26':'#252721'} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(.34,.34)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={.006} displacementBias={-.003} roughness={.79} metalness={.035} clearcoat={.025} clearcoatRoughness={.82} envMapIntensity={.66}/>
  </mesh>
}''')

replace_function('MachineCavityLiner', 'SanctuarySideGallery', r'''function MachineCavityLiner(){
  return <group name="home-v47-reliquary-cavity" userData={{treatment:'v56-recessed-service-cavity-behind-machine-face-no-exposed-pipe-rack-focal'}}>
    <RoundedBox args={[5.8,3.95,.22]} radius={.12} smoothness={5} position={[0,2.24,-8.12]} castShadow receiveShadow>
      <meshPhysicalMaterial color="#080d0c" roughness={.86} metalness={.12} clearcoat={.01} clearcoatRoughness={.9}/>
    </RoundedBox>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v56-recessed-service-network" position={[0,2.18,-7.72]} rotation={[.08,.02,0]} span={2.86} scale={[1.04,.84,.3]}/>
    <pointLight position={[0,2.35,-7.22]} color="#6b9e94" intensity={.34} distance={4.6} decay={2}/>
  </group>
}''')

replace_function('SanctuarySideGallery', 'SanctuaryArchitecture', r'''function SanctuarySideGallery(){
  const pack=useStonePack(.42,.58)
  return <group name="home-v47-side-gallery" userData={{treatment:'v56-continuous-tapered-side-returns-rooted-floor-to-vault-no-detached-scanned-slabs'}}>
    <CantedWallMass pack={pack} side={-1}/>
    <CantedWallMass pack={pack} side={1}/>
  </group>
}''')

replace_function('SanctuaryArchitecture', 'SanctuaryGlazing', r'''function SanctuaryArchitecture(){const pack=useStonePack(.34,.5);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'cinematic-wall-integrated-reliquary-v56',construction:'deep-continuous-shell-tapered-load-bearing-returns-recessed-service-cavity-and-faceted-machine-aperture',visualTreatment:'v56-wall-integrated-reliquary-retained-pixel-rebuild'}}>
  <ContinuousVaultSkin pack={pack}/>
  <SanctuarySideGallery/>
  <MachineCavityLiner/>
  <group name="home-v56-perspective-practicals" userData={{treatment:'v56-low-depth-practicals-lead-into-integrated-machine-bay'}}>
    <RecessedPractical position={[-2.25,.16,-6.72]} warm={false}/><RecessedPractical position={[2.18,.16,-6.88]}/>
  </group>
</group>}''')

replace_function('ReliquaryWing', 'CrownBridge', r'''function ReliquaryWing({side}:{side:-1|1}){
  const s=side
  return <group name={side<0?'home-v47-left-load-arm':'home-v47-right-load-arm'} userData={{treatment:'v56-short-canted-machine-jaw-overlaps-main-housing-no-floating-bar'}}>
    <RoundedBox args={[.46,1.7,.62]} radius={.1} smoothness={6} position={[s*1.7,2.22,-6.34]} rotation={[0,s*.035,s*.25]} castShadow receiveShadow>
      <meshPhysicalMaterial color={side<0?'#263732':'#453d31'} roughness={.58} metalness={.5} clearcoat={.025} clearcoatRoughness={.7}/>
    </RoundedBox>
  </group>
}''')

replace_function('OrbCradle', 'MachineCoreAssembly', r'''function OrbCradle(){return <group name="home-orb-engineered-cradle" userData={{treatment:'v56-wall-integrated-two-jaw-load-path-no-pedestal-no-crossbars-no-floor-legs'}}>
  <ReliquaryWing side={-1}/><ReliquaryWing side={1}/>
</group>}''')

replace_function('MachineCoreAssembly', 'OrbArmorPlate', r'''function MachineCoreAssembly(){
  return <group name="home-v47-machine-core-assembly" userData={{treatment:'v56-faceted-wall-integrated-machine-aperture-with-recessed-service-network-no-pipe-rack-no-display-stand'}}>
    <mesh position={[0,2.22,-6.42]} rotation={[Math.PI/2,0,0]} castShadow receiveShadow>
      <cylinderGeometry args={[1.72,1.86,.58,12,1,false]}/>
      <meshPhysicalMaterial color="#121a18" roughness={.52} metalness={.62} clearcoat={.035} clearcoatRoughness={.64} envMapIntensity={.82}/>
    </mesh>
    <mesh position={[0,2.22,-6.09]} rotation={[Math.PI/2,0,0]} castShadow receiveShadow>
      <cylinderGeometry args={[1.08,1.27,.34,12,1,false]}/>
      <meshPhysicalMaterial color="#2a3733" roughness={.47} metalness={.68} clearcoat={.04} clearcoatRoughness={.58} envMapIntensity={.88}/>
    </mesh>
    <OrbArmorPlate position={[-1.24,2.92,-5.95]} rotation={[0,-.04,-.42]} scale={[1.15,1,.9]}/>
    <OrbArmorPlate position={[1.24,2.92,-5.95]} rotation={[0,.04,.42]} scale={[1.15,1,.9]} warm/>
    <OrbArmorPlate position={[-1.52,2.18,-5.95]} rotation={[0,-.04,-1.18]} scale={[1.02,1,.9]}/>
    <OrbArmorPlate position={[1.52,2.18,-5.95]} rotation={[0,.04,1.18]} scale={[1.02,1,.9]} warm/>
    <OrbArmorPlate position={[-.82,1.5,-5.96]} rotation={[0,-.03,-2.55]} scale={[1.08,1,.9]}/>
    <OrbArmorPlate position={[.82,1.5,-5.96]} rotation={[0,.03,2.55]} scale={[1.08,1,.9]} warm/>
    <pointLight position={[0,2.22,-5.62]} color="#8fc9bc" intensity={.68} distance={4.4} decay={2}/>
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
  useFrame(({clock})=>{if(!root.current)return;root.current.rotation.y=0;root.current.position.y=ORB.y+(reducedMotion?0:Math.sin(clock.elapsedTime*.34)*.003)})
  const stateColor=state==='warning'?'#d0a06e':state==='thinking'||state==='reflecting'?'#9eacd0':'#88c7ba'
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v56-orb-interaction-anchor-is-faceted-machine-aperture-authored-glb-retained-for-governed-animation-identity'}}>
    <group scale={.34} position={[0,0,-.74]} name="home-orb-governed-hidden-animation-identity" userData={{treatment:'v56-governed-glb-animation-identity-behind-machine-aperture'}}><primitive object={authoredOrb}/></group>
    <mesh name="home-v56-visible-orb-machine-core" position={[0,0,.28]} rotation={[Math.PI/2,0,0]} castShadow receiveShadow>
      <cylinderGeometry args={[.42,.48,.16,10,1,false]}/>
      <meshStandardMaterial color="#18221f" emissive={stateColor} emissiveIntensity={state==='speaking'?.68:.42} metalness={.7} roughness={.36}/>
    </mesh>
    <mesh name="home-v56-orb-state-emitter" position={[0,0,.385]} rotation={[Math.PI/2,0,0]}>
      <cylinderGeometry args={[.16,.19,.07,8,1,false]}/>
      <meshStandardMaterial color={stateColor} emissive={stateColor} emissiveIntensity={state==='speaking'?1.1:.76} metalness={.42} roughness={.3}/>
    </mesh>
    <pointLight color={stateColor} intensity={state==='speaking'?.82:.54} distance={4.1} decay={2}/>
  </group>
}''')

replace_exact("pitch=useRef(0.10)", "pitch=useRef(0.23)", 1, 'camera pitch initializer')
replace_exact("pitch.current=0.10", "pitch.current=0.23", 1, 'camera pitch reset')
replace_exact("const desiredFov=portrait?52:47", "const desiredFov=portrait?48:43", 1, 'camera FOV')
replace_exact("camera instanceof THREE.PerspectiveCamera)camera.fov=size.height>size.width?64:55", "camera instanceof THREE.PerspectiveCamera)camera.fov=size.height>size.width?54:47", 1, 'initial camera FOV')
replace_exact("camera={{position:[2.05,1.74,6.9],fov:54,near:0.1,far:140}}", "camera={{position:[2.05,1.72,6.9],fov:47,near:0.1,far:140}}", 1, 'Canvas camera')
replace_exact("gl.toneMappingExposure=2.38", "gl.toneMappingExposure=2.48", 1, 'tone mapping exposure')
replace_exact('home-v54-central-finished-stone-lane', 'home-v56-finished-processional-floor-inset', 1, 'floor name')
replace_exact("v54-narrow-finished-processional-lane-reduces-raw-floor-acreage", "v56-finished-processional-inset-guides-camera-to-wall-integrated-machine", 1, 'floor treatment')
replace_exact("position={[0,-0.125,-3.25]}", "position={[0,-0.125,-2.35]}", 1, 'floor inset position')
replace_exact("<planeGeometry args={[6.8,11.8,12,18]} />", "<planeGeometry args={[5.6,9.9,10,16]} />", 1, 'floor inset geometry')
replace_exact('cinematic-pbr-v55-integrated-industrial-reliquary', 'cinematic-pbr-v56-wall-integrated-reliquary', 1, 'visual grade')
replace_exact('v55-integrated-industrial-reliquary-candidate', 'v56-wall-integrated-reliquary-candidate', 1, 'art revision')
replace_exact('v55-retained-pixel-candidate-not-certified', 'v56-retained-pixel-candidate-not-certified', 1, 'art certification')
replace_exact('integrated-industrial-v55-plus-governed-orb-identity', 'wall-integrated-v56-plus-governed-orb-identity', 1, 'animation owner')

SOURCE.write_text(text)

portal = PORTAL_PROOF.read_text()
portal_replacements = {
    'v55-integrated-industrial-reliquary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof': 'v56-wall-integrated-reliquary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof',
    'cinematic-pbr-v55-integrated-industrial-reliquary': 'cinematic-pbr-v56-wall-integrated-reliquary',
    'v55-integrated-industrial-reliquary-candidate': 'v56-wall-integrated-reliquary-candidate',
    'v55-retained-pixel-candidate-not-certified': 'v56-retained-pixel-candidate-not-certified',
}
for old, new in portal_replacements.items():
    count = portal.count(old)
    if count < 1:
        raise SystemExit(f'portal proof expected marker not found: {old}')
    portal = portal.replace(old, new)
PORTAL_PROOF.write_text(portal)

continuous = CONTINUOUS_PROOF.read_text()
old_owner = "result.animationOwner === 'integrated-industrial-v55-plus-governed-orb-identity'"
new_owner = "result.animationOwner === 'wall-integrated-v56-plus-governed-orb-identity'"
if continuous.count(old_owner) != 1:
    raise SystemExit(f'continuous proof owner marker count was {continuous.count(old_owner)}')
continuous = continuous.replace(old_owner, new_owner)
CONTINUOUS_PROOF.write_text(continuous)

REALISM.write_text(r'''import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const source=readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx',import.meta.url),'utf8')
const architecture=source.slice(source.indexOf('function ContinuousVaultSkin'),source.indexOf('function SanctuaryGlazing'))
const cavity=source.slice(source.indexOf('function MachineCavityLiner'),source.indexOf('function SanctuarySideGallery'))
const machine=source.slice(source.indexOf('function OrbCradle'),source.indexOf('function SacredOrb'))
const orb=source.slice(source.indexOf('function SacredOrb'),source.indexOf('function HumanPresence'))

test('V56 removes the detached scanned-rock slab composition from visible sanctuary ownership',()=>{
  assert.match(source,/v56-wall-integrated-reliquary-retained-pixel-rebuild/)
  assert.match(architecture,/v56-deep-continuous-sanctuary-shell-no-detached-rock-slabs-no-facade-stage/)
  assert.match(architecture,/v56-continuous-tapered-side-returns-rooted-floor-to-vault-no-detached-scanned-slabs/)
  assert.doesNotMatch(architecture,/home-v55-left-near-rock-return|home-v55-right-near-rock-return|home-v55-left-scanned-reliquary-return|home-v55-right-scanned-reliquary-return/)
  assert.doesNotMatch(architecture,/V48_ROCK_FACE_01|V48_ROCK_FACE_02/)
})

test('V56 keeps real industrial service detail recessed instead of making a pipe rack the focal object',()=>{
  assert.match(cavity,/home-v56-recessed-service-network/)
  assert.match(cavity,/v56-recessed-service-cavity-behind-machine-face-no-exposed-pipe-rack-focal/)
  assert.match(cavity,/V48_PIPE_SYSTEM/)
  assert.doesNotMatch(machine,/V48_PIPE_SYSTEM/)
  assert.doesNotMatch(machine,/home-v55-orb-machine-core-network/)
})

test('V56 machine is a wall-integrated faceted aperture with overlapping load paths and no pedestal or crossbars',()=>{
  assert.match(machine,/v56-wall-integrated-two-jaw-load-path-no-pedestal-no-crossbars-no-floor-legs/)
  assert.match(machine,/v56-faceted-wall-integrated-machine-aperture-with-recessed-service-network-no-pipe-rack-no-display-stand/)
  assert.match(machine,/cylinderGeometry args=\{\[1\.72,1\.86,\.58,12,1,false\]\}/)
  assert.match(machine,/OrbArmorPlate position=\{\[-1\.24,2\.92,-5\.95\]\}/)
  assert.doesNotMatch(machine,/args=\{\[3\.55,\.34,\.58\]\}|args=\{\[3\.2,\.3,\.54\]\}/)
})

test('V56 visible Orb is a compact engineered state core rather than a glass sphere starburst or orbit-ring object',()=>{
  assert.match(orb,/home-v56-visible-orb-machine-core/)
  assert.match(orb,/home-v56-orb-state-emitter/)
  assert.match(orb,/v56-governed-glb-animation-identity-behind-machine-aperture/)
  assert.doesNotMatch(orb,/sphereGeometry|torusGeometry|dodecahedronGeometry|icosahedronGeometry/)
  assert.doesNotMatch(orb,/V48_CAGED_SCONCE/)
})

test('V56 retains exact Home runtime interaction and governed identity contracts while remaining fail-closed on pixel certification',()=>{
  assert.match(source,/const ORB = new THREE\.Vector3\(0, 2\.18, -6\.0\)/)
  assert.match(source,/data-home-visual-grade="cinematic-pbr-v56-wall-integrated-reliquary"/)
  assert.match(source,/data-home-final-art-revision="v56-wall-integrated-reliquary-candidate"/)
  assert.match(source,/data-home-art-certification="v56-retained-pixel-candidate-not-certified"/)
  assert.match(source,/data-home-animation-owner="wall-integrated-v56-plus-governed-orb-identity"/)
  assert.match(source,/home-orb-governed-hidden-animation-identity/)
  assert.match(source,/requestUraiWorldTravel/)
  assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
''')

print('Materialized V56 wall-integrated reliquary retained-pixel candidate')
