from pathlib import Path
import re

path = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
source = path.read_text()

architecture = r'''function GothicArchShell({pack,position,rotation=[0,0,0],width,height,depth,openingWidth,openingHeight,color='#262a25'}:{pack:SurfacePack;position:Vec3;rotation?:Vec3;width:number;height:number;depth:number;openingWidth:number;openingHeight:number;color?:string}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-width/2,0); shape.lineTo(width/2,0); shape.lineTo(width/2,height*0.58)
    shape.bezierCurveTo(width*0.49,height*0.78,width*0.24,height*0.92,0,height)
    shape.bezierCurveTo(-width*0.24,height*0.92,-width*0.49,height*0.78,-width/2,height*0.58); shape.lineTo(-width/2,0)
    const hole = new THREE.Path(); hole.moveTo(-openingWidth/2,0); hole.lineTo(-openingWidth/2,openingHeight*0.58)
    hole.bezierCurveTo(-openingWidth*0.48,openingHeight*0.78,-openingWidth*0.22,openingHeight*0.92,0,openingHeight)
    hole.bezierCurveTo(openingWidth*0.22,openingHeight*0.92,openingWidth*0.48,openingHeight*0.78,openingWidth/2,openingHeight*0.58)
    hole.lineTo(openingWidth/2,0); hole.closePath(); shape.holes.push(hole)
    const geo = new THREE.ExtrudeGeometry(shape,{depth,steps:2,curveSegments:16,bevelEnabled:true,bevelSegments:4,bevelSize:0.075,bevelThickness:0.07})
    geo.center(); geo.computeVertexNormals(); return geo
  },[depth,height,openingHeight,openingWidth,width])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry} position={position as [number,number,number]} rotation={rotation as [number,number,number]} castShadow receiveShadow><meshPhysicalMaterial color={color} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.42,0.42)} roughnessMap={pack.arm} roughness={0.8} metalness={0.025} clearcoat={0.018} clearcoatRoughness={0.9} envMapIntensity={0.54} /></mesh>
}

function TaperedPier({pack,position,rotation=[0,0,0],height=5.2,width=1.15,depth=1.45,color='#2c2e28'}:{pack:SurfacePack;position:Vec3;rotation?:Vec3;height?:number;width?:number;depth?:number;color?:string}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape(); shape.moveTo(-width*0.56,-height*0.5); shape.lineTo(width*0.56,-height*0.5)
    shape.lineTo(width*0.48,-height*0.18); shape.lineTo(width*0.33,height*0.31); shape.lineTo(width*0.15,height*0.5)
    shape.lineTo(-width*0.11,height*0.5); shape.lineTo(-width*0.34,height*0.26); shape.lineTo(-width*0.48,-height*0.18); shape.closePath()
    const geo = new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:0.06,bevelThickness:0.06})
    geo.center(); geo.computeVertexNormals(); return geo
  },[depth,height,width])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry} position={position as [number,number,number]} rotation={rotation as [number,number,number]} castShadow receiveShadow><meshPhysicalMaterial color={color} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.36,0.36)} roughnessMap={pack.arm} roughness={0.83} metalness={0.018} clearcoat={0.012} clearcoatRoughness={0.92} envMapIntensity={0.5} /></mesh>
}

function VaultBlade({position,rotation,size,color='#252a25'}:{position:Vec3;rotation:Vec3;size:Vec3;color?:string}) { return <RoundedBox args={size as [number,number,number]} radius={0.08} smoothness={5} position={position as [number,number,number]} rotation={rotation as [number,number,number]} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={0.76} metalness={0.08} clearcoat={0.025} clearcoatRoughness={0.8} envMapIntensity={0.5} /></RoundedBox> }

function SanctuaryArchitecture() {
  const pack=useStonePack(0.6,0.76)
  return <group name="home-sanctuary-pavilion" userData={{visualOwner:'cinematic-inhabited-sacred-tech-sanctuary-v35',construction:'deep-apse-side-galleries-buttressed-cross-vault',visualTreatment:'v35-production-stone-sanctuary-rebuild'}}>
    <group name="home-v30-rear-apse" userData={{treatment:'v35-deep-layered-apse-with-service-reliquary-recess'}}>
      <GothicArchShell pack={pack} position={[0,3.15,-8.4]} width={14.3} height={6.8} depth={2.25} openingWidth={10.45} openingHeight={5.55} color="#30332d" />
      <GothicArchShell pack={pack} position={[0.12,2.72,-5.92]} rotation={[0,-0.015,0]} width={9.35} height={5.65} depth={1.35} openingWidth={6.55} openingHeight={4.55} color="#1c2421" />
      <ArchitecturalStone pack={pack} position={[-3.72,1.62,-6.25]} size={[0.5,3.35,2.25]} color="#252b27" roughness={0.8} />
      <ArchitecturalStone pack={pack} position={[3.64,1.52,-6.18]} size={[0.62,3.12,2.4]} color="#333027" roughness={0.78} />
    </group>
    <group name="home-v30-side-enclosure" userData={{treatment:'v35-asymmetric-side-galleries-and-grounded-piers'}}>
      <GothicArchShell pack={pack} position={[-5.15,2.6,-3.0]} rotation={[0,0.26,0]} width={4.25} height={5.15} depth={1.4} openingWidth={2.55} openingHeight={4.0} color="#282d28" />
      <GothicArchShell pack={pack} position={[5.05,2.72,-2.2]} rotation={[0,-0.24,0]} width={4.5} height={5.4} depth={1.55} openingWidth={2.78} openingHeight={4.18} color="#222b27" />
      <TaperedPier pack={pack} position={[-6.05,2.42,-6.1]} rotation={[0,0.08,-0.018]} height={5.0} width={1.22} depth={1.7} color="#35342d" />
      <TaperedPier pack={pack} position={[5.9,2.58,-5.25]} rotation={[0,-0.07,0.022]} height={5.35} width={1.3} depth={1.82} color="#242c28" />
      <TaperedPier pack={pack} position={[-6.15,1.95,0.75]} rotation={[0,-0.05,-0.025]} height={4.0} width={1.0} depth={1.34} color="#2b312c" />
      <TaperedPier pack={pack} position={[6.06,2.08,1.15]} rotation={[0,0.07,0.018]} height={4.28} width={1.08} depth={1.38} color="#373328" />
    </group>
    <group name="home-v30-load-bearing-vault" userData={{treatment:'v35-grounded-cross-vault-with-open-central-oculus'}}>
      <VaultBlade position={[-3.45,4.95,-1.8]} rotation={[-0.035,0,0.22]} size={[6.8,0.22,0.5]} color="#272d28" />
      <VaultBlade position={[3.55,5.02,-1.95]} rotation={[0.03,0,-0.2]} size={[6.85,0.22,0.5]} color="#2c302a" />
      <VaultBlade position={[-3.7,4.72,-5.05]} rotation={[0.02,0,0.18]} size={[6.25,0.2,0.42]} color="#242a26" />
      <VaultBlade position={[3.72,4.78,-4.92]} rotation={[-0.02,0,-0.17]} size={[6.3,0.2,0.42]} color="#303129" />
    </group>
    <group name="home-v30-orb-apse-architecture" userData={{treatment:'v35-reliquary-recess-integrated-with-apse-loads'}}>
      <RoundedBox args={[7.2,0.3,2.55]} radius={0.12} smoothness={5} position={[0,0.08,-5.0]} receiveShadow castShadow><meshPhysicalMaterial color="#151b19" map={pack.color} normalMap={pack.normal} roughness={0.86} metalness={0.025} envMapIntensity={0.46} /></RoundedBox>
      <RoundedBox args={[6.15,0.22,0.6]} radius={0.08} smoothness={4} position={[0,0.28,-5.82]} receiveShadow castShadow><meshPhysicalMaterial color="#32342d" roughness={0.66} metalness={0.14} envMapIntensity={0.56} /></RoundedBox>
    </group>
    <group name="home-v32-depth-envelope" userData={{treatment:'v35-recessed-practicals-and-material-depth'}}>
      <RecessedPractical position={[-5.35,0.5,2.05]} /><RecessedPractical position={[5.32,0.48,1.35]} warm={false} />
      <RecessedPractical position={[-4.9,0.5,-5.65]} warm={false} /><RecessedPractical position={[4.7,0.5,-5.25]} />
    </group>
  </group>
}

function SanctuaryGlazing(){'''
source, count = re.subn(r"function PointedArchMass\([\s\S]*?\nfunction SanctuaryGlazing\(\)\{", architecture, source, count=1)
assert count == 1, f'architecture replacement count={count}'

machine = r'''function MachineRail({x,z,length=3.8}:{x:number;z:number;length?:number}) { return <RoundedBox args={[0.22,0.1,length]} radius={0.045} smoothness={4} position={[x,0.08,z]} castShadow receiveShadow><meshPhysicalMaterial color="#303c38" roughness={0.38} metalness={0.76} envMapIntensity={0.72} /></RoundedBox> }

function MachineLink({from,to,thickness=0.16,color='#5d6e68'}:{from:Vec3;to:Vec3;thickness?:number;color?:string}){
  const {mid,quat,length}=useMemo(()=>{const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),d=b.clone().sub(a),length=d.length(),mid=a.clone().add(b).multiplyScalar(0.5),quat=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),d.normalize());return{mid,quat,length}},[from,to]); return <RoundedBox args={[thickness,thickness*0.72,length]} radius={Math.min(0.045,thickness*0.2)} smoothness={4} position={mid} quaternion={quat} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={0.36} metalness={0.72} envMapIntensity={0.72} /></RoundedBox>
}

function MechanicalJaw({position,rotation=[0,0,0],mirror=false,tone='#273832',accent='#7c806c'}:{position:Vec3;rotation?:Vec3;mirror?:boolean;tone?:string;accent?:string}) {
  const geometry=useMemo(()=>{const s=mirror?-1:1,shape=new THREE.Shape();shape.moveTo(-0.38*s,-0.66);shape.lineTo(0.32*s,-0.62);shape.lineTo(0.48*s,-0.18);shape.lineTo(0.31*s,0.62);shape.lineTo(-0.12*s,0.72);shape.lineTo(-0.28*s,0.18);shape.lineTo(-0.48*s,-0.08);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:0.42,steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:0.055,bevelThickness:0.055});g.center();g.computeVertexNormals();return g},[mirror]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <group position={position as [number,number,number]} rotation={rotation as [number,number,number]}><mesh geometry={geometry} castShadow receiveShadow><meshPhysicalMaterial color={tone} roughness={0.36} metalness={0.68} clearcoat={0.06} clearcoatRoughness={0.48} envMapIntensity={0.8} /></mesh><RoundedBox args={[0.14,0.48,0.12]} radius={0.035} smoothness={3} position={[mirror?-0.2:0.2,0.02,0.28]}><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.055} metalness={0.66} roughness={0.32} /></RoundedBox></group>
}

function ServiceHousing({position,rotation=[0,0,0],tone='#1d2a26',accent='#63756c'}:{position:Vec3;rotation?:Vec3;tone?:string;accent?:string}) { return <group position={position as [number,number,number]} rotation={rotation as [number,number,number]}><RoundedBox args={[0.72,1.38,0.82]} radius={0.12} smoothness={5} castShadow receiveShadow><meshPhysicalMaterial color={tone} roughness={0.4} metalness={0.62} envMapIntensity={0.74} /></RoundedBox><RoundedBox args={[0.42,0.16,0.05]} radius={0.035} smoothness={3} position={[0,0.34,0.435]}><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.07} metalness={0.68} roughness={0.3} /></RoundedBox><mesh position={[0,-0.22,0.445]}><circleGeometry args={[0.14,12]} /><meshStandardMaterial color="#0b1110" emissive={accent} emissiveIntensity={0.12} metalness={0.5} roughness={0.34} /></mesh></group> }

function OrbPlatform(){ return <group name="home-orb-machine-plinth" userData={{treatment:'v35-floor-integrated-service-rails-and-anchor-shoes',visualTreatment:'v35-no-display-platform-direct-load-paths'}}><MachineRail x={-0.82} z={-2.32} length={4.55} /><MachineRail x={0.82} z={-2.32} length={4.55} /><RoundedBox args={[0.72,0.18,0.8]} radius={0.075} smoothness={4} position={[-1.65,0.12,-1.72]} castShadow receiveShadow><meshPhysicalMaterial color="#26342f" roughness={0.46} metalness={0.62} /></RoundedBox><RoundedBox args={[0.72,0.18,0.8]} radius={0.075} smoothness={4} position={[1.65,0.12,-1.72]} castShadow receiveShadow><meshPhysicalMaterial color="#3a3429" roughness={0.46} metalness={0.58} /></RoundedBox></group> }

function OrbCradle(){ return <group name="home-orb-engineered-cradle" position={[0,0,-2.15]} userData={{treatment:'v35-sanctuary-integrated-reliquary-service-frame',visualTreatment:'v35-jaws-rails-crosshead-service-housings-and-rear-spine'}}>
  <RoundedBox args={[0.72,3.55,0.68]} radius={0.12} smoothness={5} position={[0,1.98,-1.18]} castShadow receiveShadow><meshPhysicalMaterial color="#17231f" roughness={0.42} metalness={0.62} envMapIntensity={0.76} /></RoundedBox>
  <RoundedBox args={[3.5,0.34,0.56]} radius={0.1} smoothness={5} position={[0,3.42,-0.82]} castShadow receiveShadow><meshPhysicalMaterial color="#27342f" roughness={0.4} metalness={0.66} envMapIntensity={0.76} /></RoundedBox>
  <ServiceHousing position={[-1.68,1.0,0.34]} rotation={[0.01,0.12,-0.035]} tone="#172923" accent="#6c887d" />
  <ServiceHousing position={[1.68,0.94,0.3]} rotation={[0.01,-0.1,0.03]} tone="#342f25" accent="#9b8b6d" />
  <MechanicalJaw position={[-0.72,1.66,0.08]} rotation={[0,0.08,-0.2]} tone="#293b35" accent="#7fa095" />
  <MechanicalJaw position={[0.72,1.66,0.08]} rotation={[0,-0.08,0.2]} mirror tone="#3b3529" accent="#aa9671" />
  <MechanicalJaw position={[-0.52,2.84,-0.18]} rotation={[0.05,0.04,-0.55]} tone="#25332f" accent="#728980" />
  <MechanicalJaw position={[0.52,2.84,-0.18]} rotation={[0.05,-0.04,0.55]} mirror tone="#312f27" accent="#8d8269" />
  <MachineLink from={[-1.68,1.42,0.34]} to={[-0.88,1.72,0.12]} thickness={0.2} color="#526761" />
  <MachineLink from={[1.68,1.36,0.3]} to={[0.88,1.72,0.12]} thickness={0.2} color="#776e58" />
  <MachineLink from={[-0.46,3.32,-0.66]} to={[-0.36,2.72,-0.12]} thickness={0.18} color="#536761" />
  <MachineLink from={[0.46,3.32,-0.66]} to={[0.36,2.72,-0.12]} thickness={0.18} color="#756d59" />
</group> }

function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null),authoredCore=useRef<THREE.Group>(null),activeAction=useRef<THREE.AnimationAction|null>(null); const orb=useGLTF(ORB_MODEL); const authoredOrb=useMemo(()=>cloneOrbModel(orb.scene),[orb.scene]); const {actions}=useAnimations(orb.animations,authoredOrb); const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion])
  useEffect(()=>{const allActions=Object.values(actions).filter((action):action is THREE.AnimationAction=>Boolean(action));if(reducedMotion){allActions.forEach((action)=>action.stop());activeAction.current=null;return}const next=actions[ORB_CLIPS[state]];if(!next)return;const previous=activeAction.current;if(previous&&previous!==next)previous.fadeOut(0.2);next.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(0.2).play();activeAction.current=next},[actions,reducedMotion,state]); useEffect(()=>()=>{Object.values(actions).forEach((action)=>action?.stop())},[actions])
  useFrame(()=>{if(!root.current)return;root.current.rotation.y=0;root.current.position.y=ORB.y;if(authoredCore.current)authoredCore.current.scale.setScalar(0.035)})
  const stateColor=state==='warning'?'#d69a62':state==='thinking'||state==='reflecting'?'#9ba6d4':'#83d4ca'; const intensity=state==='speaking'?1.22:state==='listening'?1.06:0.86
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v35-segmented-reactor-column-inside-mechanical-reliquary'}}><group ref={authoredCore} scale={0.035} name="home-orb-authored-core"><primitive object={authoredOrb} visible={false} /></group><group name="home-orb-engineered-body" rotation={[0.015,0.11,-0.008]}>
    <mesh position={[0,-0.62,0]} castShadow receiveShadow><cylinderGeometry args={[0.44,0.5,0.62,12,2,false]} /><meshPhysicalMaterial color="#15231f" roughness={0.36} metalness={0.72} envMapIntensity={0.8} /></mesh>
    <mesh position={[0,0,0]} castShadow receiveShadow><cylinderGeometry args={[0.48,0.48,0.54,12,2,false]} /><meshPhysicalMaterial color="#24352f" roughness={0.33} metalness={0.76} envMapIntensity={0.82} /></mesh>
    <mesh position={[0,0.62,0]} castShadow receiveShadow><cylinderGeometry args={[0.5,0.42,0.62,12,2,false]} /><meshPhysicalMaterial color="#3b382e" roughness={0.35} metalness={0.72} envMapIntensity={0.8} /></mesh>
    <mesh position={[0,-0.31,0]} castShadow><cylinderGeometry args={[0.56,0.56,0.09,16]} /><meshStandardMaterial color="#65746e" metalness={0.82} roughness={0.26} /></mesh>
    <mesh position={[0,0.31,0]} castShadow><cylinderGeometry args={[0.56,0.56,0.09,16]} /><meshStandardMaterial color="#81765e" metalness={0.8} roughness={0.28} /></mesh>
    <mesh position={[0,0.02,0.49]} scale={[0.16,0.46,0.08]}><octahedronGeometry args={[1,0]} /><meshBasicMaterial color={stateColor} transparent opacity={0.62} toneMapped={false} /></mesh>
    <RoundedBox args={[0.16,1.38,0.1]} radius={0.035} smoothness={3} position={[0,0,0.51]}><meshStandardMaterial color={stateColor} emissive={stateColor} emissiveIntensity={0.22} metalness={0.22} roughness={0.28} /></RoundedBox>
    <mesh position={[0,0.98,0]} castShadow><octahedronGeometry args={[0.48,0]} /><meshPhysicalMaterial color="#45554d" roughness={0.3} metalness={0.74} /></mesh>
    <mesh position={[0,-0.98,0]} castShadow><octahedronGeometry args={[0.48,0]} /><meshPhysicalMaterial color="#4a4437" roughness={0.32} metalness={0.72} /></mesh>
  </group><pointLight color={stateColor} intensity={intensity*0.34} distance={4.2} decay={2} /></group>
}

function HumanPresence('''
source, count = re.subn(r"function OrbPlatform\(\)\{[\s\S]*?\nfunction HumanPresence\(", machine, source, count=1)
assert count == 1, f'machine replacement count={count}'

replacements = {
  "cinematic-enclosed-sacred-tech-sanctuary-v34": "cinematic-inhabited-sacred-tech-sanctuary-v35",
  "v34-authored-stone-sanctuary-final": "v35-production-stone-sanctuary-rebuild",
  "v34-sanctuary-scale-mechanical-reliquary-assembly": "v35-sanctuary-integrated-reliquary-service-frame",
  "v34-segmented-spindle-reactor-integrated-with-cradle": "v35-segmented-reactor-column-inside-mechanical-reliquary",
  'data-home-visual-grade="cinematic-pbr-v34-authored-stone-reliquary-sanctuary"': 'data-home-visual-grade="cinematic-pbr-v35-inhabited-stone-mechanical-sanctuary"',
  'data-home-final-art-revision="v34-authored-stone-reliquary-sanctuary-final"': 'data-home-final-art-revision="v35-inhabited-stone-mechanical-sanctuary-candidate"',
  'data-home-art-certification="v34-production-final"': 'data-home-art-certification="v35-retained-pixel-candidate"',
  'if(camera instanceof THREE.PerspectiveCamera)camera.fov=size.height>size.width?58:50': 'if(camera instanceof THREE.PerspectiveCamera)camera.fov=size.height>size.width?62:56',
  'camera={{position:[0.58,1.64,6.86],fov:43,near:0.1,far:140}}': 'camera={{position:[0.58,1.64,6.86],fov:56,near:0.1,far:140}}',
  'gl.toneMappingExposure=1.08': 'gl.toneMappingExposure=1.18',
  '<ambientLight intensity={0.2} color="#d6dbd4" />': '<ambientLight intensity={0.26} color="#d6dbd4" />',
  "<hemisphereLight args={['#819c97','#111612',0.34]} />": "<hemisphereLight args={['#8ea8a1','#131812',0.44]} />",
  '<directionalLight position={[-10,15,8]} intensity={0.46} color="#d9d7cb" />': '<directionalLight position={[-10,15,8]} intensity={0.58} color="#dfd8c7" />',
  '<directionalLight position={[9,8,-10]} intensity={0.3} color="#608783" />': '<directionalLight position={[9,8,-10]} intensity={0.38} color="#6f9c98" />',
  '<spotLight position={[-1.5,8.8,4.8]} intensity={1.72}': '<spotLight position={[-1.5,8.8,4.8]} intensity={2.05}',
  '<pointLight position={[0,3.0,-2.8]} intensity={0.34}': '<pointLight position={[0,3.0,-2.8]} intensity={0.5}',
  '<spotLight position={[-5.4,3.6,1.8]} target-position={[-1.4,1.7,-3.2]} intensity={0.58}': '<spotLight position={[-5.4,3.6,1.8]} target-position={[-1.4,1.7,-3.2]} intensity={0.74}',
  '<spotLight position={[5.2,3.4,-0.5]} intensity={0.48}': '<spotLight position={[5.2,3.4,-0.5]} intensity={0.62}',
}
for old,new in replacements.items():
  assert old in source, f'missing precondition: {old}'
  source = source.replace(old,new,1)

for marker in [
  'v35-production-stone-sanctuary-rebuild',
  'v35-sanctuary-integrated-reliquary-service-frame',
  'v35-segmented-reactor-column-inside-mechanical-reliquary',
  'data-home-art-certification="v35-retained-pixel-candidate"',
]:
  assert marker in source, marker

path.write_text(source)
