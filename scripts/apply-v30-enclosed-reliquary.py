from pathlib import Path

path = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
source = path.read_text()


def replace_block(text: str, start_marker: str, end_marker: str, replacement: str) -> str:
    start = text.index(start_marker)
    end = text.index(end_marker, start)
    return text[:start] + replacement.rstrip() + '\n\n' + text[end:]

court = r'''function SanctuaryCourt({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(SANCTUARY)
  const compatibilityModel = useMemo(() => cloneCompatibilitySanctuary(sanctuary.scene), [sanctuary.scene])
  const pack = useStonePack(0.28, 0.32)
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  return <group name="home-authored-terrain" userData={{ treatment: 'monolithic-photographic-stone-court-v30-no-visible-tiling-grid', source: HOME_PHOTOGRAPHIC_PBR_V19 }}>
    <primitive object={compatibilityModel} />
    <mesh position={[0,-0.3,-1.45]} receiveShadow castShadow>
      <boxGeometry args={[16.8,0.22,19.5]} />
      <meshPhysicalMaterial color="#0c1110" roughness={0.88} metalness={0.02} clearcoat={0.04} clearcoatRoughness={0.82} envMapIntensity={0.68} />
    </mesh>
    <mesh name="home-obsidian-walkable-terrain" position={[0,-0.17,-1.45]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[16.5,19.2,2,2]} />
      <StoneTopMaterial pack={pack} color="#252b28" relief={0.0018} />
    </mesh>
    <group name="home-orb-foundation" position={[0,0,-2.15]} userData={{ treatment:'v30-buried-machine-foundation-integrated-into-sanctuary-floor' }}>
      <mesh position={[0,0.005,0]} receiveShadow castShadow><boxGeometry args={[2.25,0.06,1.75]} /><meshPhysicalMaterial color="#131b18" roughness={0.47} metalness={0.42} clearcoat={0.13} clearcoatRoughness={0.38} envMapIntensity={0.94} /></mesh>
      <MetalTrim position={[0,0.042,0.58]} size={[1.12,0.008,0.026]} color="#85795c" intensity={0.006} />
      <MetalTrim position={[-0.82,0.043,-0.1]} size={[0.018,0.008,0.84]} color="#52635e" intensity={0.004} />
      <MetalTrim position={[0.82,0.043,-0.1]} size={[0.018,0.008,0.84]} color="#52635e" intensity={0.004} />
    </group>
    <mesh name="home-walkable-navigation-surface" position={[0,0.18,-1.45]} rotation={[-Math.PI/2,0,0]} onClick={onWalk}>
      <planeGeometry args={[13.4,17.5]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}'''
source = replace_block(source, 'function SanctuaryCourt(', 'function RecessedPractical(', court)

architecture = r'''function ArchedMass({ pack, position, rotation = [0,0,0], width, height, depth, openingWidth, openingHeight, color = '#202522', accent = '#56625d' }: { pack: SurfacePack; position: Vec3; rotation?: Vec3; width: number; height: number; depth: number; openingWidth: number; openingHeight: number; color?: string; accent?: string }) {
  const shoulder = openingHeight * 0.58
  const shape = useMemo(() => {
    const outer = new THREE.Shape()
    outer.moveTo(-width/2, 0)
    outer.lineTo(width/2, 0)
    outer.lineTo(width/2, height)
    outer.lineTo(-width/2, height)
    outer.lineTo(-width/2, 0)
    const hole = new THREE.Path()
    hole.moveTo(-openingWidth/2, 0.06)
    hole.lineTo(-openingWidth/2, shoulder)
    hole.quadraticCurveTo(-openingWidth/2, openingHeight, 0, openingHeight)
    hole.quadraticCurveTo(openingWidth/2, openingHeight, openingWidth/2, shoulder)
    hole.lineTo(openingWidth/2, 0.06)
    hole.lineTo(-openingWidth/2, 0.06)
    outer.holes.push(hole)
    return outer
  }, [height, openingHeight, openingWidth, shoulder, width])
  return <group position={position as [number,number,number]} rotation={rotation as [number,number,number]}>
    <mesh castShadow receiveShadow>
      <extrudeGeometry args={[shape,{depth,bevelEnabled:true,bevelSegments:2,bevelSize:0.045,bevelThickness:0.045,curveSegments:12}]} />
      <meshPhysicalMaterial color={color} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.22,0.22)} roughnessMap={pack.arm} roughness={0.7} metalness={0.045} clearcoat={0.08} clearcoatRoughness={0.7} envMapIntensity={0.78} />
    </mesh>
    <StructuralRib points={[[-openingWidth/2-0.12,0.06,depth+0.02],[-openingWidth/2-0.12,shoulder,depth+0.02],[0,openingHeight+0.18,depth+0.02],[openingWidth/2+0.12,shoulder,depth+0.02],[openingWidth/2+0.12,0.06,depth+0.02]]} radius={0.055} color={accent} metalness={0.82} roughness={0.3} />
  </group>
}

function SanctuaryArchitecture() {
  const pack = useStonePack(0.34,0.38)
  return <group name="home-sanctuary-pavilion" userData={{ visualOwner:'cinematic-enclosed-sacred-tech-sanctuary-v30',construction:'massive-arched-shell-load-bearing-vault-orb-apse',visualTreatment:'v30-enclosed-authored-sanctuary-no-test-pavilion' }}>
    <group name="home-v30-rear-apse" userData={{ treatment:'v30-massive-arched-background-depth-and-threshold-chambers' }}>
      <ArchedMass pack={pack} position={[-4.55,0,-7.9]} width={4.35} height={4.85} depth={0.48} openingWidth={2.15} openingHeight={3.65} color="#222724" accent="#596761" />
      <ArchedMass pack={pack} position={[4.45,0,-7.94]} width={4.65} height={5.05} depth={0.5} openingWidth={2.25} openingHeight={3.78} color="#1c2320" accent="#706957" />
      <ArchedMass pack={pack} position={[0,0,-8.18]} width={4.45} height={5.35} depth={0.62} openingWidth={2.55} openingHeight={4.18} color="#262b27" accent="#4f635f" />
      <mesh position={[0,4.82,-7.8]} receiveShadow castShadow><boxGeometry args={[13.7,0.42,0.68]} /><meshPhysicalMaterial color="#141a18" roughness={0.56} metalness={0.38} clearcoat={0.11} clearcoatRoughness={0.48} envMapIntensity={0.84} /></mesh>
    </group>
    <group name="home-v30-side-enclosure" userData={{ treatment:'v30-asymmetric-side-chambers-and-structural-masses' }}>
      <ArchedMass pack={pack} position={[-6.18,0,1.3]} rotation={[0,Math.PI/2,0]} width={6.2} height={4.75} depth={0.48} openingWidth={3.15} openingHeight={3.46} color="#252b27" accent="#5d6256" />
      <ArchedMass pack={pack} position={[-6.23,0,-4.75]} rotation={[0,Math.PI/2,0]} width={5.75} height={5.05} depth={0.54} openingWidth={2.35} openingHeight={3.72} color="#1b211f" accent="#536762" />
      <ArchedMass pack={pack} position={[6.2,0,0.25]} rotation={[0,-Math.PI/2,0]} width={7.3} height={5.1} depth={0.5} openingWidth={3.8} openingHeight={3.92} color="#1e2522" accent="#6d6655" />
      <ArchedMass pack={pack} position={[6.14,0,-5.7]} rotation={[0,-Math.PI/2,0]} width={4.5} height={4.55} depth={0.46} openingWidth={1.9} openingHeight={3.3} color="#292d29" accent="#53635f" />
    </group>
    <group name="home-v30-load-bearing-vault" userData={{ treatment:'v30-heavy-vault-ribs-terminate-into-shell' }}>
      <StructuralRib points={[[-6.02,4.15,2.8],[-4.4,4.78,2.55],[-2.2,5.15,2.38],[0,5.28,2.28],[2.2,5.15,2.38],[4.4,4.78,2.55],[6.0,4.14,2.8]]} radius={0.13} color="#4c5752" />
      <StructuralRib points={[[-6.08,4.45,-1.15],[-4.45,5.0,-1.28],[-2.25,5.34,-1.4],[0,5.44,-1.48],[2.25,5.34,-1.4],[4.45,5.0,-1.28],[6.08,4.45,-1.15]]} radius={0.145} color="#615d50" />
      <StructuralRib points={[[-6.0,4.08,-5.45],[-4.35,4.72,-5.62],[-2.15,5.06,-5.74],[0,5.18,-5.8],[2.15,5.06,-5.74],[4.35,4.72,-5.62],[6.0,4.08,-5.45]]} radius={0.12} color="#465b57" />
      <StructuralRib points={[[-4.25,4.86,2.6],[-4.05,5.12,0.75],[-3.95,5.28,-1.45],[-4.0,5.05,-3.55],[-4.35,4.55,-5.65]]} radius={0.075} color="#6d6656" />
      <StructuralRib points={[[3.65,4.98,2.55],[3.8,5.2,0.55],[3.86,5.3,-1.55],[3.78,5.04,-3.5],[4.15,4.62,-5.62]]} radius={0.08} color="#4d625d" />
    </group>
    <group name="home-v30-orb-apse-architecture" userData={{ treatment:'v30-sanctuary-built-around-orb-reliquary' }}>
      <mesh position={[-1.62,1.45,-3.0]} rotation={[0,0,-0.06]} castShadow receiveShadow><cylinderGeometry args={[0.34,0.58,2.9,10]} /><StoneTopMaterial pack={pack} color="#252a26" relief={0.001} /></mesh>
      <mesh position={[1.62,1.55,-3.08]} rotation={[0,0,0.055]} castShadow receiveShadow><cylinderGeometry args={[0.32,0.6,3.1,10]} /><StoneTopMaterial pack={pack} color="#1f2522" relief={0.001} /></mesh>
      <StructuralRib points={[[-1.62,2.86,-3.0],[-1.3,3.45,-3.18],[-0.72,3.78,-3.24],[0,3.92,-3.28],[0.72,3.78,-3.24],[1.3,3.45,-3.18],[1.62,3.06,-3.08]]} radius={0.12} color="#706955" />
      <StructuralRib points={[[-1.45,0.35,-2.85],[-1.18,1.15,-2.72],[-0.9,1.62,-2.58]]} radius={0.09} color="#35443f" />
      <StructuralRib points={[[1.48,0.35,-2.9],[1.2,1.2,-2.75],[0.92,1.64,-2.58]]} radius={0.09} color="#35443f" />
    </group>
    <RecessedPractical position={[-5.35,0.24,2.7]} /><RecessedPractical position={[5.25,0.24,1.9]} warm={false} />
    <RecessedPractical position={[-5.25,0.24,-5.45]} warm={false} /><RecessedPractical position={[5.35,0.24,-6.0]} />
  </group>
}'''
source = replace_block(source, 'function SanctuaryArchitecture()', 'function SanctuaryGlazing()', architecture)

ceiling = r'''function SanctuaryCeiling() {
  return <group name="home-architectural-canopy" userData={{ treatment:'v30-vaulted-shell-ceiling-panels',visualTreatment:'v30-roof-mass-rests-on-load-bearing-vault' }}>
    <mesh position={[-3.32,4.92,-1.5]} rotation={[-0.035,0,0.11]} castShadow receiveShadow><boxGeometry args={[5.9,0.14,8.9]} /><meshPhysicalMaterial color="#111715" roughness={0.58} metalness={0.34} clearcoat={0.08} clearcoatRoughness={0.58} envMapIntensity={0.76} /></mesh>
    <mesh position={[3.4,5.02,-1.7]} rotation={[0.025,0,-0.095]} castShadow receiveShadow><boxGeometry args={[5.8,0.13,8.55]} /><meshPhysicalMaterial color="#141a18" roughness={0.55} metalness={0.38} clearcoat={0.09} clearcoatRoughness={0.55} envMapIntensity={0.8} /></mesh>
    <mesh position={[0,5.14,2.62]} rotation={[0,0,0]} castShadow receiveShadow><boxGeometry args={[5.2,0.11,1.15]} /><meshPhysicalMaterial color="#20241f" roughness={0.5} metalness={0.42} clearcoat={0.12} clearcoatRoughness={0.48} envMapIntensity={0.82} /></mesh>
  </group>
}'''
source = replace_block(source, 'function SanctuaryCeiling()', 'function FloorPanelJoints()', ceiling)

floor_joints = r'''function FloorPanelJoints() {
  return <group name="home-floor-panel-joints" userData={{ treatment:'v30-three-authored-expansion-seams-no-grid-read' }}>
    <MetalTrim position={[-1.9,0.024,1.65]} size={[3.6,0.005,0.008]} color="#222825" emissive="#000000" intensity={0} />
    <MetalTrim position={[2.35,0.024,-2.8]} size={[4.25,0.005,0.008]} color="#252a27" emissive="#000000" intensity={0} />
    <MetalTrim position={[-0.35,0.024,-5.95]} size={[0.008,0.005,3.35]} color="#202522" emissive="#000000" intensity={0} />
  </group>
}'''
source = replace_block(source, 'function FloorPanelJoints()', 'function ReflectingChannel(', floor_joints)

orb = r'''function OrbPlatform(){
  return <group name="home-orb-machine-plinth" position={[0,0,-2.15]} userData={{treatment:'v30-buried-machine-socket-no-display-pedestal',visualTreatment:'v30-rectilinear-foundation-and-reliquary-load-path'}}>
    <mesh position={[0,0.085,0]} receiveShadow castShadow><boxGeometry args={[2.1,0.14,1.58]} /><meshPhysicalMaterial color="#18201d" roughness={0.4} metalness={0.5} clearcoat={0.12} clearcoatRoughness={0.34} envMapIntensity={0.94} /></mesh>
    <MetalTrim position={[0,0.16,0.56]} size={[1.22,0.01,0.026]} color="#80765b" intensity={0.008} />
  </group>
}

function OrbCradle(){
  return <group name="home-orb-engineered-cradle" position={[0,0,-2.15]} userData={{treatment:'v30-heavy-three-point-relic-reliquary',visualTreatment:'v30-armored-socket-clamps-collars-conduits-no-center-stem'}}>
    <group name="home-orb-dock-footings">
      <mesh position={[-0.72,0.32,0.18]} rotation={[0,0,-0.05]} castShadow receiveShadow><cylinderGeometry args={[0.25,0.4,0.64,8]} /><meshPhysicalMaterial color="#202a26" roughness={0.32} metalness={0.7} clearcoat={0.16} clearcoatRoughness={0.3} envMapIntensity={1.0} /></mesh>
      <mesh position={[0.72,0.34,0.18]} rotation={[0,0,0.05]} castShadow receiveShadow><cylinderGeometry args={[0.25,0.41,0.68,8]} /><meshPhysicalMaterial color="#202a26" roughness={0.32} metalness={0.7} clearcoat={0.16} clearcoatRoughness={0.3} envMapIntensity={1.0} /></mesh>
      <mesh position={[0,0.38,-0.66]} rotation={[0.04,0,0]} castShadow receiveShadow><cylinderGeometry args={[0.28,0.46,0.76,8]} /><meshPhysicalMaterial color="#292820" roughness={0.31} metalness={0.72} clearcoat={0.13} clearcoatRoughness={0.32} envMapIntensity={0.98} /></mesh>
    </group>
    <group name="home-orb-heavy-load-arms">
      <StructuralRib points={[[-0.72,0.58,0.18],[-0.7,0.92,0.12],[-0.58,1.22,0.08],[-0.46,1.4,0.02]]} radius={0.115} color="#56645e" />
      <StructuralRib points={[[0.72,0.6,0.18],[0.7,0.94,0.12],[0.58,1.24,0.08],[0.46,1.4,0.02]]} radius={0.115} color="#56645e" />
      <StructuralRib points={[[0,0.7,-0.66],[0,0.98,-0.65],[0,1.22,-0.56],[0,1.42,-0.46]]} radius={0.12} color="#786d53" />
    </group>
    <group name="home-orb-armored-contact-jaws">
      <mesh position={[-0.46,1.42,0.02]} rotation={[0.12,0.02,-0.42]} scale={[0.22,0.14,0.17]} castShadow><octahedronGeometry args={[1,0]} /><meshStandardMaterial color="#263630" metalness={0.84} roughness={0.24} /></mesh>
      <mesh position={[0.46,1.42,0.02]} rotation={[0.12,-0.02,0.42]} scale={[0.22,0.14,0.17]} castShadow><octahedronGeometry args={[1,0]} /><meshStandardMaterial color="#263630" metalness={0.84} roughness={0.24} /></mesh>
      <mesh position={[0,1.42,-0.46]} rotation={[0.58,0,0]} scale={[0.2,0.14,0.18]} castShadow><octahedronGeometry args={[1,0]} /><meshStandardMaterial color="#665d48" metalness={0.86} roughness={0.23} /></mesh>
    </group>
    <group name="home-orb-rear-armored-collar" userData={{ treatment:'v30-segmented-reliquary-collar-not-display-halo' }}>
      <mesh position={[0,1.43,-0.18]} rotation={[Math.PI/2,0,0.34]} castShadow><torusGeometry args={[0.7,0.07,10,48,Math.PI*0.72]} /><meshStandardMaterial color="#303b36" metalness={0.86} roughness={0.27} /></mesh>
      <mesh position={[0,1.43,-0.2]} rotation={[Math.PI/2,0,Math.PI+0.34]} castShadow><torusGeometry args={[0.7,0.07,10,48,Math.PI*0.72]} /><meshStandardMaterial color="#4d4b3e" metalness={0.84} roughness={0.28} /></mesh>
      <mesh position={[0,1.02,-0.24]} rotation={[Math.PI/2,0,0.38]} castShadow><torusGeometry args={[0.56,0.085,10,42,Math.PI*0.92]} /><meshStandardMaterial color="#24322e" metalness={0.82} roughness={0.3} /></mesh>
    </group>
    <group name="home-orb-conduit-load-paths">
      <StructuralRib points={[[-0.72,0.12,0.28],[-1.1,0.08,-0.18],[-1.34,0.08,-0.72]]} radius={0.045} color="#4e5d58" />
      <StructuralRib points={[[0.72,0.12,0.28],[1.1,0.08,-0.18],[1.34,0.08,-0.72]]} radius={0.045} color="#4e5d58" />
      <StructuralRib points={[[0,0.12,-0.66],[0,0.08,-1.2],[0,0.08,-1.62]]} radius={0.05} color="#6b634f" />
    </group>
  </group>
}'''
source = replace_block(source, 'function OrbPlatform()', 'function SacredOrb(', orb)

source = source.replace("treatment:'v27-faceted-crystalline-relic-machine'", "treatment:'v30-armored-relic-machine-integrated-with-sanctuary'")
source = source.replace('<group ref={authoredCore} scale={0.146} name="home-orb-authored-core">', '<group ref={authoredCore} scale={0.17} name="home-orb-authored-core">')
source = source.replace('<group name="home-orb-engineered-body" rotation={[0.08,0.3,-0.04]}>', '<group name="home-orb-engineered-body" rotation={[0.08,0.3,-0.04]} scale={1.14}>')
source = source.replace('scale={[0.37,0.43,0.35]}', 'scale={[0.46,0.52,0.44]}')
source = source.replace('scale={scale*2.45}', 'scale={scale*1.72}')
source = source.replace("treatment:'v29-integrated-vault-threshold'", "treatment:'v30-threshold-chamber-integrated-with-rear-apse'")
source = source.replace("<SanctuaryArchitecture /><SanctuaryCeiling /><PlantedEdges reducedMotion={props.reducedMotion} />", "<SanctuaryArchitecture /><SanctuaryGlazing /><SanctuaryCeiling />")
source = source.replace("<color attach=\"background\" args={[cosmic?'#01030a':'#050a0d']} />", "<color attach=\"background\" args={[cosmic?'#01030a':'#070c0e']} />")
source = source.replace("<ambientLight intensity={0.36}", "<ambientLight intensity={0.46}")
source = source.replace("<hemisphereLight args={['#8aa0a2','#101513',0.52]}", "<hemisphereLight args={['#8aa0a2','#101513',0.6]}")
source = source.replace("intensity={1.48}", "intensity={1.62}", 1)
source = source.replace("intensity={0.62}", "intensity={0.82}", 1)
source = source.replace("intensity={0.4} distance={7.5}", "intensity={0.48} distance={8.5}", 1)
source = source.replace("toneMappingExposure={1.46}", "toneMappingExposure={1.52}")
source = source.replace("v28-authored-threshold-curved-rib-final-candidate", "v30-enclosed-reliquary-sanctuary-final-candidate")
source = source.replace("cinematic-pbr-v28-authored-threshold-curved-rib-sanctuary", "cinematic-pbr-v30-enclosed-reliquary-sanctuary")
source = source.replace("v29-grounded-vaulted-machine-hall-no-fantasy-shell", "v30-enclosed-authored-sanctuary-no-test-pavilion")

required = [
    'v30-enclosed-authored-sanctuary-no-test-pavilion',
    'v30-heavy-vault-ribs-terminate-into-shell',
    'v30-sanctuary-built-around-orb-reliquary',
    'v30-armored-socket-clamps-collars-conduits-no-center-stem',
    'v30-armored-relic-machine-integrated-with-sanctuary',
    'v30-three-authored-expansion-seams-no-grid-read',
    'v30-threshold-chamber-integrated-with-rear-apse',
]
for marker in required:
    assert marker in source, marker
for retired in [
    'v29-curved-load-arms-contact-orb-no-pedestal-stem',
    "<SanctuaryArchitecture /><SanctuaryCeiling /><PlantedEdges reducedMotion={props.reducedMotion} />",
]:
    assert retired not in source, retired

path.write_text(source)
