from pathlib import Path
import re

home_path = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
ground_path = Path('urai-tier1/src/app/GroundSpatialWorldClean.tsx')
home = home_path.read_text()
ground = ground_path.read_text()

if 'v40-open-apse-authored-orb-production-candidate' in home:
    print('V40 already applied')
    raise SystemExit(0)
if 'v39-authored-core-load-path-sanctuary-production-candidate' not in home:
    raise SystemExit('Expected live V39 Home marker was not found')
if 'v39-screen-space-band-suppressed' not in ground:
    raise SystemExit('Expected live V39 Ground marker was not found')

def replace_function_block(source: str, start_marker: str, end_marker: str, replacement: str) -> str:
    start = source.find(start_marker)
    end = source.find(end_marker, start + len(start_marker))
    if start < 0 or end < 0:
        raise SystemExit(f'Could not find transform boundary {start_marker!r} -> {end_marker!r}')
    return source[:start] + replacement.rstrip() + '\n\n' + source[end:]

# Remove the giant side masses and deep dark cavity. Keep the governed continuous vault,
# but make the rear wall an open apse whose piers sit outside the Orb sightline.
architecture = r'''function CantedWallMass({pack,side}:{pack:SurfacePack;side:-1|1}){
  const geometry=useMemo(()=>{const s=side,shape=new THREE.Shape();shape.moveTo(.28*s,-2.74);shape.lineTo(1.24*s,-2.6);shape.lineTo(1.52*s,-1.18);shape.lineTo(1.42*s,.62);shape.bezierCurveTo(1.32*s,1.64,.94*s,2.36,.42*s,2.7);shape.lineTo(.05*s,2.48);shape.bezierCurveTo(.36*s,1.42,.42*s,.3,.32*s,-.78);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:3.35,steps:1,bevelEnabled:true,bevelSegments:5,bevelSize:.1,bevelThickness:.1});g.center();g.computeVertexNormals();return g},[side]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <mesh geometry={geometry} position={[side*6.15,2.52,-4.34]} rotation={[0,side*-.16,0]} castShadow receiveShadow userData={{treatment:'v40-recessed-buttress-outside-hero-sightline'}}><meshPhysicalMaterial color={side<0?'#27302c':'#332f28'} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(.32,.32)} roughnessMap={pack.arm} roughness={.8} metalness={.025} clearcoat={.025} clearcoatRoughness={.84} envMapIntensity={.7}/></mesh>
}

function MachineCavityLiner(){
  const geometry=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-4.52,-1.86);shape.lineTo(4.52,-1.86);shape.lineTo(4.36,.52);shape.bezierCurveTo(4.12,1.68,2.46,2.64,0,2.88);shape.bezierCurveTo(-2.46,2.64,-4.12,1.68,-4.36,.52);shape.closePath();const hole=new THREE.Path();hole.moveTo(-3.92,-1.62);hole.lineTo(3.92,-1.62);hole.lineTo(3.78,.5);hole.bezierCurveTo(3.5,1.36,2.1,2.12,0,2.34);hole.bezierCurveTo(-2.1,2.12,-3.5,1.36,-3.78,.5);hole.closePath();shape.holes.push(hole);const g=new THREE.ExtrudeGeometry(shape,{depth:.34,steps:1,curveSegments:32,bevelEnabled:true,bevelSegments:5,bevelSize:.075,bevelThickness:.075});g.center();g.computeVertexNormals();return g},[]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <mesh geometry={geometry} position={[0,2.24,-6.42]} castShadow receiveShadow userData={{treatment:'v40-open-machined-apse-liner-no-egg-backplate'}}><meshPhysicalMaterial color="#26322f" roughness={.46} metalness={.46} clearcoat={.05} clearcoatRoughness={.46} envMapIntensity={1.0}/></mesh>
}

function SanctuaryArchitecture(){const pack=useStonePack(.44,.6);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'cinematic-integrated-machine-sanctuary-v40',construction:'open-recessed-apse-continuous-vault-floor-pier-crown-load-path',visualTreatment:'v40-open-apse-authored-orb-production-candidate'}}>
  <group name="home-v30-rear-apse" userData={{treatment:'v40-wide-open-rear-apse-no-oversized-wall-slabs'}}><SanctuaryShellMass pack={pack} position={[0,3.2,-7.82]} width={14.3} height={6.62} depth={1.58} openingWidth={11.72} openingHeight={5.32}/></group>
  <group name="home-v30-side-enclosure" userData={{treatment:'v40-buttresses-recessed-outside-camera-corridor'}}><CantedWallMass pack={pack} side={-1}/><CantedWallMass pack={pack} side={1}/></group>
  <group name="home-v30-load-bearing-vault" userData={{treatment:'v40-continuous-curved-vault-over-open-apse'}}><ContinuousVaultSkin pack={pack}/></group>
  <group name="home-v30-orb-apse-architecture" userData={{treatment:'v40-machined-arch-is-architecture-not-display-backdrop'}}><MachineCavityLiner/></group>
  <group name="home-v32-depth-envelope" userData={{treatment:'v40-recessed-practical-lighting-and-material-depth'}}><RecessedPractical position={[-5.45,.5,2.0]}/><RecessedPractical position={[5.38,.5,1.12]} warm={false}/><RecessedPractical position={[-5.02,.5,-5.56]} warm={false}/><RecessedPractical position={[4.92,.5,-5.48]}/></group>
</group>}
'''
home = replace_function_block(home, 'function CantedWallMass(', 'function SanctuaryGlazing()', architecture)

reliquary = r'''function ReliquarySpine(){
  const geometry=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-3.58,-2.12);shape.lineTo(-3.15,-2.12);shape.lineTo(-2.98,.54);shape.bezierCurveTo(-2.76,1.88,-1.66,2.84,0,3.02);shape.bezierCurveTo(1.66,2.84,2.76,1.88,2.98,.54);shape.lineTo(3.15,-2.12);shape.lineTo(3.58,-2.12);shape.lineTo(3.42,.66);shape.bezierCurveTo(3.14,2.28,1.88,3.42,0,3.66);shape.bezierCurveTo(-1.88,3.42,-3.14,2.28,-3.42,.66);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.5,steps:1,curveSegments:36,bevelEnabled:true,bevelSegments:6,bevelSize:.08,bevelThickness:.08});g.center();g.computeVertexNormals();return g},[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry} position={[0,2.36,-1.88]} castShadow receiveShadow name="home-orb-reliquary-spine" userData={{treatment:'v40-open-apse-bearing-arch-no-solid-backplate'}}><meshPhysicalMaterial color="#33413d" roughness={.42} metalness={.48} clearcoat={.045} clearcoatRoughness={.44} envMapIntensity={1.06}/></mesh>
}

function ReliquaryWing({side}:{side:-1|1}){
  const geometry=useMemo(()=>{const s=side,shape=new THREE.Shape();shape.moveTo(2.72*s,-2.36);shape.lineTo(3.28*s,-2.2);shape.lineTo(3.12*s,1.24);shape.bezierCurveTo(3.04*s,1.92,2.78*s,2.46,2.46*s,2.78);shape.lineTo(2.04*s,2.54);shape.bezierCurveTo(2.42*s,1.7,2.5*s,.66,2.42*s,-.62);shape.lineTo(2.18*s,-2.16);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.74,steps:1,curveSegments:24,bevelEnabled:true,bevelSegments:5,bevelSize:.085,bevelThickness:.085});g.center();g.computeVertexNormals();return g},[side])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry} position={[0,2.28,-1.48]} castShadow receiveShadow userData={{treatment:'v40-floor-rooted-tapered-pier-no-bar-cage'}}><meshPhysicalMaterial color={side<0?'#3f5550':'#514b3d'} roughness={.4} metalness={.5} clearcoat={.045} clearcoatRoughness={.42} envMapIntensity={1.02}/></mesh>
}

function CrownBridge(){
  const geometry=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-3.14,-.56);shape.bezierCurveTo(-2.52,.66,-1.46,1.32,0,1.44);shape.bezierCurveTo(1.46,1.32,2.52,.66,3.14,-.56);shape.lineTo(2.74,-.86);shape.bezierCurveTo(2.12,.08,1.18,.58,0,.66);shape.bezierCurveTo(-1.18,.58,-2.12,.08,-2.74,-.86);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.72,steps:1,curveSegments:34,bevelEnabled:true,bevelSegments:6,bevelSize:.075,bevelThickness:.075});g.center();g.computeVertexNormals();return g},[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry} position={[0,4.44,-1.44]} castShadow receiveShadow name="home-orb-load-crown" userData={{treatment:'v40-continuous-crown-seated-on-tapered-piers'}}><meshPhysicalMaterial color="#46534e" roughness={.37} metalness={.56} clearcoat={.05} clearcoatRoughness={.4} envMapIntensity={1.08}/></mesh>
}

function FloorReliquaryBed(){
  const geometry=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-3.28,-1.18);shape.lineTo(-2.46,-1.56);shape.lineTo(2.46,-1.56);shape.lineTo(3.28,-1.18);shape.lineTo(2.92,-.88);shape.lineTo(-2.92,-.88);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.035,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.018,bevelThickness:.014});g.rotateX(-Math.PI/2);g.computeVertexNormals();return g},[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry} position={[0,-.018,-3.28]} receiveShadow name="home-orb-machine-floor-integration" userData={{treatment:'v40-flush-recessed-service-seam-no-platform',visualTreatment:'v40-piers-terminate-through-floor-plane'}}><meshPhysicalMaterial color="#171e1c" roughness={.72} metalness={.22} clearcoat={.02} clearcoatRoughness={.72} envMapIntensity={.8}/></mesh>
}

function OrbPlatform(){return <FloorReliquaryBed/>}

function OrbCradle(){return <group name="home-orb-engineered-cradle" position={[0,0,-3.72]} userData={{treatment:'v40-integrated-open-apse-reliquary',visualTreatment:'v40-floor-piers-crown-without-cage-or-pedestal'}}>
  <ReliquarySpine/><ReliquaryWing side={-1}/><ReliquaryWing side={1}/><CrownBridge/>
</group>}
'''
home = replace_function_block(home, 'function ReliquarySpine()', 'function SacredOrb(', reliquary)

orb = r'''function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null),activeAction=useRef<THREE.AnimationAction|null>(null)
  const orb=useGLTF(ORB_MODEL)
  const authoredOrb=useMemo(()=>cloneOrbModel(orb.scene),[orb.scene])
  const {actions}=useAnimations(orb.animations,authoredOrb)
  const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion])
  useEffect(()=>{const allActions=Object.values(actions).filter((action):action is THREE.AnimationAction=>Boolean(action));if(reducedMotion){allActions.forEach((action)=>action.stop());activeAction.current=null;return}const next=actions[ORB_CLIPS[state]];if(!next)return;const previous=activeAction.current;if(previous&&previous!==next)previous.fadeOut(.2);next.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(.2).play();activeAction.current=next},[actions,reducedMotion,state])
  useEffect(()=>()=>{Object.values(actions).forEach((action)=>action?.stop())},[actions])
  useFrame(({clock})=>{if(!root.current)return;root.current.rotation.y=reducedMotion?0:Math.sin(clock.elapsedTime*.08)*.004;root.current.position.y=ORB.y})
  const stateColor=state==='warning'?'#d0a06e':state==='thinking'||state==='reflecting'?'#a4b3d6':'#86d4ca'
  const intensity=state==='speaking'?1.18:state==='listening'?1.06:.92
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v40-governed-authored-orb-primary-hero-inside-open-architectural-apse'}}>
    <group scale={.072} name="home-orb-authored-core"><primitive object={authoredOrb}/></group>
    <group name="home-orb-engineered-body" userData={{treatment:'v40-recessed-retention-collar-not-display-cage'}}>
      <mesh position={[0,0,-.58]} rotation={[Math.PI/2,0,0]} castShadow receiveShadow><torusGeometry args={[1.12,.115,24,96]}/><meshPhysicalMaterial color="#40534e" roughness={.36} metalness={.62} clearcoat={.055} clearcoatRoughness={.38} envMapIntensity={1.1}/></mesh>
      <mesh position={[0,0,-.68]} rotation={[Math.PI/2,0,0]} castShadow receiveShadow><torusGeometry args={[1.38,.055,20,96]}/><meshStandardMaterial color="#7c7561" metalness={.78} roughness={.3}/></mesh>
    </group>
    <pointLight color={stateColor} intensity={intensity*.9} distance={7.4} decay={2}/>
  </group>
}
'''
home = replace_function_block(home, 'function SacredOrb(', 'function HumanPresence', orb)

home = home.replace('v39-authored-core-load-path-sanctuary-production-candidate', 'v40-open-apse-authored-orb-production-candidate')
home = home.replace('cinematic-pbr-v39-authored-core-load-path-sanctuary', 'cinematic-pbr-v40-open-apse-authored-orb-sanctuary')
home = home.replace('v39-retained-pixel-candidate', 'v40-retained-pixel-candidate')
# Improve depth without flattening the stone response.
home = home.replace('<ambientLight intensity={0.4}', '<ambientLight intensity={0.46}')
home = home.replace('toneMappingExposure=1.36', 'toneMappingExposure=1.44')

# Ground V40: remove emissive placeholder read, place authored destinations on the floor,
# add a continuous architectural under-floor and HDR response, and lower portrait camera.
ground = ground.replace('import { Sparkles, useAnimations, useGLTF } from "@react-three/drei";', 'import { Environment, Sparkles, useAnimations, useGLTF } from "@react-three/drei";')
ground = ground.replace('clone.color.multiplyScalar(1.08);\n    clone.emissive.copy(clone.color).multiplyScalar(0.035);\n    clone.emissiveIntensity = Math.max(clone.emissiveIntensity, 0.16);\n    clone.roughness = Math.max(clone.roughness, 0.5);\n    clone.metalness = Math.min(clone.metalness, 0.3);', 'clone.color.multiplyScalar(0.82);\n    clone.emissive.set("#030807");\n    clone.emissiveIntensity = Math.min(clone.emissiveIntensity, 0.035);\n    clone.roughness = Math.max(clone.roughness, 0.64);\n    clone.metalness = Math.min(clone.metalness, 0.2);\n    clone.envMapIntensity = 0.95;')
ground = ground.replace('root.scale.set(character[0], character[1], character[2]);\n    root.userData.uraiChamberForm', 'root.scale.set(character[0] * 0.88, character[1] * 0.78, character[2] * 0.88);\n    root.position.y = Math.min(root.position.y, 0.12);\n    root.userData.uraiChamberForm')
ground = ground.replace('const distance = portrait ? 6.6 : 8.2;\n    const height = portrait ? 3.15 : 3.35;', 'const distance = portrait ? 8.6 : 8.8;\n    const height = portrait ? 2.18 : 2.72;')
ground = ground.replace('const pitch = useRef(-0.08);', 'const pitch = useRef(-0.025);')
ground = ground.replace('pitch.current = -0.08;', 'pitch.current = -0.025;')
ground = ground.replace('<color attach="background" args={["#173a43"]} />\n      <fogExp2 attach="fog" args={["#244b50", 0.0075]} />', '<color attach="background" args={["#202d2d"]} />\n      <fogExp2 attach="fog" args={["#202d2d", 0.018]} />\n      <Environment files="/assets/urai/home-production/cc0/environment/studio-small-08-1k.hdr" background={false} environmentIntensity={0.82} />')
ground = ground.replace('<Player input={input} yaw={yaw} pitch={pitch} target={target} activeId={activeId} onNearby={onNearby} />', '<mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.16,-11]} receiveShadow name="ground-v40-continuous-architectural-underfloor" userData={{treatment:"v40-continuous-floor-removes-floating-island-edge"}}><planeGeometry args={[64,88]}/><meshPhysicalMaterial color="#202822" roughness={0.9} metalness={0.025} clearcoat={0.025} clearcoatRoughness={0.88} envMapIntensity={0.72}/></mesh>\n      <Player input={input} yaw={yaw} pitch={pitch} target={target} activeId={activeId} onNearby={onNearby} />')
ground = ground.replace('<Vignette eskil={false} offset={0.08} darkness={0.035} />', '<Vignette eskil={false} offset={0.12} darkness={0.018} />')
ground = ground.replace('data-ground-compositing-treatment="v39-screen-space-band-suppressed"', 'data-ground-compositing-treatment="v40-continuous-floor-hdr-fog-no-screen-space-band"')
ground = ground.replace('filter:brightness(1.06)', 'filter:brightness(1.1)')

after = ground
if 'ground-v40-continuous-architectural-underfloor' not in after or 'v40-continuous-floor-hdr-fog-no-screen-space-band' not in after:
    raise SystemExit('Ground V40 markers were not materialized')
if 'v40-open-apse-authored-orb-production-candidate' not in home or 'scale={.072}' not in home:
    raise SystemExit('Home V40 markers were not materialized')

home_path.write_text(home)
ground_path.write_text(ground)
print('Applied Home/Ground V40 production rebuild')
