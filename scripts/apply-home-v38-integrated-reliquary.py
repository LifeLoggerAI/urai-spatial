from pathlib import Path
import re

path = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
source = path.read_text()

if 'v38-integrated-machine-sanctuary-production-candidate' in source:
    print('HOME_V38_ALREADY_APPLIED')
    raise SystemExit(0)

if 'v37-continuous-vault-reliquary-sanctuary-candidate' not in source:
    raise SystemExit('V38 transform requires the exact V37 production candidate')


def replace_function(start: str, end: str, replacement: str, label: str) -> None:
    global source
    pattern = re.escape(start) + r'.*?(?=' + re.escape(end) + r')'
    updated, count = re.subn(pattern, replacement.rstrip() + '\n\n', source, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected one function range, found {count}')
    source = updated


replace_function(
    'function ServiceConduit(',
    'function ReliquaryWing',
    r'''function ServiceConduit({side}:{side:-1|1}){
  const geometry=useMemo(()=>{const s=side,curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(s*3.62,.08,-3.0),new THREE.Vector3(s*3.5,.18,-2.25),new THREE.Vector3(s*3.36,.62,-1.4),
    new THREE.Vector3(s*3.28,1.52,-.92),new THREE.Vector3(s*3.06,2.72,-.82),new THREE.Vector3(s*2.72,3.72,-1.02)
  ]);return new THREE.TubeGeometry(curve,44,.04,10,false)},[side]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} castShadow receiveShadow userData={{treatment:'v38-recessed-service-trunk'}}><meshStandardMaterial color={side<0?'#405b55':'#625b4c'} emissive={side<0?'#0c2420':'#241d12'} emissiveIntensity={.025} metalness={.72} roughness={.42}/></mesh>
}

function ReliquarySpine(){
  const geometry=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-1.66,-1.82);shape.lineTo(1.66,-1.82);shape.lineTo(1.9,-.96);shape.lineTo(1.72,1.46);shape.bezierCurveTo(1.28,2.12,.72,2.42,0,2.54);shape.bezierCurveTo(-.72,2.42,-1.28,2.12,-1.72,1.46);shape.lineTo(-1.9,-.96);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.72,steps:1,curveSegments:18,bevelEnabled:true,bevelSegments:5,bevelSize:.08,bevelThickness:.08});g.center();g.computeVertexNormals();return g},[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <group position={[0,2.1,-1.46]} name="home-orb-reliquary-spine" userData={{treatment:'v38-rear-bearing-spine'}}>
    <mesh geometry={geometry} castShadow receiveShadow><meshPhysicalMaterial color="#101817" roughness={.46} metalness={.58} clearcoat={.035} clearcoatRoughness={.54} envMapIntensity={.72}/></mesh>
    <mesh position={[0,-.16,.44]} scale={[.72,1.38,.22]} castShadow><dodecahedronGeometry args={[1.02,0]}/><meshPhysicalMaterial color="#182320" roughness={.52} metalness={.5} clearcoat={.025} clearcoatRoughness={.58} envMapIntensity={.68}/></mesh>
    <mesh position={[0,-1.46,.49]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.62,.68,64]}/><meshStandardMaterial color="#56635c" emissive="#102722" emissiveIntensity={.035} metalness={.78} roughness={.36}/></mesh>
  </group>
}

function ReliquaryWing''',
    'service trunks and bearing spine',
)

replace_function(
    'function ReliquaryWing(',
    'function CrownBridge',
    r'''function ReliquaryWing({side}:{side:-1|1}){
  const geometry=useMemo(()=>{const s=side,shape=new THREE.Shape();shape.moveTo(1.55*s,-1.92);shape.lineTo(3.28*s,-1.72);shape.bezierCurveTo(3.62*s,-.95,3.7*s,.24,3.38*s,1.18);shape.bezierCurveTo(3.12*s,2.0,2.52*s,2.46,1.88*s,2.62);shape.lineTo(1.38*s,1.88);shape.bezierCurveTo(1.82*s,1.34,2.02*s,.7,1.96*s,.06);shape.bezierCurveTo(1.9*s,-.62,1.66*s,-1.18,1.22*s,-1.54);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:1.06,steps:1,curveSegments:24,bevelEnabled:true,bevelSegments:6,bevelSize:.09,bevelThickness:.09});g.center();g.computeVertexNormals();return g},[side]);
  const inner=useMemo(()=>{const s=side,shape=new THREE.Shape();shape.moveTo(1.72*s,-1.42);shape.lineTo(2.75*s,-1.24);shape.bezierCurveTo(3.0*s,-.42,2.98*s,.56,2.64*s,1.34);shape.bezierCurveTo(2.4*s,1.86,2.06*s,2.12,1.7*s,2.2);shape.lineTo(1.48*s,1.64);shape.bezierCurveTo(1.78*s,.92,1.82*s,-.54,1.46*s,-1.06);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:1.12,steps:1,curveSegments:20,bevelEnabled:true,bevelSegments:4,bevelSize:.055,bevelThickness:.055});g.center();g.computeVertexNormals();return g},[side]);
  useEffect(()=>()=>{geometry.dispose();inner.dispose()},[geometry,inner]);
  return <group position={[0,2.08,-1.04]} userData={{treatment:'v38-floor-to-vault-load-bearing-reliquary-pier'}}>
    <mesh geometry={geometry} castShadow receiveShadow><meshPhysicalMaterial color={side<0?'#14201d':'#26231d'} roughness={.48} metalness={.46} clearcoat={.025} clearcoatRoughness={.58} envMapIntensity={.7}/></mesh>
    <mesh geometry={inner} position={[0,0,.18]} castShadow receiveShadow><meshPhysicalMaterial color={side<0?'#243630':'#3b3428'} roughness={.36} metalness={.66} clearcoat={.045} clearcoatRoughness={.44} envMapIntensity={.78}/></mesh>
    <mesh position={[side*2.72,-1.52,.62]} rotation={[0,0,side*.05]} castShadow><capsuleGeometry args={[.085,.84,6,14]}/><meshStandardMaterial color="#4d5b55" metalness={.74} roughness={.38}/></mesh>
  </group>
}''',
    'bearing reliquary piers',
)

replace_function(
    'function CrownBridge()',
    'function FloorReliquaryBed',
    r'''function CrownBridge(){
  const geometry=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-3.58,-.48);shape.lineTo(-3.08,.08);shape.bezierCurveTo(-2.28,.92,-1.34,1.34,0,1.42);shape.bezierCurveTo(1.34,1.34,2.28,.92,3.08,.08);shape.lineTo(3.58,-.48);shape.lineTo(3.02,-.86);shape.bezierCurveTo(2.06,-.18,1.18,.12,0,.18);shape.bezierCurveTo(-1.18,.12,-2.06,-.18,-3.02,-.86);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:1.02,steps:1,curveSegments:26,bevelEnabled:true,bevelSegments:6,bevelSize:.08,bevelThickness:.08});g.center();g.computeVertexNormals();return g},[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <group position={[0,4.06,-1.02]} name="home-orb-load-crown" userData={{treatment:'v38-structural-vault-crown'}}>
    <mesh geometry={geometry} castShadow receiveShadow><meshPhysicalMaterial color="#1b2522" roughness={.44} metalness={.52} clearcoat={.03} clearcoatRoughness={.52} envMapIntensity={.72}/></mesh>
    <mesh position={[0,.14,.58]} scale={[2.18,.18,.16]} castShadow><capsuleGeometry args={[.18,1.0,6,16]}/><meshStandardMaterial color="#4a5751" metalness={.76} roughness={.34}/></mesh>
  </group>
}''',
    'structural crown',
)

replace_function(
    'function FloorReliquaryBed()',
    'function OrbPlatform()',
    r'''function FloorReliquaryBed(){
  const accessGeometry=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-2.62,-1.04);shape.lineTo(-1.62,-1.42);shape.lineTo(1.72,-1.4);shape.lineTo(2.7,-1.0);shape.lineTo(2.38,-.72);shape.lineTo(-2.32,-.7);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.045,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.025,bevelThickness:.018});g.rotateX(-Math.PI/2);g.computeVertexNormals();return g},[]);
  useEffect(()=>()=>accessGeometry.dispose(),[accessGeometry]);
  return <group name="home-orb-machine-floor-integration" userData={{treatment:'v38-recessed-floor-service-integration-no-plinth',visualTreatment:'v38-machine-loads-disappear-into-floor'}}>
    <mesh geometry={accessGeometry} position={[0,.012,-3.18]} receiveShadow><meshPhysicalMaterial color="#0c1211" roughness={.72} metalness={.24} clearcoat={.015} clearcoatRoughness={.72} envMapIntensity={.5}/></mesh>
    <ServiceConduit side={-1}/><ServiceConduit side={1}/>
    <mesh position={[-2.82,.036,-3.06]} rotation={[-Math.PI/2,0,.12]}><planeGeometry args={[.92,.032]}/><meshStandardMaterial color="#4a5751" metalness={.76} roughness={.38}/></mesh>
    <mesh position={[2.78,.036,-3.02]} rotation={[-Math.PI/2,0,-.1]}><planeGeometry args={[1.08,.032]}/><meshStandardMaterial color="#5a5141" metalness={.72} roughness={.4}/></mesh>
  </group>
}''',
    'recessed floor integration',
)

replace_function(
    'function OrbCradle()',
    'function SacredOrb(',
    r'''function OrbCradle(){return <group name="home-orb-engineered-cradle" position={[0,0,-3.72]} userData={{treatment:'v38-architectural-reliquary-machine',visualTreatment:'v38-floor-to-vault-bearing-piers-rear-spine-crown-service-trunks'}}><ReliquarySpine/><ReliquaryWing side={-1}/><ReliquaryWing side={1}/><CrownBridge/><TaperedLoadBeam from={[-3.05,.22,-1.12]} to={[-2.5,1.02,-.72]} width={.22} color="#3c4f49"/><TaperedLoadBeam from={[3.02,.22,-1.12]} to={[2.52,1.0,-.72]} width={.22} color="#554c3d"/></group>}''',
    'integrated cradle',
)

replace_function(
    'function SacredOrb(',
    'function HumanPresence',
    r'''function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null),authoredCore=useRef<THREE.Group>(null),activeAction=useRef<THREE.AnimationAction|null>(null);const orb=useGLTF(ORB_MODEL);const authoredOrb=useMemo(()=>cloneOrbModel(orb.scene),[orb.scene]);const {actions}=useAnimations(orb.animations,authoredOrb);const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion]);useEffect(()=>{const allActions=Object.values(actions).filter((action):action is THREE.AnimationAction=>Boolean(action));if(reducedMotion){allActions.forEach((action)=>action.stop());activeAction.current=null;return}const next=actions[ORB_CLIPS[state]];if(!next)return;const previous=activeAction.current;if(previous&&previous!==next)previous.fadeOut(.2);next.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(.2).play();activeAction.current=next},[actions,reducedMotion,state]);useEffect(()=>()=>{Object.values(actions).forEach((action)=>action?.stop())},[actions]);useFrame(({clock})=>{if(!root.current)return;root.current.rotation.y=reducedMotion?0:Math.sin(clock.elapsedTime*.1)*.008;root.current.position.y=ORB.y;if(authoredCore.current)authoredCore.current.scale.setScalar(.035)});const stateColor=state==='warning'?'#c99666':state==='thinking'||state==='reflecting'?'#93a2c7':'#72bdb4';const intensity=state==='speaking'?1.12:state==='listening'?1.0:.82;return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v38-recessed-armored-memory-core-inside-load-bearing-reliquary'}}>
    <group ref={authoredCore} scale={.035} name="home-orb-authored-core"><primitive object={authoredOrb} visible={false}/></group>
    <group name="home-orb-engineered-body" rotation={[.02,.08,-.015]}>
      <mesh scale={[.78,1.02,.72]} castShadow receiveShadow><dodecahedronGeometry args={[1.0,1]}/><meshPhysicalMaterial color="#101918" emissive={stateColor} emissiveIntensity={intensity*.012} roughness={.5} metalness={.56} clearcoat={.045} clearcoatRoughness={.52} envMapIntensity={.76}/></mesh>
      <mesh scale={[.62,.84,.58]} rotation={[.12,.24,.04]} castShadow><icosahedronGeometry args={[.94,1]}/><meshPhysicalMaterial color="#1c2c28" emissive={stateColor} emissiveIntensity={intensity*.07} roughness={.38} metalness={.48} clearcoat={.08} clearcoatRoughness={.42} envMapIntensity={.8}/></mesh>
      <mesh scale={[.34,.46,.31]} rotation={[-.08,-.18,.12]}><octahedronGeometry args={[.9,1]}/><meshStandardMaterial color="#28413b" emissive={stateColor} emissiveIntensity={intensity*.28} metalness={.4} roughness={.36}/></mesh>
      <mesh position={[0,.05,.63]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.43,.018,8,64,Math.PI*1.44]}/><meshStandardMaterial color="#718982" emissive={stateColor} emissiveIntensity={intensity*.12} metalness={.78} roughness={.3}/></mesh>
      <mesh position={[0,-.02,-.65]} rotation={[Math.PI/2,0,Math.PI]}><torusGeometry args={[.38,.014,8,64,Math.PI*1.28]}/><meshStandardMaterial color="#596962" emissive={stateColor} emissiveIntensity={intensity*.08} metalness={.8} roughness={.32}/></mesh>
    </group>
    <pointLight color={stateColor} intensity={intensity*.28} distance={4.2} decay={2}/>
  </group>
}''',
    'armored recessed Orb core',
)

source = source.replace('v37-continuous-vault-reliquary-sanctuary-candidate', 'v38-integrated-machine-sanctuary-production-candidate')
source = source.replace('v37-retained-pixel-candidate', 'v38-retained-pixel-candidate')
source = source.replace("cinematic-continuous-vault-sanctuary-v37", "cinematic-integrated-machine-sanctuary-v38")
source = source.replace("v37-finished-continuous-sanctuary-candidate", "v38-finished-integrated-sanctuary-candidate")

path.write_text(source)
print('HOME_V38_INTEGRATED_RELIQUARY_APPLIED')
