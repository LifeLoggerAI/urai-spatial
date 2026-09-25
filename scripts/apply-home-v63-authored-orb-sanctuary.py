from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx'
NATURAL = ROOT / 'scripts/capture-natural-home-orb-proof.mjs'
CONTINUOUS = ROOT / 'scripts/run-continuous-spatial-proof-v22-natural.mjs'
TEST = ROOT / 'urai-tier1/tests/home-relic-machine-realism-contract.test.mjs'


def replace_between(text: str, start: str, end: str, replacement: str) -> str:
    a = text.find(start)
    if a < 0:
        raise SystemExit(f'missing start marker: {start}')
    b = text.find(end, a)
    if b < 0:
        raise SystemExit(f'missing end marker: {end}')
    return text[:a] + replacement.rstrip() + '\n\n' + text[b:]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


source = SOURCE.read_text()
if "visualOwner:'authored-orb-sanctuary-v63'" in source:
    raise SystemExit('V63 already materialized')
if "visualOwner:'asset-backed-service-vault-v62'" not in source:
    raise SystemExit('V62 runtime marker missing')

# Keep the authored Orb body/core visible. Decorative aura/orbit/filament/petal elements remain retired.
old_identity = """    const governedIdentityOnly = object.name === 'orb-aura'\n      || object.name === 'orb-core'\n      || object.name === 'orb-heart'\n      || object.name.startsWith('orb-orbit-')\n      || object.name.startsWith('orb-filament-')\n      || object.name.startsWith('orb-petal-')\n"""
new_identity = """    const governedIdentityOnly = object.name === 'orb-aura'\n      || object.name.startsWith('orb-orbit-')\n      || object.name.startsWith('orb-filament-')\n      || object.name.startsWith('orb-petal-')\n"""
source = replace_once(source, old_identity, new_identity, 'orb visible identity')
source = source.replace("v56-governed-orb-animation-identity-retained-behind-wall-integrated-machine-aperture", "v63-governed-orb-animation-identity-with-authored-core-visible")
source = source.replace("v56-governed-orb-glb-retained-for-identity-and-animation-behind-engineered-aperture", "v63-authored-orb-visible-with-governed-animation-identity")

vault = r'''function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  return <group name="home-v47-reliquary-apse" userData={{treatment:'v63-deep-stone-sanctuary-with-integrated-geology-no-display-frame'}}>
    <SanctuaryShellMass pack={pack} position={[0,2.72,-9.65]} width={11.9} height={6.35} depth={1.8} openingWidth={7.7} openingHeight={4.95} color="#171d1b"/>
    <ArchitecturalStone pack={pack} position={[0,2.35,-10.18]} size={[7.15,4.45,.42]} color="#202724" roughness={.88}/>
    <ArchitecturalStone pack={pack} position={[-3.55,2.25,-8.95]} size={[1.15,4.55,2.65]} color="#151b19" roughness={.9}/>
    <ArchitecturalStone pack={pack} position={[3.55,2.25,-9.05]} size={[1.15,4.55,2.45]} color="#161c1a" roughness={.9}/>
    <ProductionAsset url={V48_ROCK_FACE_01} name="home-v63-left-geology-foundation" position={[-4.72,.62,-8.7]} rotation={[0,1.12,-.18]} span={3.7} scale={[1.0,.72,.78]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name="home-v63-right-geology-foundation" position={[4.62,.58,-8.82]} rotation={[0,-1.08,.14]} span={3.55} scale={[1.0,.7,.78]}/>
    <pointLight position={[0,3.45,-8.85]} color="#7da79e" intensity={.32} distance={5.2} decay={2}/>
    <pointLight position={[-3.45,1.7,-8.15]} color="#c39a68" intensity={.18} distance={4.2} decay={2}/>
  </group>
}'''
source = replace_between(source, 'function ContinuousVaultSkin', 'function CantedWallMass', vault)

cavity = r'''function MachineCavityLiner(){
  return <group name="home-v47-reliquary-cavity" userData={{treatment:'v63-open-stone-reliquary-depth-no-pipe-wall-no-rectangular-frame'}}>
    <RecessedPractical position={[-2.55,.42,-8.02]} warm={true}/>
    <RecessedPractical position={[2.45,.42,-8.12]} warm={false}/>
  </group>
}'''
source = replace_between(source, 'function MachineCavityLiner', 'function SanctuarySideGallery', cavity)

gallery = r'''function SanctuarySideGallery(){
  return <group name="home-v47-side-gallery" userData={{treatment:'v63-restrained-service-infrastructure-recessed-at-sanctuary-edges'}}>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v63-left-recessed-service" position={[-4.65,2.0,-8.72]} rotation={[.08,.88,.18]} span={2.15} scale={[.44,.5,.64]}/>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v63-right-recessed-service" position={[4.58,2.02,-8.8]} rotation={[-.06,-.86,-.16]} span={2.1} scale={[-.44,.5,.64]}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v63-left-practical" position={[-4.18,2.55,-7.6]} rotation={[0,.48,0]} span={.44}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v63-right-practical" position={[4.12,2.56,-7.68]} rotation={[0,-.48,0]} span={.44}/>
    <pointLight position={[-3.95,2.5,-7.45]} color="#c49b69" intensity={.26} distance={4.1} decay={2}/>
    <pointLight position={[3.9,2.5,-7.52]} color="#75a39a" intensity={.24} distance={4.0} decay={2}/>
  </group>
}'''
source = replace_between(source, 'function SanctuarySideGallery', 'function SanctuaryArchitecture', gallery)

architecture = r'''function SanctuaryArchitecture(){const pack=useStonePack(.5,.72);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'authored-orb-sanctuary-v63',construction:'deep-stone-sanctuary-with-recessed-edge-services-and-visible-authored-orb',visualTreatment:'v63-authored-orb-sanctuary-retained-pixel-rebuild'}}>
  <ContinuousVaultSkin pack={pack}/><SanctuarySideGallery/><MachineCavityLiner/>
  <group name="home-v63-floor-guidance" userData={{treatment:'v63-subtle-recessed-guidance-no-display-platform'}}><RecessedPractical position={[-1.65,.13,-6.5]} warm={false}/><RecessedPractical position={[1.55,.13,-6.58]}/></group>
</group>}'''
source = replace_between(source, 'function SanctuaryArchitecture', 'function SanctuaryGlazing', architecture)

machine = r'''function MachineCoreAssembly(){
  return <group name="home-v47-machine-core-assembly" userData={{treatment:'v63-edge-service-infrastructure-supports-authored-orb-no-reactor-no-pipe-wall'}}>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v63-left-orb-service" position={[-2.55,2.0,-8.25]} rotation={[.08,.82,.32]} span={2.0} scale={[.42,.48,.58]}/>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v63-right-orb-service" position={[2.48,2.05,-8.3]} rotation={[-.08,-.82,-.3]} span={1.95} scale={[-.42,.48,.58]}/>
    <pointLight position={[0,2.35,-7.55]} color="#7eb1a7" intensity={.28} distance={4.0} decay={2}/>
  </group>
}'''
source = replace_between(source, 'function MachineCoreAssembly', 'function SacredOrb', machine)

orb = r'''function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null),activeAction=useRef<THREE.AnimationAction|null>(null)
  const orb=useGLTF(ORB_MODEL)
  const authoredOrb=useMemo(()=>cloneOrbModel(orb.scene),[orb.scene])
  const {actions}=useAnimations(orb.animations,authoredOrb)
  const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion])
  useEffect(()=>{const allActions=Object.values(actions).filter((action):action is THREE.AnimationAction=>Boolean(action));if(reducedMotion){allActions.forEach((action)=>action.stop());activeAction.current=null;return}const next=actions[ORB_CLIPS[state]];if(!next)return;const previous=activeAction.current;if(previous&&previous!==next)previous.fadeOut(.2);next.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(.2).play();activeAction.current=next},[actions,reducedMotion,state])
  useEffect(()=>()=>{Object.values(actions).forEach((action)=>action?.stop())},[actions])
  useFrame(()=>{if(!root.current)return;root.current.rotation.y=reducedMotion?0:Math.sin(performance.now()*.00018)*.04;root.current.position.y=ORB.y})
  const stateColor=state==='warning'?'#b57e55':state==='thinking'||state==='reflecting'?'#8fa4c4':'#86c8ba'
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v63-visible-authored-orb-suspended-in-deep-stone-sanctuary'}}>
    <group scale={.34} name="home-v63-visible-authored-orb" userData={{treatment:'v63-authored-glb-core-visible-governed-animation-identity'}}><primitive object={authoredOrb}/></group>
    <pointLight color={stateColor} intensity={state==='speaking'?.46:.24} distance={3.6} decay={2}/>
  </group>
}'''
source = replace_between(source, 'function SacredOrb', 'function HumanPresence', orb)

replacements = {
    'cinematic-pbr-v62-asset-backed-service-vault': 'cinematic-pbr-v63-authored-orb-sanctuary',
    'v62-asset-backed-service-vault-candidate': 'v63-authored-orb-sanctuary-candidate',
    'v62-retained-pixel-candidate-not-certified': 'v63-retained-pixel-candidate-not-certified',
    'asset-backed-service-vault-v62-plus-governed-orb-identity': 'authored-orb-sanctuary-v63-plus-governed-orb-identity',
}
for old, new in replacements.items():
    source = source.replace(old, new)
SOURCE.write_text(source)

natural = NATURAL.read_text()
for old, new in {
    'v62-asset-backed-service-vault-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof': 'v63-authored-orb-sanctuary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof',
    'cinematic-pbr-v62-asset-backed-service-vault': 'cinematic-pbr-v63-authored-orb-sanctuary',
    'v62-asset-backed-service-vault-candidate': 'v63-authored-orb-sanctuary-candidate',
    'v62-retained-pixel-candidate-not-certified': 'v63-retained-pixel-candidate-not-certified',
}.items():
    if old not in natural:
        raise SystemExit(f'natural proof marker missing: {old}')
    natural = natural.replace(old, new)
NATURAL.write_text(natural)

continuous = CONTINUOUS.read_text()
old_owner = "result.animationOwner === 'asset-backed-service-vault-v62-plus-governed-orb-identity'"
new_owner = "result.animationOwner === 'authored-orb-sanctuary-v63-plus-governed-orb-identity'"
if old_owner not in continuous:
    raise SystemExit('continuous proof V62 owner missing')
CONTINUOUS.write_text(continuous.replace(old_owner, new_owner, 1))

TEST.write_text("""import assert from 'node:assert/strict'\nimport { readFileSync } from 'node:fs'\nimport test from 'node:test'\nconst source=readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx',import.meta.url),'utf8')\nconst machine=source.slice(source.indexOf('function MachineCoreAssembly'),source.indexOf('function HumanPresence'))\nconst architecture=source.slice(source.indexOf('function ContinuousVaultSkin'),source.indexOf('function SanctuaryGlazing'))\nconst orb=source.slice(source.indexOf('function SacredOrb'),source.indexOf('function HumanPresence'))\ntest('V63 removes the V62 reactor and pipe-wall spectacle',()=>{assert.match(source,/v63-authored-orb-sanctuary-retained-pixel-rebuild/);assert.match(source,/visualOwner:'authored-orb-sanctuary-v63'/);assert.doesNotMatch(machine,/home-v62-machine-main-manifold|home-v62-machine-overhead-return|home-v62-orb-core-housing|home-v62-orb-state-window/);assert.doesNotMatch(orb,/cylinderGeometry|sphereGeometry|icosahedronGeometry|dodecahedronGeometry|torusGeometry/)})\ntest('V63 restores the governed authored Orb as the visible focal object',()=>{assert.match(orb,/home-v63-visible-authored-orb/);assert.match(orb,/<primitive object=\\{authoredOrb\\}/);assert.match(orb,/v63-authored-glb-core-visible-governed-animation-identity/);assert.match(source,/data-home-animation-owner=\"authored-orb-sanctuary-v63-plus-governed-orb-identity\"/)})\ntest('V63 keeps industrial service assets recessed at the sanctuary edges',()=>{assert.match(machine,/home-v63-left-orb-service/);assert.match(machine,/home-v63-right-orb-service/);assert.match(architecture,/home-v63-left-recessed-service/);assert.match(architecture,/home-v63-right-recessed-service/);assert.match(architecture,/v63-restrained-service-infrastructure-recessed-at-sanctuary-edges/)})\ntest('V63 creates lit architectural depth and integrated geology instead of a black maintenance bay',()=>{assert.match(architecture,/v63-deep-stone-sanctuary-with-integrated-geology-no-display-frame/);assert.match(architecture,/home-v63-left-geology-foundation/);assert.match(architecture,/home-v63-right-geology-foundation/);assert.match(architecture,/ArchitecturalStone/);assert.doesNotMatch(architecture,/home-v62-rear-service-manifold|home-v62-deep-service-layer/)})\ntest('V63 remains fail closed pending literal retained-pixel review',()=>{assert.match(source,/data-home-visual-grade=\"cinematic-pbr-v63-authored-orb-sanctuary\"/);assert.match(source,/data-home-final-art-revision=\"v63-authored-orb-sanctuary-candidate\"/);assert.match(source,/data-home-art-certification=\"v63-retained-pixel-candidate-not-certified\"/);assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)})\n""")

print('V63 authored Orb sanctuary materialized')
