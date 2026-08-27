from pathlib import Path
import re

path = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
source = path.read_text()

required = [
    "cinematic-inhabited-sacred-tech-sanctuary-v35",
    "v35-production-stone-sanctuary-rebuild",
    "v35-sanctuary-integrated-reliquary-service-frame",
    "v35-segmented-reactor-column-inside-mechanical-reliquary",
    'data-home-final-art-revision="v35-inhabited-stone-mechanical-sanctuary-candidate"',
]
for marker in required:
    assert marker in source, f'missing V35 precondition: {marker}'

architecture = r'''function SanctuaryShellMass({pack,position,rotation=[0,0,0],width,height,depth,openingWidth,openingHeight,color='#242a27'}:{pack:SurfacePack;position:Vec3;rotation?:Vec3;width:number;height:number;depth:number;openingWidth:number;openingHeight:number;color?:string}) {
  const geometry=useMemo(()=>{
    const shape=new THREE.Shape()
    shape.moveTo(-width/2,-height/2);shape.lineTo(width/2,-height/2);shape.lineTo(width/2,height*0.08)
    shape.bezierCurveTo(width*0.49,height*0.30,width*0.33,height*0.47,0,height/2)
    shape.bezierCurveTo(-width*0.33,height*0.47,-width*0.49,height*0.30,-width/2,height*0.08);shape.lineTo(-width/2,-height/2)
    const hole=new THREE.Path();hole.moveTo(-openingWidth/2,-openingHeight/2);hole.lineTo(openingWidth/2,-openingHeight/2);hole.lineTo(openingWidth/2,openingHeight*0.08)
    hole.bezierCurveTo(openingWidth*0.46,openingHeight*0.34,openingWidth*0.28,openingHeight*0.48,0,openingHeight/2)
    hole.bezierCurveTo(-openingWidth*0.28,openingHeight*0.48,-openingWidth*0.46,openingHeight*0.34,-openingWidth/2,openingHeight*0.08);hole.lineTo(-openingWidth/2,-openingHeight/2);shape.holes.push(hole)
    const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,curveSegments:16,bevelEnabled:true,bevelSegments:4,bevelSize:0.09,bevelThickness:0.09});g.center();g.computeVertexNormals();return g
  },[depth,height,openingHeight,openingWidth,width]);useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry} position={position as [number,number,number]} rotation={rotation as [number,number,number]} castShadow receiveShadow><meshPhysicalMaterial color={color} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.38,0.38)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={0.007} displacementBias={-0.0035} roughness={0.79} metalness={0.035} clearcoat={0.035} clearcoatRoughness={0.82} envMapIntensity={0.58} /></mesh>
}

function CantedSanctuaryWing({pack,side}:{pack:SurfacePack;side:-1|1}) {
  const geometry=useMemo(()=>{const s=side;const shape=new THREE.Shape();shape.moveTo(-1.65*s,-2.6);shape.lineTo(1.4*s,-2.6);shape.lineTo(1.72*s,-0.72);shape.lineTo(1.35*s,1.95);shape.lineTo(0.58*s,2.62);shape.lineTo(-1.15*s,2.35);shape.lineTo(-1.78*s,0.28);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:6.9,steps:1,bevelEnabled:true,bevelSegments:4,bevelSize:0.09,bevelThickness:0.09});g.center();g.computeVertexNormals();return g},[side]);useEffect(()=>()=>geometry.dispose(),[geometry])
  const x=side*5.65,rot=side*-0.105
  return <group position={[x,2.55,-2.05]} rotation={[0,rot,0]} userData={{treatment:'v36-continuous-canted-sanctuary-wing'}}><mesh geometry={geometry} castShadow receiveShadow><meshPhysicalMaterial color={side<0?'#252c29':'#302e28'} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.32,0.32)} roughnessMap={pack.arm} roughness={0.8} metalness={0.035} clearcoat={0.025} clearcoatRoughness={0.84} envMapIntensity={0.54} /></mesh><RoundedBox args={[0.18,2.55,4.5]} radius={0.055} smoothness={4} position={[-side*1.46,-0.15,0.1]} castShadow receiveShadow><meshPhysicalMaterial color="#101816" roughness={0.4} metalness={0.55} envMapIntensity={0.72} /></RoundedBox><RoundedBox args={[0.06,1.82,3.7]} radius={0.02} smoothness={3} position={[-side*1.57,-0.02,0.12]}><meshStandardMaterial color={side<0?'#677f75':'#82745b'} emissive={side<0?'#27483f':'#4a3825'} emissiveIntensity={0.12} metalness={0.7} roughness={0.31} /></RoundedBox></group>
}

function VaultShoulder({pack,side}:{pack:SurfacePack;side:-1|1}) {
  return <group position={[side*3.45,4.78,-2.45]} rotation={[-0.018,side*0.025,side*-0.19]} userData={{treatment:'v36-grounded-vault-shoulder-attached-to-wing'}}><RoundedBox args={[5.65,0.46,6.8]} radius={0.16} smoothness={6} castShadow receiveShadow><meshPhysicalMaterial color={side<0?'#202724':'#292a24'} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.26,0.26)} roughnessMap={pack.arm} roughness={0.78} metalness={0.045} clearcoat={0.02} clearcoatRoughness={0.84} envMapIntensity={0.5} /></RoundedBox><RoundedBox args={[4.35,0.08,5.4]} radius={0.025} smoothness={3} position={[0,-0.255,0.12]}><meshStandardMaterial color="#313b36" metalness={0.62} roughness={0.38} /></RoundedBox></group>
}

function SanctuaryArchitecture() {
  const pack=useStonePack(0.42,0.58)
  return <group name="home-sanctuary-pavilion" userData={{visualOwner:'cinematic-integrated-megalithic-sanctuary-v36',construction:'continuous-rear-shell-canted-wings-grounded-vault-shoulders',visualTreatment:'v36-continuous-megalithic-sanctuary-final-candidate'}}>
    <group name="home-v30-rear-apse" userData={{treatment:'v36-single-continuous-rear-shell-with-machine-cavity'}}>
      <SanctuaryShellMass pack={pack} position={[0,3.18,-7.55]} width={14.7} height={6.65} depth={2.05} openingWidth={8.35} openingHeight={4.45} color="#2a2e29" />
      <RoundedBox args={[10.2,0.48,2.5]} radius={0.16} smoothness={6} position={[0,0.26,-6.62]} receiveShadow castShadow><meshPhysicalMaterial color="#151b19" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.22,0.22)} roughnessMap={pack.arm} roughness={0.87} metalness={0.025} envMapIntensity={0.44} /></RoundedBox>
    </group>
    <group name="home-v30-side-enclosure" userData={{treatment:'v36-continuous-asymmetric-canted-wings-no-modular-bays'}}><CantedSanctuaryWing pack={pack} side={-1} /><CantedSanctuaryWing pack={pack} side={1} /></group>
    <group name="home-v30-load-bearing-vault" userData={{treatment:'v36-vault-shoulders-grounded-into-side-wings-with-central-oculus'}}><VaultShoulder pack={pack} side={-1} /><VaultShoulder pack={pack} side={1} /></group>
    <group name="home-v30-orb-apse-architecture" userData={{treatment:'v36-machine-cavity-bonded-into-rear-shell-and-floor'}}>
      <RoundedBox args={[8.55,4.25,0.7]} radius={0.2} smoothness={7} position={[0,2.26,-6.03]} castShadow receiveShadow><meshPhysicalMaterial color="#0f1716" roughness={0.54} metalness={0.48} clearcoat={0.09} clearcoatRoughness={0.48} envMapIntensity={0.72} /></RoundedBox>
      <RoundedBox args={[7.7,3.5,0.11]} radius={0.12} smoothness={5} position={[0,2.25,-5.66]}><meshPhysicalMaterial color="#071110" emissive="#183c38" emissiveIntensity={0.018} roughness={0.37} metalness={0.26} clearcoat={0.18} clearcoatRoughness={0.42} /></RoundedBox>
    </group>
    <group name="home-v32-depth-envelope" userData={{treatment:'v36-integrated-practical-light-cuts-and-deep-shell-material-separation'}}>
      <RecessedPractical position={[-5.5,0.48,2.05]} /><RecessedPractical position={[5.42,0.48,1.2]} warm={false} />
      <RecessedPractical position={[-5.05,0.48,-5.55]} warm={false} /><RecessedPractical position={[4.92,0.48,-5.45]} />
    </group>
  </group>
}

function SanctuaryGlazing(){'''
source, count = re.subn(r"function GothicArchShell\([\s\S]*?\nfunction SanctuaryGlazing\(\)\{", architecture, source, count=1)
assert count == 1, f'architecture replacement count={count}'

machine = r'''function MachineLink({from,to,thickness=0.18,color='#64766f'}:{from:Vec3;to:Vec3;thickness?:number;color?:string}){
  const {mid,quat,length}=useMemo(()=>{const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),d=b.clone().sub(a),length=d.length(),mid=a.clone().add(b).multiplyScalar(0.5),quat=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),d.normalize());return{mid,quat,length}},[from,to]);return <RoundedBox args={[thickness,thickness*0.72,length]} radius={Math.min(0.055,thickness*0.22)} smoothness={5} position={mid} quaternion={quat} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={0.34} metalness={0.74} clearcoat={0.055} clearcoatRoughness={0.42} envMapIntensity={0.82} /></RoundedBox>
}

function EmbeddedMachineTrench({x,z,length=5.4,tone='#25342f'}:{x:number;z:number;length?:number;tone?:string}) { return <group position={[x,-0.055,z]} userData={{treatment:'v36-sunk-floor-service-trench'}}><RoundedBox args={[0.5,0.11,length]} radius={0.055} smoothness={4} castShadow receiveShadow><meshPhysicalMaterial color="#080d0c" roughness={0.6} metalness={0.34} envMapIntensity={0.5} /></RoundedBox><RoundedBox args={[0.11,0.035,length*0.88]} radius={0.025} smoothness={3} position={[0,0.067,0]}><meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={0.09} metalness={0.74} roughness={0.3} /></RoundedBox></group> }

function ReliquaryShellHalf({side}:{side:-1|1}) {
  const geometry=useMemo(()=>{const s=side,shape=new THREE.Shape();shape.moveTo(0.3*s,-1.55);shape.lineTo(1.45*s,-1.48);shape.lineTo(2.28*s,-0.84);shape.lineTo(2.5*s,0.35);shape.lineTo(2.04*s,1.5);shape.lineTo(1.15*s,1.82);shape.lineTo(0.42*s,1.42);shape.lineTo(0.72*s,0.62);shape.lineTo(0.66*s,-0.55);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:0.92,steps:1,curveSegments:4,bevelEnabled:true,bevelSegments:4,bevelSize:0.1,bevelThickness:0.1});g.center();g.computeVertexNormals();return g},[side]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <group position={[0,2.05,-0.72]} userData={{treatment:'v36-deep-reliquary-shell-half'}}><mesh geometry={geometry} castShadow receiveShadow><meshPhysicalMaterial color={side<0?'#182a26':'#332f26'} roughness={0.34} metalness={0.71} clearcoat={0.08} clearcoatRoughness={0.38} envMapIntensity={0.86} /></mesh><RoundedBox args={[0.12,1.48,0.12]} radius={0.035} smoothness={4} position={[side*1.72,0.18,0.56]}><meshStandardMaterial color={side<0?'#78998e':'#a39170'} emissive={side<0?'#274e46':'#543d25'} emissiveIntensity={0.11} metalness={0.75} roughness={0.28} /></RoundedBox></group>
}

function WallMachineAnchor({side}:{side:-1|1}) { return <group position={[side*3.22,2.08,-1.35]} rotation={[0,side*-0.06,side*0.025]} userData={{treatment:'v36-wall-embedded-load-anchor'}}><RoundedBox args={[1.38,4.1,1.42]} radius={0.19} smoothness={6} castShadow receiveShadow><meshPhysicalMaterial color={side<0?'#15221f':'#2e2a23'} roughness={0.42} metalness={0.6} clearcoat={0.055} clearcoatRoughness={0.46} envMapIntensity={0.76} /></RoundedBox><RoundedBox args={[0.48,2.7,0.08]} radius={0.07} smoothness={4} position={[-side*0.7,0,0.66]}><meshPhysicalMaterial color="#4d5f59" roughness={0.31} metalness={0.78} envMapIntensity={0.85} /></RoundedBox></group> }

function CoreClamp({side,upper=false}:{side:-1|1;upper?:boolean}) { const y=upper?0.63:-0.54;return <group position={[side*0.86,y,0.04]} rotation={[0,side*-0.12,side*(upper?-0.18:0.14)]}><RoundedBox args={[0.62,0.26,0.68]} radius={0.08} smoothness={5} castShadow receiveShadow><meshPhysicalMaterial color={side<0?'#52675f':'#75684f'} roughness={0.3} metalness={0.78} clearcoat={0.06} clearcoatRoughness={0.34} envMapIntensity={0.88} /></RoundedBox><RoundedBox args={[0.19,0.34,0.24]} radius={0.05} smoothness={4} position={[-side*0.29,0,0.15]}><meshStandardMaterial color="#8aa79d" emissive="#2d5f55" emissiveIntensity={0.09} metalness={0.68} roughness={0.3} /></RoundedBox></group> }

function OrbPlatform(){ return <group name="home-orb-machine-plinth" userData={{treatment:'v36-floor-integrated-service-trenches-and-wall-load-paths',visualTreatment:'v36-no-plinth-no-freestanding-rails'}}><EmbeddedMachineTrench x={-1.25} z={-3.82} length={5.8} tone="#355f57" /><EmbeddedMachineTrench x={1.25} z={-3.82} length={5.8} tone="#5a4d36" /><RoundedBox args={[5.9,0.09,0.42]} radius={0.04} smoothness={3} position={[0,-0.04,-5.45]} receiveShadow><meshPhysicalMaterial color="#111816" roughness={0.52} metalness={0.42} envMapIntensity={0.52} /></RoundedBox></group> }

function OrbCradle(){ return <group name="home-orb-engineered-cradle" position={[0,0,-3.72]} userData={{treatment:'v36-sanctuary-bonded-reliquary-machine',visualTreatment:'v36-deep-shell-halves-wall-anchors-floor-braces-core-clamps'}}><WallMachineAnchor side={-1} /><WallMachineAnchor side={1} /><ReliquaryShellHalf side={-1} /><ReliquaryShellHalf side={1} />
  <MachineLink from={[-3.05,3.32,-1.28]} to={[-1.28,2.68,-0.44]} thickness={0.29} color="#465b54" /><MachineLink from={[3.05,3.28,-1.28]} to={[1.28,2.66,-0.44]} thickness={0.29} color="#6c6049" />
  <MachineLink from={[-2.82,0.72,-1.12]} to={[-0.92,1.22,-0.2]} thickness={0.32} color="#42574f" /><MachineLink from={[2.82,0.72,-1.12]} to={[0.92,1.22,-0.2]} thickness={0.32} color="#675a45" />
  <MachineLink from={[-1.25,0.1,0.28]} to={[-0.82,1.2,0.02]} thickness={0.25} color="#4d625b" /><MachineLink from={[1.25,0.1,0.28]} to={[0.82,1.2,0.02]} thickness={0.25} color="#75674e" />
  <RoundedBox args={[6.55,0.3,0.72]} radius={0.1} smoothness={5} position={[0,3.72,-1.12]} castShadow receiveShadow><meshPhysicalMaterial color="#202b27" roughness={0.38} metalness={0.68} envMapIntensity={0.78} /></RoundedBox>
  <RoundedBox args={[0.64,4.25,0.84]} radius={0.13} smoothness={5} position={[0,2.15,-1.5]} castShadow receiveShadow><meshPhysicalMaterial color="#101a18" roughness={0.44} metalness={0.58} envMapIntensity={0.7} /></RoundedBox>
</group> }

function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null),authoredCore=useRef<THREE.Group>(null),activeAction=useRef<THREE.AnimationAction|null>(null);const orb=useGLTF(ORB_MODEL);const authoredOrb=useMemo(()=>cloneOrbModel(orb.scene),[orb.scene]);const {actions}=useAnimations(orb.animations,authoredOrb);const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion])
  useEffect(()=>{const allActions=Object.values(actions).filter((action):action is THREE.AnimationAction=>Boolean(action));if(reducedMotion){allActions.forEach((action)=>action.stop());activeAction.current=null;return}const next=actions[ORB_CLIPS[state]];if(!next)return;const previous=activeAction.current;if(previous&&previous!==next)previous.fadeOut(0.2);next.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(0.2).play();activeAction.current=next},[actions,reducedMotion,state]);useEffect(()=>()=>{Object.values(actions).forEach((action)=>action?.stop())},[actions])
  useFrame(({clock})=>{if(!root.current)return;root.current.rotation.y=reducedMotion?0:Math.sin(clock.elapsedTime*0.18)*0.035;root.current.position.y=ORB.y;if(authoredCore.current)authoredCore.current.scale.setScalar(0.035)})
  const stateColor=state==='warning'?'#d29a65':state==='thinking'||state==='reflecting'?'#99a5d4':'#83d5cb';const intensity=state==='speaking'?1.24:state==='listening'?1.08:0.9
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v36-faceted-memory-heart-captured-inside-architectural-reliquary'}}><group ref={authoredCore} scale={0.035} name="home-orb-authored-core"><primitive object={authoredOrb} visible={false} /></group><group name="home-orb-engineered-body" rotation={[0.03,0.18,-0.025]}>
    <mesh scale={[1.05,0.82,0.86]} castShadow receiveShadow><icosahedronGeometry args={[0.72,2]} /><meshPhysicalMaterial color="#182824" emissive={stateColor} emissiveIntensity={intensity*0.035} roughness={0.24} metalness={0.58} clearcoat={0.32} clearcoatRoughness={0.24} envMapIntensity={1.0} /></mesh>
    <mesh scale={[0.62,0.5,0.54]}><dodecahedronGeometry args={[0.72,0]} /><meshPhysicalMaterial color={stateColor} emissive={stateColor} emissiveIntensity={intensity*0.34} roughness={0.18} metalness={0.28} transmission={0.08} transparent opacity={0.72} clearcoat={0.48} clearcoatRoughness={0.18} /></mesh>
    <CoreClamp side={-1} upper /><CoreClamp side={1} upper /><CoreClamp side={-1} /><CoreClamp side={1} />
  </group><pointLight color={stateColor} intensity={intensity*0.55} distance={5.2} decay={2} /></group>
}

function HumanPresence('''
source, count = re.subn(r"function MachineRail\([\s\S]*?\nfunction HumanPresence\(", machine, source, count=1)
assert count == 1, f'machine replacement count={count}'

pairs = {
    "const SPAWN = new THREE.Vector3(0.72, 0.04, 6.7)":"const SPAWN = new THREE.Vector3(2.05, 0.04, 6.8)",
    "const ORB = new THREE.Vector3(0, 1.43, -2.15)":"const ORB = new THREE.Vector3(0, 1.82, -3.72)",
    "const DEFAULT_YAW = 0.03":"const DEFAULT_YAW = 0.205",
    "cinematic-pbr-v35-inhabited-stone-mechanical-sanctuary":"cinematic-pbr-v36-integrated-megalithic-reliquary-sanctuary",
    "v35-inhabited-stone-mechanical-sanctuary-candidate":"v36-integrated-megalithic-reliquary-sanctuary-candidate",
    "v35-retained-pixel-candidate":"v36-retained-pixel-candidate",
    "<ContactShadows position={[0,0.03,-2.15]} opacity={0.58} scale={5.2} blur={1.95} far={3.1}":"<ContactShadows position={[0,0.03,-3.72]} opacity={0.48} scale={7.4} blur={2.2} far={3.8}",
    "<ambientLight intensity={0.26} color=\"#d6dbd4\" />":"<ambientLight intensity={0.22} color=\"#d6dbd4\" />",
    "<hemisphereLight args={['#8ea8a1','#131812',0.44]} />":"<hemisphereLight args={['#8fa9a2','#111612',0.38]} />",
    "<directionalLight position={[-10,15,8]} intensity={0.58} color=\"#dfd8c7\" />":"<directionalLight position={[-10,15,8]} intensity={0.66} color=\"#dfd8c7\" />",
    "<directionalLight position={[9,8,-10]} intensity={0.38} color=\"#6f9c98\" />":"<directionalLight position={[9,8,-10]} intensity={0.46} color=\"#6f9c98\" />",
    "<pointLight position={[0,3.0,-2.8]} intensity={0.5} distance={8.2}":"<pointLight position={[0,2.35,-4.05]} intensity={0.72} distance={9.4}",
    "camera={{position:[0.58,1.64,6.86],fov:56,near:0.1,far:140}}":"camera={{position:[2.05,1.68,6.9],fov:50,near:0.1,far:140}}",
    "gl.toneMappingExposure=1.18":"gl.toneMappingExposure=1.14",
}
for old,new in pairs.items():
    assert old in source, f'missing replacement precondition: {old}'
    source=source.replace(old,new,1)

path.write_text(source)
