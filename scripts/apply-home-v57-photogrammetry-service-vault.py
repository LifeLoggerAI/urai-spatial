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


if 'v57-photogrammetry-service-vault-retained-pixel-rebuild' in text:
    print('V57 already materialized')
    raise SystemExit(0)
if 'v56-wall-integrated-reliquary-retained-pixel-rebuild' not in text:
    raise SystemExit('expected V56 source marker not found')

replace_function('ContinuousVaultSkin', 'CantedWallMass', r'''function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  return <group name="home-v47-reliquary-apse" userData={{treatment:'v57-overlapped-photogrammetry-rear-vault-no-rectangular-backboard-no-primitive-apse'}}>
    <ProductionAsset url={V48_ROCK_FACE_01} name="home-v57-rear-rock-left" position={[-2.85,2.2,-8.72]} rotation={[-.04,.34,.03]} span={6.15} scale={[1.34,1.28,.72]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name="home-v57-rear-rock-right" position={[2.72,2.12,-8.9]} rotation={[.03,-.38,-.025]} span={6.2} scale={[1.32,1.25,.74]}/>
    <ProductionAsset url={V48_ROCK_FACE_01} name="home-v57-upper-rock-crown" position={[0,4.55,-8.56]} rotation={[1.1,.04,1.57]} span={5.35} scale={[1.28,.78,.62]}/>
  </group>
}''')

replace_function('CantedWallMass', 'MachineCavityLiner', r'''function CantedWallMass({pack,side}:{pack:SurfacePack;side:-1|1}){return <group name={side<0?'home-v57-left-retired-primitive-return':'home-v57-right-retired-primitive-return'} userData={{treatment:'v57-primitive-side-mass-retired-in-favor-of-photogrammetry'}} />}
''')

replace_function('MachineCavityLiner', 'SanctuarySideGallery', r'''function MachineCavityLiner(){
  return <group name="home-v47-reliquary-cavity" userData={{treatment:'v57-deep-real-industrial-service-network-without-flat-backboard-or-polygon-ring'}}>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v57-rear-service-network" position={[0,2.28,-7.72]} rotation={[.1,.18,.05]} span={4.35} scale={[1.03,.94,.72]}/>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v57-left-service-riser" position={[-2.3,2.05,-7.34]} rotation={[.02,.96,.36]} span={3.1} scale={[.72,.88,.68]}/>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v57-right-service-riser" position={[2.38,2.12,-7.5]} rotation={[-.03,-.92,-.3]} span={3.15} scale={[-.72,.9,.7]}/>
    <pointLight position={[0,2.45,-6.75]} color="#82b8ad" intensity={.46} distance={5.2} decay={2}/>
  </group>
}''')

replace_function('SanctuarySideGallery', 'SanctuaryArchitecture', r'''function SanctuarySideGallery(){
  return <group name="home-v47-side-gallery" userData={{treatment:'v57-photogrammetry-side-enclosure-with-integrated-practicals-no-giant-slab-towers'}}>
    <ProductionAsset url={V48_ROCK_FACE_02} name="home-v57-left-near-enclosure" position={[-5.18,1.52,-4.55]} rotation={[.02,1.02,.025]} span={4.7} scale={[.92,1.24,.72]}/>
    <ProductionAsset url={V48_ROCK_FACE_01} name="home-v57-right-near-enclosure" position={[5.02,1.45,-4.92]} rotation={[-.02,-1.06,-.02]} span={4.62} scale={[.94,1.2,.72]}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v57-left-depth-practical" position={[-4.02,2.25,-6.18]} rotation={[0,.72,0]} span={.54}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v57-right-depth-practical" position={[3.92,2.18,-6.34]} rotation={[0,-.72,0]} span={.54}/>
    <pointLight position={[-3.88,2.22,-5.98]} color="#8ab6ad" intensity={.42} distance={5.2} decay={2}/>
    <pointLight position={[3.82,2.16,-6.14]} color="#c7a26e" intensity={.4} distance={5.2} decay={2}/>
  </group>
}''')

replace_function('SanctuaryArchitecture', 'SanctuaryGlazing', r'''function SanctuaryArchitecture(){const pack=useStonePack(.34,.5);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'cinematic-photogrammetry-service-vault-v57',construction:'overlapped-photogrammetry-enclosure-real-industrial-service-network-embedded-orb-emitter',visualTreatment:'v57-photogrammetry-service-vault-retained-pixel-rebuild'}}>
  <ContinuousVaultSkin pack={pack}/>
  <SanctuarySideGallery/>
  <MachineCavityLiner/>
  <group name="home-v57-floor-depth-practicals" userData={{treatment:'v57-low-practicals-guide-perspective-without-stage-framing'}}>
    <RecessedPractical position={[-1.88,.15,-6.34]} warm={false}/><RecessedPractical position={[1.96,.15,-6.55]}/>
  </group>
</group>}''')

replace_function('ReliquaryWing', 'CrownBridge', r'''function ReliquaryWing({side}:{side:-1|1}){
  return <group name={side<0?'home-v47-left-load-arm':'home-v47-right-load-arm'} userData={{treatment:'v57-load-path-owned-by-real-service-risers-no-primitive-clamp-bars'}} />
}''')

replace_function('OrbCradle', 'MachineCoreAssembly', r'''function OrbCradle(){return <group name="home-orb-engineered-cradle" userData={{treatment:'v57-service-vault-load-path-no-pedestal-no-ring-no-primitive-clamps'}}><ReliquaryWing side={-1}/><ReliquaryWing side={1}/></group>}''')

replace_function('MachineCoreAssembly', 'OrbArmorPlate', r'''function MachineCoreAssembly(){
  return <group name="home-v47-machine-core-assembly" userData={{treatment:'v57-real-industrial-service-machine-depth-with-embedded-state-emitter-no-backboard-no-polygon-ring'}}>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v57-orb-machine-depth-frame" position={[0,2.18,-6.82]} rotation={[.08,.36,.08]} span={3.85} scale={[.92,.92,.7]}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v57-orb-machine-emitter-housing" position={[0,2.2,-5.96]} rotation={[Math.PI/2,.08,0]} span={.78}/>
    <pointLight position={[0,2.22,-5.55]} color="#8fd1c3" intensity={.78} distance={4.4} decay={2}/>
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
  useFrame(({clock})=>{if(!root.current)return;root.current.rotation.y=0;root.current.position.y=ORB.y+(reducedMotion?0:Math.sin(clock.elapsedTime*.32)*.0025)})
  const stateColor=state==='warning'?'#d0a06e':state==='thinking'||state==='reflecting'?'#9eacd0':'#88c7ba'
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v57-orb-interaction-anchor-is-small-embedded-industrial-emitter-governed-glb-retained-for-animation-identity'}}>
    <group scale={.3} position={[0,0,-.82]} name="home-orb-governed-hidden-animation-identity" userData={{treatment:'v57-governed-glb-animation-identity-behind-service-machine'}}><primitive object={authoredOrb}/></group>
    <mesh name="home-v57-orb-state-emitter" position={[0,0,.18]} castShadow>
      <icosahedronGeometry args={[.17,1]}/>
      <meshStandardMaterial color={stateColor} emissive={stateColor} emissiveIntensity={state==='speaking'?.95:.58} metalness={.46} roughness={.3}/>
    </mesh>
    <pointLight color={stateColor} intensity={state==='speaking'?.82:.52} distance={3.8} decay={2}/>
  </group>
}''')

replace_exact("const SPAWN = new THREE.Vector3(2.05, 0.04, 6.8)", "const SPAWN = new THREE.Vector3(2.75, 0.04, 5.35)", 1, 'spawn')
replace_exact("const DEFAULT_YAW = 0.205", "const DEFAULT_YAW = 0.29", 1, 'default yaw')
replace_exact("pitch=useRef(0.23)", "pitch=useRef(0.15)", 1, 'camera pitch initializer')
replace_exact("pitch.current=0.23", "pitch.current=0.15", 1, 'camera pitch reset')
replace_exact("const desiredFov=portrait?48:43", "const desiredFov=portrait?47:40", 1, 'camera FOV')
replace_exact("camera instanceof THREE.PerspectiveCamera)camera.fov=size.height>size.width?54:47", "camera instanceof THREE.PerspectiveCamera)camera.fov=size.height>size.width?52:44", 1, 'initial camera FOV')
replace_exact("camera={{position:[2.05,1.72,6.9],fov:47,near:0.1,far:140}}", "camera={{position:[2.75,1.7,5.35],fov:44,near:0.1,far:140}}", 1, 'Canvas camera')
replace_exact("gl.toneMappingExposure=2.48", "gl.toneMappingExposure=2.32", 1, 'tone mapping exposure')
replace_exact('home-v56-finished-processional-floor-inset', 'home-v57-tight-processional-floor-inset', 1, 'floor name')
replace_exact("v56-finished-processional-inset-guides-camera-to-wall-integrated-machine", "v57-tight-processional-inset-guides-oblique-camera-into-service-vault", 1, 'floor treatment')
replace_exact("position={[0,-0.125,-2.35]}", "position={[0,-0.125,-3.0]}", 1, 'floor inset position')
replace_exact("<planeGeometry args={[5.6,9.9,10,16]} />", "<planeGeometry args={[4.7,8.2,10,14]} />", 1, 'floor inset geometry')
replace_exact('cinematic-pbr-v56-wall-integrated-reliquary', 'cinematic-pbr-v57-photogrammetry-service-vault', 1, 'visual grade')
replace_exact('v56-wall-integrated-reliquary-candidate', 'v57-photogrammetry-service-vault-candidate', 1, 'art revision')
replace_exact('v56-retained-pixel-candidate-not-certified', 'v57-retained-pixel-candidate-not-certified', 1, 'art certification')
replace_exact('wall-integrated-v56-plus-governed-orb-identity', 'photogrammetry-service-v57-plus-governed-orb-identity', 1, 'animation owner')

SOURCE.write_text(text)

portal = PORTAL_PROOF.read_text()
portal_replacements = {
    'v56-wall-integrated-reliquary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof': 'v57-photogrammetry-service-vault-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof',
    'cinematic-pbr-v56-wall-integrated-reliquary': 'cinematic-pbr-v57-photogrammetry-service-vault',
    'v56-wall-integrated-reliquary-candidate': 'v57-photogrammetry-service-vault-candidate',
    'v56-retained-pixel-candidate-not-certified': 'v57-retained-pixel-candidate-not-certified',
}
for old, new in portal_replacements.items():
    count = portal.count(old)
    if count < 1:
        raise SystemExit(f'portal proof expected marker not found: {old}')
    portal = portal.replace(old, new)
PORTAL_PROOF.write_text(portal)

continuous = CONTINUOUS_PROOF.read_text()
old_owner = "result.animationOwner === 'wall-integrated-v56-plus-governed-orb-identity'"
new_owner = "result.animationOwner === 'photogrammetry-service-v57-plus-governed-orb-identity'"
if continuous.count(old_owner) != 1:
    raise SystemExit(f'continuous proof owner marker count was {continuous.count(old_owner)}')
continuous = continuous.replace(old_owner, new_owner)
CONTINUOUS_PROOF.write_text(continuous)

REALISM.write_text(r'''import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const source=readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx',import.meta.url),'utf8')
const architecture=source.slice(source.indexOf('function ContinuousVaultSkin'),source.indexOf('function SanctuaryGlazing'))
const machine=source.slice(source.indexOf('function OrbCradle'),source.indexOf('function SacredOrb'))
const orb=source.slice(source.indexOf('function SacredOrb'),source.indexOf('function HumanPresence'))

test('V57 visible architecture is owned by committed photogrammetry instead of the rejected primitive towers and backboard',()=>{
  assert.match(source,/v57-photogrammetry-service-vault-retained-pixel-rebuild/)
  assert.match(architecture,/home-v57-rear-rock-left/)
  assert.match(architecture,/home-v57-rear-rock-right/)
  assert.match(architecture,/home-v57-upper-rock-crown/)
  assert.match(architecture,/home-v57-left-near-enclosure/)
  assert.match(architecture,/home-v57-right-near-enclosure/)
  assert.doesNotMatch(architecture,/SanctuaryShellMass pack=/)
  assert.doesNotMatch(architecture,/RoundedBox args=\{\[5\.8,3\.95,\.22\]\}/)
  assert.doesNotMatch(architecture,/v56-left-tapered-load-bearing-sanctuary-return|v56-right-tapered-load-bearing-sanctuary-return/)
})

test('V57 machine uses real industrial depth and contains no polygon aperture or primitive clamp constellation',()=>{
  assert.match(machine,/home-v57-orb-machine-depth-frame/)
  assert.match(machine,/home-v57-orb-machine-emitter-housing/)
  assert.match(machine,/v57-real-industrial-service-machine-depth-with-embedded-state-emitter-no-backboard-no-polygon-ring/)
  assert.doesNotMatch(machine,/cylinderGeometry args=\{\[1\.72,1\.86,\.58,12,1,false\]\}/)
  assert.doesNotMatch(machine,/OrbArmorPlate position=/)
  assert.doesNotMatch(machine,/RoundedBox args=\{\[3\.55,\.34,\.58\]\}|RoundedBox args=\{\[3\.2,\.3,\.54\]\}/)
})

test('V57 keeps the Orb interaction core compact and embedded while retaining governed animation identity',()=>{
  assert.match(orb,/home-v57-orb-state-emitter/)
  assert.match(orb,/v57-governed-glb-animation-identity-behind-service-machine/)
  assert.match(orb,/icosahedronGeometry args=\{\[\.17,1\]\}/)
  assert.doesNotMatch(orb,/sphereGeometry|torusGeometry|dodecahedronGeometry/)
})

test('V57 tightens the camera and floor composition instead of hiding unfinished work',()=>{
  assert.match(source,/const SPAWN = new THREE\.Vector3\(2\.75, 0\.04, 5\.35\)/)
  assert.match(source,/const DEFAULT_YAW = 0\.29/)
  assert.match(source,/const desiredFov=portrait\?47:40/)
  assert.match(source,/home-v57-tight-processional-floor-inset/)
})

test('V57 preserves interaction/governance contracts and remains fail-closed until literal pixel review',()=>{
  assert.match(source,/const ORB = new THREE\.Vector3\(0, 2\.18, -6\.0\)/)
  assert.match(source,/data-home-visual-grade="cinematic-pbr-v57-photogrammetry-service-vault"/)
  assert.match(source,/data-home-final-art-revision="v57-photogrammetry-service-vault-candidate"/)
  assert.match(source,/data-home-art-certification="v57-retained-pixel-candidate-not-certified"/)
  assert.match(source,/data-home-animation-owner="photogrammetry-service-v57-plus-governed-orb-identity"/)
  assert.match(source,/requestUraiWorldTravel/)
  assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
''')

print('Materialized V57 photogrammetry service-vault retained-pixel candidate')
