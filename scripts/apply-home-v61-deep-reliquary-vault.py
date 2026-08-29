from pathlib import Path

SOURCE=Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
PORTAL=Path('scripts/capture-natural-home-orb-proof.mjs')
CONTINUOUS=Path('scripts/run-continuous-spatial-proof-v22-natural.mjs')
REALISM=Path('urai-tier1/tests/home-relic-machine-realism-contract.test.mjs')
SCAN=Path('.github/workflows/home-scanned-composition-forge.yml')

text=SOURCE.read_text()

def replace_between(source,start,end,replacement):
    i=source.index(start); j=source.index(end,i)
    return source[:i]+replacement+source[j:]

def replace_exact(source,old,new,label):
    count=source.count(old)
    if count!=1: raise SystemExit(f'{label}: expected one match, found {count}')
    return source.replace(old,new,1)

if 'v61-deep-reliquary-vault-retained-pixel-rebuild' in text:
    print('V61 already materialized'); raise SystemExit(0)
if 'v60-faceted-wall-relic-retained-pixel-rebuild' not in text:
    raise SystemExit('V60 runtime marker missing')

architecture=r'''function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  return <group name="home-v47-reliquary-apse" userData={{treatment:'v61-deep-continuous-stone-vault-with-recessed-relic-bay'}}>
    <ArchitecturalStone pack={pack} position={[0,2.5,-9.05]} size={[12.2,5.8,.95]} color="#101615" roughness={.9}/>
    <ArchitecturalStone pack={pack} position={[-5.7,2.42,-4.95]} size={[1.2,5.0,7.9]} color="#111817" roughness={.9}/>
    <ArchitecturalStone pack={pack} position={[5.45,2.5,-5.35]} size={[1.42,5.15,7.05]} color="#131918" roughness={.9}/>
    <ArchitecturalStone pack={pack} position={[-.18,5.05,-5.75]} size={[10.8,.5,6.25]} color="#0e1413" roughness={.92}/>
    <ProductionAsset url={V48_ROCK_FACE_01} name="home-v61-left-integrated-geology" position={[-4.45,1.5,-7.3]} rotation={[0,1.4,.05]} span={3.5} scale={[.95,1.08,.62]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name="home-v61-right-integrated-geology" position={[4.2,1.25,-7.55]} rotation={[0,-1.35,-.03]} span={3.25} scale={[.9,1.0,.58]}/>
  </group>
}

function CantedWallMass({pack,side}:{pack:SurfacePack;side:-1|1}){return <group name={side<0?'home-v61-left-return':'home-v61-right-return'} userData={{treatment:'v61-integrated-wall-return'}} />}

function MachineCavityLiner(){
  const pack=useStonePack(.36,.48)
  return <group name="home-v47-reliquary-cavity" userData={{treatment:'v61-meter-deep-stone-and-metal-reliquary-bay-no-flat-backboard'}}>
    <ArchitecturalStone pack={pack} position={[0,2.25,-8.25]} size={[4.6,4.15,.42]} color="#090f0e" roughness={.94}/>
    <ArchitecturalStone pack={pack} position={[-2.25,2.25,-7.55]} size={[.55,4.15,1.55]} color="#111817" roughness={.88}/>
    <ArchitecturalStone pack={pack} position={[2.25,2.25,-7.55]} size={[.55,4.15,1.55]} color="#121817" roughness={.88}/>
    <ArchitecturalStone pack={pack} position={[0,4.18,-7.58]} size={[4.75,.45,1.42]} color="#0f1514" roughness={.9}/>
    <ArchitecturalStone pack={pack} position={[0,.38,-7.62]} size={[4.3,.38,1.32]} color="#0d1312" roughness={.92}/>
    <pointLight position={[0,2.25,-7.15]} color="#658e87" intensity={.16} distance={3.1} decay={2}/>
  </group>
}

function SanctuarySideGallery(){
  const pack=useStonePack(.7,.9)
  return <group name="home-v47-side-gallery" userData={{treatment:'v61-shadowed-side-galleries-with-recessed-real-practicals'}}>
    <ArchitecturalStone pack={pack} position={[-4.55,2.0,-5.85]} size={[.9,2.1,.7]} color="#0f1614" roughness={.9}/>
    <ArchitecturalStone pack={pack} position={[4.35,2.05,-6.05]} size={[.82,2.0,.7]} color="#111715" roughness={.9}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v61-left-recessed-practical" position={[-4.35,2.05,-5.4]} rotation={[0,.48,0]} span={.48}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v61-right-recessed-practical" position={[4.18,2.08,-5.65]} rotation={[0,-.5,0]} span={.48}/>
    <pointLight position={[-4.05,2.05,-5.1]} color="#c49b69" intensity={.22} distance={4.2} decay={2}/>
    <pointLight position={[3.95,2.05,-5.35]} color="#6c9990" intensity={.2} distance={4.0} decay={2}/>
  </group>
}

function SanctuaryArchitecture(){const pack=useStonePack(.5,.72);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'deep-reliquary-vault-v61',construction:'deep-stone-vault-with-meter-deep-integrated-relic-machine',visualTreatment:'v61-deep-reliquary-vault-retained-pixel-rebuild'}}>
  <ContinuousVaultSkin pack={pack}/><SanctuarySideGallery/><MachineCavityLiner/>
  <group name="home-v61-floor-guidance" userData={{treatment:'v61-subtle-processional-depth-not-display-platform'}}><RecessedPractical position={[-1.3,.13,-6.6]} warm={false}/><RecessedPractical position={[1.25,.13,-6.7]}/></group>
</group>}

'''
text=replace_between(text,'function ContinuousVaultSkin','function SanctuaryGlazing',architecture)

machine=r'''function RelicMass({position,rotation=[0,0,0],size,warm=false}:{position:Vec3;rotation?:Vec3;size:Vec3;warm?:boolean}){
  const geometry=useMemo(()=>{
    const [w,h,d]=size, c=Math.min(w,h)*.2
    const shape=new THREE.Shape();shape.moveTo(-w/2+c,-h/2);shape.lineTo(w/2-c,-h/2);shape.lineTo(w/2,-h/2+c);shape.lineTo(w/2,h*.18);shape.lineTo(w*.28,h/2);shape.lineTo(-w*.34,h/2);shape.lineTo(-w/2,h*.1);shape.closePath()
    const g=new THREE.ExtrudeGeometry(shape,{depth:d,steps:1,curveSegments:1,bevelEnabled:true,bevelSegments:2,bevelSize:.055,bevelThickness:.055});g.center();g.computeVertexNormals();return g
  },[size])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry} position={position as [number,number,number]} rotation={rotation as [number,number,number]} castShadow receiveShadow userData={{treatment:'v61-thick-asymmetric-load-bearing-relic-mass'}}><meshPhysicalMaterial color={warm?'#433a30':'#1b2926'} roughness={.78} metalness={.28} clearcoat={.008} clearcoatRoughness={.9} envMapIntensity={.46}/></mesh>
}

function MachineCoreAssembly(){
  return <group name="home-v47-machine-core-assembly" userData={{treatment:'v61-deep-overlapping-relic-masses-with-real-parallax-no-plaques-no-rods'}}>
    <RelicMass position={[-1.1,2.35,-7.38]} rotation={[0,.11,-.1]} size={[1.55,2.85,1.15]}/>
    <RelicMass position={[1.05,2.2,-7.32]} rotation={[0,-.13,.09]} size={[1.5,2.7,1.08]} warm/>
    <RelicMass position={[-.35,3.55,-7.05]} rotation={[-.05,.08,.08]} size={[1.5,1.0,.92]}/>
    <RelicMass position={[.4,1.05,-7.0]} rotation={[.04,-.07,-.07]} size={[1.4,.95,.88]} warm/>
    <RelicMass position={[-1.85,1.25,-7.65]} rotation={[0,.18,-.03]} size={[.62,1.6,.72]}/>
    <RelicMass position={[1.78,1.4,-7.62]} rotation={[0,-.18,.03]} size={[.58,1.5,.7]} warm/>
    <mesh name="home-v61-deep-central-shadow" position={[0,2.22,-6.9]}><boxGeometry args={[.48,1.82,.42]}/><meshStandardMaterial color="#030706" roughness={.96} metalness={.02}/></mesh>
    <pointLight position={[0,2.22,-6.45]} color="#5e8d83" intensity={.18} distance={2.8} decay={2}/>
  </group>
}

function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null),activeAction=useRef<THREE.AnimationAction|null>(null)
  const orb=useGLTF(ORB_MODEL)
  const authoredOrb=useMemo(()=>cloneOrbModel(orb.scene),[orb.scene])
  const {actions}=useAnimations(orb.animations,authoredOrb)
  const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion])
  useEffect(()=>{const allActions=Object.values(actions).filter((action):action is THREE.AnimationAction=>Boolean(action));if(reducedMotion){allActions.forEach((action)=>action.stop());activeAction.current=null;return}const next=actions[ORB_CLIPS[state]];if(!next)return;const previous=activeAction.current;if(previous&&previous!==next)previous.fadeOut(.2);next.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(.2).play();activeAction.current=next},[actions,reducedMotion,state])
  useEffect(()=>()=>{Object.values(actions).forEach((action)=>action?.stop())},[actions])
  useFrame(()=>{if(!root.current)return;root.current.rotation.y=0;root.current.position.y=ORB.y})
  const stateColor=state==='warning'?'#a67852':state==='thinking'||state==='reflecting'?'#72849a':'#67988d'
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v61-recessed-state-core-inside-deep-load-bearing-relic-vault'}}>
    <group scale={.2} position={[0,0,-1.1]} visible={false} name="home-orb-governed-hidden-animation-identity" userData={{treatment:'v61-governed-glb-animation-identity-retained-invisibly-for-state-contract'}}><primitive object={authoredOrb}/></group>
    <RelicMass position={[-.38,.05,-.05]} rotation={[0,.12,-.05]} size={[.55,1.55,.62]}/>
    <RelicMass position={[.38,-.04,-.04]} rotation={[0,-.12,.05]} size={[.55,1.5,.6]} warm/>
    <mesh name="home-v61-orb-state-core" position={[0,0,.26]} castShadow receiveShadow><boxGeometry args={[.12,.9,.12]}/><meshPhysicalMaterial color="#06100e" roughness={.66} metalness={.4} clearcoat={.006} clearcoatRoughness={.9}/></mesh>
    <mesh name="home-v61-orb-state-slit" position={[0,0,.33]}><boxGeometry args={[.026,.62,.012]}/><meshStandardMaterial color={stateColor} emissive={stateColor} emissiveIntensity={state==='speaking'?.56:.25} metalness={.16} roughness={.42}/></mesh>
    <pointLight color={stateColor} intensity={state==='speaking'?.24:.1} distance={2.0} decay={2}/>
  </group>
}

'''
text=replace_between(text,'function FacetedMachinePanel','function HumanPresence',machine)

for old,new,label in [
("visualOwner:'faceted-wall-relic-v60'","visualOwner:'deep-reliquary-vault-v61'",'visual owner'),
("visualTreatment:'v60-faceted-wall-relic-retained-pixel-rebuild'","visualTreatment:'v61-deep-reliquary-vault-retained-pixel-rebuild'",'visual treatment'),
("cinematic-pbr-v60-faceted-wall-relic","cinematic-pbr-v61-deep-reliquary-vault",'visual grade'),
("v60-faceted-wall-relic-candidate","v61-deep-reliquary-vault-candidate",'art revision'),
("v60-retained-pixel-candidate-not-certified","v61-retained-pixel-candidate-not-certified",'art certification'),
("faceted-wall-relic-v60-plus-governed-orb-identity","deep-reliquary-v61-plus-governed-orb-identity",'animation owner'),
('const SPAWN = new THREE.Vector3(3.45, 0.04, 4.2)','const SPAWN = new THREE.Vector3(4.45, 0.04, 3.15)','spawn'),
('const DEFAULT_YAW = 0.18','const DEFAULT_YAW = 0.435','yaw'),
('camera.position.set(3.4,1.74,5.05);camera.lookAt(.3,2.0,-6.0)','camera.position.set(4.4,1.72,3.1);camera.lookAt(.1,2.15,-7.0)','initial camera'),
('const desiredFov=portrait?46:39','const desiredFov=portrait?52:40','runtime fov'),
]: text=replace_exact(text,old,new,label)
SOURCE.write_text(text)

portal=PORTAL.read_text()
for old,new,label in [
('v60-faceted-wall-relic-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof','v61-deep-reliquary-vault-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof','proof runtime'),
('cinematic-pbr-v60-faceted-wall-relic','cinematic-pbr-v61-deep-reliquary-vault','proof grade'),
('v60-faceted-wall-relic-candidate','v61-deep-reliquary-vault-candidate','proof revision'),
('v60-retained-pixel-candidate-not-certified','v61-retained-pixel-candidate-not-certified','proof certification'),
]: portal=replace_exact(portal,old,new,label)
PORTAL.write_text(portal)

continuous=CONTINUOUS.read_text()
continuous=replace_exact(continuous,"const newOwner = \"result.animationOwner === 'faceted-wall-relic-v60-plus-governed-orb-identity'\"","const newOwner = \"result.animationOwner === 'deep-reliquary-v61-plus-governed-orb-identity'\"",'continuous owner')
CONTINUOUS.write_text(continuous)

REALISM.write_text(r'''import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const source=readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx',import.meta.url),'utf8')
const machine=source.slice(source.indexOf('function RelicMass'),source.indexOf('function HumanPresence'))
const architecture=source.slice(source.indexOf('function ContinuousVaultSkin'),source.indexOf('function SanctuaryGlazing'))
test('V61 owns a deep continuous sanctuary vault rather than a wall plaque composition',()=>{assert.match(source,/v61-deep-reliquary-vault-retained-pixel-rebuild/);assert.match(source,/visualOwner:'deep-reliquary-vault-v61'/);assert.match(architecture,/v61-meter-deep-stone-and-metal-reliquary-bay-no-flat-backboard/);assert.match(architecture,/home-v61-left-integrated-geology/);assert.match(architecture,/home-v61-right-integrated-geology/)})
test('V61 machine uses thick asymmetric parallax masses and no rejected rod or plaque grammar',()=>{assert.match(machine,/v61-deep-overlapping-relic-masses-with-real-parallax-no-plaques-no-rods/);assert.match(machine,/v61-thick-asymmetric-load-bearing-relic-mass/);assert.match(machine,/home-v61-orb-state-core/);assert.doesNotMatch(machine,/RoundedBox|TaperedLoadBeam|OrbArmorPlate|FacetedMachinePanel|TubeGeometry|sphereGeometry|icosahedronGeometry|dodecahedronGeometry|torusGeometry|circleGeometry/)})
test('V61 preserves governed Orb identity invisibly and keeps visible state machine-owned',()=>{assert.match(machine,/visible=\{false\}/);assert.match(machine,/v61-governed-glb-animation-identity-retained-invisibly-for-state-contract/);assert.match(source,/data-home-animation-owner="deep-reliquary-v61-plus-governed-orb-identity"/)})
test('V61 mobile-safe initial framing aims the offset spawn at the recessed Orb bay',()=>{assert.match(source,/const SPAWN = new THREE\.Vector3\(4\.45, 0\.04, 3\.15\)/);assert.match(source,/const DEFAULT_YAW = 0\.435/);assert.match(source,/const desiredFov=portrait\?52:40/)})
test('V61 remains fail closed until literal retained pixels pass',()=>{assert.match(source,/data-home-visual-grade="cinematic-pbr-v61-deep-reliquary-vault"/);assert.match(source,/data-home-final-art-revision="v61-deep-reliquary-vault-candidate"/);assert.match(source,/data-home-art-certification="v61-retained-pixel-candidate-not-certified"/);assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)})
''')

scan=SCAN.read_text()
start=scan.index('          # V59 visible composition:')
end=scan.index('          ! grep -F \'<ProductionOrbMachine />\'',start)
replacement=r'''          # V61 visible composition: deep continuous sanctuary vault and meter-deep integrated relic machine.
          grep -F "visualOwner:'deep-reliquary-vault-v61'" "$source"
          grep -F "visualTreatment:'v61-deep-reliquary-vault-retained-pixel-rebuild'" "$source"
          grep -F 'v61-deep-continuous-stone-vault-with-recessed-relic-bay' "$source"
          grep -F 'home-v61-left-integrated-geology' "$source"
          grep -F 'home-v61-right-integrated-geology' "$source"
          grep -F 'v61-meter-deep-stone-and-metal-reliquary-bay-no-flat-backboard' "$source"
          grep -F 'v61-deep-overlapping-relic-masses-with-real-parallax-no-plaques-no-rods' "$source"
          grep -F 'v61-recessed-state-core-inside-deep-load-bearing-relic-vault' "$source"
          grep -F 'home-v61-orb-state-slit' "$source"
          grep -F 'v61-governed-glb-animation-identity-retained-invisibly-for-state-contract' "$source"
          grep -F 'data-home-visual-grade="cinematic-pbr-v61-deep-reliquary-vault"' "$source"
          grep -F 'data-home-final-art-revision="v61-deep-reliquary-vault-candidate"' "$source"
          grep -F 'data-home-art-certification="v61-retained-pixel-candidate-not-certified"' "$source"
          grep -F 'data-home-animation-owner="deep-reliquary-v61-plus-governed-orb-identity"' "$source"

          # Rejected visible grammars and primitive Orb shapes must not survive in the V61 visible block.
          orb_block="$(sed -n '/function SacredOrb/,/function HumanPresence/p' "$source")"
          machine_block="$(sed -n '/function RelicMass/,/function HumanPresence/p' "$source")"
          ! grep -F 'sphereGeometry' <<<"$orb_block"
          ! grep -F 'icosahedronGeometry' <<<"$orb_block"
          ! grep -F 'dodecahedronGeometry' <<<"$orb_block"
          ! grep -F 'torusGeometry' <<<"$orb_block"
          ! grep -F 'RoundedBox' <<<"$machine_block"
          ! grep -F 'TaperedLoadBeam' <<<"$machine_block"
          ! grep -F 'OrbArmorPlate' <<<"$machine_block"
          ! grep -F 'FacetedMachinePanel' <<<"$machine_block"
'''
SCAN.write_text(scan[:start]+replacement+scan[end:])
print('Materialized V61 deep reliquary vault retained-pixel candidate')
