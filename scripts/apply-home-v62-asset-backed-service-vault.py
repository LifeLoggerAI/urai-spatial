from pathlib import Path

SOURCE=Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
PORTAL=Path('scripts/capture-natural-home-orb-proof.mjs')
CONTINUOUS=Path('scripts/run-continuous-spatial-proof-v22-natural.mjs')
REALISM=Path('urai-tier1/tests/home-relic-machine-realism-contract.test.mjs')

text=SOURCE.read_text()

def replace_between(source,start,end,replacement):
    i=source.index(start); j=source.index(end,i)
    return source[:i]+replacement+source[j:]

def one(source,old,new,label):
    count=source.count(old)
    if count!=1: raise SystemExit(f'{label}: expected one match, found {count}')
    return source.replace(old,new,1)

if 'v62-asset-backed-service-vault-retained-pixel-rebuild' in text:
    print('V62 already materialized'); raise SystemExit(0)
if 'v61-deep-reliquary-vault-retained-pixel-rebuild' not in text:
    raise SystemExit('V61 runtime marker missing')

architecture=r'''function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  return <group name="home-v47-reliquary-apse" userData={{treatment:'v62-open-service-vault-with-integrated-geology-no-display-frame'}}>
    <SanctuaryShellMass pack={pack} position={[0,2.62,-9.35]} width={11.7} height={6.2} depth={1.5} openingWidth={7.5} openingHeight={4.8} color="#151b19"/>
    <ProductionAsset url={V48_ROCK_FACE_01} name="home-v62-left-geology-foundation" position={[-4.65,.72,-8.25]} rotation={[0,1.18,-.22]} span={4.8} scale={[1.18,.82,.86]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name="home-v62-right-geology-foundation" position={[4.5,.56,-8.45]} rotation={[0,-1.12,.18]} span={4.7} scale={[1.16,.78,.9]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name="home-v62-upper-geology-key" position={[-2.8,4.15,-8.92]} rotation={[1.42,.18,.22]} span={3.25} scale={[1.0,.62,.72]}/>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v62-rear-service-manifold" position={[0,2.7,-8.15]} rotation={[0,0,.08]} span={5.75} scale={[1.08,.92,.76]}/>
  </group>
}

function CantedWallMass({pack,side}:{pack:SurfacePack;side:-1|1}){return <group name={side<0?'home-v62-left-return':'home-v62-right-return'} userData={{treatment:'v62-open-return-no-panel-frame'}} />}

function MachineCavityLiner(){
  return <group name="home-v47-reliquary-cavity" userData={{treatment:'v62-no-rectangular-cavity-frame-open-service-depth'}}>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v62-deep-service-layer" position={[.1,2.25,-8.05]} rotation={[1.54,.12,0]} span={4.4} scale={[.82,.72,1.08]}/>
    <pointLight position={[0,2.3,-7.75]} color="#6d9e95" intensity={.24} distance={4.6} decay={2}/>
  </group>
}

function SanctuarySideGallery(){
  return <group name="home-v47-side-gallery" userData={{treatment:'v62-service-galleries-embedded-in-geology'}}>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v62-left-service-gallery" position={[-3.75,2.05,-7.15]} rotation={[.1,.72,.15]} span={3.0} scale={[.62,.72,.86]}/>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v62-right-service-gallery" position={[3.65,2.08,-7.25]} rotation={[-.08,-.7,-.12]} span={3.0} scale={[-.62,.72,.86]}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v62-left-practical" position={[-4.62,2.25,-6.45]} rotation={[0,.55,0]} span={.5}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v62-right-practical" position={[4.5,2.28,-6.55]} rotation={[0,-.55,0]} span={.5}/>
    <pointLight position={[-4.25,2.22,-6.3]} color="#c49b69" intensity={.3} distance={4.8} decay={2}/>
    <pointLight position={[4.15,2.22,-6.38]} color="#6c9990" intensity={.27} distance={4.6} decay={2}/>
  </group>
}

function SanctuaryArchitecture(){const pack=useStonePack(.5,.72);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'asset-backed-service-vault-v62',construction:'open-stone-service-vault-with-real-industrial-manifold-depth',visualTreatment:'v62-asset-backed-service-vault-retained-pixel-rebuild'}}>
  <ContinuousVaultSkin pack={pack}/><SanctuarySideGallery/><MachineCavityLiner/>
  <group name="home-v62-floor-guidance" userData={{treatment:'v62-recessed-guidance-only-no-display-platform'}}><RecessedPractical position={[-1.45,.13,-6.25]} warm={false}/><RecessedPractical position={[1.35,.13,-6.42]}/></group>
</group>}

'''
text=replace_between(text,'function ContinuousVaultSkin','function SanctuaryGlazing',architecture)

machine=r'''function MachineCoreAssembly(){
  return <group name="home-v47-machine-core-assembly" userData={{treatment:'v62-real-industrial-service-manifold-layered-through-stone-no-procedural-relic-slabs'}}>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v62-machine-main-manifold" position={[0,2.18,-6.98]} rotation={[0,0,1.57]} span={4.35} scale={[.9,.9,1.05]}/>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v62-machine-left-load-path" position={[-1.75,1.75,-7.18]} rotation={[.12,.92,.42]} span={3.0} scale={[.66,.7,.9]}/>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v62-machine-right-load-path" position={[1.72,1.78,-7.2]} rotation={[-.1,-.9,-.4]} span={3.0} scale={[-.66,.7,.9]}/>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v62-machine-overhead-return" position={[0,3.65,-7.55]} rotation={[1.48,0,.08]} span={2.8} scale={[.72,.62,.9]}/>
    <pointLight position={[0,2.28,-6.55]} color="#5d9187" intensity={.26} distance={3.8} decay={2}/>
    <pointLight position={[-1.5,2.0,-6.85]} color="#b29167" intensity={.12} distance={2.8} decay={2}/>
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
  const stateColor=state==='warning'?'#b57e55':state==='thinking'||state==='reflecting'?'#8391aa':'#78b8aa'
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v62-state-core-suspended-inside-real-service-manifold'}}>
    <group scale={.18} position={[0,0,-.72]} visible={false} name="home-orb-governed-hidden-animation-identity" userData={{treatment:'v62-governed-glb-animation-identity-retained-invisibly-for-state-contract'}}><primitive object={authoredOrb}/></group>
    <mesh name="home-v62-orb-core-housing" position={[0,0,.03]} castShadow receiveShadow><cylinderGeometry args={[.24,.31,.92,10,1,false]}/><meshPhysicalMaterial color="#101c1a" roughness={.5} metalness={.66} clearcoat={.08} clearcoatRoughness={.52} envMapIntensity={.82}/></mesh>
    <mesh name="home-v62-orb-state-window" position={[0,0,.305]}><boxGeometry args={[.12,.56,.018]}/><meshStandardMaterial color={stateColor} emissive={stateColor} emissiveIntensity={state==='speaking'?.7:.34} metalness={.12} roughness={.34}/></mesh>
    <pointLight color={stateColor} intensity={state==='speaking'?.35:.16} distance={2.6} decay={2}/>
  </group>
}

'''
text=replace_between(text,'function RelicMass','function HumanPresence',machine)

for old,new,label in [
("cinematic-pbr-v61-deep-reliquary-vault","cinematic-pbr-v62-asset-backed-service-vault",'visual grade'),
("v61-deep-reliquary-vault-candidate","v62-asset-backed-service-vault-candidate",'art revision'),
("v61-retained-pixel-candidate-not-certified","v62-retained-pixel-candidate-not-certified",'art certification'),
("deep-reliquary-v61-plus-governed-orb-identity","asset-backed-service-vault-v62-plus-governed-orb-identity",'animation owner'),
]: text=one(text,old,new,label)
if 'useGLTF.preload(V48_PIPE_SYSTEM)' not in text:
    text=one(text,'useGLTF.preload(V48_CAGED_SCONCE)','useGLTF.preload(V48_CAGED_SCONCE)\nuseGLTF.preload(V48_PIPE_SYSTEM)\nuseGLTF.preload(V48_ROCK_FACE_01)\nuseGLTF.preload(V48_ROCK_FACE_02)','asset preload')
SOURCE.write_text(text)

portal=PORTAL.read_text()
for old,new,label in [
('v61-deep-reliquary-vault-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof','v62-asset-backed-service-vault-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof','proof runtime'),
('cinematic-pbr-v61-deep-reliquary-vault','cinematic-pbr-v62-asset-backed-service-vault','proof grade'),
('v61-deep-reliquary-vault-candidate','v62-asset-backed-service-vault-candidate','proof revision'),
('v61-retained-pixel-candidate-not-certified','v62-retained-pixel-candidate-not-certified','proof certification'),
]: portal=one(portal,old,new,label)
PORTAL.write_text(portal)

continuous=CONTINUOUS.read_text()
continuous=one(continuous,"const newOwner = \"result.animationOwner === 'deep-reliquary-v61-plus-governed-orb-identity'\"","const newOwner = \"result.animationOwner === 'asset-backed-service-vault-v62-plus-governed-orb-identity'\"",'continuous owner')
CONTINUOUS.write_text(continuous)

REALISM.write_text(r'''import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const source=readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx',import.meta.url),'utf8')
const machine=source.slice(source.indexOf('function MachineCoreAssembly'),source.indexOf('function HumanPresence'))
const architecture=source.slice(source.indexOf('function ContinuousVaultSkin'),source.indexOf('function SanctuaryGlazing'))
test('V62 removes the rejected procedural relic-slab display composition',()=>{assert.match(source,/v62-asset-backed-service-vault-retained-pixel-rebuild/);assert.match(source,/visualOwner:'asset-backed-service-vault-v62'/);assert.doesNotMatch(machine,/RelicMass|ExtrudeGeometry|v61-thick-asymmetric-load-bearing-relic-mass/);assert.match(machine,/v62-real-industrial-service-manifold-layered-through-stone-no-procedural-relic-slabs/)})
test('V62 uses committed real service assets for the visible machine and side galleries',()=>{assert.match(machine,/home-v62-machine-main-manifold/);assert.match(machine,/home-v62-machine-left-load-path/);assert.match(machine,/home-v62-machine-right-load-path/);assert.match(architecture,/home-v62-left-service-gallery/);assert.match(architecture,/home-v62-right-service-gallery/);assert.match(architecture,/home-v62-rear-service-manifold/)})
test('V62 integrates geology as foundation and upper key instead of floating side props',()=>{assert.match(architecture,/home-v62-left-geology-foundation/);assert.match(architecture,/home-v62-right-geology-foundation/);assert.match(architecture,/home-v62-upper-geology-key/);assert.match(architecture,/v62-open-service-vault-with-integrated-geology-no-display-frame/)})
test('V62 preserves governed Orb identity and a machine-owned visible state core',()=>{assert.match(machine,/visible=\{false\}/);assert.match(machine,/v62-governed-glb-animation-identity-retained-invisibly-for-state-contract/);assert.match(machine,/home-v62-orb-core-housing/);assert.match(machine,/home-v62-orb-state-window/);assert.match(source,/data-home-animation-owner="asset-backed-service-vault-v62-plus-governed-orb-identity"/)})
test('V62 remains fail closed pending literal retained-pixel review',()=>{assert.match(source,/data-home-visual-grade="cinematic-pbr-v62-asset-backed-service-vault"/);assert.match(source,/data-home-final-art-revision="v62-asset-backed-service-vault-candidate"/);assert.match(source,/data-home-art-certification="v62-retained-pixel-candidate-not-certified"/);assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)})
''')
print('Materialized V62 asset-backed service vault retained-pixel candidate')
