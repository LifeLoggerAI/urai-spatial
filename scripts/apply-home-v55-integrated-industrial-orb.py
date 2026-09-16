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


if 'v55-integrated-industrial-orb-retained-pixel-rebuild' in text:
    print('V55 already materialized')
    raise SystemExit(0)
if 'v54-authored-relic-sanctuary-retained-pixel-rebuild' not in text:
    raise SystemExit('expected V54 source marker not found')

replace_function('cloneOrbModel', 'PouredStone', r'''function cloneOrbModel(source: THREE.Object3D) {
  const root = cloneModel(source)
  root.visible = true
  root.traverse((object) => {
    const authoredCelestialDisplay = object.name === 'orb-aura'
      || object.name === 'orb-core'
      || object.name === 'orb-heart'
      || object.name.startsWith('orb-orbit-')
      || object.name.startsWith('orb-filament-')
      || object.name.startsWith('orb-petal-')
    if (authoredCelestialDisplay) {
      object.visible = false
      object.userData.uraiRetiredVisualRole = 'v55-governed-orb-animation-identity-retained-but-celestial-display-hidden-after-literal-pixel-rejection'
    }
  })
  root.userData.uraiTreatment = 'v55-governed-orb-glb-retained-for-identity-and-animation-not-visible-glass-starburst'
  return root
}''')

replace_function('ContinuousVaultSkin', 'CantedWallMass', r'''function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  return <group name="home-v47-reliquary-apse" userData={{treatment:'v55-single-rear-sanctuary-shell-with-scanned-rock-returns-no-side-arch-corridor-no-torus-tunnel'}}>
    <SanctuaryShellMass pack={pack} position={[0,2.68,-10.78]} width={10.8} height={6.45} depth={1.26} openingWidth={7.25} openingHeight={4.72} color="#202925"/>
    <ProductionAsset url={V48_ROCK_FACE_01} name="home-v55-left-scanned-reliquary-return" position={[-4.85,2.0,-8.15]} rotation={[0,0.9,0.02]} span={4.8} scale={[1.0,1.16,.72]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name="home-v55-right-scanned-reliquary-return" position={[4.72,1.92,-8.38]} rotation={[0,-0.84,-.02]} span={4.65} scale={[1.04,1.1,.7]}/>
  </group>
}''')

replace_function('MachineCavityLiner', 'SanctuarySideGallery', r'''function MachineCavityLiner(){
  return <group name="home-v47-reliquary-cavity" userData={{treatment:'v55-authored-industrial-pipe-bay-recessed-into-rear-shell-no-floating-load-bars'}}>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v55-rear-machine-service-network" position={[0,2.12,-7.82]} rotation={[0.08,0.02,0]} span={4.9} scale={[1.12,.92,.62]}/>
    <pointLight position={[0,2.38,-7.05]} color="#73a99f" intensity={.58} distance={5.8} decay={2}/>
  </group>
}''')

replace_function('SanctuarySideGallery', 'SanctuaryArchitecture', r'''function SanctuarySideGallery(){
  return <group name="home-v47-side-gallery" userData={{treatment:'v55-scanned-asymmetric-rock-returns-and-practicals-no-repeated-side-arches-no-bollards'}}>
    <ProductionAsset url={V48_ROCK_FACE_01} name="home-v55-left-near-rock-return" position={[-5.82,1.15,-3.65]} rotation={[0,1.35,0]} span={3.55} scale={[.78,1.22,.62]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name="home-v55-right-near-rock-return" position={[5.72,1.08,-4.25]} rotation={[0,-1.28,0]} span={3.6} scale={[.82,1.16,.64]}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v55-left-depth-practical" position={[-4.62,2.05,-5.72]} rotation={[0,.72,0]} span={.62}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v55-right-depth-practical" position={[4.52,1.98,-5.9]} rotation={[0,-.72,0]} span={.62}/>
    <pointLight position={[-4.42,2.0,-5.5]} color="#8ab4aa" intensity={.38} distance={5.4} decay={2}/>
    <pointLight position={[4.34,1.96,-5.66]} color="#c19b66" intensity={.36} distance={5.4} decay={2}/>
  </group>
}''')

replace_function('SanctuaryArchitecture', 'SanctuaryGlazing', r'''function SanctuaryArchitecture(){const pack=useStonePack(.36,.52);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'cinematic-integrated-industrial-reliquary-v55',construction:'single-rear-shell-scanned-rock-returns-recessed-authored-pipe-network-and-wall-integrated-orb-aperture',visualTreatment:'v55-integrated-industrial-orb-retained-pixel-rebuild'}}>
  <SanctuarySideGallery/>
  <ContinuousVaultSkin pack={pack}/>
  <MachineCavityLiner/>
  <group name="home-v55-perspective-practicals" userData={{treatment:'v55-low-recessed-depth-lights-lead-to-machine-bay-not-display-stage'}}>
    <RecessedPractical position={[-2.7,.16,-7.9]} warm={false}/><RecessedPractical position={[2.62,.16,-8.08]}/>
  </group>
</group>}''')

replace_function('ReliquaryWing', 'CrownBridge', r'''function ReliquaryWing({side}:{side:-1|1}){
  const s=side
  return <group name={side<0?'home-v47-left-load-arm':'home-v47-right-load-arm'} userData={{treatment:'v55-broad-rear-wall-machine-cheek-no-floating-beam-no-floor-leg'}}>
    <RoundedBox args={[.72,1.28,.5]} radius={.09} smoothness={5} position={[s*1.42,2.12,-6.55]} rotation={[0,s*.06,0]} castShadow receiveShadow>
      <meshPhysicalMaterial color={side<0?'#263a35':'#4a4032'} roughness={.64} metalness={.42} clearcoat={.025} clearcoatRoughness={.74}/>
    </RoundedBox>
  </group>
}''')

replace_function('OrbCradle', 'MachineCoreAssembly', r'''function OrbCradle(){return <group name="home-orb-engineered-cradle" userData={{treatment:'v55-recessed-wall-machine-seat-no-pedestal-no-floor-legs-no-disconnected-bars'}}>
  <ReliquaryWing side={-1}/><ReliquaryWing side={1}/>
  <RoundedBox args={[3.55,.34,.58]} radius={.1} smoothness={6} position={[0,1.22,-6.58]} castShadow receiveShadow>
    <meshPhysicalMaterial color="#202c29" roughness={.68} metalness={.38} clearcoat={.02} clearcoatRoughness={.78}/>
  </RoundedBox>
  <RoundedBox args={[3.2,.3,.54]} radius={.1} smoothness={6} position={[0,3.12,-6.62]} castShadow receiveShadow>
    <meshPhysicalMaterial color="#293733" roughness={.66} metalness={.4} clearcoat={.02} clearcoatRoughness={.76}/>
  </RoundedBox>
</group>}''')

replace_function('MachineCoreAssembly', 'OrbArmorPlate', r'''function MachineCoreAssembly(){
  return <group name="home-v47-machine-core-assembly" userData={{treatment:'v55-real-cc0-industrial-machine-core-integrated-in-rear-bay-no-starburst-no-floating-struts'}}>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v55-orb-machine-core-network" position={[0,2.12,-6.72]} rotation={[0,0,.02]} span={3.45} scale={[.92,.9,.48]}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v55-orb-machine-luminous-aperture" position={[0,2.18,-6.02]} rotation={[Math.PI/2,0,0]} span={1.06}/>
    <pointLight position={[0,2.2,-5.72]} color="#8fd1c3" intensity={.72} distance={4.8} decay={2}/>
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
  useFrame(({clock})=>{if(!root.current)return;root.current.rotation.y=0;root.current.position.y=ORB.y+(reducedMotion?0:Math.sin(clock.elapsedTime*.34)*.004)})
  const stateColor=state==='warning'?'#d0a06e':state==='thinking'||state==='reflecting'?'#9eacd0':'#88c7ba'
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v55-orb-interaction-anchor-is-recessed-industrial-aperture-authored-glb-retained-hidden-for-identity-animation'}}>
    <group scale={.42} position={[0,0,-.72]} name="home-orb-governed-hidden-animation-identity" userData={{treatment:'v55-governed-glb-loaded-but-celestial-visual-children-hidden'}}><primitive object={authoredOrb}/></group>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v55-visible-orb-aperture" position={[0,0,0]} rotation={[Math.PI/2,0,0]} span={.92}/>
    <pointLight color={stateColor} intensity={state==='speaking'?.9:.62} distance={4.2} decay={2}/>
  </group>
}''')

replace_exact("const ORB = new THREE.Vector3(0, 2.22, -5.05)", "const ORB = new THREE.Vector3(0, 2.18, -6.0)", 1, 'Orb location')
replace_exact("pitch=useRef(0.26)", "pitch=useRef(0.10)", 1, 'camera pitch initializer')
replace_exact("pitch.current=0.26", "pitch.current=0.10", 1, 'camera pitch reset')
replace_exact("const desiredFov=portrait?54:48", "const desiredFov=portrait?52:47", 1, 'camera FOV')
replace_exact('cinematic-pbr-v54-authored-relic-sanctuary', 'cinematic-pbr-v55-integrated-industrial-reliquary', 1, 'visual grade')
replace_exact('v54-authored-relic-sanctuary-candidate', 'v55-integrated-industrial-reliquary-candidate', 1, 'art revision')
replace_exact('v54-retained-pixel-candidate-not-certified', 'v55-retained-pixel-candidate-not-certified', 1, 'art certification')
replace_exact('authored-relic-v54-plus-governed-living-orb', 'integrated-industrial-v55-plus-governed-orb-identity', 1, 'animation owner')
replace_exact("v54-finished-processional-floor-with-dark-shoulders-and-integrated-machine-seams", "v55-finished-processional-floor-with-dark-shoulders-and-reduced-camera-floor-dominance", 1, 'floor treatment')

SOURCE.write_text(text)

REALISM.write_text(r'''import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const source=readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx',import.meta.url),'utf8')
const orb=source.slice(source.indexOf('function SacredOrb('),source.indexOf('function HumanPresence'))
const clone=source.slice(source.indexOf('function cloneOrbModel'),source.indexOf('function PouredStone'))
const architecture=source.slice(source.indexOf('function ContinuousVaultSkin'),source.indexOf('function SanctuaryGlazing'))

test('V55 hides every rejected celestial GLB visual child while retaining governed identity and animation',()=>{
  assert.match(source,/v55-governed-orb-glb-retained-for-identity-and-animation-not-visible-glass-starburst/)
  assert.match(clone,/object\.name === 'orb-core'/)
  assert.match(clone,/object\.name === 'orb-heart'/)
  assert.match(clone,/object\.name\.startsWith\('orb-petal-'\)/)
  assert.match(clone,/object\.name\.startsWith\('orb-filament-'\)/)
  assert.match(clone,/object\.visible = false/)
  assert.match(orb,/home-orb-governed-hidden-animation-identity/)
})

test('V55 visible Orb is an authored industrial aperture embedded in a real CC0 machine network',()=>{
  assert.match(source,/home-v55-orb-machine-core-network/)
  assert.match(source,/home-v55-orb-machine-luminous-aperture/)
  assert.match(orb,/home-v55-visible-orb-aperture/)
  assert.match(architecture,/V48_PIPE_SYSTEM/)
  assert.match(architecture,/V48_ROCK_FACE_01/)
  assert.match(architecture,/V48_ROCK_FACE_02/)
  assert.doesNotMatch(orb,/dodecahedronGeometry|icosahedronGeometry|sphereGeometry|torusGeometry|OrbArmorPlate/)
})

test('V55 removes V54 disconnected bars and repeated side arches from the hero composition',()=>{
  assert.match(source,/v55-authored-industrial-pipe-bay-recessed-into-rear-shell-no-floating-load-bars/)
  assert.match(source,/v55-scanned-asymmetric-rock-returns-and-practicals-no-repeated-side-arches-no-bollards/)
  assert.match(source,/v55-recessed-wall-machine-seat-no-pedestal-no-floor-legs-no-disconnected-bars/)
  assert.match(source,/v55-real-cc0-industrial-machine-core-integrated-in-rear-bay-no-starburst-no-floating-struts/)
  assert.doesNotMatch(architecture,/TaperedLoadBeam/)
})

test('V55 camera reduces raw floor dominance and remains candidate-only pending literal pixel review',()=>{
  assert.match(source,/pitch=useRef\(0\.10\)/)
  assert.match(source,/const desiredFov=portrait\?52:47/)
  assert.match(source,/data-home-visual-grade="cinematic-pbr-v55-integrated-industrial-reliquary"/)
  assert.match(source,/data-home-final-art-revision="v55-integrated-industrial-reliquary-candidate"/)
  assert.match(source,/data-home-art-certification="v55-retained-pixel-candidate-not-certified"/)
  assert.doesNotMatch(source,/retained-pixel-pass|pixel-certified|PRODUCTION CERTIFIED/)
})
''')

portal = PORTAL_PROOF.read_text()
portal = portal.replace('v54-authored-relic-sanctuary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof','v55-integrated-industrial-reliquary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof')
portal = portal.replace("record.visualGrade === 'cinematic-pbr-v54-authored-relic-sanctuary'", "record.visualGrade === 'cinematic-pbr-v55-integrated-industrial-reliquary'")
portal = portal.replace("record.artRevision === 'v54-authored-relic-sanctuary-candidate'", "record.artRevision === 'v55-integrated-industrial-reliquary-candidate'")
portal = portal.replace("record.artCertification === 'v54-retained-pixel-candidate-not-certified'", "record.artCertification === 'v55-retained-pixel-candidate-not-certified'")
PORTAL_PROOF.write_text(portal)

continuous = CONTINUOUS_PROOF.read_text()
continuous = continuous.replace("result.animationOwner === 'authored-relic-v54-plus-governed-living-orb'", "result.animationOwner === 'integrated-industrial-v55-plus-governed-orb-identity'")
CONTINUOUS_PROOF.write_text(continuous)
print('materialized V55 integrated industrial Orb after literal V54 glass-starburst/disconnected-bar rejection')
