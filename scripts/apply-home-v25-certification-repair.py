#!/usr/bin/env python3
from pathlib import Path

path = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
source = path.read_text()
original = source


def replace_once(old: str, new: str, label: str):
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    source = source.replace(old, new, 1)


def replace_between(start: str, end: str, replacement: str, label: str):
    global source
    a = source.find(start)
    if a < 0:
        raise SystemExit(f'{label}: start marker missing')
    b = source.find(end, a)
    if b < 0:
        raise SystemExit(f'{label}: end marker missing')
    source = source[:a] + replacement.rstrip() + '\n\n' + source[b:]

replace_once("const ORB = new THREE.Vector3(0, 1.58, -2.15)", "const ORB = new THREE.Vector3(0, 1.43, -2.15)", 'Orb physical height')
replace_once("<StoneTopMaterial pack={pack} color=\"#151b19\" relief={0.004} />", "<StoneTopMaterial pack={pack} color=\"#232a27\" relief={0.006} />", 'floor material lift')

old_foundation = '''    <group name="home-orb-foundation" position={[0,0,-2.15]} userData={{ treatment:'recessed-machine-foundation-v24-no-circular-pad' }}>
      <PouredStone position={[0,0.045,0]} size={[1.22,0.12,1.02]} color="#0a0f0e" metalness={0.12} roughness={0.48} />
      <PouredStone position={[0,0.12,-0.03]} size={[0.82,0.1,0.68]} color="#171d1b" metalness={0.28} roughness={0.38} />
      <MetalTrim position={[0,0.176,0.25]} size={[0.54,0.012,0.02]} color="#736c59" intensity={0.01} />
    </group>'''
new_foundation = '''    <group name="home-orb-foundation" position={[0,0,-2.15]} userData={{ treatment:'recessed-machine-foundation-v25-flush-inlay' }}>
      <PouredStone position={[0,0.035,0]} size={[1.54,0.08,1.18]} color="#151c1a" metalness={0.16} roughness={0.5} />
      <MetalTrim position={[0,0.08,0.42]} size={[0.72,0.008,0.018]} color="#81785f" intensity={0.008} />
    </group>'''
replace_once(old_foundation, new_foundation, 'flush Orb foundation')

architecture = '''const FIN_Z = [3.15, -2.35, -7.05] as const
function SanctuaryArchitecture() {
  const pack = useStonePack(1.1,1.65)
  return <group name="home-sanctuary-pavilion" userData={{ visualOwner:'material-authored-sacred-tech-sanctuary-v25',construction:'asymmetric-load-bearing-court-with-deep-recesses' }}>
    <group rotation={[0,0.035,0]}>
      <ArchitecturalStone pack={pack} position={[-7.0,2.05,-1.2]} size={[0.62,4.0,18.2]} color="#171d1b" roughness={0.68} />
      <ArchitecturalStone pack={pack} position={[-5.95,2.36,-8.78]} size={[1.75,3.15,1.15]} color="#202622" roughness={0.64} />
    </group>
    <group rotation={[0,-0.028,0]}>
      <ArchitecturalStone pack={pack} position={[7.0,2.0,-1.35]} size={[0.58,3.9,18.0]} color="#161c1a" roughness={0.7} />
      <ArchitecturalStone pack={pack} position={[5.72,1.82,-8.92]} size={[2.05,2.45,1.05]} color="#242a26" roughness={0.62} />
    </group>
    <ArchitecturalStone pack={pack} position={[0,3.35,-9.75]} size={[12.3,1.3,0.68]} color="#1b211e" roughness={0.67} />
    <ArchitecturalStone pack={pack} position={[-2.75,1.38,-9.42]} size={[4.25,2.25,0.46]} color="#252c28" roughness={0.64} />
    <ArchitecturalStone pack={pack} position={[2.15,1.12,-9.5]} size={[3.9,1.7,0.42]} color="#1d2421" roughness={0.66} />
    <ArchitecturalStone pack={pack} position={[4.75,2.65,-9.38]} size={[1.15,1.4,0.5]} color="#2a302b" roughness={0.62} />
    <MetalTrim position={[-2.55,2.63,-9.16]} size={[2.4,0.016,0.022]} color="#786f58" intensity={0.012} />
    <MetalTrim position={[2.0,2.02,-9.22]} size={[1.72,0.014,0.022]} color="#4e6968" intensity={0.012} />
    {FIN_Z.map((z,index)=><group key={z} rotation={[0,index===1?0.07:-0.045,0]}>
      <ArchitecturalStone pack={pack} position={[-6.35,2.0,z]} size={[0.5,index===2?2.9:3.35,1.15]} color="#202724" roughness={0.67} />
      <ArchitecturalStone pack={pack} position={[6.35,1.85,z+0.35]} size={[0.46,index===0?2.8:3.15,1.0]} color="#1d2421" roughness={0.69} />
    </group>)}
    <RecessedPractical position={[-6.52,0.18,3.45]} /><RecessedPractical position={[6.48,0.18,2.75]} warm={false} />
    <RecessedPractical position={[-6.45,0.18,-3.0]} warm={false} /><RecessedPractical position={[6.5,0.18,-4.2]} />
  </group>
}'''
replace_between('const FIN_Z =', 'function SanctuaryGlazing()', architecture, 'sanctuary architecture')

ceiling = '''function SanctuaryCeiling() {
  const pack = useStonePack(1.0,1.45)
  return <group name="home-architectural-canopy" userData={{ treatment:'asymmetric-load-bearing-canopy-v25' }}>
    <ArchitecturalStone pack={pack} position={[-5.65,4.05,-1.8]} size={[0.42,0.34,14.2]} color="#151b19" roughness={0.7} />
    <ArchitecturalStone pack={pack} position={[5.7,4.05,-2.2]} size={[0.38,0.32,13.4]} color="#141a18" roughness={0.72} />
    <group rotation={[0,0.06,0]}><ArchitecturalStone pack={pack} position={[-1.0,4.04,2.45]} size={[9.7,0.34,0.5]} color="#1a201d" roughness={0.68} /></group>
    <group rotation={[0,-0.045,0]}><ArchitecturalStone pack={pack} position={[1.2,4.02,-4.65]} size={[8.6,0.32,0.52]} color="#181e1c" roughness={0.69} /></group>
    <ArchitecturalStone pack={pack} position={[0,4.08,-8.45]} size={[11.2,0.3,0.56]} color="#161c1a" roughness={0.7} />
    <mesh position={[0,4.16,-2.1]} rotation={[Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[10.9,13.2]} /><meshStandardMaterial color="#111615" roughness={0.82} metalness={0.05} />
    </mesh>
    <MetalTrim position={[-1.35,3.84,2.4]} size={[3.0,0.016,0.026]} color="#776d55" intensity={0.012} />
    <MetalTrim position={[1.6,3.82,-4.6]} size={[2.3,0.016,0.026]} color="#4c6667" intensity={0.012} />
  </group>
}'''
replace_between('function SanctuaryCeiling()', 'function FloorPanelJoints()', ceiling, 'sanctuary ceiling')

floor_joints = '''function FloorPanelJoints() {
  const shortJoints: readonly [number,number,number][] = [
    [-3.15,2.9,2.5],[1.55,2.9,2.15],[-1.0,-1.35,2.8],[3.45,-1.35,1.75],[-3.55,-5.65,1.95],[0.35,-5.65,2.65],
  ]
  const longitudinal: readonly [number,number,number][] = [[-2.55,1.0,3.6],[2.8,-3.35,3.25],[-0.45,-6.4,2.1]]
  return <group name="home-floor-panel-joints" userData={{ treatment:'broken-large-format-stone-joints-v25-no-horizon-band' }}>
    {shortJoints.map(([x,z,length],index)=><MetalTrim key={`cross-${index}`} position={[x,0.022,z]} size={[length,0.004,0.006]} color="#202624" emissive="#000000" intensity={0} />)}
    {longitudinal.map(([x,z,length],index)=><MetalTrim key={`long-${index}`} position={[x,0.022,z]} size={[0.006,0.004,length]} color="#202624" emissive="#000000" intensity={0} />)}
  </group>
}'''
replace_between('function FloorPanelJoints()', 'function ReflectingChannel', floor_joints, 'floor joints')

orb_platform = '''function OrbPlatform(){
  return <group name="home-orb-machine-plinth" position={[0,0,-2.15]} userData={{treatment:'flush-machined-relic-socket-v25'}}>
    <PouredStone position={[0,0.12,0]} size={[0.92,0.1,0.74]} color="#1d2522" metalness={0.32} roughness={0.4} />
    <MetalTrim position={[0,0.176,0.29]} size={[0.48,0.01,0.026]} color="#8a8065" intensity={0.01} />
  </group>
}

function OrbCradle(){
  return <group name="home-orb-engineered-cradle" position={[0,0,-2.15]} userData={{treatment:'low-three-point-machined-yoke-v25'}}>
    <mesh position={[0,0.5,-0.08]} castShadow><cylinderGeometry args={[0.06,0.09,0.5,12]} /><meshStandardMaterial color="#222c29" metalness={0.86} roughness={0.3} /></mesh>
    <mesh position={[-0.31,0.89,0.02]} rotation={[0.05,0,-0.72]} castShadow><cylinderGeometry args={[0.032,0.05,0.58,10]} /><meshStandardMaterial color="#424c47" metalness={0.9} roughness={0.24} /></mesh>
    <mesh position={[0.31,0.89,0.02]} rotation={[0.05,0,0.72]} castShadow><cylinderGeometry args={[0.032,0.05,0.58,10]} /><meshStandardMaterial color="#424c47" metalness={0.9} roughness={0.24} /></mesh>
    <mesh position={[0,0.86,-0.32]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[0.028,0.042,0.46,10]} /><meshStandardMaterial color="#756f5c" metalness={0.88} roughness={0.27} /></mesh>
  </group>
}'''
replace_between('function OrbPlatform(){', 'function SacredOrb', orb_platform, 'Orb platform/cradle')

replace_once("const pulse=state==='speaking'?0.174:state==='listening'?0.169:0.165+Math.sin(clock.elapsedTime*0.9)*0.002", "const pulse=state==='speaking'?0.238:state==='listening'?0.232:0.226+Math.sin(clock.elapsedTime*0.9)*0.002", 'authored Orb pulse scale')
replace_once('scale={0.165} name="home-orb-authored-core"', 'scale={0.226} name="home-orb-authored-core"', 'authored Orb base scale')
replace_once('scale={[0.275,0.325,0.235]}', 'scale={[0.39,0.46,0.34]}', 'engineered Orb scale')
replace_once('position={[0,0.29,0]}', 'position={[0,0.405,0]}', 'Orb upper cap height')
replace_once('args={[0.12,0.18,0.085,16]}', 'args={[0.16,0.235,0.105,16]}', 'Orb upper cap size')
replace_once('position={[0,-0.29,0]}', 'position={[0,-0.405,0]}', 'Orb lower cap height')
replace_once('args={[0.18,0.12,0.085,16]}', 'args={[0.235,0.16,0.105,16]}', 'Orb lower cap size')
replace_once('args={[0.245,0.009,8,88]}', 'args={[0.345,0.008,8,96]}', 'Orb equatorial seam')
replace_once('args={[0.35,0.0045,10,112]}', 'args={[0.48,0.0042,10,112]}', 'Orb stabilizer one')
replace_once('args={[0.315,0.0042,10,112]}', 'args={[0.43,0.004,10,112]}', 'Orb stabilizer two')
replace_once('args={[0.285,0.004,10,112]}', 'args={[0.385,0.0038,10,112]}', 'Orb stabilizer three')
replace_once('scale={scale}><tetrahedronGeometry', 'scale={scale*1.42}><tetrahedronGeometry', 'Orb fragment scale')
replace_once('position={[0,-0.035,0.255]}', 'position={[0,-0.04,0.355]}', 'Orb state light position')
replace_once("function PhysicalEnvironment(){return <Environment files={HOME_HDR} background={false} environmentIntensity={0.74} />}", "function PhysicalEnvironment(){return <Environment files={HOME_HDR} background={false} environmentIntensity={1.05} />}", 'environment intensity')

replace_once("const duration=reducedMotion?0.45:transition==='life-map'?3.4:2.6", "const duration=reducedMotion?0.9:transition==='life-map'?3.4:2.6", 'reduced-motion lifecycle duration')
replace_once("setPortalSequence('life-map:opening');setTransition('life-map');useSceneStore.getState().enterLifeMap()", "setPortalSequence('life-map:opening');setTransition('life-map')", 'single Life Map transition owner')

old_lighting = '''<ambientLight intensity={0.16} color="#bac5c3" /><hemisphereLight args={['#74898d','#060908',0.31]} /><directionalLight position={[-13,18,9]} intensity={1.02} color="#c8d9dc" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.00012} /><directionalLight position={[10,6,-12]} intensity={0.14} color="#55717a" /><spotLight position={[0,7.5,4]} intensity={0.27} color="#e2dfd5" distance={24} angle={0.4} penumbra={0.96} decay={2} castShadow />'''
new_lighting = '''<ambientLight intensity={0.3} color="#d0d7d3" /><hemisphereLight args={['#8aa0a2','#101513',0.46]} /><directionalLight position={[-13,18,9]} intensity={1.34} color="#d4e0df" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.00012} /><directionalLight position={[10,7,-12]} intensity={0.28} color="#68878c" /><spotLight position={[0,7.5,4]} intensity={0.52} color="#ece6d8" distance={25} angle={0.44} penumbra={0.92} decay={2} castShadow /><pointLight position={[0,3.2,-2.5]} intensity={0.28} distance={7} decay={2} color="#d8c99e" />'''
replace_once(old_lighting, new_lighting, 'physical lighting')
replace_once('opacity={0.42} scale={8} blur={2.5} far={5}', 'opacity={0.56} scale={7} blur={2.15} far={4.5}', 'contact shadow')
replace_once('data-home-visual-grade="cinematic-pbr-v24-architectural-relic-sanctuary"', 'data-home-visual-grade="cinematic-pbr-v25-physical-relic-sanctuary"', 'visual grade')
replace_once('data-home-final-art-revision="v24-coherent-architectural-machine-correction"', 'data-home-final-art-revision="v25-asymmetric-physical-certification-candidate"', 'art revision')
replace_once('architectural-depth-v24-volumetric-only-no-card', 'architectural-depth-v25-volumetric-only-no-card', 'depth authority')
replace_once('gl.toneMappingExposure=1.22', 'gl.toneMappingExposure=1.36', 'tone exposure')

if source == original:
    raise SystemExit('No Home V25 changes produced')
path.write_text(source)
print('HOME_V25_CERTIFICATION_REPAIR_APPLIED')
