from pathlib import Path

path = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
source = path.read_text()

def replace_block(start_marker: str, end_marker: str, replacement: str) -> None:
    global source
    start = source.index(start_marker)
    end = source.index(end_marker, start)
    source = source[:start] + replacement.rstrip() + '\n\n' + source[end:]

replace_block(
    'function SanctuaryArchitecture() {',
    'function SanctuaryGlazing()',
    r'''function SanctuaryArchitecture() {
  const pack = useStonePack(0.72,1.28)
  return <group name="home-sanctuary-pavilion" userData={{ visualOwner:'material-authored-sacred-tech-sanctuary-v27',construction:'asymmetric-open-pier-court-with-relic-spine',visualTreatment:'v27-authored-pier-and-recess-court' }}>
    <group rotation={[0,0.045,0]}>
      <ArchitecturalStone pack={pack} position={[-6.05,1.48,2.65]} size={[0.54,2.72,1.2]} color="#202924" roughness={0.62} />
      <ArchitecturalStone pack={pack} position={[-5.82,2.15,-1.35]} size={[0.72,4.08,1.55]} color="#18211d" roughness={0.64} />
      <ArchitecturalStone pack={pack} position={[-6.12,1.2,-6.1]} size={[0.58,2.15,1.05]} color="#2b342e" roughness={0.58} />
    </group>
    <group rotation={[0,-0.035,0]}>
      <ArchitecturalStone pack={pack} position={[6.02,1.92,1.35]} size={[0.6,3.58,1.34]} color="#1b2420" roughness={0.64} />
      <ArchitecturalStone pack={pack} position={[5.78,1.35,-3.15]} size={[0.76,2.45,1.25]} color="#28312b" roughness={0.59} />
      <ArchitecturalStone pack={pack} position={[6.08,2.38,-7.1]} size={[0.56,4.42,1.18]} color="#17201c" roughness={0.66} />
    </group>
    <group name="home-relic-spine" rotation={[0,0.018,0]}>
      <ArchitecturalStone pack={pack} position={[-3.72,1.15,-9.22]} size={[1.55,2.05,0.52]} color="#26302a" roughness={0.59} />
      <ArchitecturalStone pack={pack} position={[-0.75,2.02,-9.38]} size={[2.35,3.75,0.58]} color="#161f1c" roughness={0.66} />
      <ArchitecturalStone pack={pack} position={[2.05,1.42,-9.3]} size={[1.55,2.58,0.5]} color="#303831" roughness={0.57} />
      <ArchitecturalStone pack={pack} position={[4.38,2.22,-9.44]} size={[0.72,4.12,0.56]} color="#1b2420" roughness={0.63} />
      <MetalTrim position={[-0.75,2.12,-9.075]} size={[1.62,0.024,0.028]} color="#9b8d68" emissive="#382f20" intensity={0.025} />
      <MetalTrim position={[2.05,1.53,-9.04]} size={[0.92,0.018,0.024]} color="#648685" emissive="#173637" intensity={0.03} />
    </group>
    <group name="home-machined-buttresses">
      <mesh position={[-4.82,1.15,-5.4]} rotation={[0,0,-0.18]} castShadow><boxGeometry args={[0.16,2.25,0.22]} /><meshStandardMaterial color="#59645d" metalness={0.82} roughness={0.29} envMapIntensity={1.1} /></mesh>
      <mesh position={[4.72,1.48,-5.85]} rotation={[0,0,0.16]} castShadow><boxGeometry args={[0.15,2.8,0.2]} /><meshStandardMaterial color="#6c6858" metalness={0.86} roughness={0.27} envMapIntensity={1.12} /></mesh>
      <mesh position={[-4.35,0.92,1.3]} rotation={[0,0,0.22]} castShadow><boxGeometry args={[0.14,1.72,0.2]} /><meshStandardMaterial color="#6f705f" metalness={0.84} roughness={0.28} envMapIntensity={1.1} /></mesh>
    </group>
    <RecessedPractical position={[-5.3,0.18,2.95]} /><RecessedPractical position={[5.25,0.18,1.55]} warm={false} />
    <RecessedPractical position={[-5.55,0.18,-6.15]} warm={false} /><RecessedPractical position={[5.5,0.18,-7.1]} />
  </group>
}'''
)

replace_block(
    'function SanctuaryGlazing()',
    'function SanctuaryCeiling()',
    r'''function SanctuaryGlazing(){
  const glass=<meshPhysicalMaterial color="#172622" roughness={0.18} metalness={0.04} transmission={0.16} transparent opacity={0.26} clearcoat={0.66} clearcoatRoughness={0.18} envMapIntensity={1.18} />
  return <group name="home-architectural-glazing" userData={{treatment:'v27-sparse-structural-glass-fins-open-air'}}>
    <mesh position={[-6.36,1.62,4.45]} rotation={[0,0.08,0]} castShadow receiveShadow><boxGeometry args={[0.035,2.65,2.6]} />{glass}</mesh>
    <mesh position={[-6.32,1.8,-4.0]} rotation={[0,-0.05,0]} castShadow receiveShadow><boxGeometry args={[0.035,2.95,2.85]} />{glass}</mesh>
    <mesh position={[6.34,1.72,4.0]} rotation={[0,-0.06,0]} castShadow receiveShadow><boxGeometry args={[0.035,2.8,2.45]} />{glass}</mesh>
    <mesh position={[6.31,1.92,-4.75]} rotation={[0,0.05,0]} castShadow receiveShadow><boxGeometry args={[0.035,3.18,2.75]} />{glass}</mesh>
  </group>
}'''
)

replace_block(
    'function SanctuaryCeiling() {',
    'function FloorPanelJoints()',
    r'''function SanctuaryCeiling() {
  const pack = useStonePack(0.64,1.08)
  return <group name="home-architectural-canopy" userData={{ treatment:'asymmetric-load-bearing-canopy-v27',visualTreatment:'v27-open-ribbed-skylight-with-machined-ties' }}>
    <group rotation={[0,0.15,0]}><ArchitecturalStone pack={pack} position={[-4.15,4.02,2.55]} size={[3.35,0.2,0.34]} color="#1b2420" roughness={0.63} /></group>
    <group rotation={[0,-0.12,0]}><ArchitecturalStone pack={pack} position={[3.65,4.12,1.0]} size={[4.05,0.18,0.32]} color="#17201d" roughness={0.66} /></group>
    <group rotation={[0,0.095,0]}><ArchitecturalStone pack={pack} position={[-2.55,4.22,-4.55]} size={[3.7,0.2,0.34]} color="#202923" roughness={0.63} /></group>
    <group rotation={[0,-0.14,0]}><ArchitecturalStone pack={pack} position={[4.05,4.08,-7.0]} size={[2.6,0.18,0.3]} color="#19221e" roughness={0.67} /></group>
    <mesh position={[-1.0,3.98,1.45]} rotation={[0,0.42,0]} castShadow><boxGeometry args={[0.07,0.07,4.8]} /><meshStandardMaterial color="#7a725e" metalness={0.9} roughness={0.23} /></mesh>
    <mesh position={[1.35,4.05,-3.25]} rotation={[0,-0.34,0]} castShadow><boxGeometry args={[0.065,0.065,5.2]} /><meshStandardMaterial color="#557270" metalness={0.9} roughness={0.24} /></mesh>
    <mesh position={[0.15,4.1,-7.1]} rotation={[0,0.3,0]} castShadow><boxGeometry args={[0.06,0.06,3.6]} /><meshStandardMaterial color="#746b57" metalness={0.89} roughness={0.25} /></mesh>
  </group>
}'''
)

replace_block(
    'function OrbCradle(){',
    'function SacredOrb',
    r'''function OrbCradle(){
  return <group name="home-orb-engineered-cradle" position={[0,0,-2.15]} userData={{treatment:'low-three-point-machined-yoke-v27',visualTreatment:'v27-angular-cantilever-docking-frame-no-stem'}}>
    <PouredStone position={[-0.4,0.14,0.16]} size={[0.3,0.1,0.34]} color="#1b2521" metalness={0.46} roughness={0.34} />
    <PouredStone position={[0.4,0.14,0.16]} size={[0.3,0.1,0.34]} color="#1b2521" metalness={0.46} roughness={0.34} />
    <PouredStone position={[0,0.14,-0.38]} size={[0.34,0.1,0.28]} color="#242d28" metalness={0.48} roughness={0.33} />
    <mesh position={[-0.3,0.49,0.08]} rotation={[0.04,0,-0.72]} castShadow><boxGeometry args={[0.08,0.68,0.1]} /><meshStandardMaterial color="#59655e" metalness={0.91} roughness={0.22} envMapIntensity={1.2} /></mesh>
    <mesh position={[0.3,0.49,0.08]} rotation={[0.04,0,0.72]} castShadow><boxGeometry args={[0.08,0.68,0.1]} /><meshStandardMaterial color="#59655e" metalness={0.91} roughness={0.22} envMapIntensity={1.2} /></mesh>
    <mesh position={[0,0.48,-0.28]} rotation={[0.82,0,0]} castShadow><boxGeometry args={[0.09,0.62,0.1]} /><meshStandardMaterial color="#8a7d5f" metalness={0.9} roughness={0.23} envMapIntensity={1.18} /></mesh>
    <mesh position={[-0.19,0.73,0.04]} rotation={[0.12,0,-0.35]} castShadow><boxGeometry args={[0.14,0.08,0.18]} /><meshStandardMaterial color="#2d3934" metalness={0.76} roughness={0.28} /></mesh>
    <mesh position={[0.19,0.73,0.04]} rotation={[0.12,0,0.35]} castShadow><boxGeometry args={[0.14,0.08,0.18]} /><meshStandardMaterial color="#2d3934" metalness={0.76} roughness={0.28} /></mesh>
  </group>
}'''
)

replace_block(
    'function SacredOrb({state,reducedMotion,onOpen}',
    'function HumanPresence',
    r'''function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){
  const root=useRef<THREE.Group>(null),authoredCore=useRef<THREE.Group>(null),activeAction=useRef<THREE.AnimationAction|null>(null); const orb=useGLTF(ORB_MODEL); const authoredOrb=useMemo(()=>cloneOrbModel(orb.scene),[orb.scene]); const {actions}=useAnimations(orb.animations,authoredOrb); const sensory=useMemo(()=>resolveOrbSensoryOutput(state,reducedMotion,true),[state,reducedMotion])
  useEffect(()=>{const allActions=Object.values(actions).filter((action):action is THREE.AnimationAction=>Boolean(action));if(reducedMotion){allActions.forEach((action)=>action.stop());activeAction.current=null;return}const next=actions[ORB_CLIPS[state]];if(!next)return;const previous=activeAction.current;if(previous&&previous!==next)previous.fadeOut(0.2);next.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(0.2).play();activeAction.current=next},[actions,reducedMotion,state]); useEffect(()=>()=>{Object.values(actions).forEach((action)=>action?.stop())},[actions])
  useFrame(({clock})=>{if(!root.current||reducedMotion)return;root.current.rotation.y=Math.sin(clock.elapsedTime*0.13)*0.075;root.current.position.y=ORB.y+Math.sin(clock.elapsedTime*0.48)*0.012;if(authoredCore.current){const pulse=state==='speaking'?0.155:state==='listening'?0.15:0.146+Math.sin(clock.elapsedTime*0.85)*0.002;authoredCore.current.scale.setScalar(pulse)}})
  const stateColor=state==='warning'?'#d6a06e':state==='thinking'||state==='reflecting'?'#9aa8d0':'#8fd6d1'; const intensity=state==='speaking'?1.22:state==='listening'?1.08:0.86
  const armor=[
    [[0.0,0.38,0.0],[0.12,0.22,0.04],[0.34,0.12,0.28]],
    [[0.0,-0.38,0.0],[-0.12,-0.18,-0.05],[0.32,0.11,0.27]],
    [[0.36,0.04,0.02],[0.22,0.18,-0.2],[0.12,0.34,0.3]],
    [[-0.36,-0.02,0.0],[-0.2,-0.18,0.24],[0.12,0.32,0.28]],
    [[0.03,0.02,0.34],[-0.12,0.28,0.04],[0.28,0.3,0.1]],
    [[-0.04,0.0,-0.34],[0.16,-0.25,-0.04],[0.26,0.28,0.1]],
  ] as const
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event) => { event.stopPropagation(); onOpen() }} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v27-faceted-crystalline-relic-machine'}}>
    <group ref={authoredCore} scale={0.146} name="home-orb-authored-core"><primitive object={authoredOrb} /></group>
    <group name="home-orb-engineered-body" rotation={[0.08,0.3,-0.04]}>
      <mesh name="home-orb-faceted-reactor" scale={[0.37,0.43,0.35]} castShadow><icosahedronGeometry args={[1,1]} /><meshPhysicalMaterial color="#17211f" emissive={stateColor} emissiveIntensity={intensity*0.032} roughness={0.22} metalness={0.82} clearcoat={0.2} clearcoatRoughness={0.31} envMapIntensity={1.24} /></mesh>
      {armor.map(([position,rotation,scale],index)=><mesh key={`armor-${index}`} name={`home-orb-armor-${index+1}`} position={position as [number,number,number]} rotation={rotation as [number,number,number]} scale={scale as [number,number,number]} castShadow><octahedronGeometry args={[1,0]} /><meshPhysicalMaterial color={index%2===0?'#35423d':'#4a493f'} emissive={stateColor} emissiveIntensity={0.009} roughness={0.27} metalness={0.78} clearcoat={0.16} clearcoatRoughness={0.32} envMapIntensity={1.18} /></mesh>)}
      <mesh name="home-orb-energy-aperture" position={[0,-0.015,0.34]} scale={[0.13,0.13,0.045]}><sphereGeometry args={[1,24,16]} /><meshStandardMaterial color="#dcebe8" emissive={stateColor} emissiveIntensity={intensity*0.72} roughness={0.32} metalness={0.18} /></mesh>
      <mesh name="home-orb-stabilizer-arc-a" rotation={[0.3,0.55,0.1]}><torusGeometry args={[0.49,0.013,8,56,Math.PI*1.18]} /><meshStandardMaterial color="#64716c" metalness={0.91} roughness={0.23} /></mesh>
      <mesh name="home-orb-stabilizer-arc-b" rotation={[1.4,-0.18,0.72]}><torusGeometry args={[0.44,0.012,8,52,Math.PI*0.94]} /><meshStandardMaterial color="#877b5f" metalness={0.89} roughness={0.25} /></mesh>
      <mesh name="home-orb-stabilizer-arc-c" rotation={[-0.74,0.4,-0.42]}><torusGeometry args={[0.405,0.009,8,44,Math.PI*0.72]} /><meshStandardMaterial color="#536764" metalness={0.9} roughness={0.24} /></mesh>
      <group name="home-orb-crystalline-fragments">{ORB_FRAGMENT_LAYOUT.map(([position,rotation,scale],index)=><mesh key={index} position={position as [number,number,number]} rotation={rotation as [number,number,number]} scale={scale*2.45}><tetrahedronGeometry args={[1,0]} /><meshPhysicalMaterial color={index%2===0?'#91aaa4':'#a29679'} emissive={stateColor} emissiveIntensity={0.035} roughness={0.25} metalness={0.36} clearcoat={0.24} clearcoatRoughness={0.24} /></mesh>)}</group>
      <pointLight color={stateColor} intensity={intensity*0.28} distance={2.7} decay={2} />
    </group>
  </group>
}'''
)

source = source.replace("data-home-final-art-revision=\"v26-open-court-integrated-relic-candidate\"", "data-home-final-art-revision=\"v27-open-pier-faceted-relic-final-candidate\"")
source = source.replace("cinematic-pbr-v25-physical-relic-sanctuary", "cinematic-pbr-v27-open-pier-faceted-relic-sanctuary")

path.write_text(source)
