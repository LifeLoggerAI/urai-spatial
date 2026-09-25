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


if 'v51-open-reliquary-retained-pixel-rebuild' in text:
    print('V51 open reliquary rebuild already materialized')
    raise SystemExit(0)

if 'v50-retained-pixel-rebuild' not in text:
    raise SystemExit('expected V50 source marker was not found')

replace_function('cloneOrbModel', 'PouredStone', r'''function cloneOrbModel(source: THREE.Object3D) {
  const root = cloneModel(source)
  root.visible = true
  root.traverse((object) => {
    const retiredDisplay = object.name === 'orb-aura' || object.name.startsWith('orb-orbit-')
    if (retiredDisplay) {
      object.visible = false
      object.userData.uraiRetiredVisualRole = 'v51-no-aura-no-orbit-display-language'
      return
    }
    if (object.name === 'orb-core') {
      object.visible = true
      object.scale.multiplyScalar(0.42)
      object.userData.uraiIntegratedVisualRole = 'v51-contained-engine-heart-not-sphere-hero'
    }
    if (object.name === 'orb-heart') {
      object.visible = true
      object.scale.multiplyScalar(0.62)
      object.userData.uraiIntegratedVisualRole = 'v51-contained-emotional-heart'
    }
    if (object.name.startsWith('orb-filament-')) {
      object.visible = true
      object.scale.multiplyScalar(0.44)
      object.userData.uraiIntegratedVisualRole = 'v51-contained-filament'
    }
    if (object.name.startsWith('orb-petal-')) {
      object.visible = true
      object.scale.multiplyScalar(0.92)
      object.userData.uraiIntegratedVisualRole = 'v51-primary-faceted-authored-shell'
    }
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue
      material.color.lerp(new THREE.Color('#223b35'), 0.46)
      material.emissive.lerp(new THREE.Color('#74b6aa'), 0.11)
      material.emissiveIntensity = Math.min(Math.max(material.emissiveIntensity, 0.018), 0.1)
      material.roughness = Math.max(material.roughness, 0.6)
      material.metalness = Math.min(Math.max(material.metalness, 0.34), 0.64)
      material.envMapIntensity = Math.min(Math.max(material.envMapIntensity, 0.48), 0.72)
      if (material instanceof THREE.MeshPhysicalMaterial) {
        material.transmission = 0
        material.thickness = 0
        material.opacity = 1
        material.transparent = false
      }
      material.needsUpdate = true
    }
  })
  root.userData.uraiTreatment = 'v51-authored-faceted-heart-with-small-opaque-machine-clamps'
  return root
}''')

replace_function('SanctuaryCourt', 'ProductionSanctuary', r'''function SanctuaryCourt({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(SANCTUARY)
  const compatibilityModel = useMemo(() => cloneCompatibilitySanctuary(sanctuary.scene), [sanctuary.scene])
  const pack = useStonePack(0.19, 0.24)
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  return <group name="home-authored-terrain" userData={{ treatment: 'v51-open-reliquary-floor-controlled-relief-and-authored-central-lane', source: HOME_PHOTOGRAPHIC_PBR_V19 }}>
    <primitive object={compatibilityModel} />
    <mesh name="home-v48-walkable-photographic-floor" position={[0,-0.16,-1.45]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[16.5,19.2,34,40]} />
      <meshPhysicalMaterial color="#29312d" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.31,0.31)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={0.012} displacementBias={-0.005} roughness={0.8} metalness={0.012} clearcoat={0.018} clearcoatRoughness={0.86} envMapIntensity={0.7} />
    </mesh>
    <mesh name="home-v51-central-finished-stone-lane" position={[0,-0.135,-2.15]} rotation={[-Math.PI/2,0,0]} receiveShadow userData={{treatment:'v51-finished-central-stone-lane-breaks-raw-floor-dominance'}}>
      <planeGeometry args={[7.4,14.6,12,20]} />
      <meshPhysicalMaterial color="#313936" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.16,0.16)} roughnessMap={pack.arm} roughness={0.74} metalness={0.018} clearcoat={0.035} clearcoatRoughness={0.78} envMapIntensity={0.78} />
    </mesh>
    <group name="home-v51-floor-authored-depth" userData={{treatment:'v51-asymmetric-recessed-service-lines-no-grid-no-platform'}}>
      <mesh position={[-2.72,-0.105,-2.9]} rotation={[-Math.PI/2,0,-0.018]} receiveShadow><planeGeometry args={[0.045,10.2]}/><meshStandardMaterial color="#101614" roughness={0.9} metalness={0.05}/></mesh>
      <mesh position={[2.44,-0.104,-3.6]} rotation={[-Math.PI/2,0,0.028]} receiveShadow><planeGeometry args={[0.04,8.8]}/><meshStandardMaterial color="#151b19" roughness={0.9} metalness={0.04}/></mesh>
      <mesh position={[0.7,-0.102,-5.25]} rotation={[-Math.PI/2,0,Math.PI/2]} receiveShadow><planeGeometry args={[0.035,4.2]}/><meshStandardMaterial color="#47655d" emissive="#1b322d" emissiveIntensity={0.1} roughness={0.62} metalness={0.24}/></mesh>
    </group>
    <mesh name="home-walkable-navigation-surface" position={[0,0.18,-1.45]} rotation={[-Math.PI/2,0,0]} onClick={onWalk}>
      <planeGeometry args={[13.4,17.5]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}''')

replace_function('ContinuousVaultSkin', 'CantedWallMass', r'''function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  return <group name="home-v47-reliquary-apse" userData={{treatment:'v51-open-layered-rear-shell-no-house-slabs-no-front-facade'}}>
    <SanctuaryShellMass pack={pack} position={[0,2.65,-10.25]} width={9.8} height={6.1} depth={0.9} openingWidth={4.8} openingHeight={4.2} color="#18211e"/>
    <SanctuaryShellMass pack={pack} position={[0,2.72,-11.02]} width={8.3} height={5.45} depth={0.54} openingWidth={4.15} openingHeight={3.65} color="#101816"/>
    <TaperedLoadBeam from={[-5.15,.16,-7.55]} to={[-3.25,4.82,-9.65]} width={.3} color="#35433e"/>
    <TaperedLoadBeam from={[4.92,.16,-7.75]} to={[3.02,4.92,-9.78]} width={.28} color="#4a4439"/>
    <TaperedLoadBeam from={[-3.18,4.78,-9.66]} to={[-.72,5.38,-10.18]} width={.22} color="#43534d"/>
    <TaperedLoadBeam from={[3.02,4.9,-9.78]} to={[.68,5.42,-10.2]} width={.22} color="#5a5142"/>
  </group>
}''')

replace_function('MachineCavityLiner', 'SanctuarySideGallery', r'''function MachineCavityLiner(){
  return <group name="home-v47-reliquary-cavity" userData={{treatment:'v51-open-machine-bay-rear-ribs-and-depth-no-box-housing'}}>
    <TaperedLoadBeam from={[-2.55,.34,-8.65]} to={[-1.62,4.48,-9.46]} width={.18} color="#283934"/>
    <TaperedLoadBeam from={[2.46,.34,-8.78]} to={[1.52,4.54,-9.52]} width={.18} color="#4c463a"/>
    <TaperedLoadBeam from={[-1.62,4.48,-9.46]} to={[0,5.02,-9.7]} width={.15} color="#334942"/>
    <TaperedLoadBeam from={[1.52,4.54,-9.52]} to={[0,5.02,-9.7]} width={.15} color="#554c3d"/>
    <mesh position={[0,2.38,-10.03]} castShadow receiveShadow><boxGeometry args={[4.9,4.2,.16]}/><meshPhysicalMaterial color="#0c1312" roughness={.9} metalness={.08} envMapIntensity={.34}/></mesh>
    <pointLight position={[-1.72,2.72,-8.35]} color="#78aaa1" intensity={1.15} distance={7.4} decay={2}/>
    <pointLight position={[1.62,2.62,-8.42]} color="#bd9b68" intensity={1.04} distance={7.2} decay={2}/>
  </group>
}''')

replace_function('SanctuarySideGallery', 'SanctuaryArchitecture', r'''function SanctuarySideGallery(){
  const pack=useStonePack(.48,.68)
  return <group name="home-v47-side-gallery" userData={{treatment:'v51-open-asymmetric-buttress-galleries-no-solid-house-blocks-no-repeated-bays'}}>
    <ArchitecturalStone pack={pack} position={[-5.42,1.72,-1.18]} size={[.62,3.45,.82]} color="#202b27" roughness={.82}/>
    <ArchitecturalStone pack={pack} position={[-5.08,1.94,-5.02]} size={[.52,3.9,.74]} color="#18231f" roughness={.84}/>
    <ArchitecturalStone pack={pack} position={[-4.72,2.15,-8.1]} size={[.46,4.3,.66]} color="#26302c" roughness={.82}/>
    <ArchitecturalStone pack={pack} position={[5.34,1.82,-1.9]} size={[.58,3.62,.78]} color="#2c2f2b" roughness={.82}/>
    <ArchitecturalStone pack={pack} position={[4.96,2.06,-5.62]} size={[.5,4.1,.7]} color="#232925" roughness={.84}/>
    <ArchitecturalStone pack={pack} position={[4.55,2.28,-8.32]} size={[.44,4.5,.64]} color="#342f28" roughness={.82}/>
    <TaperedLoadBeam from={[-5.38,3.34,-1.18]} to={[-5.05,3.86,-5.02]} width={.16} color="#41534c"/>
    <TaperedLoadBeam from={[-5.03,3.82,-5.02]} to={[-4.7,4.18,-8.1]} width={.15} color="#33443f"/>
    <TaperedLoadBeam from={[5.32,3.5,-1.9]} to={[4.94,4.02,-5.62]} width={.16} color="#5a5040"/>
    <TaperedLoadBeam from={[4.92,4.02,-5.62]} to={[4.54,4.38,-8.32]} width={.15} color="#4b4438"/>
    <RecessedPractical position={[-5.12,.38,-3.25]}/><RecessedPractical position={[5.02,.4,-4.18]} warm={false}/>
    <pointLight position={[-4.8,1.75,-6.0]} color="#82b7ad" intensity={.68} distance={6.8} decay={2}/>
    <pointLight position={[4.7,1.7,-6.45]} color="#c5a371" intensity={.62} distance={6.6} decay={2}/>
  </group>
}''')

replace_function('SanctuaryArchitecture', 'SanctuaryGlazing', r'''function SanctuaryArchitecture(){const pack=useStonePack(.36,.52);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'cinematic-open-reliquary-sanctuary-v51',construction:'open-buttress-galleries-layered-rear-shell-deep-machine-bay-and-restrained-practicals',visualTreatment:'v51-open-reliquary-retained-pixel-rebuild'}}>
  <SanctuarySideGallery/>
  <ContinuousVaultSkin pack={pack}/>
  <MachineCavityLiner/>
  <group name="home-v51-depth-practicals" userData={{treatment:'v51-recessed-perspective-lighting-without-floating-fixtures'}}>
    <RecessedPractical position={[-4.72,.44,.5]}/><RecessedPractical position={[4.62,.44,-.18]} warm={false}/>
    <RecessedPractical position={[-3.72,.4,-7.42]} warm={false}/><RecessedPractical position={[3.45,.4,-7.76]}/>
  </group>
</group>}''')

replace_function('ReliquaryWing', 'CrownBridge', r'''function ReliquaryWing({side}:{side:-1|1}){
  const s=side
  return <group name={side<0?'home-v47-left-load-arm':'home-v47-right-load-arm'} userData={{treatment:'v51-open-three-member-floor-rooted-jaw-no-panel-no-house-silhouette-no-visible-feet'}}>
    <TaperedLoadBeam from={[s*2.22,.14,-5.42]} to={[s*.92,1.98,-5.16]} width={.2} color={side<0?'#30433d':'#544a3a'}/>
    <TaperedLoadBeam from={[s*1.82,.18,-5.88]} to={[s*.72,2.66,-5.28]} width={.16} color={side<0?'#40564f':'#625744'}/>
    <TaperedLoadBeam from={[s*.92,1.98,-5.16]} to={[s*.5,2.3,-5.04]} width={.13} color={side<0?'#4d665e':'#74664d'}/>
  </group>
}''')

replace_function('OrbCradle', 'MachineCoreAssembly', r'''function OrbCradle(){return <group name="home-orb-engineered-cradle" userData={{treatment:'v51-open-four-point-floor-rooted-load-paths-no-display-stand-no-panel-wings'}}>
  <ReliquaryWing side={-1}/><ReliquaryWing side={1}/><CrownBridge/>
  <TaperedLoadBeam from={[-2.55,.12,-5.62]} to={[-.62,2.82,-5.18]} width={.16} color="#35483f"/>
  <TaperedLoadBeam from={[2.48,.12,-5.7]} to={[(.62),2.84,-5.18]} width={.16} color="#5a4e3c"/>
</group>}''')

replace_function('MachineCoreAssembly', 'OrbArmorPlate', r'''function MachineCoreAssembly(){
  return <group name="home-v47-machine-core-assembly" userData={{treatment:'v51-open-rear-yoke-and-service-crosshead-no-polygon-display-plate'}}>
    <TaperedLoadBeam from={[-1.72,1.16,-6.18]} to={[-.72,2.52,-5.52]} width={.14} color="#263a34"/>
    <TaperedLoadBeam from={[1.68,1.18,-6.22]} to={[(.72),2.54,-5.54]} width={.14} color="#554a39"/>
    <TaperedLoadBeam from={[-1.62,3.24,-6.18]} to={[-.68,2.68,-5.5]} width={.13} color="#375149"/>
    <TaperedLoadBeam from={[1.58,3.26,-6.2]} to={[(.68),2.7,-5.5]} width={.13} color="#625442"/>
    <mesh position={[0,3.26,-6.08]} castShadow receiveShadow><boxGeometry args={[2.8,.14,.2]}/><meshPhysicalMaterial color="#1d2925" roughness={.62} metalness={.48} envMapIntensity={.68}/></mesh>
    <mesh position={[0,1.02,-6.16]} castShadow receiveShadow><boxGeometry args={[2.25,.12,.18]}/><meshPhysicalMaterial color="#272c28" roughness={.68} metalness={.4} envMapIntensity={.62}/></mesh>
    <pointLight position={[0,2.34,-5.82]} color="#7fbdb2" intensity={.72} distance={4.4} decay={2}/>
  </group>
}''')

replace_function('OrbArmorPlate', 'SacredOrb', r'''function OrbArmorPlate({position,rotation,scale=[1,1,1],warm=false}:{position:Vec3;rotation:Vec3;scale?:Vec3;warm?:boolean}){
  return <RoundedBox args={[.58,.14,.38]} radius={.055} smoothness={4} position={position as [number,number,number]} rotation={rotation as [number,number,number]} scale={scale as [number,number,number]} castShadow receiveShadow>
    <meshPhysicalMaterial color={warm?'#655944':'#355149'} roughness={.62} metalness={.54} clearcoat={.016} clearcoatRoughness={.78} envMapIntensity={.7}/>
  </RoundedBox>
}''')

replace_function('SacredOrb', 'HumanPresence', r'''function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null),activeAction=useRef<THREE.AnimationAction|null>(null)
  const orb=useGLTF(ORB_MODEL)
  const authoredOrb=useMemo(()=>cloneOrbModel(orb.scene),[orb.scene])
  const {actions}=useAnimations(orb.animations,authoredOrb)
  const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion])
  useEffect(()=>{const allActions=Object.values(actions).filter((action):action is THREE.AnimationAction=>Boolean(action));if(reducedMotion){allActions.forEach((action)=>action.stop());activeAction.current=null;return}const next=actions[ORB_CLIPS[state]];if(!next)return;const previous=activeAction.current;if(previous&&previous!==next)previous.fadeOut(.2);next.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(.2).play();activeAction.current=next},[actions,reducedMotion,state])
  useEffect(()=>()=>{Object.values(actions).forEach((action)=>action?.stop())},[actions])
  useFrame(({clock})=>{if(!root.current)return;root.current.rotation.y=reducedMotion?0:Math.sin(clock.elapsedTime*.11)*.007;root.current.position.y=ORB.y+(reducedMotion?0:Math.sin(clock.elapsedTime*.38)*.009)})
  const stateColor=state==='warning'?'#d0a06e':state==='thinking'||state==='reflecting'?'#a4b3d6':'#8ce0d4'
  const intensity=state==='speaking'?1.18:state==='listening'?1.08:.96
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v51-authored-faceted-heart-open-machine-capture-no-glass-ball-no-display-case'}}>
    <group name="home-orb-engineered-body" userData={{treatment:'v51-four-small-opaque-machine-clamps-authored-faceted-heart-remains-primary'}}>
      <OrbArmorPlate position={[0,.62,0]} rotation={[.08,0,.05]} scale={[1.05,1,.9]}/>
      <OrbArmorPlate position={[0,-.6,.02]} rotation={[-.08,0,-.05]} scale={[1.02,1,.88]} warm/>
      <OrbArmorPlate position={[-.58,.02,0]} rotation={[0,.1,Math.PI/2-.08]} scale={[1,1,.86]}/>
      <OrbArmorPlate position={[.58,.02,-.02]} rotation={[0,-.1,Math.PI/2+.08]} scale={[1,1,.86]} warm/>
    </group>
    <group scale={0.82} position={[0,-.03,0]} rotation={[0,.18,0]} name="home-orb-authored-core" userData={{treatment:'v51-governed-faceted-authored-heart-primary-inside-open-machine-jaws'}}><primitive object={authoredOrb}/></group>
    <pointLight color={stateColor} intensity={intensity*1.28} distance={8.8} decay={2}/>
    <pointLight position={[0,.5,-1.1]} color="#d5b77d" intensity={.72} distance={5.8} decay={2}/>
    <pointLight position={[0,-.34,.58]} color="#75b8b0" intensity={.56} distance={4.8} decay={2}/>
  </group>
}''')

text = text.replace("userData={{ treatment: 'v49-photographic-pbr-floor-under-authored-reliquary v50-retained-pixel-depth-floor'", "userData={{ treatment: 'v51-open-reliquary-floor-controlled-relief-and-authored-central-lane'", 1)
text = text.replace("data-home-visual-grade=\"cinematic-pbr-v49-authored-reliquary\"", "data-home-visual-grade=\"cinematic-pbr-v51-open-reliquary\"", 1)
text = text.replace("data-home-final-art-revision=\"v49-authored-reliquary-candidate\"", "data-home-final-art-revision=\"v51-open-reliquary-candidate\"", 1)
text = text.replace("data-home-art-certification=\"v49-retained-pixel-candidate-not-certified\"", "data-home-art-certification=\"v51-retained-pixel-candidate-not-certified\"", 1)
text = text.replace("data-home-animation-owner=\"authored-reliquary-v49-plus-governed-living-orb\"", "data-home-animation-owner=\"open-reliquary-v51-plus-governed-living-orb\"", 1)
text = text.replace("pitch=useRef(-0.045)", "pitch=useRef(0.08)", 1)
text = text.replace("pitch.current=-0.045", "pitch.current=0.08", 1)
text = text.replace("const desiredFov=portrait?72:56", "const desiredFov=portrait?64:50", 1)
text = text.replace("gl.toneMappingExposure=2.24", "gl.toneMappingExposure=2.36", 1)

if 'v51-open-reliquary-retained-pixel-rebuild' not in text:
    raise SystemExit('V51 marker missing after materialization')

SOURCE.write_text(text)
print('materialized V51 open reliquary rebuild from literal V50 pixel rejection')
