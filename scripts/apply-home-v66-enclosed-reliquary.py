from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx'
N=ROOT/'scripts/capture-natural-home-orb-proof.mjs'
C=ROOT/'scripts/run-continuous-spatial-proof-v22-natural.mjs'
T=ROOT/'urai-tier1/tests/home-relic-machine-realism-contract.test.mjs'

def between(s,a,b,r):
    i=s.index(a); j=s.index(b,i); return s[:i]+r.rstrip()+'\n\n'+s[j:]

def one(s,a,b):
    if s.count(a)!=1: raise SystemExit(f'expected one {a!r}, got {s.count(a)}')
    return s.replace(a,b,1)

s=P.read_text()
if "visualOwner:'enclosed-reliquary-v66'" in s: raise SystemExit('V66 already materialized')
if "visualOwner:'authored-chamber-orb-sanctuary-v65'" not in s: raise SystemExit('V65 marker missing')

s=one(s,"  root.visible = true\n  root.userData.retainedForGovernedCompatibilityOnly = false\n  root.userData.visibleWorldOwner = 'home-v65-authored-entry-chamber'\n  root.userData.treatment = 'v65-authored-home-entry-chamber-visible-primary-enclosure'","  root.visible = false\n  root.userData.retainedForGovernedCompatibilityOnly = true\n  root.userData.visibleWorldOwner = 'home-v66-enclosed-reliquary'\n  root.userData.treatment = 'v66-authored-chamber-retained-provenance-never-visible'")

s=one(s,"const ORB = new THREE.Vector3(0, 2.18, -6.7)","const ORB = new THREE.Vector3(0, 2.35, -7.25)")

vault=r'''function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  return <group name="home-v47-reliquary-apse" userData={{treatment:'v66-contiguous-enclosed-stone-reliquary-no-open-sky-no-floating-geology'}}>
    <ArchitecturalStone pack={pack} position={[0,3.0,-10.75]} size={[13.4,6.5,.72]} color="#171d1b" roughness={.82}/>
    <ArchitecturalStone pack={pack} position={[-6.15,2.85,-4.45]} size={[.82,6.0,13.4]} color="#151b19" roughness={.84}/>
    <ArchitecturalStone pack={pack} position={[6.15,2.85,-4.45]} size={[.82,6.0,13.4]} color="#151b19" roughness={.84}/>
    <ArchitecturalStone pack={pack} position={[-3.9,5.45,-4.7]} size={[4.7,.52,12.8]} color="#1c221f" roughness={.8}/>
    <ArchitecturalStone pack={pack} position={[3.9,5.45,-4.7]} size={[4.7,.52,12.8]} color="#1c221f" roughness={.8}/>
    <ArchitecturalStone pack={pack} position={[0,3.0,-10.28]} size={[7.2,4.65,.42]} color="#232a26" roughness={.74}/>
    <ArchitecturalStone pack={pack} position={[-4.45,2.8,-9.9]} size={[1.15,5.0,1.05]} color="#202723" roughness={.78}/>
    <ArchitecturalStone pack={pack} position={[4.45,2.8,-9.9]} size={[1.15,5.0,1.05]} color="#202723" roughness={.78}/>
    <StructuralRib points={[[ -4.2,.35,-9.45],[-4.0,4.35,-9.45],[0,5.35,-9.45],[4.0,4.35,-9.45],[4.2,.35,-9.45]]} radius={.075} color="#606a64" metalness={.72} roughness={.38}/>
    <pointLight position={[0,4.35,-8.65]} color="#9bc8ba" intensity={.72} distance={8.2} decay={2}/>
    <pointLight position={[-4.25,2.2,-7.2]} color="#d0a36b" intensity={.38} distance={5.0} decay={2}/>
    <pointLight position={[4.25,2.2,-7.2]} color="#76a9a0" intensity={.34} distance={5.0} decay={2}/>
  </group>
}'''
s=between(s,'function ContinuousVaultSkin','function CantedWallMass',vault)

gallery=r'''function SanctuarySideGallery(){
  return <group name="home-v47-side-gallery" userData={{treatment:'v66-recessed-practicals-integrated-into-enclosure'}}>
    <RecessedPractical position={[-4.75,.16,-5.1]} warm={true}/><RecessedPractical position={[4.75,.16,-5.1]} warm={false}/>
    <RecessedPractical position={[-4.75,.16,-8.1]} warm={true}/><RecessedPractical position={[4.75,.16,-8.1]} warm={false}/>
  </group>
}'''
s=between(s,'function SanctuarySideGallery','function SanctuaryArchitecture',gallery)

arch=r'''function SanctuaryArchitecture(){const pack=useStonePack(.56,.8);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'enclosed-reliquary-v66',construction:'contiguous-pbr-stone-enclosure-with-recessed-reliquary-focus',visualTreatment:'v66-enclosed-reliquary-retained-pixel-rebuild'}}><ContinuousVaultSkin pack={pack}/><SanctuarySideGallery/><MachineCavityLiner/></group>}'''
s=between(s,'function SanctuaryArchitecture','function SanctuaryGlazing',arch)

machine=r'''function MachineCoreAssembly(){
  return <group name="home-v47-machine-core-assembly" userData={{treatment:'v66-six-fragment-engineered-orb-no-glass-sphere-no-pedestal'}} position={ORB}>
    {ORB_FRAGMENT_LAYOUT.map(([p,r,scale],i)=><RoundedBox key={i} args={[.42,.2,.78]} radius={.07} smoothness={5} position={p as [number,number,number]} rotation={r as [number,number,number]} scale={scale*8.2} castShadow receiveShadow><meshStandardMaterial color={i%2?'#59635e':'#73796f'} metalness={.78} roughness={.31} envMapIntensity={1.0}/></RoundedBox>)}
    <mesh scale={.34} castShadow><icosahedronGeometry args={[1,2]}/><meshStandardMaterial color="#7fc6b7" emissive="#2c776c" emissiveIntensity={.34} metalness={.42} roughness={.3}/></mesh>
    <pointLight color="#8fcdbf" intensity={.7} distance={4.8} decay={2}/>
  </group>
}'''
s=between(s,'function MachineCoreAssembly','function SacredOrb',machine)

orb=r'''function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null)
  const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion])
  useFrame(()=>{if(!root.current)return;root.current.rotation.y=reducedMotion?0:Math.sin(performance.now()*.00018)*.055})
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,runtimeAsset:ORB_MODEL,treatment:'v66-interaction-anchor-for-six-fragment-engineered-orb'}}>
    <mesh visible={false}><icosahedronGeometry args={[.45,1]}/><meshBasicMaterial/></mesh>
  </group>
}'''
s=between(s,'function SacredOrb','function HumanPresence',orb)

for a,b in {
'cinematic-pbr-v65-authored-chamber-orb-sanctuary':'cinematic-pbr-v66-enclosed-reliquary',
'v65-authored-chamber-orb-sanctuary-candidate':'v66-enclosed-reliquary-candidate',
'v65-retained-pixel-candidate-not-certified':'v66-retained-pixel-candidate-not-certified',
'authored-chamber-orb-sanctuary-v65-plus-governed-orb-identity':'enclosed-reliquary-v66-six-fragment-orb',
}.items(): s=s.replace(a,b)
s=s.replace('gl.toneMappingExposure=1.46','gl.toneMappingExposure=1.58')
P.write_text(s)

n=N.read_text()
for a,b in {
'v65-authored-chamber-orb-sanctuary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof':'v66-enclosed-reliquary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof',
'cinematic-pbr-v65-authored-chamber-orb-sanctuary':'cinematic-pbr-v66-enclosed-reliquary',
'v65-authored-chamber-orb-sanctuary-candidate':'v66-enclosed-reliquary-candidate',
'v65-retained-pixel-candidate-not-certified':'v66-retained-pixel-candidate-not-certified',
}.items(): n=n.replace(a,b)
N.write_text(n)

c=C.read_text().replace("result.animationOwner === 'authored-chamber-orb-sanctuary-v65-plus-governed-orb-identity'","result.animationOwner === 'enclosed-reliquary-v66-six-fragment-orb'").replace("orb: { x: 0, z: -6.7, radius: 2.5","orb: { x: 0, z: -7.25, radius: 2.5")
C.write_text(c)

T.write_text("""import assert from 'node:assert/strict'\nimport {readFileSync} from 'node:fs'\nimport test from 'node:test'\nconst s=readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx',import.meta.url),'utf8')\nconst a=s.slice(s.indexOf('function ContinuousVaultSkin'),s.indexOf('function SanctuaryGlazing'))\nconst m=s.slice(s.indexOf('function MachineCoreAssembly'),s.indexOf('function HumanPresence'))\ntest('V66 is a contiguous enclosed PBR reliquary',()=>{assert.match(s,/visualOwner:'enclosed-reliquary-v66'/);assert.match(a,/v66-contiguous-enclosed-stone-reliquary-no-open-sky-no-floating-geology/);assert.doesNotMatch(a,/ProductionAsset url=\\{V48_ROCK_FACE/);assert.match(s,/root.visible = false/);assert.match(s,/v66-authored-chamber-retained-provenance-never-visible/)})\ntest('V66 replaces glass sphere with engineered fragments',()=>{assert.match(m,/v66-six-fragment-engineered-orb-no-glass-sphere-no-pedestal/);assert.match(m,/ORB_FRAGMENT_LAYOUT\.map/);assert.doesNotMatch(m,/sphereGeometry|torusGeometry|ProductionAsset url=\\{V48_PIPE_SYSTEM\\}/)})\ntest('V66 remains fail closed',()=>{assert.match(s,/data-home-visual-grade=\"cinematic-pbr-v66-enclosed-reliquary\"/);assert.match(s,/data-home-final-art-revision=\"v66-enclosed-reliquary-candidate\"/);assert.match(s,/data-home-art-certification=\"v66-retained-pixel-candidate-not-certified\"/);assert.doesNotMatch(s,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)})\n""")
print('V66 enclosed reliquary materialized')
