#!/usr/bin/env python3
from pathlib import Path

HOME = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
source = HOME.read_text()

if 'v42-sanctuary-integrated-relic-machine-production-candidate' in source:
    raise SystemExit('V42 already materialized')
if 'v41-integrated-authored-orb-sanctuary-production-candidate' not in source:
    raise SystemExit('Expected exact V41 source before V42 rebuild')


def replace_function(text: str, name: str, next_name: str, replacement: str) -> str:
    start = text.index(f'function {name}')
    end = text.index(f'function {next_name}', start)
    return text[:start] + replacement.rstrip() + '\n\n' + text[end:]

source = source.replace(
    'const ORB = new THREE.Vector3(0, 1.82, -3.72)',
    'const ORB = new THREE.Vector3(0, 2.18, -3.15)',
)

source = replace_function(source, 'ContinuousVaultSkin', 'CantedWallMass', r'''
function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  const geometry=useMemo(()=>{const sx=36,sz=28,w=13.6,d=12.8,verts:number[]=[],uvs:number[]=[],idx:number[]=[];for(let iz=0;iz<=sz;iz++){const vz=iz/sz,z=3.55-vz*d;for(let ix=0;ix<=sx;ix++){const vx=ix/sx,x=(vx-.5)*w;const arch=Math.pow(Math.abs(x)/(w*.5),1.78);const longitudinal=.18*Math.cos((vz-.34)*Math.PI*1.08);const y=6.38-1.48*arch+longitudinal;verts.push(x,y,z);uvs.push(vx,vz)}}for(let iz=0;iz<sz;iz++)for(let ix=0;ix<sx;ix++){const a=iz*(sx+1)+ix,b=a+1,c=a+(sx+1),e=c+1;idx.push(a,c,b,b,c,e)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(idx);g.computeVertexNormals();return g},[]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <mesh geometry={geometry} castShadow receiveShadow userData={{treatment:'v42-high-clearance-continuous-bearing-vault'}}><meshPhysicalMaterial color="#303630" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(.4,.4)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={.006} displacementBias={-.003} roughness={.68} metalness={.045} clearcoat={.035} clearcoatRoughness={.7} envMapIntensity={.86} side={THREE.DoubleSide}/></mesh>
}
''')

source = replace_function(source, 'CantedWallMass', 'MachineCavityLiner', r'''
function CantedWallMass({pack,side}:{pack:SurfacePack;side:-1|1}){
  const geometry=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-.58,-1.78);shape.lineTo(.56,-1.9);shape.lineTo(.62,.32);shape.bezierCurveTo(.52,1.08,.22,1.68,-.22,1.9);shape.lineTo(-.56,1.42);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:side<0?.82:.72,steps:1,bevelEnabled:true,bevelSegments:5,bevelSize:.085,bevelThickness:.085,curveSegments:18});g.center();g.computeVertexNormals();return g},[side]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <mesh geometry={geometry} position={[side*5.92,2.12,side<0?-6.48:-6.72]} rotation={[0,side*-.12,side<0?.02:-.026]} castShadow receiveShadow userData={{treatment:'v42-rear-recessed-buttress-outside-orb-hero-frame'}}><meshPhysicalMaterial color={side<0?'#3d4b45':'#50493d'} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(.34,.34)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={.006} displacementBias={-.003} roughness={.66} metalness={.06} clearcoat={.045} clearcoatRoughness={.66} envMapIntensity={1.0}/></mesh>
}
''')

source = replace_function(source, 'MachineCavityLiner', 'SanctuaryArchitecture', r'''
function MachineCavityLiner(){return <group name="home-v42-rear-load-field" userData={{treatment:'v42-grounded-rear-load-paths-no-display-backplate'}}>
  <PouredStone position={[-4.62,.12,-7.18]} size={[1.48,.22,1.42]} color="#202a27" metalness={.34} roughness={.58}/>
  <PouredStone position={[4.76,.12,-7.34]} size={[1.52,.22,1.38]} color="#2c2a24" metalness={.34} roughness={.58}/>
  <TaperedLoadBeam from={[-4.62,.22,-7.18]} to={[-3.72,3.72,-6.92]} width={.36} color="#405a53"/>
  <TaperedLoadBeam from={[-3.72,3.72,-6.92]} to={[-1.72,5.28,-6.36]} width={.29} color="#58756c"/>
  <TaperedLoadBeam from={[4.76,.22,-7.34]} to={[3.88,3.82,-7.04]} width={.38} color="#625c4b"/>
  <TaperedLoadBeam from={[3.88,3.82,-7.04]} to={[1.82,5.34,-6.42]} width={.3} color="#756b55"/>
  <pointLight position={[-3.45,3.1,-6.4]} color="#78b9b1" intensity={.72} distance={6.8} decay={2}/>
  <pointLight position={[3.7,3.2,-6.55]} color="#d0ac78" intensity={.68} distance={6.8} decay={2}/>
</group>}
''')

source = replace_function(source, 'SanctuaryArchitecture', 'SanctuaryGlazing', r'''
function SanctuaryArchitecture(){const pack=useStonePack(.38,.52);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'cinematic-integrated-relic-machine-sanctuary-v42',construction:'foundation-machinery-lateral-capture-vault',visualTreatment:'v42-sanctuary-integrated-relic-machine-production-candidate'}}>
  <group name="home-v30-rear-apse" userData={{treatment:'v42-open-depth-with-grounded-rear-load-field'}}><MachineCavityLiner/></group>
  <group name="home-v30-side-enclosure" userData={{treatment:'v42-recessed-buttresses-outside-primary-composition'}}><CantedWallMass pack={pack} side={-1}/><CantedWallMass pack={pack} side={1}/></group>
  <group name="home-v30-load-bearing-vault" userData={{treatment:'v42-high-clearance-continuous-vault-over-machine'}}><ContinuousVaultSkin pack={pack}/></group>
  <group name="home-v30-orb-apse-architecture" userData={{treatment:'v42-orb-machine-load-field-owned-by-foundation-and-vault'}} />
  <group name="home-v32-depth-envelope" userData={{treatment:'v42-readable-cavity-fill-and-asymmetric-practicals'}}><RecessedPractical position={[-5.4,.52,2.0]}/><RecessedPractical position={[5.25,.52,1.0]} warm={false}/><RecessedPractical position={[-4.9,.52,-6.2]} warm={false}/><RecessedPractical position={[4.88,.52,-6.32]}/></group>
</group>}
''')

source = replace_function(source, 'ReliquaryWing', 'CrownBridge', r'''
function ReliquaryWing({side}:{side:-1|1}){
  const baseX=side*2.68,innerX=side*1.16,midX=side*2.18,upperX=side*1.76
  const cool=side<0?'#4e6e66':'#756b54',accent=side<0?'#6faaa0':'#b29a6d'
  return <group name={side<0?'home-v42-left-machine-pier':'home-v42-right-machine-pier'} userData={{treatment:'v42-articulated-floor-rooted-capture-pier'}}>
    <PouredStone position={[baseX,.12,-3.58]} size={[1.42,.24,2.08]} color={side<0?'#23312d':'#332f27'} metalness={.38} roughness={.54}/>
    <TaperedLoadBeam from={[baseX,.24,-3.58]} to={[midX,2.18,-3.44]} width={.43} color={cool}/>
    <TaperedLoadBeam from={[midX,2.18,-3.44]} to={[innerX,1.72,-3.18]} width={.28} color={accent}/>
    <TaperedLoadBeam from={[midX,2.18,-3.44]} to={[innerX,2.7,-3.18]} width={.3} color={accent}/>
    <TaperedLoadBeam from={[midX,2.18,-3.44]} to={[upperX,3.72,-3.62]} width={.34} color={cool}/>
    <TaperedLoadBeam from={[upperX,3.72,-3.62]} to={[side*3.42,5.28,-5.68]} width={.29} color={cool}/>
    <pointLight position={[side*1.68,2.2,-3.02]} color={side<0?'#7fcfc3':'#d6b57b'} intensity={.56} distance={4.8} decay={2}/>
  </group>
}
''')

source = replace_function(source, 'CrownBridge', 'FloorReliquaryBed', r'''
function CrownBridge(){return <group name="home-orb-load-crown" userData={{treatment:'v42-split-vault-shoulders-continuous-with-articulated-piers'}}>
  <TaperedLoadBeam from={[-1.76,3.72,-3.62]} to={[-3.42,5.28,-5.68]} width={.31} color="#5c7b72"/>
  <TaperedLoadBeam from={[1.76,3.72,-3.62]} to={[3.42,5.28,-5.68]} width={.32} color="#81745c"/>
</group>}
''')

source = replace_function(source, 'FloorReliquaryBed', 'OrbPlatform', r'''
function FloorReliquaryBed(){return <group name="home-orb-machine-floor-integration" userData={{treatment:'v42-machinery-embedded-foundation-sockets-no-platform',visualTreatment:'v42-load-paths-enter-floor-with-clear-open-center'}}>
  <mesh position={[-2.68,.016,-3.58]} rotation={[-Math.PI/2,0,.08]} receiveShadow><planeGeometry args={[1.72,3.0]}/><meshPhysicalMaterial color="#25302c" roughness={.52} metalness={.4} clearcoat={.04} clearcoatRoughness={.54} envMapIntensity={1.02}/></mesh>
  <mesh position={[2.68,.018,-3.58]} rotation={[-Math.PI/2,0,-.06]} receiveShadow><planeGeometry args={[1.72,3.0]}/><meshPhysicalMaterial color="#302d25" roughness={.5} metalness={.42} clearcoat={.04} clearcoatRoughness={.52} envMapIntensity={1.0}/></mesh>
</group>}
''')

source = replace_function(source, 'OrbCradle', 'SacredOrb', r'''
function OrbCradle(){return <group name="home-orb-engineered-cradle" position={[0,0,0]} userData={{treatment:'v42-foundation-articulated-capture-vault-relic-machine',visualTreatment:'v42-massive-orb-integrated-with-grounded-lateral-machinery'}}>
  <ReliquaryWing side={-1}/><ReliquaryWing side={1}/><CrownBridge/><ServiceConduit side={-1}/><ServiceConduit side={1}/>
</group>}
''')

source = replace_function(source, 'SacredOrb', 'HumanPresence', r'''
function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null),activeAction=useRef<THREE.AnimationAction|null>(null)
  const orb=useGLTF(ORB_MODEL)
  const authoredOrb=useMemo(()=>cloneOrbModel(orb.scene),[orb.scene])
  const {actions}=useAnimations(orb.animations,authoredOrb)
  const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion])
  useEffect(()=>{const allActions=Object.values(actions).filter((action):action is THREE.AnimationAction=>Boolean(action));if(reducedMotion){allActions.forEach((action)=>action.stop());activeAction.current=null;return}const next=actions[ORB_CLIPS[state]];if(!next)return;const previous=activeAction.current;if(previous&&previous!==next)previous.fadeOut(.2);next.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(.2).play();activeAction.current=next},[actions,reducedMotion,state])
  useEffect(()=>()=>{Object.values(actions).forEach((action)=>action?.stop())},[actions])
  useFrame(({clock})=>{if(!root.current)return;root.current.rotation.y=reducedMotion?0:Math.sin(clock.elapsedTime*.12)*.012;root.current.position.y=ORB.y+(reducedMotion?0:Math.sin(clock.elapsedTime*.42)*.018)})
  const stateColor=state==='warning'?'#d0a06e':state==='thinking'||state==='reflecting'?'#a4b3d6':'#8ce0d4'
  const intensity=state==='speaking'?1.28:state==='listening'?1.14:1.0
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v42-governed-authored-orb-massive-relic-machine-hero'}}>
    <group scale={1.05} position={[0,.04,0]} rotation={[0,.18,0]} name="home-orb-authored-core" userData={{treatment:'v42-authored-orb-large-visible-integrated-desktop-mobile'}}><primitive object={authoredOrb}/></group>
    <group name="home-orb-engineered-body" userData={{treatment:'v42-engineered-body-is-architectural-capture-system-no-display-ring-no-pedestal'}} />
    <pointLight color={stateColor} intensity={intensity*2.15} distance={11.5} decay={2}/>
    <pointLight position={[0,.55,-1.5]} color="#d7ba82" intensity={1.28} distance={7.4} decay={2}/>
    <pointLight position={[0,-.42,.72]} color="#75bdb5" intensity={.9} distance={5.8} decay={2}/>
  </group>
}
''')

source = source.replace("data-home-visual-grade=\"cinematic-pbr-v41-integrated-authored-orb-sanctuary\"", "data-home-visual-grade=\"cinematic-pbr-v42-integrated-relic-machine-sanctuary\"")
source = source.replace("data-home-final-art-revision=\"v41-integrated-authored-orb-sanctuary-production-candidate\"", "data-home-final-art-revision=\"v42-sanctuary-integrated-relic-machine-production-candidate\"")
source = source.replace("data-home-art-certification=\"v41-retained-pixel-candidate\"", "data-home-art-certification=\"v42-retained-pixel-candidate\"")
source = source.replace("camera.fov=size.height>size.width?66:60", "camera.fov=size.height>size.width?56:50")
source = source.replace("camera.position.set(1.15,1.68,6.98);camera.lookAt(0,1.65,-3.2)", "camera.position.set(1.02,1.7,6.72);camera.lookAt(ORB.x,ORB.y-.08,ORB.z)")
source = source.replace("const desiredFov=portrait?58:54", "const desiredFov=portrait?56:50")
source = source.replace("const lookHeight=portrait?1.72:1.48", "const lookHeight=portrait?2.18:2.04")
source = source.replace("gl.toneMappingExposure=1.62", "gl.toneMappingExposure=1.7")
source = source.replace("<ambientLight intensity={0.64} color=\"#e3ebe6\" />", "<ambientLight intensity={0.7} color=\"#e6efea\" />")
source = source.replace("<hemisphereLight args={['#c1d8d0','#202a24',0.88]} />", "<hemisphereLight args={['#c9ded7','#26322b',0.98]} />")
source = source.replace("intensity={4.15} color=\"#f4dfb7\"", "intensity={5.1} color=\"#f4dfb7\"")
source = source.replace("<pointLight position={[0,2.45,-4.35]} intensity={2.2}", "<pointLight position={[0,2.72,-4.15]} intensity={3.4}")
source = source.replace("intensity={0.74} color=\"#d3ad78\"", "intensity={1.12} color=\"#d3ad78\"")
source = source.replace("intensity={0.62} color=\"#78a8a7\"", "intensity={1.04} color=\"#78a8a7\"")
source = source.replace("<ContactShadows position={[0,0.03,-3.9]} opacity={0.58} scale={8.2} blur={1.9} far={4.2}", "<ContactShadows position={[0,0.03,-3.55]} opacity={0.66} scale={9.0} blur={1.55} far={4.8}")

required = [
    'v42-sanctuary-integrated-relic-machine-production-candidate',
    'v42-articulated-floor-rooted-capture-pier',
    'v42-split-vault-shoulders-continuous-with-articulated-piers',
    'v42-massive-orb-integrated-with-grounded-lateral-machinery',
    'v42-governed-authored-orb-massive-relic-machine-hero',
    'scale={1.05}',
    'desiredFov=portrait?56:50',
    'lookHeight=portrait?2.18:2.04',
    'gl.toneMappingExposure=1.7',
]
for marker in required:
    if marker not in source:
        raise SystemExit(f'Missing V42 marker after transform: {marker}')

orb_start = source.index('function SacredOrb(')
orb_end = source.index('function HumanPresence', orb_start)
orb_source = source[orb_start:orb_end]
for forbidden in ['torusGeometry', 'dodecahedronGeometry', 'icosahedronGeometry', 'octahedronGeometry', 'sphereGeometry', 'RoundedBox']:
    if forbidden in orb_source:
        raise SystemExit(f'Forbidden V42 Orb display/placeholder geometry remains: {forbidden}')

architecture_start = source.index('function SanctuaryArchitecture')
architecture_end = source.index('function SanctuaryGlazing', architecture_start)
architecture_source = source[architecture_start:architecture_end]
for forbidden in ['v41-integrated-authored-orb-sanctuary-production-candidate', '<SanctuaryShellMass']:
    if forbidden in architecture_source:
        raise SystemExit(f'Retired V41/solid-shell owner remains in V42 architecture: {forbidden}')

HOME.write_text(source)
print('Materialized V42 sanctuary-integrated relic-machine rebuild')
