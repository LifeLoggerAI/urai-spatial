from pathlib import Path

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
if "visualOwner:'authored-chamber-orb-sanctuary-v65'" in source:
    raise SystemExit('V65 already materialized')
if "visualOwner:'photogrammetry-orb-sanctuary-v64'" not in source:
    raise SystemExit('V64 runtime marker missing')

# Restore the committed authored Home chamber as the coherent visible enclosure.
source = replace_once(source, '  root.visible = false\n  root.userData.retainedForGovernedCompatibilityOnly = true\n  root.userData.visibleWorldOwner = \'home-v48-committed-production-asset-sanctuary\'\n  root.userData.treatment = \'v48-deterministic-intake-glb-provenance-only-never-visible\'', "  root.visible = true\n  root.userData.retainedForGovernedCompatibilityOnly = false\n  root.userData.visibleWorldOwner = 'home-v65-authored-entry-chamber'\n  root.userData.treatment = 'v65-authored-home-entry-chamber-visible-primary-enclosure'", 'authored chamber visibility')

# Keep only the aura hidden; restore authored Orb orbit/filament/petal geometry.
old_identity = """    const governedIdentityOnly = object.name === 'orb-aura'\n      || object.name.startsWith('orb-orbit-')\n      || object.name.startsWith('orb-filament-')\n      || object.name.startsWith('orb-petal-')\n"""
new_identity = """    const governedIdentityOnly = object.name === 'orb-aura'\n"""
source = replace_once(source, old_identity, new_identity, 'authored Orb decorative geometry')
source = source.replace('v64-governed-orb-animation-identity-photogrammetry-sanctuary', 'v65-authored-orb-full-geometry-aura-only-retired')
source = source.replace('v64-authored-orb-visible-photogrammetry-sanctuary', 'v65-authored-orb-full-geometry-visible-in-authored-chamber')
source = replace_once(source, 'const ORB = new THREE.Vector3(0, 2.38, -7.35)', 'const ORB = new THREE.Vector3(0, 2.18, -6.7)', 'V65 Orb position')

vault = r'''function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  void pack
  return <group name="home-v47-reliquary-apse" userData={{treatment:'v65-authored-chamber-primary-enclosure-with-low-embedded-geology'}}>
    <ProductionAsset url={V48_ROCK_FACE_01} name="home-v65-left-ground-geology" position={[-4.95,-.2,-7.95]} rotation={[1.52,.72,.02]} span={2.85} scale={[1.08,.22,.78]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name="home-v65-right-ground-geology" position={[4.78,-.22,-8.05]} rotation={[1.5,-.68,-.03]} span={2.8} scale={[1.06,.21,.76]}/>
    <pointLight position={[0,3.0,-7.55]} color="#8fc5b8" intensity={.46} distance={6.4} decay={2}/>
    <pointLight position={[-3.45,2.0,-6.55]} color="#d0a56e" intensity={.27} distance={4.6} decay={2}/>
    <pointLight position={[3.4,1.95,-6.65]} color="#75a7a0" intensity={.25} distance={4.5} decay={2}/>
  </group>
}'''
source = replace_between(source, 'function ContinuousVaultSkin', 'function CantedWallMass', vault)

cavity = r'''function MachineCavityLiner(){
  return <group name="home-v47-reliquary-cavity" userData={{treatment:'v65-authored-chamber-open-center-no-display-wall-no-floating-slab-cavity'}}>
    <RecessedPractical position={[-1.55,.1,-6.15]} warm={true}/>
    <RecessedPractical position={[1.5,.1,-6.2]} warm={false}/>
  </group>
}'''
source = replace_between(source, 'function MachineCavityLiner', 'function SanctuarySideGallery', cavity)

gallery = r'''function SanctuarySideGallery(){
  return <group name="home-v47-side-gallery" userData={{treatment:'v65-authored-chamber-integrated-practicals-no-visible-pipe-racks'}}>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v65-left-chamber-practical" position={[-4.18,2.3,-6.45]} rotation={[0,.62,0]} span={.46}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v65-right-chamber-practical" position={[4.1,2.28,-6.55]} rotation={[0,-.62,0]} span={.46}/>
    <pointLight position={[-4.02,2.25,-6.25]} color="#d2a66f" intensity={.32} distance={4.6} decay={2}/>
    <pointLight position={[3.95,2.23,-6.35]} color="#76aaa2" intensity={.3} distance={4.5} decay={2}/>
  </group>
}'''
source = replace_between(source, 'function SanctuarySideGallery', 'function SanctuaryArchitecture', gallery)

architecture = r'''function SanctuaryArchitecture(){const pack=useStonePack(.5,.72);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'authored-chamber-orb-sanctuary-v65',construction:'visible-authored-home-entry-chamber-with-integrated-ground-geology-and-full-authored-orb',visualTreatment:'v65-authored-chamber-revival-retained-pixel-rebuild'}}>
  <ContinuousVaultSkin pack={pack}/><SanctuarySideGallery/><MachineCavityLiner/>
</group>}'''
source = replace_between(source, 'function SanctuaryArchitecture', 'function SanctuaryGlazing', architecture)

machine = r'''function MachineCoreAssembly(){
  return <group name="home-v47-machine-core-assembly" userData={{treatment:'v65-authored-orb-is-visible-relic-focus-without-pipe-cage-or-reactor'}}>
    <pointLight position={[0,2.28,-6.55]} color="#93cfc1" intensity={.56} distance={5.2} decay={2}/>
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
  useFrame(()=>{if(!root.current)return;root.current.rotation.y=reducedMotion?0:Math.sin(performance.now()*.00016)*.032;root.current.position.y=ORB.y})
  const stateColor=state==='warning'?'#c38b5d':state==='thinking'||state==='reflecting'?'#9dadd0':'#94d6c6'
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v65-full-authored-orb-suspended-inside-authored-home-entry-chamber'}}>
    <group scale={.78} name="home-v65-full-authored-orb" userData={{treatment:'v65-authored-glb-core-orbits-filaments-petals-visible-aura-only-retired'}}><primitive object={authoredOrb}/></group>
    <pointLight color={stateColor} intensity={state==='speaking'?.8:.5} distance={5.0} decay={2}/>
  </group>
}'''
source = replace_between(source, 'function SacredOrb', 'function HumanPresence', orb)

for old, new in {
    'cinematic-pbr-v64-photogrammetry-orb-sanctuary': 'cinematic-pbr-v65-authored-chamber-orb-sanctuary',
    'v64-photogrammetry-orb-sanctuary-candidate': 'v65-authored-chamber-orb-sanctuary-candidate',
    'v64-retained-pixel-candidate-not-certified': 'v65-retained-pixel-candidate-not-certified',
    'photogrammetry-orb-sanctuary-v64-plus-governed-orb-identity': 'authored-chamber-orb-sanctuary-v65-plus-governed-orb-identity',
}.items():
    source = source.replace(old, new)
source = source.replace('gl.toneMappingExposure=1.52', 'gl.toneMappingExposure=1.46')
SOURCE.write_text(source)

natural = NATURAL.read_text()
for old, new in {
    'v64-photogrammetry-orb-sanctuary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof': 'v65-authored-chamber-orb-sanctuary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof',
    'cinematic-pbr-v64-photogrammetry-orb-sanctuary': 'cinematic-pbr-v65-authored-chamber-orb-sanctuary',
    'v64-photogrammetry-orb-sanctuary-candidate': 'v65-authored-chamber-orb-sanctuary-candidate',
    'v64-retained-pixel-candidate-not-certified': 'v65-retained-pixel-candidate-not-certified',
}.items():
    if old not in natural:
        raise SystemExit(f'natural proof marker missing: {old}')
    natural = natural.replace(old, new)
NATURAL.write_text(natural)

continuous = CONTINUOUS.read_text()
continuous = continuous.replace("result.animationOwner === 'photogrammetry-orb-sanctuary-v64-plus-governed-orb-identity'", "result.animationOwner === 'authored-chamber-orb-sanctuary-v65-plus-governed-orb-identity'")
continuous = continuous.replace("orb: { x: 0, z: -7.35, radius: 2.5", "orb: { x: 0, z: -6.7, radius: 2.5")
CONTINUOUS.write_text(continuous)

TEST.write_text("""import assert from 'node:assert/strict'\nimport { readFileSync } from 'node:fs'\nimport test from 'node:test'\nconst source=readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx',import.meta.url),'utf8')\nconst architecture=source.slice(source.indexOf('function ContinuousVaultSkin'),source.indexOf('function SanctuaryGlazing'))\nconst machine=source.slice(source.indexOf('function MachineCoreAssembly'),source.indexOf('function HumanPresence'))\nconst orb=source.slice(source.indexOf('function cloneOrbModel'),source.indexOf('function PouredStone'))+source.slice(source.indexOf('function SacredOrb'),source.indexOf('function HumanPresence'))\ntest('V65 restores the committed authored Home chamber as visible enclosure',()=>{assert.match(source,/root\.visible = true/);assert.match(source,/retainedForGovernedCompatibilityOnly = false/);assert.match(source,/v65-authored-home-entry-chamber-visible-primary-enclosure/);assert.match(source,/visualOwner:'authored-chamber-orb-sanctuary-v65'/)})\ntest('V65 removes V64 floating rock collage and keeps geology grounded',()=>{assert.match(architecture,/home-v65-left-ground-geology/);assert.match(architecture,/home-v65-right-ground-geology/);for(const retired of ['home-v64-left-deep-wall','home-v64-right-deep-wall','home-v64-left-rear-depth','home-v64-right-rear-depth','home-v64-upper-left-vault','home-v64-upper-right-vault']) assert.doesNotMatch(architecture,new RegExp(retired))})\ntest('V65 restores authored Orb orbit filament and petal geometry',()=>{assert.match(orb,/const governedIdentityOnly = object\.name === 'orb-aura'/);assert.doesNotMatch(orb,/object\.name\.startsWith\('orb-orbit-'\)/);assert.doesNotMatch(orb,/object\.name\.startsWith\('orb-filament-'\)/);assert.doesNotMatch(orb,/object\.name\.startsWith\('orb-petal-'\)/);assert.match(orb,/home-v65-full-authored-orb/);assert.match(orb,/scale=\\{\.78\\}/)})\ntest('V65 has no visible pipe cage or primitive reactor around the Orb',()=>{assert.doesNotMatch(machine,/ProductionAsset url=\\{V48_PIPE_SYSTEM\\}/);assert.doesNotMatch(machine,/cylinderGeometry|sphereGeometry|icosahedronGeometry|torusGeometry/);assert.match(machine,/v65-authored-orb-is-visible-relic-focus-without-pipe-cage-or-reactor/)})\ntest('V65 remains fail closed pending fresh literal retained-pixel review',()=>{assert.match(source,/data-home-visual-grade=\"cinematic-pbr-v65-authored-chamber-orb-sanctuary\"/);assert.match(source,/data-home-final-art-revision=\"v65-authored-chamber-orb-sanctuary-candidate\"/);assert.match(source,/data-home-art-certification=\"v65-retained-pixel-candidate-not-certified\"/);assert.match(source,/data-home-animation-owner=\"authored-chamber-orb-sanctuary-v65-plus-governed-orb-identity\"/);assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)})\n""")

print('V65 coherent authored chamber revival materialized')
