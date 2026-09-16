from pathlib import Path


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


home_path = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
home = home_path.read_text()

home = once(home,
    "const HOME_PHOTOGRAPHIC_PBR_V19 = 'polyhaven-rock-tile-floor-plus-studio-small-08-built-sanctuary-v19'",
    "const HOME_PHOTOGRAPHIC_PBR_V19 = 'polyhaven-rock-tile-floor-plus-studio-small-08-built-sanctuary-v19'\nconst HOME_SCANNED_COMPOSITION_V1 = 'built-sacred-tech-sanctuary-v20'",
    'scanned composition marker')
home = once(home, "const GROUND = new THREE.Vector3(-5.45, 0, -8.25)", "const GROUND = new THREE.Vector3(-5.2, 0, -8.4)", 'Ground anchor')
home = once(home, "const LIFE_MAP = new THREE.Vector3(5.45, 0, -8.25)", "const LIFE_MAP = new THREE.Vector3(5.2, 0, -8.4)", 'Life Map anchor')
home = once(home, "const pack = useStonePack(1.2, 1.65)", "const pack = useStonePack(0.88, 1.12)", 'floor texture frequency')
home = once(home, "color=\"#3b4240\" relief={0.012}", "color=\"#2c3331\" relief={0.009}", 'floor material')
home = once(home, "<circleGeometry args={[2.5,128]} />", "<circleGeometry args={[1.78,128]} />", 'ritual field scale')
home = once(home, "<ringGeometry args={[1.65,1.67,160]} />", "<ringGeometry args={[1.18,1.194,160]} />", 'warm inlay scale')
home = once(home, "<ringGeometry args={[2.06,2.075,160]} />", "<ringGeometry args={[1.54,1.553,160]} />", 'cyan inlay scale')

architecture_insert = '''
function SanctuaryCeiling() {
  const zBays = [4.65, 1.25, -2.15, -5.55, -8.65] as const
  return <group name="home-architectural-canopy" userData={{ treatment:'layered-physical-canopy-v20' }}>
    {zBays.map((z,index)=><group key={`canopy-${z}`}>
      <PouredStone position={[0,4.08,z]} size={[12.55,0.22,0.34]} color="#0a100f" metalness={0.14} roughness={0.64} />
      <MetalTrim position={[0,3.94,z+0.02]} size={[index===2?5.8:3.8,0.018,0.025]} color={index%2===0?'#6c644f':'#4e696a'} emissive={index%2===0?'#282219':'#173637'} intensity={0.018} />
    </group>)}
    <PouredStone position={[-5.95,3.96,-2.0]} size={[0.34,0.22,13.9]} color="#0a100f" roughness={0.68} />
    <PouredStone position={[5.95,3.96,-2.0]} size={[0.34,0.22,13.9]} color="#0a100f" roughness={0.68} />
    <group name="home-orb-architectural-apse" position={[0,0,-3.45]}>
      <PouredStone position={[-1.62,1.72,0]} size={[0.52,3.44,0.58]} color="#0a100f" roughness={0.72} />
      <PouredStone position={[1.62,1.72,0]} size={[0.52,3.44,0.58]} color="#0a100f" roughness={0.72} />
      <PouredStone position={[0,3.23,0]} size={[3.76,0.44,0.58]} color="#090f0e" roughness={0.7} />
      <PouredStone position={[0,1.58,-0.34]} size={[2.58,2.78,0.14]} color="#111817" metalness={0.12} roughness={0.6} />
      <MetalTrim position={[0,2.76,-0.43]} size={[1.6,0.018,0.026]} color="#6b6453" intensity={0.012} />
    </group>
  </group>
}

function FloorPanelJoints() {
  const zLines = [5.15, 3.15, 1.15, -0.85, -2.85, -4.85, -6.85] as const
  return <group name="home-floor-panel-joints" userData={{ treatment:'large-format-stone-joints-v20' }}>
    {zLines.map((z)=><MetalTrim key={z} position={[0,0.027,z]} size={[10.4,0.008,0.01]} color="#222a28" emissive="#000000" intensity={0} />)}
    <MetalTrim position={[-3.25,0.027,-0.85]} size={[0.01,0.008,13.9]} color="#222a28" emissive="#000000" intensity={0} />
    <MetalTrim position={[3.25,0.027,-0.85]} size={[0.01,0.008,13.9]} color="#222a28" emissive="#000000" intensity={0} />
  </group>
}
'''
home = once(home, "\nfunction ReflectingChannel({ x }: { x: number }) {", architecture_insert + "\nfunction ReflectingChannel({ x }: { x: number }) {", 'architectural canopy insertion')

home = once(home,
    "const FERN_PLACEMENTS: readonly [number,number,number,number][] = [[-6.35,4.6,0.52,0.8],[-6.18,1.9,0.44,-0.5],[-6.34,-1.4,0.5,2.1],[-6.08,-4.9,0.42,-1.1],[-6.2,-7.4,0.46,1.4],[6.32,4.0,0.5,-1.4],[6.16,1.0,0.46,0.8],[6.34,-2.3,0.52,-2.0],[6.08,-5.5,0.42,1.5],[6.2,-7.65,0.47,-0.2]]",
    "const FERN_PLACEMENTS: readonly [number,number,number,number][] = [[-6.18,4.45,0.46,0.8],[-6.08,-0.9,0.42,2.1],[-6.12,-6.5,0.44,-1.1],[6.18,3.75,0.45,-1.4],[6.08,-1.85,0.47,-2.0],[6.12,-6.85,0.41,1.5]]",
    'sparse planting')
home = home.replace("treatment:'architectural-planter-growth-v19'", "treatment:'sparse-architectural-planter-growth-v20'")
home = home.replace("size={[1.05,0.42,17.5]}", "size={[0.86,0.38,16.8]}")
home = home.replace("<PouredStone position={[0,-0.06,0]} size={[1.45,0.16,13.9]}", "<PouredStone position={[0,-0.06,0]} size={[0.9,0.14,11.8]}")
home = home.replace("<planeGeometry args={[1.18,13.55]} />", "<planeGeometry args={[0.66,11.46]} />")
home = home.replace("transparent opacity={0.88}", "transparent opacity={0.7}")

orb_cradle = '''
function OrbCradle(){return <group position={[0,0,-2.15]} name="home-orb-physical-cradle" userData={{treatment:'mechanical-relic-yoke-v20'}}>
  <PouredStone position={[0,0.08,0]} size={[1.24,0.16,0.96]} color="#090e0e" roughness={0.5} />
  <PouredStone position={[0,0.2,0]} size={[0.86,0.08,0.66]} color="#151b1a" metalness={0.12} roughness={0.46} />
  <PouredStone position={[0,0.72,0.12]} size={[0.14,0.98,0.14]} color="#111817" metalness={0.34} roughness={0.38} />
  <PouredStone position={[-0.3,1.08,0.08]} size={[0.07,0.56,0.07]} color="#18201f" metalness={0.58} roughness={0.3} />
  <PouredStone position={[0.3,1.08,0.08]} size={[0.07,0.56,0.07]} color="#18201f" metalness={0.58} roughness={0.3} />
  <mesh position={[-0.22,1.32,0.07]} rotation={[0,0,-0.72]} castShadow><boxGeometry args={[0.07,0.5,0.07]} /><meshStandardMaterial color="#1a2322" metalness={0.74} roughness={0.26} envMapIntensity={0.9} /></mesh>
  <mesh position={[0.22,1.32,0.07]} rotation={[0,0,0.72]} castShadow><boxGeometry args={[0.07,0.5,0.07]} /><meshStandardMaterial color="#1a2322" metalness={0.74} roughness={0.26} envMapIntensity={0.9} /></mesh>
</group>}
'''
home = once(home, "\nconst ORB_FRAGMENT_LAYOUT:", orb_cradle + "\nconst ORB_FRAGMENT_LAYOUT:", 'Orb cradle insertion')
home = home.replace("scale={[0.24,0.39,0.24]}", "scale={[0.18,0.3,0.18]}")
home = once(home, "<icosahedronGeometry args={[1,4]} />", "<sphereGeometry args={[1,48,48]} />", 'smooth Orb shell')
home = home.replace("emissiveIntensity={intensity*0.38} roughness={0.26} metalness={0.34} clearcoat={0.62} clearcoatRoughness={0.22} envMapIntensity={1.18}", "emissiveIntensity={intensity*0.2} roughness={0.34} metalness={0.48} clearcoat={0.34} clearcoatRoughness={0.3} envMapIntensity={0.94}")
home = home.replace("scale={[0.12,0.2,0.12]}", "scale={[0.072,0.12,0.072]}")
home = home.replace("emissiveIntensity={intensity*1.42}", "emissiveIntensity={intensity*0.88}")
home = home.replace("torusGeometry args={[0.47,0.007,10,128]}", "torusGeometry args={[0.385,0.006,10,112]}")
home = home.replace("torusGeometry args={[0.43,0.006,10,128]}", "torusGeometry args={[0.35,0.0055,10,112]}")
home = home.replace("torusGeometry args={[0.39,0.0055,10,128]}", "torusGeometry args={[0.32,0.005,10,112]}")
home = home.replace("intensity={intensity*0.64} distance={4.6}", "intensity={intensity*0.34} distance={3.2}")
home = home.replace("treatment:'industrial-moonlit-relic-machine-v19'", "treatment:'physical-moonlit-relic-machine-v20'")

home = home.replace("scale=0.24", "scale=0.19") if "scale=0.24" in home else home
home = home.replace("scale={0.24}", "scale={0.19}")
home = home.replace("treatment:'integrated-architectural-threshold-v19'", "treatment:'deep-recessed-architectural-threshold-v20'")
home = home.replace("opacity={0.52} transmission={0.18} roughness={0.24}", "opacity={0.4} transmission={0.1} roughness={0.34}")
home = home.replace("emissiveIntensity={0.025}", "emissiveIntensity={0.014}")
home = home.replace("intensity={0.11}", "intensity={0.045}")

home = once(home,
    "<SanctuaryCourt target={props.target} /><ReflectingChannel x={-5.05} /><ReflectingChannel x={5.05} /><SanctuaryArchitecture /><PlantedEdges",
    "<SanctuaryCourt target={props.target} /><FloorPanelJoints /><ReflectingChannel x={-5.45} /><ReflectingChannel x={5.45} /><SanctuaryArchitecture /><SanctuaryCeiling /><PlantedEdges",
    'architectural scene composition')
home = once(home, "<AtmosphericDepth /><OrbPlatform /><SacredOrb", "<AtmosphericDepth /><OrbPlatform /><OrbCradle /><SacredOrb", 'Orb cradle scene ownership')
home = home.replace("<ambientLight intensity={0.18}", "<ambientLight intensity={0.11}")
home = home.replace("0.34]} />", "0.24]} />", 1)
home = home.replace("intensity={1.52} color=\"#c8d9dc\"", "intensity={1.06} color=\"#c8d9dc\"")
home = home.replace("intensity={0.36} color=\"#e2dfd5\"", "intensity={0.42} color=\"#e2dfd5\"")
home = home.replace("environmentIntensity={0.7}", "environmentIntensity={0.62}")
home = home.replace("args={[cosmic?'#060918':'#0c1517',cosmic?0.0022:0.027]}", "args={[cosmic?'#060918':'#0b1315',cosmic?0.0022:0.021]}")
home = home.replace("count={420} factor={1.8}", "count={320} factor={1.55}")
home = home.replace("camera.position.set(0.72,1.66,6.72);camera.lookAt(0,1.4,-2.15)", "camera.position.set(0.58,1.64,6.86);camera.lookAt(0,1.38,-2.15)")
home = home.replace("new THREE.Vector3(-5.45,-2,-13.2)", "new THREE.Vector3(-5.2,-2,-13.35)")
home = home.replace("camera.lookAt(-5.45,-0.8,-14.5)", "camera.lookAt(-5.2,-0.8,-14.6)")
home = home.replace("camera={{position:[0.72,1.66,6.72],fov:44,near:0.1,far:140}}", "camera={{position:[0.58,1.64,6.86],fov:43,near:0.1,far:140}}")
home = home.replace("gl.toneMappingExposure=1.22", "gl.toneMappingExposure=1.16")
home = once(home,
    'data-home-visual-grade="cinematic-pbr-v19-final-built-sanctuary"',
    'data-home-visual-grade="cinematic-pbr-v19-final-built-sanctuary" data-home-final-art-revision="v20-physical-sanctuary" data-home-scanned-composition={HOME_SCANNED_COMPOSITION_V1}',
    'V20 DOM markers')
home = home.replace("architectural-depth-v19", "architectural-depth-v20")
home = home.replace("built-photographic-sanctuary-plus-cc0-fern-plus-authored-living-orb", "built-physical-sanctuary-v20-plus-cc0-fern-plus-authored-living-orb")

if '<cylinderGeometry' in home:
    raise SystemExit('V20 Home must not introduce cylinderGeometry placeholder grammar')
for marker in ['HOME_SCANNED_COMPOSITION_V1','home-architectural-canopy','home-floor-panel-joints','home-orb-physical-cradle','physical-moonlit-relic-machine-v20','deep-recessed-architectural-threshold-v20']:
    if marker not in home:
        raise SystemExit(f'missing V20 marker: {marker}')
home_path.write_text(home)

runtime_path = Path('urai-tier1/src/app/HomeSpatialRuntimeLayer.tsx')
runtime = runtime_path.read_text()
runtime = once(runtime,
    "function HomeSemanticNavigation() {",
    "const HOME_SEMANTIC_DESTINATIONS = {\n  ground: { href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent', travelHref: '/ground/?entryPortal=home-ground&cameraCheckpoint=home-ground-descent' },\n  lifeMap: { href: '/life-map/', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete', travelHref: '/life-map/' },\n} as const\n\nfunction HomeSemanticNavigation() {",
    'semantic contracts')
runtime = runtime.replace("directHomeSemanticTravel('/ground/?entryPortal=home-ground&cameraCheckpoint=home-ground-descent')", "directHomeSemanticTravel(HOME_SEMANTIC_DESTINATIONS.ground.travelHref)")
runtime = runtime.replace("directHomeSemanticTravel('/life-map/')", "directHomeSemanticTravel(HOME_SEMANTIC_DESTINATIONS.lifeMap.travelHref)")
runtime_path.write_text(runtime)

print('Applied UrAi Home V20 physical final-art patch.')
