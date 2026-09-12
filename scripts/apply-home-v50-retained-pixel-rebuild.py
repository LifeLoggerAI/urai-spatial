from pathlib import Path
import re

SOURCE = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
text = SOURCE.read_text()


def replace_function(start_name: str, next_name: str, replacement: str) -> None:
    global text
    pattern = rf"function {re.escape(start_name)}\b[\s\S]*?(?=\nfunction {re.escape(next_name)}\b)"
    text, count = re.subn(pattern, replacement.rstrip() + "\n\n", text, count=1)
    if count != 1:
        raise SystemExit(f'expected exactly one {start_name} -> {next_name} function span, got {count}')


if 'v50-retained-pixel-rebuild' in text:
    print('V50 retained-pixel rebuild already materialized')
    raise SystemExit(0)

old_orb = "const ORB = new THREE.Vector3(0, 2.18, -3.15)"
if old_orb not in text:
    raise SystemExit('expected V49 Orb anchor was not found')
text = text.replace(old_orb, "const ORB = new THREE.Vector3(0, 2.22, -5.05)", 1)

replace_function('cloneOrbModel', 'PouredStone', r'''function cloneOrbModel(source: THREE.Object3D) {
  const root = cloneModel(source)
  root.visible = true
  root.traverse((object) => {
    const retiredDisplay = object.name === 'orb-aura' || object.name.startsWith('orb-orbit-')
    if (retiredDisplay) {
      object.visible = false
      object.userData.uraiRetiredVisualRole = 'v50-no-orbit-display-language'
      return
    }
    if (object.name === 'orb-core') {
      object.visible = true
      object.scale.multiplyScalar(0.54)
      object.userData.uraiIntegratedVisualRole = 'v50-contained-engine-heart'
    }
    if (object.name === 'orb-heart') {
      object.visible = true
      object.scale.multiplyScalar(0.58)
      object.userData.uraiIntegratedVisualRole = 'v50-contained-emotional-heart'
    }
    if (object.name.startsWith('orb-filament-')) {
      object.visible = true
      object.scale.multiplyScalar(0.34)
      object.userData.uraiIntegratedVisualRole = 'v50-contained-filament'
    }
    if (object.name.startsWith('orb-petal-')) {
      object.visible = true
      object.scale.multiplyScalar(0.72)
      object.userData.uraiIntegratedVisualRole = 'v50-inner-faceted-armor'
    }
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue
      material.color.lerp(new THREE.Color('#1d332f'), 0.56)
      material.emissive.lerp(new THREE.Color('#6ca79f'), 0.16)
      material.emissiveIntensity = Math.min(Math.max(material.emissiveIntensity, 0.025), 0.13)
      material.roughness = Math.max(material.roughness, 0.54)
      material.metalness = Math.min(Math.max(material.metalness, 0.42), 0.72)
      material.envMapIntensity = Math.min(Math.max(material.envMapIntensity, 0.5), 0.78)
      if (material instanceof THREE.MeshPhysicalMaterial) {
        material.transmission = 0
        material.thickness = 0
        material.opacity = 1
        material.transparent = false
      }
      material.needsUpdate = true
    }
  })
  root.userData.uraiTreatment = 'v50-retained-pixel-rebuild-opaque-governed-heart'
  return root
}''')

replace_function('SanctuaryCourt', 'ProductionSanctuary', r'''function SanctuaryCourt({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(SANCTUARY)
  const compatibilityModel = useMemo(() => cloneCompatibilitySanctuary(sanctuary.scene), [sanctuary.scene])
  const pack = useStonePack(0.15, 0.19)
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  return <group name="home-authored-terrain" userData={{ treatment: 'v49-photographic-pbr-floor-under-authored-reliquary v50-retained-pixel-depth-floor', source: HOME_PHOTOGRAPHIC_PBR_V19 }}>
    <primitive object={compatibilityModel} />
    <mesh name="home-v48-walkable-photographic-floor" position={[0,-0.16,-1.45]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[16.5,19.2,40,48]} />
      <meshPhysicalMaterial color="#252c29" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.58,0.58)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={0.031} displacementBias={-0.014} roughness={0.84} metalness={0.015} clearcoat={0.025} clearcoatRoughness={0.84} envMapIntensity={0.78} />
    </mesh>
    <group name="home-v50-floor-authored-depth" userData={{treatment:'v50-asymmetric-recessed-wayfinding-and-service-depth-no-grid-no-display-platform'}}>
      <mesh position={[-2.55,-0.105,-2.8]} rotation={[-Math.PI/2,0,-0.025]} receiveShadow><planeGeometry args={[0.08,10.8]}/><meshStandardMaterial color="#111715" roughness={0.88} metalness={0.06}/></mesh>
      <mesh position={[2.28,-0.104,-3.55]} rotation={[-Math.PI/2,0,0.032]} receiveShadow><planeGeometry args={[0.065,9.3]}/><meshStandardMaterial color="#151b19" roughness={0.9} metalness={0.04}/></mesh>
      <mesh position={[-0.62,-0.103,-6.15]} rotation={[-Math.PI/2,0,Math.PI/2]} receiveShadow><planeGeometry args={[0.055,6.4]}/><meshStandardMaterial color="#101614" roughness={0.9} metalness={0.04}/></mesh>
      <mesh position={[0.84,-0.095,-4.4]} rotation={[-Math.PI/2,0,Math.PI/2]} receiveShadow><planeGeometry args={[0.035,3.1]}/><meshStandardMaterial color="#49665f" emissive="#203a35" emissiveIntensity={0.16} roughness={0.55} metalness={0.32}/></mesh>
      <mesh position={[-3.92,-0.095,-5.1]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[0.03,2.1]}/><meshStandardMaterial color="#887153" emissive="#3b2b1b" emissiveIntensity={0.12} roughness={0.55} metalness={0.28}/></mesh>
    </group>
    <mesh name="home-walkable-navigation-surface" position={[0,0.18,-1.45]} rotation={[-Math.PI/2,0,0]} onClick={onWalk}>
      <planeGeometry args={[13.4,17.5]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}''')

replace_function('ContinuousVaultSkin', 'CantedWallMass', r'''function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  const left=useMemo(()=>{const q=new THREE.Shape();q.moveTo(-5.75,-2.72);q.lineTo(-1.62,-2.72);q.lineTo(-1.76,.72);q.lineTo(-2.62,2.62);q.lineTo(-4.18,3.28);q.lineTo(-5.48,2.44);q.closePath();const g=new THREE.ExtrudeGeometry(q,{depth:2.62,steps:1,curveSegments:12,bevelEnabled:true,bevelSegments:5,bevelSize:.16,bevelThickness:.14});g.center();g.computeVertexNormals();return g},[])
  const right=useMemo(()=>{const q=new THREE.Shape();q.moveTo(1.46,-2.72);q.lineTo(5.68,-2.72);q.lineTo(5.42,2.28);q.lineTo(4.12,3.22);q.lineTo(2.52,2.68);q.lineTo(1.62,.82);q.closePath();const g=new THREE.ExtrudeGeometry(q,{depth:2.34,steps:1,curveSegments:12,bevelEnabled:true,bevelSegments:5,bevelSize:.15,bevelThickness:.13});g.center();g.computeVertexNormals();return g},[])
  const rear=useMemo(()=>{const q=new THREE.Shape();q.moveTo(-4.25,-2.45);q.lineTo(4.12,-2.45);q.lineTo(3.72,1.18);q.lineTo(2.58,2.42);q.lineTo(.82,2.92);q.lineTo(-1.24,2.78);q.lineTo(-2.92,2.18);q.lineTo(-4.08,.92);q.closePath();const hole=new THREE.Path();hole.moveTo(-1.95,-1.9);hole.lineTo(1.88,-1.9);hole.lineTo(1.78,.62);hole.lineTo(.92,1.52);hole.lineTo(-.66,1.7);hole.lineTo(-1.72,.72);hole.closePath();q.holes.push(hole);const g=new THREE.ExtrudeGeometry(q,{depth:.64,steps:1,curveSegments:14,bevelEnabled:true,bevelSegments:4,bevelSize:.1,bevelThickness:.08});g.center();g.computeVertexNormals();return g},[])
  useEffect(()=>()=>{left.dispose();right.dispose();rear.dispose()},[left,right,rear])
  return <group name="home-v47-reliquary-apse" userData={{treatment:'v47-asymmetric-load-bearing-apse-masses-with-open-machine-bay-no-arch-facade v50-retained-pixel-depth-shell'}}>
    <mesh name="home-v47-left-apse-mass" geometry={left} position={[-.7,2.46,-8.72]} rotation={[0,.12,.018]} castShadow receiveShadow><meshPhysicalMaterial color="#202926" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(.42,.42)} roughnessMap={pack.arm} roughness={.86} metalness={.02} envMapIntensity={.58}/></mesh>
    <mesh name="home-v47-right-apse-mass" geometry={right} position={[.48,2.54,-8.92]} rotation={[0,-.11,-.012]} castShadow receiveShadow><meshPhysicalMaterial color="#282e2b" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(.38,.38)} roughnessMap={pack.arm} roughness={.85} metalness={.022} envMapIntensity={.6}/></mesh>
    <mesh geometry={rear} position={[.06,2.38,-10.18]} rotation={[0,.015,-.008]} castShadow receiveShadow><meshPhysicalMaterial color="#151d1b" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(.28,.28)} roughnessMap={pack.arm} roughness={.88} metalness={.018} envMapIntensity={.5}/></mesh>
    <TaperedLoadBeam from={[-4.55,.18,-7.15]} to={[-2.42,4.65,-9.18]} width={.36} color="#38443f"/>
    <TaperedLoadBeam from={[4.38,.18,-7.28]} to={[2.28,4.7,-9.32]} width={.34} color="#49443a"/>
  </group>
}''')

replace_function('MachineCavityLiner', 'SanctuarySideGallery', r'''function MachineCavityLiner(){
  const rear=useMemo(()=>{const q=new THREE.Shape();q.moveTo(-3.22,-2.08);q.lineTo(3.18,-2.08);q.lineTo(2.92,1.12);q.lineTo(2.08,1.92);q.lineTo(.68,2.28);q.lineTo(-.92,2.2);q.lineTo(-2.36,1.72);q.lineTo(-3.08,.98);q.closePath();const g=new THREE.ExtrudeGeometry(q,{depth:.42,steps:1,curveSegments:12,bevelEnabled:true,bevelSegments:4,bevelSize:.075,bevelThickness:.065});g.center();g.computeVertexNormals();return g},[])
  useEffect(()=>()=>rear.dispose(),[rear])
  return <group name="home-v47-reliquary-cavity" userData={{treatment:'v47-deep-open-machine-bay-with-staggered-bulkheads-floor-service-depth-and-side-galleries v50-machine-bay-three-layer-depth'}}>
    <mesh geometry={rear} position={[0,2.28,-9.55]} castShadow receiveShadow><meshPhysicalMaterial color="#0d1413" roughness={.82} metalness={.3} envMapIntensity={.46}/></mesh>
    <mesh geometry={rear} position={[0,2.24,-8.72]} scale={[.82,.82,.82]} castShadow receiveShadow><meshPhysicalMaterial color="#19221f" roughness={.74} metalness={.34} envMapIntensity={.56}/></mesh>
    <mesh position={[-2.72,2.0,-8.18]} rotation={[0,.16,.035]} castShadow receiveShadow><boxGeometry args={[.22,3.26,1.08]}/><meshPhysicalMaterial color="#313b37" roughness={.66} metalness={.34} envMapIntensity={.68}/></mesh>
    <mesh position={[2.52,2.08,-8.3]} rotation={[0,-.14,-.03]} castShadow receiveShadow><boxGeometry args={[.24,3.42,1.12]}/><meshPhysicalMaterial color="#403a31" roughness={.66} metalness={.34} envMapIntensity={.68}/></mesh>
    <pointLight position={[-2.0,2.58,-7.82]} color="#76a69d" intensity={.9} distance={7.2} decay={2}/>
    <pointLight position={[1.92,2.48,-7.9]} color="#b49466" intensity={.84} distance={7.0} decay={2}/>
  </group>
}''')

replace_function('SanctuarySideGallery', 'SanctuaryArchitecture', r'''function SanctuarySideGallery(){
  const left=useMemo(()=>{const q=new THREE.Shape();q.moveTo(-1.1,-2.15);q.lineTo(.9,-1.96);q.lineTo(1.18,.9);q.lineTo(.34,2.02);q.lineTo(-.82,1.62);q.closePath();const g=new THREE.ExtrudeGeometry(q,{depth:3.15,steps:1,curveSegments:10,bevelEnabled:true,bevelSegments:4,bevelSize:.11,bevelThickness:.1});g.center();g.computeVertexNormals();return g},[])
  const right=useMemo(()=>{const q=new THREE.Shape();q.moveTo(-.92,-2.08);q.lineTo(1.12,-2.18);q.lineTo(.94,1.48);q.lineTo(-.08,2.1);q.lineTo(-1.02,1.34);q.closePath();const g=new THREE.ExtrudeGeometry(q,{depth:2.72,steps:1,curveSegments:10,bevelEnabled:true,bevelSegments:4,bevelSize:.1,bevelThickness:.1});g.center();g.computeVertexNormals();return g},[])
  useEffect(()=>()=>{left.dispose();right.dispose()},[left,right])
  return <group name="home-v47-side-gallery" userData={{treatment:'v47-staggered-side-gallery-masses-create-sanctuary-depth-no-repeated-bays v50-long-perspective-side-returns'}}>
    <mesh geometry={left} position={[-5.15,2.03,-6.75]} rotation={[0,.28,.028]} castShadow receiveShadow><meshPhysicalMaterial color="#1d2724" roughness={.87} metalness={.025} envMapIntensity={.58}/></mesh>
    <mesh geometry={right} position={[5.06,2.12,-7.08]} rotation={[0,-.24,-.022]} castShadow receiveShadow><meshPhysicalMaterial color="#252a27" roughness={.86} metalness={.03} envMapIntensity={.6}/></mesh>
    <RecessedPractical position={[-5.2,.38,-2.5]}/><RecessedPractical position={[5.02,.42,-3.4]} warm={false}/>
    <pointLight position={[-4.62,1.35,-6.15]} color="#8db9af" intensity={.58} distance={6.4} decay={2}/>
    <pointLight position={[4.46,1.32,-6.42]} color="#c3a471" intensity={.52} distance={6.2} decay={2}/>
  </group>
}''')

replace_function('SanctuaryArchitecture', 'SanctuaryGlazing', r'''function SanctuaryArchitecture(){const pack=useStonePack(.3,.46);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'cinematic-integrated-reliquary-sanctuary-v49',construction:'asymmetric-apse-side-galleries-deep-machine-bay-and-restrained-real-practicals',visualTreatment:'v49-authored-reliquary-production-candidate v50-retained-pixel-rebuild'}}>
  <SanctuarySideGallery/>
  <ContinuousVaultSkin pack={pack}/>
  <MachineCavityLiner/>
  <group name="home-v47-depth-practicals" userData={{treatment:'v47-restrained-recessed-machine-bay-and-gallery-lighting v50-perspective-depth-practicals'}}>
    <RecessedPractical position={[-4.9,.46,.8]}/><RecessedPractical position={[4.76,.46,.2]} warm={false}/>
    <RecessedPractical position={[-3.8,.42,-6.9]} warm={false}/><RecessedPractical position={[3.55,.42,-7.35]}/>
  </group>
</group>}
''')

replace_function('ReliquaryWing', 'CrownBridge', r'''function ReliquaryWing({side}:{side:-1|1}){
  const geometry=useMemo(()=>{const q=new THREE.Shape();q.moveTo(-.78,-.86);q.lineTo(.86,-.8);q.lineTo(.68,.12);q.lineTo(.18,.96);q.lineTo(-.54,.78);q.lineTo(-.88,.04);q.closePath();const hole=new THREE.Path();hole.moveTo(-.3,-.28);hole.lineTo(.36,-.3);hole.lineTo(.28,.18);hole.lineTo(-.06,.5);hole.lineTo(-.38,.18);hole.closePath();q.holes.push(hole);const g=new THREE.ExtrudeGeometry(q,{depth:.92,steps:1,curveSegments:10,bevelEnabled:true,bevelSegments:4,bevelSize:.1,bevelThickness:.1});g.center();g.computeVertexNormals();return g},[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh name={side<0?'home-v47-left-load-arm':'home-v47-right-load-arm'} geometry={geometry} position={[side*1.42,1.72,-5.06]} rotation={[side*.04,side*.25,side*.12]} castShadow receiveShadow userData={{treatment:'v47-low-canted-floor-rooted-load-arm-open-center-no-panel-no-visible-feet v50-grounded-orb-load-path'}}><meshPhysicalMaterial color={side<0?'#21302c':'#353128'} roughness={.67} metalness={.4} clearcoat={.015} clearcoatRoughness={.8} envMapIntensity={.7}/></mesh>
}''')

replace_function('OrbCradle', 'MachineCoreAssembly', r'''function OrbCradle(){return <group name="home-orb-engineered-cradle" userData={{treatment:'v47-deep-machine-bay-and-low-load-arms-physically-capture-core-no-display-stand v50-four-point-structural-capture'}}>
  <ReliquaryWing side={-1}/><ReliquaryWing side={1}/><CrownBridge/>
  <TaperedLoadBeam from={[-2.55,.12,-5.32]} to={[-1.02,2.62,-5.08]} width={.24} color="#35463f"/>
  <TaperedLoadBeam from={[2.5,.12,-5.38]} to={[1.0,2.66,-5.1]} width={.24} color="#554b3b"/>
</group>}
''')

replace_function('MachineCoreAssembly', 'SacredOrb', r'''function MachineCoreAssembly(){
  const plate=useMemo(()=>{const q=new THREE.Shape();q.moveTo(-.92,-.9);q.lineTo(.88,-.76);q.lineTo(.98,.32);q.lineTo(.42,1.04);q.lineTo(-.58,.92);q.lineTo-0.98,.12);q.closePath();const hole=new THREE.Path();hole.absellipse(0,.04,.38,.46,0,Math.PI*2,false,0);q.holes.push(hole);const g=new THREE.ExtrudeGeometry(q,{depth:.28,steps:1,curveSegments:20,bevelEnabled:true,bevelSegments:3,bevelSize:.055,bevelThickness:.055});g.center();g.computeVertexNormals();return g},[])
  useEffect(()=>()=>plate.dispose(),[plate])
  return <group name="home-v47-machine-core-assembly" position={[0,2.22,-5.22]} userData={{treatment:'v47-layered-machined-aperture-deep-captures-authored-heart-trace v50-rear-machine-aperture-integrated'}}>
    <mesh geometry={plate} position={[0,0,-.42]} scale={[1.32,1.32,1.32]} castShadow receiveShadow><meshPhysicalMaterial color="#121a18" roughness={.58} metalness={.54} envMapIntensity={.7}/></mesh>
    <mesh geometry={plate} position={[0,0,-.12]} rotation={[0,Math.PI,.035]} scale={[1.08,1.08,1.08]} castShadow receiveShadow><meshPhysicalMaterial color="#29312d" roughness={.62} metalness={.46} envMapIntensity={.72}/></mesh>
    <mesh geometry={plate} position={[0,0,.18]} rotation={[0,Math.PI,-.028]} scale={[.88,.88,.88]} castShadow receiveShadow><meshPhysicalMaterial color="#3b3b32" roughness={.6} metalness={.48} envMapIntensity={.74}/></mesh>
    <pointLight position={[0,.08,.55]} color="#7fc0b5" intensity={1.05} distance={4.2} decay={2}/>
  </group>
}
'''.replace('q.lineTo-0.98,.12)', 'q.lineTo(-.98,.12)'))

replace_function('SacredOrb', 'HumanPresence', r'''function OrbArmorPlate({position,rotation,scale=[1,1,1],warm=false}:{position:Vec3;rotation:Vec3;scale?:Vec3;warm?:boolean}){
  return <RoundedBox args={[1.08,.26,.72]} radius={.1} smoothness={4} position={position as [number,number,number]} rotation={rotation as [number,number,number]} scale={scale as [number,number,number]} castShadow receiveShadow>
    <meshPhysicalMaterial color={warm?'#514a3b':'#2b3c37'} roughness={.56} metalness={.62} clearcoat={.025} clearcoatRoughness={.72} envMapIntensity={.78}/>
  </RoundedBox>
}

function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null),activeAction=useRef<THREE.AnimationAction|null>(null)
  const orb=useGLTF(ORB_MODEL)
  const authoredOrb=useMemo(()=>cloneOrbModel(orb.scene),[orb.scene])
  const {actions}=useAnimations(orb.animations,authoredOrb)
  const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion])
  useEffect(()=>{const allActions=Object.values(actions).filter((action):action is THREE.AnimationAction=>Boolean(action));if(reducedMotion){allActions.forEach((action)=>action.stop());activeAction.current=null;return}const next=actions[ORB_CLIPS[state]];if(!next)return;const previous=activeAction.current;if(previous&&previous!==next)previous.fadeOut(.2);next.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(.2).play();activeAction.current=next},[actions,reducedMotion,state])
  useEffect(()=>()=>{Object.values(actions).forEach((action)=>action?.stop())},[actions])
  useFrame(({clock})=>{if(!root.current)return;root.current.rotation.y=reducedMotion?0:Math.sin(clock.elapsedTime*.11)*.009;root.current.position.y=ORB.y+(reducedMotion?0:Math.sin(clock.elapsedTime*.38)*.012)})
  const stateColor=state==='warning'?'#d0a06e':state==='thinking'||state==='reflecting'?'#a4b3d6':'#8ce0d4'
  const intensity=state==='speaking'?1.22:state==='listening'?1.1:1.0
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v49-governed-faceted-orb-heart-primary-reliquary-content v50-retained-pixel-rebuild-opaque-engineered-relic'}}>
    <group name="home-orb-engineered-body" userData={{treatment:'v50-six-plate-opaque-reliquary-armor-no-glass-ball-no-orbit-rings'}}>
      <OrbArmorPlate position={[0,.7,0]} rotation={[.08,0,.08]} scale={[1.12,1,.92]}/>
      <OrbArmorPlate position={[0,-.68,.02]} rotation={[-.08,0,-.08]} scale={[1.06,1,.9]} warm/>
      <OrbArmorPlate position={[-.66,.02,0]} rotation={[0,.12,Math.PI/2-.12]} scale={[1.02,1,.9]}/>
      <OrbArmorPlate position={[.66,.02,-.02]} rotation={[0,-.12,Math.PI/2+.12]} scale={[1.02,1,.9]} warm/>
      <OrbArmorPlate position={[0,.02,-.62]} rotation={[Math.PI/2-.08,0,.16]} scale={[.9,1,.88]}/>
      <OrbArmorPlate position={[0,.02,.62]} rotation={[Math.PI/2+.08,0,-.14]} scale={[.9,1,.88]} warm/>
    </group>
    <group scale={0.64} position={[0,-.05,0]} rotation={[0,.18,0]} name="home-orb-authored-core" userData={{treatment:'v50-contained-governed-heart-inside-opaque-machined-armor'}}><primitive object={authoredOrb}/></group>
    <pointLight color={stateColor} intensity={intensity*1.45} distance={9.2} decay={2}/>
    <pointLight position={[0,.52,-1.25]} color="#d7ba82" intensity={.96} distance={6.2} decay={2}/>
    <pointLight position={[0,-.38,.66]} color="#75bdb5" intensity={.72} distance={5.2} decay={2}/>
  </group>
}
''')

text = text.replace("const portrait=size.height>size.width,backDistance=portrait?0.08:0.18,eyeHeight=portrait?1.56:1.62;if(camera instanceof THREE.PerspectiveCamera){const desiredFov=portrait?67:58", "const portrait=size.height>size.width,backDistance=portrait?0.11:0.18,eyeHeight=portrait?1.56:1.62;if(camera instanceof THREE.PerspectiveCamera){const desiredFov=portrait?72:56", 1)
text = text.replace("camera.position.set(1.02,1.7,6.72);camera.lookAt(ORB.x,ORB.y-.08,ORB.z)", "camera.position.set(.82,1.72,7.05);camera.lookAt(ORB.x,ORB.y-.08,ORB.z)", 1)
text = text.replace("<pointLight position={[0,2.72,-4.15]} intensity={3.4}", "<pointLight position={[0,2.78,-5.08]} intensity={3.65}", 1)
text = text.replace("gl.toneMappingExposure=2.08", "gl.toneMappingExposure=2.24", 1)

if 'v50-retained-pixel-rebuild' not in text:
    raise SystemExit('V50 marker missing after materialization')

SOURCE.write_text(text)
print('materialized V50 retained-pixel sanctuary and opaque engineered Orb rebuild')
