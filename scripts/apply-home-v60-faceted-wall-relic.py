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

if 'v60-faceted-wall-relic-retained-pixel-rebuild' in text:
    print('V60 already materialized'); raise SystemExit(0)
if 'v59-integrated-chamber-machine-retained-pixel-rebuild' not in text:
    raise SystemExit('V59 runtime marker missing')

text=replace_exact(text,'const ORB = new THREE.Vector3(0, 2.18, -6.0)','const ORB = new THREE.Vector3(0, 2.18, -6.42)','Orb physical position')

machine=r'''function FacetedMachinePanel({position,rotation=[0,0,0],size,warm=false}:{position:Vec3;rotation?:Vec3;size:Vec3;warm?:boolean}){
  const geometry=useMemo(()=>{
    const [width,height,depth]=size
    const cut=Math.min(width,height)*.16
    const shape=new THREE.Shape()
    shape.moveTo(-width/2+cut,-height/2)
    shape.lineTo(width/2-cut,-height/2)
    shape.lineTo(width/2,-height/2+cut)
    shape.lineTo(width/2,height/2-cut)
    shape.lineTo(width/2-cut,height/2)
    shape.lineTo(-width/2+cut,height/2)
    shape.lineTo(-width/2,height/2-cut)
    shape.lineTo(-width/2,-height/2+cut)
    shape.closePath()
    const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,curveSegments:1,bevelEnabled:true,bevelSegments:2,bevelSize:.035,bevelThickness:.035})
    g.center();g.computeVertexNormals();return g
  },[size])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry} position={position as [number,number,number]} rotation={rotation as [number,number,number]} castShadow receiveShadow userData={{treatment:'v60-chamfered-structural-armor-panel-no-rounded-bar-grammar'}}>
    <meshPhysicalMaterial color={warm?'#554b3c':'#223632'} roughness={.7} metalness={.38} clearcoat={.012} clearcoatRoughness={.82} envMapIntensity={.58}/>
  </mesh>
}

function MachineCoreAssembly(){
  return <group name="home-v47-machine-core-assembly" userData={{treatment:'v60-wall-integrated-faceted-reliquary-no-rods-no-spokes-no-display-frame'}}>
    <FacetedMachinePanel position={[-1.12,2.25,-6.93]} rotation={[0,.08,-.055]} size={[1.28,2.55,.34]}/>
    <FacetedMachinePanel position={[1.1,2.22,-6.93]} rotation={[0,-.08,.05]} size={[1.26,2.5,.34]} warm/>
    <FacetedMachinePanel position={[-.45,3.55,-6.97]} rotation={[0,.03,.018]} size={[1.35,.62,.31]}/>
    <FacetedMachinePanel position={[.62,.92,-6.94]} rotation={[0,-.03,-.018]} size={[1.26,.54,.3]} warm/>
    <mesh name="home-v60-machine-shadow-gap" position={[0,2.18,-6.87]}><boxGeometry args={[.52,1.72,.12]}/><meshStandardMaterial color="#050807" roughness={.88} metalness={.08}/></mesh>
    <pointLight position={[0,2.2,-6.12]} color="#6d988f" intensity={.22} distance={3.6} decay={2}/>
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
  const stateColor=state==='warning'?'#a87650':state==='thinking'||state==='reflecting'?'#718096':'#5f9488'
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v60-recessed-faceted-state-aperture-inside-wall-integrated-relic-machine'}}>
    <group scale={.22} position={[0,0,-.88]} visible={false} name="home-orb-governed-hidden-animation-identity" userData={{treatment:'v60-governed-glb-animation-identity-retained-invisibly-for-state-contract'}}><primitive object={authoredOrb}/></group>
    <FacetedMachinePanel position={[-.39,.04,.01]} rotation={[0,.12,-.025]} size={[.58,1.48,.25]}/>
    <FacetedMachinePanel position={[.39,-.04,.01]} rotation={[0,-.12,.025]} size={[.58,1.48,.25]} warm/>
    <FacetedMachinePanel position={[0,.89,-.03]} rotation={[0,0,0]} size={[.58,.28,.23]}/>
    <FacetedMachinePanel position={[0,-.9,-.03]} rotation={[0,0,0]} size={[.56,.26,.23]} warm/>
    <mesh name="home-v60-orb-state-aperture" position={[0,0,.17]} castShadow receiveShadow><boxGeometry args={[.15,1.02,.11]}/><meshPhysicalMaterial color="#07100e" roughness={.62} metalness={.5} clearcoat={.01} clearcoatRoughness={.82}/></mesh>
    <mesh name="home-v60-orb-state-slit" position={[0,0,.232]}><boxGeometry args={[.034,.72,.018]}/><meshStandardMaterial color={stateColor} emissive={stateColor} emissiveIntensity={state==='speaking'?.64:.3} metalness={.22} roughness={.38}/></mesh>
    <pointLight color={stateColor} intensity={state==='speaking'?.28:.12} distance={2.3} decay={2}/>
  </group>
}

'''
text=replace_between(text,'function MachineCoreAssembly','function HumanPresence',machine)

for old,new,label in [
("visualOwner:'integrated-chamber-machine-v59'","visualOwner:'faceted-wall-relic-v60'",'visual owner'),
("visualTreatment:'v59-integrated-chamber-machine-retained-pixel-rebuild'","visualTreatment:'v60-faceted-wall-relic-retained-pixel-rebuild'",'visual treatment'),
("cinematic-pbr-v59-integrated-chamber-machine","cinematic-pbr-v60-faceted-wall-relic",'visual grade'),
("v59-integrated-chamber-machine-candidate","v60-faceted-wall-relic-candidate",'art revision'),
("v59-retained-pixel-candidate-not-certified","v60-retained-pixel-candidate-not-certified",'art certification'),
("integrated-chamber-v59-plus-governed-orb-identity","faceted-wall-relic-v60-plus-governed-orb-identity",'animation owner'),
]: text=replace_exact(text,old,new,label)
SOURCE.write_text(text)

portal=PORTAL.read_text()
for old,new,label in [
('v59-integrated-chamber-machine-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof','v60-faceted-wall-relic-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof','proof runtime'),
('cinematic-pbr-v59-integrated-chamber-machine','cinematic-pbr-v60-faceted-wall-relic','proof grade'),
('v59-integrated-chamber-machine-candidate','v60-faceted-wall-relic-candidate','proof revision'),
('v59-retained-pixel-candidate-not-certified','v60-retained-pixel-candidate-not-certified','proof certification'),
]: portal=replace_exact(portal,old,new,label)
PORTAL.write_text(portal)

continuous=CONTINUOUS.read_text()
continuous=replace_exact(continuous,"const newOwner = \"result.animationOwner === 'integrated-chamber-v59-plus-governed-orb-identity'\"","const newOwner = \"result.animationOwner === 'faceted-wall-relic-v60-plus-governed-orb-identity'\"",'continuous owner')
continuous=replace_exact(continuous,'const runtimeOrbRadius = "orb: { x: 0, z: -2.65, radius: 2.5"','const runtimeOrbRadius = "orb: { x: 0, z: -6.42, radius: 2.5"','continuous actual Orb target')
CONTINUOUS.write_text(continuous)

REALISM.write_text(r'''import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const source=readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx',import.meta.url),'utf8')
const machine=source.slice(source.indexOf('function FacetedMachinePanel'),source.indexOf('function HumanPresence'))
const architecture=source.slice(source.indexOf('function ContinuousVaultSkin'),source.indexOf('function SanctuaryGlazing'))
test('V60 owns a continuous enclosed chamber with a faceted wall relic',()=>{assert.match(source,/v60-faceted-wall-relic-retained-pixel-rebuild/);assert.match(source,/visualOwner:'faceted-wall-relic-v60'/);assert.match(architecture,/v59-continuous-asymmetric-enclosed-chamber-no-arch-facade/);assert.match(source,/const ORB = new THREE\.Vector3\(0, 2\.18, -6\.42\)/)})
test('V60 visible relic eliminates the rejected rounded-bar, spoke and spherical Orb grammar',()=>{assert.match(machine,/v60-wall-integrated-faceted-reliquary-no-rods-no-spokes-no-display-frame/);assert.match(machine,/v60-recessed-faceted-state-aperture-inside-wall-integrated-relic-machine/);assert.match(machine,/home-v60-orb-state-slit/);assert.doesNotMatch(machine,/OrbArmorPlate|TaperedLoadBeam|sphereGeometry|icosahedronGeometry|dodecahedronGeometry|torusGeometry|circleGeometry|TubeGeometry/);assert.doesNotMatch(machine,/RoundedBox/)})
test('V60 retains governed Orb identity invisibly while visible pixels are machine-owned',()=>{assert.match(machine,/visible=\{false\}/);assert.match(machine,/v60-governed-glb-animation-identity-retained-invisibly-for-state-contract/);assert.match(source,/data-home-animation-owner="faceted-wall-relic-v60-plus-governed-orb-identity"/)})
test('V60 remains candidate-only until literal retained pixels pass',()=>{assert.match(source,/data-home-visual-grade="cinematic-pbr-v60-faceted-wall-relic"/);assert.match(source,/data-home-final-art-revision="v60-faceted-wall-relic-candidate"/);assert.match(source,/data-home-art-certification="v60-retained-pixel-candidate-not-certified"/);assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)})
''')
print('Materialized V60 faceted wall relic retained-pixel candidate')
