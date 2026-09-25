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
if "visualOwner:'photogrammetry-orb-sanctuary-v64'" in source:
    raise SystemExit('V64 already materialized')
if "visualOwner:'authored-orb-sanctuary-v63'" not in source:
    raise SystemExit('V63 runtime marker missing')

source = replace_once(source, "const ORB = new THREE.Vector3(0, 2.18, -6.42)", "const ORB = new THREE.Vector3(0, 2.38, -7.35)", 'orb placement')
source = source.replace('v63-governed-orb-animation-identity-with-authored-core-visible', 'v64-governed-orb-animation-identity-photogrammetry-sanctuary')
source = source.replace('v63-authored-orb-visible-with-governed-animation-identity', 'v64-authored-orb-visible-photogrammetry-sanctuary')

vault = r'''function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  void pack
  return <group name="home-v47-reliquary-apse" userData={{treatment:'v64-photogrammetry-cavern-sanctuary-no-arch-no-flat-backboard'}}>
    <ProductionAsset url={V48_ROCK_FACE_01} name="home-v64-left-deep-wall" position={[-4.85,2.15,-10.35]} rotation={[.08,.96,-.2]} span={6.2} scale={[1.16,.96,1.22]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name="home-v64-right-deep-wall" position={[4.72,2.05,-10.48]} rotation={[-.1,-.92,.18]} span={6.0} scale={[1.14,.94,1.2]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name="home-v64-left-rear-depth" position={[-2.75,2.78,-11.55]} rotation={[.18,1.64,.42]} span={4.8} scale={[1.12,.84,1.05]}/>
    <ProductionAsset url={V48_ROCK_FACE_01} name="home-v64-right-rear-depth" position={[2.9,2.62,-11.5]} rotation={[-.16,-1.58,-.34]} span={4.7} scale={[1.1,.82,1.02]}/>
    <ProductionAsset url={V48_ROCK_FACE_01} name="home-v64-upper-left-vault" position={[-2.5,4.95,-9.78]} rotation={[1.18,.34,.58]} span={4.4} scale={[1.18,.52,.94]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name="home-v64-upper-right-vault" position={[2.35,5.02,-9.92]} rotation={[1.28,-.28,-.52]} span={4.35} scale={[1.16,.5,.92]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name="home-v64-left-floor-geology" position={[-3.25,.04,-7.45]} rotation={[1.48,.52,.08]} span={3.7} scale={[1.12,.34,.9]}/>
    <ProductionAsset url={V48_ROCK_FACE_01} name="home-v64-right-floor-geology" position={[3.18,.02,-7.62]} rotation={[1.5,-.46,-.05]} span={3.6} scale={[1.08,.32,.88]}/>
    <pointLight position={[0,3.35,-9.1]} color="#8ebbb0" intensity={.54} distance={7.2} decay={2}/>
    <pointLight position={[-3.1,2.1,-8.35]} color="#c6a06c" intensity={.34} distance={5.2} decay={2}/>
    <pointLight position={[3.15,2.0,-8.45]} color="#6f9f9b" intensity={.3} distance={5.0} decay={2}/>
  </group>
}'''
source = replace_between(source, 'function ContinuousVaultSkin', 'function CantedWallMass', vault)

cavity = r'''function MachineCavityLiner(){
  return <group name="home-v47-reliquary-cavity" userData={{treatment:'v64-open-photogrammetry-depth-no-display-cavity-no-floor-boxes'}}>
    <pointLight position={[-1.9,1.05,-8.8]} color="#c39b69" intensity={.16} distance={3.6} decay={2}/>
    <pointLight position={[1.85,1.12,-8.9]} color="#77a7a0" intensity={.17} distance={3.7} decay={2}/>
  </group>
}'''
source = replace_between(source, 'function MachineCavityLiner', 'function SanctuarySideGallery', cavity)

gallery = r'''function SanctuarySideGallery(){
  return <group name="home-v47-side-gallery" userData={{treatment:'v64-service-infrastructure-buried-behind-photogrammetry-geology'}}>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v64-left-buried-service" position={[-4.45,2.15,-10.72]} rotation={[.12,.94,.22]} span={1.32} scale={[.2,.24,.32]}/>
    <ProductionAsset url={V48_PIPE_SYSTEM} name="home-v64-right-buried-service" position={[4.4,2.1,-10.78]} rotation={[-.1,-.92,-.2]} span={1.28} scale={[-.2,.24,.32]}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v64-left-integrated-practical" position={[-3.72,2.62,-8.92]} rotation={[0,.54,0]} span={.42}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name="home-v64-right-integrated-practical" position={[3.68,2.58,-9.02]} rotation={[0,-.52,0]} span={.42}/>
    <pointLight position={[-3.62,2.58,-8.72]} color="#d0a36e" intensity={.32} distance={4.4} decay={2}/>
    <pointLight position={[3.58,2.55,-8.82]} color="#79a9a2" intensity={.3} distance={4.3} decay={2}/>
  </group>
}'''
source = replace_between(source, 'function SanctuarySideGallery', 'function SanctuaryArchitecture', gallery)

architecture = r'''function SanctuaryArchitecture(){const pack=useStonePack(.5,.72);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'photogrammetry-orb-sanctuary-v64',construction:'deep-photogrammetry-geology-sanctuary-with-buried-services-and-monumental-authored-orb',visualTreatment:'v64-photogrammetry-orb-sanctuary-retained-pixel-rebuild'}}>
  <ContinuousVaultSkin pack={pack}/><SanctuarySideGallery/><MachineCavityLiner/>
</group>}'''
source = replace_between(source, 'function SanctuaryArchitecture', 'function SanctuaryGlazing', architecture)

machine = r'''function MachineCoreAssembly(){
  return <group name="home-v47-machine-core-assembly" userData={{treatment:'v64-authored-orb-is-machine-focus-no-visible-reactor-no-pipe-wall-no-clamp-frame'}}>
    <pointLight position={[0,2.48,-7.62]} color="#8fc8bc" intensity={.55} distance={5.4} decay={2}/>
    <pointLight position={[0,1.55,-8.35]} color="#b89567" intensity={.17} distance={3.8} decay={2}/>
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
  useFrame(()=>{if(!root.current)return;root.current.rotation.y=reducedMotion?0:Math.sin(performance.now()*.00016)*.035;root.current.position.y=ORB.y})
  const stateColor=state==='warning'?'#c18a5d':state==='thinking'||state==='reflecting'?'#9eadd0':'#91d4c4'
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v64-monumental-authored-orb-suspended-inside-photogrammetry-sanctuary'}}>
    <group scale={1.02} name="home-v64-monumental-authored-orb" userData={{treatment:'v64-authored-glb-body-core-visible-governed-animation-identity'}}><primitive object={authoredOrb}/></group>
    <pointLight color={stateColor} intensity={state==='speaking'?.82:.52} distance={5.5} decay={2}/>
  </group>
}'''
source = replace_between(source, 'function SacredOrb', 'function HumanPresence', orb)

for old, new in {
    'cinematic-pbr-v63-authored-orb-sanctuary': 'cinematic-pbr-v64-photogrammetry-orb-sanctuary',
    'v63-authored-orb-sanctuary-candidate': 'v64-photogrammetry-orb-sanctuary-candidate',
    'v63-retained-pixel-candidate-not-certified': 'v64-retained-pixel-candidate-not-certified',
    'authored-orb-sanctuary-v63-plus-governed-orb-identity': 'photogrammetry-orb-sanctuary-v64-plus-governed-orb-identity',
}.items():
    source = source.replace(old, new)
source = source.replace('gl.toneMappingExposure=1.36', 'gl.toneMappingExposure=1.52')
SOURCE.write_text(source)

natural = NATURAL.read_text()
for old, new in {
    'v63-authored-orb-sanctuary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof': 'v64-photogrammetry-orb-sanctuary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof',
    'cinematic-pbr-v63-authored-orb-sanctuary': 'cinematic-pbr-v64-photogrammetry-orb-sanctuary',
    'v63-authored-orb-sanctuary-candidate': 'v64-photogrammetry-orb-sanctuary-candidate',
    'v63-retained-pixel-candidate-not-certified': 'v64-retained-pixel-candidate-not-certified',
}.items():
    if old not in natural:
        raise SystemExit(f'natural proof marker missing: {old}')
    natural = natural.replace(old, new)
NATURAL.write_text(natural)

continuous = CONTINUOUS.read_text()
old_owner = "result.animationOwner === 'authored-orb-sanctuary-v63-plus-governed-orb-identity'"
new_owner = "result.animationOwner === 'photogrammetry-orb-sanctuary-v64-plus-governed-orb-identity'"
if old_owner not in continuous:
    raise SystemExit('continuous proof V63 owner missing')
CONTINUOUS.write_text(continuous.replace(old_owner, new_owner, 1))

TEST.write_text("""import assert from 'node:assert/strict'\nimport { readFileSync } from 'node:fs'\nimport test from 'node:test'\nconst source=readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx',import.meta.url),'utf8')\nconst architecture=source.slice(source.indexOf('function ContinuousVaultSkin'),source.indexOf('function SanctuaryGlazing'))\nconst machine=source.slice(source.indexOf('function MachineCoreAssembly'),source.indexOf('function HumanPresence'))\nconst orb=source.slice(source.indexOf('function SacredOrb'),source.indexOf('function HumanPresence'))\ntest('V64 removes the rejected primitive arch and flat backboard composition',()=>{assert.match(source,/v64-photogrammetry-orb-sanctuary-retained-pixel-rebuild/);assert.match(source,/visualOwner:'photogrammetry-orb-sanctuary-v64'/);assert.doesNotMatch(architecture,/SanctuaryShellMass|ArchitecturalStone/);assert.doesNotMatch(architecture,/v63-deep-stone-sanctuary-with-integrated-geology-no-display-frame/)})\ntest('V64 makes committed photogrammetry geometry own the sanctuary depth',()=>{for(const name of ['home-v64-left-deep-wall','home-v64-right-deep-wall','home-v64-left-rear-depth','home-v64-right-rear-depth','home-v64-upper-left-vault','home-v64-upper-right-vault']) assert.match(architecture,new RegExp(name));assert.match(architecture,/v64-photogrammetry-cavern-sanctuary-no-arch-no-flat-backboard/)})\ntest('V64 buries service infrastructure instead of hanging pipe racks on the focal wall',()=>{assert.match(architecture,/v64-service-infrastructure-buried-behind-photogrammetry-geology/);assert.match(architecture,/home-v64-left-buried-service/);assert.match(architecture,/home-v64-right-buried-service/);assert.doesNotMatch(machine,/ProductionAsset url=\\{V48_PIPE_SYSTEM\\}/)})\ntest('V64 restores monumental authored Orb scale without primitive replacement geometry',()=>{assert.match(orb,/home-v64-monumental-authored-orb/);assert.match(orb,/scale=\\{1\.02\\}/);assert.match(orb,/<primitive object=\\{authoredOrb\\}/);assert.doesNotMatch(orb,/cylinderGeometry|sphereGeometry|icosahedronGeometry|dodecahedronGeometry|torusGeometry/);assert.match(source,/const ORB = new THREE\.Vector3\(0, 2\.38, -7\.35\)/)})\ntest('V64 remains fail closed pending literal retained-pixel review',()=>{assert.match(source,/data-home-visual-grade=\"cinematic-pbr-v64-photogrammetry-orb-sanctuary\"/);assert.match(source,/data-home-final-art-revision=\"v64-photogrammetry-orb-sanctuary-candidate\"/);assert.match(source,/data-home-art-certification=\"v64-retained-pixel-candidate-not-certified\"/);assert.match(source,/data-home-animation-owner=\"photogrammetry-orb-sanctuary-v64-plus-governed-orb-identity\"/);assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)})\n""")

print('V64 photogrammetry sanctuary materialized')
