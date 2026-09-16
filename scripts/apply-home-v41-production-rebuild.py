#!/usr/bin/env python3
from pathlib import Path

HOME = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
source = HOME.read_text()

if 'v41-integrated-authored-orb-sanctuary-production-candidate' in source:
    raise SystemExit('V41 already materialized')
if 'v40-open-apse-authored-orb-production-candidate' not in source:
    raise SystemExit('Expected exact V40 source marker before V41 rebuild')


def replace_function(text: str, name: str, next_name: str, replacement: str) -> str:
    start = text.index(f'function {name}')
    end = text.index(f'function {next_name}', start)
    return text[:start] + replacement.rstrip() + '\n\n' + text[end:]


source = replace_function(source, 'CantedWallMass', 'MachineCavityLiner', r'''
function CantedWallMass({pack,side}:{pack:SurfacePack;side:-1|1}){
  const geometry=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-.72,-2.0);shape.lineTo(.66,-2.22);shape.lineTo(.92,-.72);shape.bezierCurveTo(.88,.58,.56,1.58,.12,2.18);shape.lineTo(-.48,1.92);shape.bezierCurveTo(-.12,.7,-.18,-.48,-.72,-2.0);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:side<0?1.62:1.28,steps:1,bevelEnabled:true,bevelSegments:5,bevelSize:.11,bevelThickness:.11,curveSegments:18});g.center();g.computeVertexNormals();return g},[side]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <mesh geometry={geometry} position={[side*(side<0?5.2:5.48),2.18,side<0?-5.18:-5.72]} rotation={[0,side*(side<0?-.22:-.16),side<0?.025:-.035]} castShadow receiveShadow userData={{treatment:'v41-recessed-asymmetric-buttress-clear-of-hero-sightline'}}><meshPhysicalMaterial color={side<0?'#34423d':'#463f34'} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(.38,.38)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={.007} displacementBias={-.0035} roughness={.68} metalness={.055} clearcoat={.045} clearcoatRoughness={.7} envMapIntensity={.92}/></mesh>
}
''')

source = replace_function(source, 'MachineCavityLiner', 'SanctuaryArchitecture', r'''
function MachineCavityLiner(){
  const left=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-.82,-1.88);shape.lineTo(.58,-2.05);shape.lineTo(.76,.72);shape.lineTo(.18,1.94);shape.lineTo(-.62,1.46);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.62,steps:1,bevelEnabled:true,bevelSegments:5,bevelSize:.09,bevelThickness:.09});g.center();g.computeVertexNormals();return g},[])
  const right=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-.62,-1.72);shape.lineTo(.78,-1.92);shape.lineTo(.62,1.18);shape.lineTo(-.04,2.12);shape.lineTo(-.76,1.34);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.48,steps:1,bevelEnabled:true,bevelSegments:5,bevelSize:.085,bevelThickness:.085});g.center();g.computeVertexNormals();return g},[])
  useEffect(()=>()=>{left.dispose();right.dispose()},[left,right])
  return <group name="home-v41-recessed-machine-shoulders" userData={{treatment:'v41-separated-recessed-machine-shoulders-no-arch-no-backplate'}}>
    <mesh geometry={left} position={[-4.18,2.15,-7.18]} rotation={[0,.18,.03]} castShadow receiveShadow><meshPhysicalMaterial color="#2d3e3a" roughness={.44} metalness={.5} clearcoat={.05} clearcoatRoughness={.46} envMapIntensity={1.04}/></mesh>
    <mesh geometry={right} position={[4.42,2.34,-7.42]} rotation={[0,-.12,-.025]} castShadow receiveShadow><meshPhysicalMaterial color="#51483a" roughness={.46} metalness={.46} clearcoat={.045} clearcoatRoughness={.48} envMapIntensity={1.0}/></mesh>
  </group>
}
''')

source = replace_function(source, 'SanctuaryArchitecture', 'SanctuaryGlazing', r'''
function SanctuaryArchitecture(){const pack=useStonePack(.44,.6);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'cinematic-integrated-machine-sanctuary-v41',construction:'foundation-to-lateral-piers-to-vault-with-open-orb-center',visualTreatment:'v41-integrated-authored-orb-sanctuary-production-candidate'}}>
  <group name="home-v30-rear-apse" userData={{treatment:'v41-open-depth-field-no-nested-arch-shell'}} />
  <group name="home-v30-side-enclosure" userData={{treatment:'v41-asymmetric-recessed-structural-buttresses'}}><CantedWallMass pack={pack} side={-1}/><CantedWallMass pack={pack} side={1}/></group>
  <group name="home-v30-load-bearing-vault" userData={{treatment:'v41-single-continuous-vault-skin-over-open-center'}}><ContinuousVaultSkin pack={pack}/></group>
  <group name="home-v30-orb-apse-architecture" userData={{treatment:'v41-separated-machine-shoulders-integrated-with-vault-depth'}}><MachineCavityLiner/></group>
  <group name="home-v32-depth-envelope" userData={{treatment:'v41-readable-cavity-fill-and-asymmetric-practicals'}}><RecessedPractical position={[-5.3,.5,2.0]}/><RecessedPractical position={[5.2,.5,1.0]} warm={false}/><RecessedPractical position={[-4.72,.5,-5.9]} warm={false}/><RecessedPractical position={[4.62,.5,-6.18]}/></group>
</group>}
''')

source = replace_function(source, 'ReliquarySpine', 'ReliquaryWing', r'''
function ReliquarySpine(){return <group name="home-orb-reliquary-spine" userData={{treatment:'v41-retired-center-spine-no-production-geometry'}} />}
''')

source = replace_function(source, 'ReliquaryWing', 'CrownBridge', r'''
function ReliquaryWing({side}:{side:-1|1}){
  const geometry=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-.78,-2.28);shape.lineTo(.72,-2.42);shape.lineTo(.58,-.46);shape.bezierCurveTo(.52,.66,.28,1.48,-.08,2.18);shape.lineTo(-.62,1.86);shape.bezierCurveTo(-.38,.72,-.46,-.58,-.78,-2.28);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:side<0?1.0:.86,steps:1,curveSegments:18,bevelEnabled:true,bevelSegments:5,bevelSize:.1,bevelThickness:.1});g.center();g.computeVertexNormals();return g},[side])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry} position={[side*(side<0?2.88:3.08),2.34,side<0?-3.94:-4.18]} rotation={[0,side*(side<0?.12:.08),side<0?-.025:.035]} castShadow receiveShadow name={side<0?'home-v41-left-bearing-pier':'home-v41-right-bearing-pier'} userData={{treatment:'v41-foundation-rooted-heavy-lateral-pier'}}><meshPhysicalMaterial color={side<0?'#405650':'#625948'} roughness={.34} metalness={.54} clearcoat={.055} clearcoatRoughness={.38} envMapIntensity={1.18}/></mesh>
}
''')

source = replace_function(source, 'CrownBridge', 'FloorReliquaryBed', r'''
function CrownBridge(){return <group name="home-orb-load-crown" userData={{treatment:'v41-split-vault-shoulders-no-center-bridge'}}>
  <TaperedLoadBeam from={[-2.88,4.26,-3.94]} to={[-4.72,4.92,-5.64]} width={.46} color="#5a7169"/>
  <TaperedLoadBeam from={[3.08,4.3,-4.18]} to={[4.86,5.02,-5.9]} width={.5} color="#6d6653"/>
</group>}
''')

source = replace_function(source, 'FloorReliquaryBed', 'OrbPlatform', r'''
function FloorReliquaryBed(){return <group name="home-orb-machine-floor-integration" userData={{treatment:'v41-recessed-foundation-sockets-no-platform',visualTreatment:'v41-piers-terminate-into-floor-with-open-center'}}>
  <mesh position={[-2.88,.012,-3.94]} rotation={[-Math.PI/2,0,.06]} receiveShadow><planeGeometry args={[1.36,2.7]}/><meshPhysicalMaterial color="#202a27" roughness={.6} metalness={.28} clearcoat={.025} clearcoatRoughness={.64} envMapIntensity={.9}/></mesh>
  <mesh position={[3.08,.014,-4.18]} rotation={[-Math.PI/2,0,-.04]} receiveShadow><planeGeometry args={[1.42,2.5]}/><meshPhysicalMaterial color="#2b2923" roughness={.58} metalness={.3} clearcoat={.025} clearcoatRoughness={.62} envMapIntensity={.88}/></mesh>
</group>}
''')

source = replace_function(source, 'OrbCradle', 'SacredOrb', r'''
function OrbCradle(){return <group name="home-orb-engineered-cradle" position={[0,0,0]} userData={{treatment:'v41-foundation-lateral-pier-vault-shoulder-reliquary',visualTreatment:'v41-open-center-no-spine-no-ring-no-pedestal'}}>
  <ReliquaryWing side={-1}/><ReliquaryWing side={1}/><CrownBridge/>
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
  useFrame(({clock})=>{if(!root.current)return;root.current.rotation.y=reducedMotion?0:Math.sin(clock.elapsedTime*.08)*.003;root.current.position.y=ORB.y})
  const stateColor=state==='warning'?'#d0a06e':state==='thinking'||state==='reflecting'?'#a4b3d6':'#8ce0d4'
  const intensity=state==='speaking'?1.28:state==='listening'?1.14:1.0
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v41-governed-authored-orb-primary-architectural-hero'}}>
    <group scale={.17} position={[0,.12,-.08]} name="home-orb-authored-core" userData={{treatment:'v41-authored-orb-visible-desktop-mobile-no-procedural-core'}}><primitive object={authoredOrb}/></group>
    <group name="home-orb-engineered-body" userData={{treatment:'v41-engineered-reliquary-is-lateral-architecture-no-display-ring'}} />
    <pointLight color={stateColor} intensity={intensity*1.34} distance={9.2} decay={2}/>
    <pointLight position={[0,.38,-1.2]} color="#d5b982" intensity={.82} distance={5.4} decay={2}/>
  </group>
}
''')

source = source.replace("data-home-visual-grade=\"cinematic-pbr-v40-open-apse-authored-orb-sanctuary\"", "data-home-visual-grade=\"cinematic-pbr-v41-integrated-authored-orb-sanctuary\"")
source = source.replace("data-home-final-art-revision=\"v40-open-apse-authored-orb-production-candidate\"", "data-home-final-art-revision=\"v41-integrated-authored-orb-sanctuary-production-candidate\"")
source = source.replace("data-home-art-certification=\"v40-retained-pixel-candidate\"", "data-home-art-certification=\"v41-retained-pixel-candidate\"")
source = source.replace("<ambientLight intensity={0.46} color=\"#dce5df\" />", "<ambientLight intensity={0.64} color=\"#e3ebe6\" />")
source = source.replace("<hemisphereLight args={['#abc3bc','#18201b',0.62]} />", "<hemisphereLight args={['#c1d8d0','#202a24',0.88]} />")
source = source.replace("<directionalLight position={[-10,15,8]} intensity={0.96} color=\"#efe3cf\" />", "<directionalLight position={[-10,15,8]} intensity={1.24} color=\"#f2e5cf\" />")
source = source.replace("<directionalLight position={[9,8,-10]} intensity={0.68} color=\"#87bbb5\" />", "<directionalLight position={[9,8,-10]} intensity={0.92} color=\"#91c9c1\" />")
source = source.replace("intensity={3.15} color=\"#f0d9ac\"", "intensity={4.15} color=\"#f4dfb7\"")
source = source.replace("<pointLight position={[0,2.35,-4.05]} intensity={1.22}", "<pointLight position={[0,2.45,-4.35]} intensity={2.2}")
source = source.replace("gl.toneMappingExposure=1.44", "gl.toneMappingExposure=1.62")
source = source.replace("camera={{position:[2.05,1.68,6.9],fov:50,near:0.1,far:140}}", "camera={{position:[2.05,1.74,6.9],fov:54,near:0.1,far:140}}")
source = source.replace("const portrait=size.height>size.width,backDistance=portrait?0.1:0.18,eyeHeight=portrait?1.5:1.6", "const portrait=size.height>size.width,backDistance=portrait?0.08:0.18,eyeHeight=portrait?1.56:1.62;if(camera instanceof THREE.PerspectiveCamera){const desiredFov=portrait?58:54;if(Math.abs(camera.fov-desiredFov)>.05){camera.fov=desiredFov;camera.updateProjectionMatrix()}}")
source = source.replace("const look=pos.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current)*9.2,1.25+pitch.current,-Math.cos(yaw.current)*9.2));camera.lookAt(look)", "const lookHeight=portrait?1.72:1.48;const look=pos.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current)*9.2,lookHeight+pitch.current,-Math.cos(yaw.current)*9.2));camera.lookAt(look)")
source = source.replace("<ContactShadows position={[0,0.03,-3.72]} opacity={0.48} scale={7.4} blur={2.2} far={3.8}", "<ContactShadows position={[0,0.03,-3.9]} opacity={0.58} scale={8.2} blur={1.9} far={4.2}")

required = [
    'v41-integrated-authored-orb-sanctuary-production-candidate',
    'v41-foundation-rooted-heavy-lateral-pier',
    'v41-split-vault-shoulders-no-center-bridge',
    'v41-open-center-no-spine-no-ring-no-pedestal',
    'v41-governed-authored-orb-primary-architectural-hero',
    'scale={.17}',
    'desiredFov=portrait?58:54',
    'gl.toneMappingExposure=1.62',
]
for marker in required:
    if marker not in source:
        raise SystemExit(f'Missing V41 marker after transform: {marker}')

orb_start = source.index('function SacredOrb(')
orb_end = source.index('function HumanPresence', orb_start)
orb_source = source[orb_start:orb_end]
for forbidden in ['torusGeometry', 'dodecahedronGeometry', 'icosahedronGeometry', 'octahedronGeometry', 'sphereGeometry']:
    if forbidden in orb_source:
        raise SystemExit(f'Forbidden V41 Orb centerpiece geometry remains: {forbidden}')

arch_start = source.index('function SanctuaryArchitecture')
arch_end = source.index('function SanctuaryGlazing', arch_start)
arch_source = source[arch_start:arch_end]
for forbidden in ['<SanctuaryShellMass', 'v40-open-apse-authored-orb-production-candidate']:
    if forbidden in arch_source:
        raise SystemExit(f'Forbidden V40 repeated-arch owner remains in live V41 architecture: {forbidden}')

HOME.write_text(source)
print('Materialized V41 integrated Orb sanctuary rebuild')
