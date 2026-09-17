from pathlib import Path

SOURCE=Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
PORTAL=Path('scripts/capture-natural-home-orb-proof.mjs')
CONTINUOUS=Path('scripts/run-continuous-spatial-proof-v22-natural.mjs')
REALISM=Path('urai-tier1/tests/home-relic-machine-realism-contract.test.mjs')

text=SOURCE.read_text()

def replace_between(source,start,end,replacement):
    i=source.index(start); j=source.index(end,i)
    return source[:i]+replacement+source[j:]

def replace_exact(source,old,new,label):
    count=source.count(old)
    if count!=1: raise SystemExit(f'{label}: expected one match, found {count}')
    return source.replace(old,new,1)

if 'v59-integrated-chamber-machine-retained-pixel-rebuild' in text:
    print('V59 already materialized'); raise SystemExit(0)
if 'v58-retained-pixel-rebuild-no-cutout-cave-no-pipe-kitbash' not in text:
    raise SystemExit('V58 architecture marker missing')

court=r'''function SanctuaryCourt({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(SANCTUARY)
  const compatibilityModel = useMemo(() => cloneCompatibilitySanctuary(sanctuary.scene), [sanctuary.scene])
  const pack = useStonePack(0.42, 0.64)
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  return <group name="home-authored-terrain" userData={{ treatment: 'v59-finished-enclosed-stone-floor-with-broken-depth-planes', source: HOME_PHOTOGRAPHIC_PBR_V19 }}>
    <primitive object={compatibilityModel} />
    <mesh name="home-v59-continuous-stone-floor" position={[0,-0.16,-1.9]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[14.2,18.4,34,42]} />
      <meshPhysicalMaterial color="#111817" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(.23,.23)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={.007} displacementBias={-.0032} roughness={.86} metalness={.008} clearcoat={.012} clearcoatRoughness={.92} envMapIntensity={.44}/>
    </mesh>
    <mesh name="home-v59-central-worn-stone" position={[-.18,-.125,-3.8]} rotation={[-Math.PI/2,0,-.018]} receiveShadow>
      <planeGeometry args={[6.25,9.9,18,24]} />
      <meshPhysicalMaterial color="#202723" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(.14,.14)} roughnessMap={pack.arm} roughness={.82} metalness={.01} clearcoat={.018} clearcoatRoughness={.88} envMapIntensity={.5}/>
    </mesh>
    <ArchitecturalStone pack={pack} position={[-5.7,.02,-3.8]} size={[1.35,.24,10.8]} color="#151c1a" roughness={.86}/>
    <ArchitecturalStone pack={pack} position={[5.5,.02,-4.35]} size={[1.65,.24,9.7]} color="#181e1b" roughness={.86}/>
    <mesh name="home-walkable-navigation-surface" position={[0,.18,-1.45]} rotation={[-Math.PI/2,0,0]} onClick={onWalk}><planeGeometry args={[13,17]}/><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false}/></mesh>
  </group>
}

'''
text=replace_between(text,'function SanctuaryCourt','function ProductionSanctuary',court)

architecture=r'''function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  return <group name="home-v47-reliquary-apse" userData={{treatment:'v59-continuous-asymmetric-enclosed-chamber-no-arch-facade'}}>
    <ArchitecturalStone pack={pack} position={[0,2.55,-8.75]} size={[11.9,5.7,1.15]} color="#141b19" roughness={.82}/>
    <ArchitecturalStone pack={pack} position={[-5.45,2.42,-5.05]} size={[1.45,4.95,7.25]} color="#161d1b" roughness={.84}/>
    <ArchitecturalStone pack={pack} position={[5.2,2.62,-5.48]} size={[1.78,5.25,6.35]} color="#181e1b" roughness={.84}/>
    <ArchitecturalStone pack={pack} position={[-.25,5.08,-5.72]} size={[10.65,.62,6.15]} color="#111715" roughness={.88}/>
    <ProductionAsset url={V48_ROCK_FACE_01} name="home-v59-left-embedded-geology" position={[-5.0,1.35,-6.6]} rotation={[0,1.34,.02]} span={2.2} scale={[.54,.76,.28]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name="home-v59-right-embedded-geology" position={[4.92,1.1,-7.08]} rotation={[0,-1.28,-.02]} span={2.05} scale={[.5,.7,.26]}/>
  </group>
}

function CantedWallMass({pack,side}:{pack:SurfacePack;side:-1|1}){return <group name={side<0?'home-v59-left-return':'home-v59-right-return'} userData={{treatment:'v59-integrated-wall-return'}} />}

function MachineCavityLiner(){
  return <group name="home-v47-reliquary-cavity" userData={{treatment:'v59-deep-machined-wall-recess-no-circle-no-backboard-no-pipe-rack'}}>
    <PouredStone position={[-1.6,2.2,-7.58]} size={[.48,3.15,.58]} color="#080d0c" metalness={.18} roughness={.78}/>
    <PouredStone position={[1.6,2.2,-7.58]} size={[.48,3.15,.58]} color="#080d0c" metalness={.18} roughness={.78}/>
    <PouredStone position={[0,3.57,-7.58]} size={[2.75,.42,.58]} color="#0a100e" metalness={.2} roughness={.76}/>
    <PouredStone position={[0,.83,-7.58]} size={[2.55,.32,.58]} color="#0a100e" metalness={.2} roughness={.8}/>
    <pointLight position={[0,2.2,-6.75]} color="#6d9d92" intensity={.24} distance={4.2} decay={2}/>
  </group>
}

function SanctuarySideGallery(){
  const pack=useStonePack(.55,.8)
  return <group name="home-v47-side-gallery" userData={{treatment:'v59-recessed-side-practicals-embedded-in-enclosure'}}>
    <ArchitecturalStone pack={pack} position={[-4.35,2.08,-6.55]} size={[.8,1.6,.42]} color="#111816" roughness={.84}/>
    <ArchitecturalStone pack={pack} position={[4.18,2.05,-6.72]} size={[.72,1.52,.42]} color="#151a17" roughness={.84}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v59-left-recessed-practical" position={[-4.28,2.08,-6.22]} rotation={[0,.45,0]} span={.42}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v59-right-recessed-practical" position={[4.1,2.04,-6.39]} rotation={[0,-.45,0]} span={.42}/>
    <pointLight position={[-4.0,2.1,-6.0]} color="#c5a070" intensity={.26} distance={4.0} decay={2}/>
    <pointLight position={[3.9,2.05,-6.18]} color="#6f9e96" intensity={.24} distance={4.0} decay={2}/>
  </group>
}

function SanctuaryArchitecture(){const pack=useStonePack(.48,.7);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'integrated-chamber-machine-v59',construction:'asymmetric-enclosed-stone-chamber-with-recessed-load-bearing-relic-machine',visualTreatment:'v59-integrated-chamber-machine-retained-pixel-rebuild'}}>
  <ContinuousVaultSkin pack={pack}/><SanctuarySideGallery/><MachineCavityLiner/>
  <group name="home-v59-low-floor-practicals" userData={{treatment:'v59-subtle-depth-light-not-stage-framing'}}><RecessedPractical position={[-1.62,.14,-6.28]} warm={false}/><RecessedPractical position={[1.55,.14,-6.38]}/></group>
</group>}

'''
text=replace_between(text,'function ContinuousVaultSkin','function SanctuaryGlazing',architecture)

core=r'''function MachineCoreAssembly(){
  return <group name="home-v47-machine-core-assembly" userData={{treatment:'v59-floor-rooted-wall-machine-with-overlapping-armor-and-central-state-slit'}}>
    <TaperedLoadBeam from={[-1.55,.42,-7.18]} to={[-.72,1.62,-6.72]} width={.2} color="#273832"/>
    <TaperedLoadBeam from={[1.5,.42,-7.18]} to={[.68,1.58,-6.72]} width={.2} color="#40392f"/>
    <OrbArmorPlate position={[-.82,2.35,-6.78]} rotation={[0,.16,-.3]} scale={[1.35,1.18,1.12]}/>
    <OrbArmorPlate position={[.78,2.28,-6.78]} rotation={[0,-.13,.27]} scale={[1.28,1.22,1.12]} warm/>
    <OrbArmorPlate position={[-.28,3.05,-6.86]} rotation={[0,.06,.18]} scale={[1.12,.96,1.08]}/>
    <OrbArmorPlate position={[.24,1.42,-6.82]} rotation={[0,-.05,-.2]} scale={[1.08,.92,1.08]} warm/>
    <pointLight position={[0,2.18,-6.15]} color="#6fa89b" intensity={.28} distance={3.8} decay={2}/>
  </group>
}

'''
text=replace_between(text,'function MachineCoreAssembly','function OrbArmorPlate',core)

orb=r'''function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null),activeAction=useRef<THREE.AnimationAction|null>(null)
  const orb=useGLTF(ORB_MODEL)
  const authoredOrb=useMemo(()=>cloneOrbModel(orb.scene),[orb.scene])
  const {actions}=useAnimations(orb.animations,authoredOrb)
  const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion])
  useEffect(()=>{const allActions=Object.values(actions).filter((action):action is THREE.AnimationAction=>Boolean(action));if(reducedMotion){allActions.forEach((action)=>action.stop());activeAction.current=null;return}const next=actions[ORB_CLIPS[state]];if(!next)return;const previous=activeAction.current;if(previous&&previous!==next)previous.fadeOut(.2);next.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(.2).play();activeAction.current=next},[actions,reducedMotion,state])
  useEffect(()=>()=>{Object.values(actions).forEach((action)=>action?.stop())},[actions])
  useFrame(()=>{if(!root.current)return;root.current.rotation.y=0;root.current.position.y=ORB.y})
  const stateColor=state==='warning'?'#b27a4d':state==='thinking'||state==='reflecting'?'#7886a4':'#5b9689'
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v59-recessed-machined-state-slit-inside-load-bearing-relic-machine'}}>
    <group scale={.22} position={[0,0,-.88]} visible={false} name="home-orb-governed-hidden-animation-identity" userData={{treatment:'v59-governed-glb-animation-identity-retained-invisibly-for-state-contract'}}><primitive object={authoredOrb}/></group>
    <OrbArmorPlate position={[-.38,.02,.02]} rotation={[0,.18,-.18]} scale={[.94,1.34,1.0]}/>
    <OrbArmorPlate position={ [.38,-.02,.02]} rotation={[0,-.18,.18]} scale={[.94,1.34,1.0]} warm/>
    <RoundedBox name="home-v59-orb-state-slit-housing" args={[.22,.92,.16]} radius={.07} smoothness={6} position={[0,0,.11]} castShadow receiveShadow><meshPhysicalMaterial color="#0b1210" roughness={.48} metalness={.68} clearcoat={.025} clearcoatRoughness={.7}/></RoundedBox>
    <mesh name="home-v59-orb-state-slit" position={[0,0,.205]}><boxGeometry args={[.055,.58,.025]}/><meshStandardMaterial color={stateColor} emissive={stateColor} emissiveIntensity={state==='speaking'?.78:.38} metalness={.3} roughness={.34}/></mesh>
    <pointLight color={stateColor} intensity={state==='speaking'?.34:.16} distance={2.6} decay={2}/>
  </group>
}

'''
text=replace_between(text,'function SacredOrb','function HumanPresence',orb)

for old,new,label in [
('const SPAWN = new THREE.Vector3(2.75, 0.04, 5.35)','const SPAWN = new THREE.Vector3(3.45, 0.04, 4.2)','spawn'),
('const DEFAULT_YAW = 0.29','const DEFAULT_YAW = 0.18','yaw'),
('camera.position.set(.82,1.72,7.05);camera.lookAt(ORB.x,ORB.y-.08,ORB.z)','camera.position.set(3.4,1.74,5.05);camera.lookAt(.3,2.0,-6.0)','initial camera'),
('const desiredFov=portrait?47:40','const desiredFov=portrait?46:39','runtime fov'),
('cinematic-pbr-v58-integrated-reliquary-vault','cinematic-pbr-v59-integrated-chamber-machine','visual grade'),
('v58-integrated-reliquary-vault-candidate','v59-integrated-chamber-machine-candidate','art revision'),
('v58-retained-pixel-candidate-not-certified','v59-retained-pixel-candidate-not-certified','art certification'),
('integrated-reliquary-v58-plus-governed-orb-identity','integrated-chamber-v59-plus-governed-orb-identity','animation owner'),
]: text=replace_exact(text,old,new,label)
SOURCE.write_text(text)

portal=PORTAL.read_text()
for old,new,label in [
('v58-integrated-reliquary-vault-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof','v59-integrated-chamber-machine-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof','proof runtime'),
('cinematic-pbr-v58-integrated-reliquary-vault','cinematic-pbr-v59-integrated-chamber-machine','proof grade'),
('v58-integrated-reliquary-vault-candidate','v59-integrated-chamber-machine-candidate','proof revision'),
('v58-retained-pixel-candidate-not-certified','v59-retained-pixel-candidate-not-certified','proof certification'),
]: portal=replace_exact(portal,old,new,label)
PORTAL.write_text(portal)

continuous=CONTINUOUS.read_text()
continuous=replace_exact(continuous,"const newOwner = \"result.animationOwner === 'photogrammetry-service-v57-plus-governed-orb-identity'\"","const newOwner = \"result.animationOwner === 'integrated-chamber-v59-plus-governed-orb-identity'\"",'continuous owner')
CONTINUOUS.write_text(continuous)

REALISM.write_text(r'''import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const source=readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx',import.meta.url),'utf8')
const architecture=source.slice(source.indexOf('function ContinuousVaultSkin'),source.indexOf('function SanctuaryGlazing'))
const machine=source.slice(source.indexOf('function MachineCoreAssembly'),source.indexOf('function OrbArmorPlate'))
const orb=source.slice(source.indexOf('function SacredOrb'),source.indexOf('function HumanPresence'))
test('V59 removes the rejected arch facade and owns one enclosed asymmetric chamber',()=>{assert.match(source,/v59-integrated-chamber-machine-retained-pixel-rebuild/);assert.match(architecture,/v59-continuous-asymmetric-enclosed-chamber-no-arch-facade/);assert.doesNotMatch(architecture,/SanctuaryShellMass pack=|circleGeometry/);assert.match(architecture,/home-v59-left-embedded-geology/);assert.match(architecture,/home-v59-right-embedded-geology/)})
test('V59 removes the V58 spoke constellation and visible spherical Orb',()=>{assert.match(machine,/v59-floor-rooted-wall-machine-with-overlapping-armor-and-central-state-slit/);assert.match(orb,/home-v59-orb-state-slit/);assert.doesNotMatch(orb,/icosahedronGeometry|sphereGeometry|dodecahedronGeometry|torusGeometry|ORB_FRAGMENT_LAYOUT\.map/);assert.doesNotMatch(machine,/from=\{\[-2\.05|from=\{\[2\.05/)})
test('V59 preserves governed Orb state identity without letting it own visible pixels',()=>{assert.match(orb,/visible=\{false\}/);assert.match(orb,/v59-governed-glb-animation-identity-retained-invisibly-for-state-contract/);assert.match(orb,/v59-recessed-machined-state-slit-inside-load-bearing-relic-machine/)})
test('V59 uses a tighter oblique embodied composition and remains fail closed',()=>{assert.match(source,/const SPAWN = new THREE\.Vector3\(3\.45, 0\.04, 4\.2\)/);assert.match(source,/const DEFAULT_YAW = 0\.18/);assert.match(source,/const desiredFov=portrait\?46:39/);assert.match(source,/data-home-visual-grade="cinematic-pbr-v59-integrated-chamber-machine"/);assert.match(source,/data-home-final-art-revision="v59-integrated-chamber-machine-candidate"/);assert.match(source,/data-home-art-certification="v59-retained-pixel-candidate-not-certified"/);assert.match(source,/data-home-animation-owner="integrated-chamber-v59-plus-governed-orb-identity"/);assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)})
''')
print('Materialized V59 integrated chamber machine retained-pixel candidate')
