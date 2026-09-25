from pathlib import Path

p = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
s = p.read_text()


def once(old: str, new: str, label: str) -> None:
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected one match, found {n}')
    s = s.replace(old, new, 1)


once(
    "import { ContactShadows, Environment, Stars, useAnimations, useGLTF, useTexture } from '@react-three/drei'",
    "import { ContactShadows, Environment, RoundedBox, Stars, useAnimations, useGLTF, useTexture } from '@react-three/drei'",
    'RoundedBox import',
)

once(
    "function PouredStone({ position, size, color = '#151b1a', metalness = 0.08, roughness = 0.74 }: { position: Vec3; size: Vec3; color?: string; metalness?: number; roughness?: number }) {\n  return <mesh position={position as [number,number,number]} castShadow receiveShadow><boxGeometry args={size as [number,number,number]} /><meshPhysicalMaterial color={color} roughness={roughness} metalness={metalness} clearcoat={0.08} clearcoatRoughness={0.72} envMapIntensity={0.72} /></mesh>\n}",
    "function PouredStone({ position, size, color = '#151b1a', metalness = 0.08, roughness = 0.74 }: { position: Vec3; size: Vec3; color?: string; metalness?: number; roughness?: number }) {\n  const radius = Math.min(0.12, Math.max(0.018, Math.min(size[0], size[1], size[2]) * 0.16))\n  return <RoundedBox args={size as [number,number,number]} radius={radius} smoothness={4} position={position as [number,number,number]} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={roughness} metalness={metalness} clearcoat={0.11} clearcoatRoughness={0.58} envMapIntensity={0.9} /></RoundedBox>\n}",
    'beveled physical stone',
)

once("const pack = useStonePack(0.88, 1.12)", "const pack = useStonePack(2.15, 2.55)", 'floor texture scale')
once("<StoneTopMaterial pack={pack} color=\"#2c3331\" relief={0.009} />", "<StoneTopMaterial pack={pack} color=\"#202827\" relief={0.012} />", 'floor material grade')
once("<circleGeometry args={[1.78,128]} />", "<circleGeometry args={[1.28,128]} />", 'ritual disk restraint')
once("<ringGeometry args={[1.18,1.194,160]} />", "<ringGeometry args={[0.84,0.852,160]} />", 'ritual inner ring restraint')
once("<ringGeometry args={[1.54,1.553,160]} />", "<ringGeometry args={[1.08,1.092,160]} />", 'ritual outer ring restraint')

once(
    "\nfunction SanctuaryCeiling() {",
    "\nfunction SanctuaryGlazing(){return <group name=\"home-architectural-glazing\" userData={{treatment:'smoked-structural-glass-v22'}}><mesh position={[-6.82,2.02,-1.65]} castShadow receiveShadow><boxGeometry args={[0.07,3.18,16.3]} /><meshPhysicalMaterial color=\"#182322\" roughness={0.28} metalness={0.05} transmission={0.04} transparent opacity={0.58} clearcoat={0.48} clearcoatRoughness={0.22} envMapIntensity={1.08} /></mesh><mesh position={[6.82,2.02,-1.65]} castShadow receiveShadow><boxGeometry args={[0.07,3.18,16.3]} /><meshPhysicalMaterial color=\"#172221\" roughness={0.3} metalness={0.05} transmission={0.04} transparent opacity={0.56} clearcoat={0.46} clearcoatRoughness={0.24} envMapIntensity={1.06} /></mesh><mesh position={[0,2.05,-9.82]} castShadow receiveShadow><boxGeometry args={[10.2,3.25,0.07]} /><meshPhysicalMaterial color=\"#101918\" roughness={0.32} metalness={0.04} transmission={0.035} transparent opacity={0.62} clearcoat={0.42} clearcoatRoughness={0.26} envMapIntensity={1.02} /></mesh></group>}\n\nfunction SanctuaryCeiling() {",
    'structural glazing',
)
once("const zBays = [4.65, 1.25, -2.15, -5.55, -8.65] as const", "const zBays = [4.55, 0.55, -3.45, -7.45] as const", 'canopy cadence')

once(
    "function PortalGlass({tone}:{tone:'ground'|'life-map'}){const color=tone==='ground'?'#5f8582':'#74769c';return <mesh position={[0,1.35,-0.18]}><planeGeometry args={[1.62,2.58]} /><meshPhysicalMaterial color=\"#07100f\" emissive={color} emissiveIntensity={0.014} transparent opacity={0.4} transmission={0.1} roughness={0.34} metalness={0.08} clearcoat={0.52} clearcoatRoughness={0.22} side={THREE.DoubleSide} depthWrite /></mesh>}",
    "function PortalGlass({tone}:{tone:'ground'|'life-map'}){const color=tone==='ground'?'#5f8582':'#74769c';return <mesh position={[0,1.35,-0.62]}><planeGeometry args={[1.46,2.38]} /><meshPhysicalMaterial color=\"#06100f\" emissive={color} emissiveIntensity={0.008} transparent opacity={0.3} transmission={0.045} roughness={0.46} metalness={0.08} clearcoat={0.3} clearcoatRoughness={0.34} side={THREE.DoubleSide} depthWrite /></mesh>}",
    'recess portal glass',
)

once(
    "function ThresholdAlcove({tone,onActivate,authoredPortal=false}:{tone:'ground'|'life-map';onActivate:()=>void;authoredPortal?:boolean}){const portal=useGLTF(PORTAL_MODEL);const model=useMemo(()=>clonePortalModel(portal.scene),[portal.scene]);const accent=tone==='ground'?'#597875':'#676b90';return <group userData={{treatment:'deep-recessed-architectural-threshold-v20',destination:tone}}><PouredStone position={[-1.16,1.42,0]} size={[0.46,2.84,0.72]} color=\"#101615\" /><PouredStone position={[1.16,1.42,0]} size={[0.46,2.84,0.72]} color=\"#101615\" /><PouredStone position={[0,2.72,0]} size={[2.74,0.34,0.72]} color=\"#101615\" /><MetalTrim position={[-0.9,1.42,-0.38]} size={[0.025,2.28,0.035]} color={accent} emissive={accent} intensity={0.045} /><MetalTrim position={[0.9,1.42,-0.38]} size={[0.025,2.28,0.035]} color={accent} emissive={accent} intensity={0.045} /><PortalGlass tone={tone} />{authoredPortal?<group position={[0,1.35,-0.3]} scale={0.19}><primitive object={model} /></group>:null}<mesh position={[0,1.45,0.1]} onClick={(event)=>{event.stopPropagation();onActivate()}}><boxGeometry args={[3.25,3.45,2.25]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group>}",
    "function ThresholdAlcove({tone,onActivate,authoredPortal=false}:{tone:'ground'|'life-map';onActivate:()=>void;authoredPortal?:boolean}){const portal=useGLTF(PORTAL_MODEL);const model=useMemo(()=>clonePortalModel(portal.scene),[portal.scene]);const accent=tone==='ground'?'#597875':'#676b90';return <group userData={{treatment:'layered-deep-architectural-threshold-v22',destination:tone}}><PouredStone position={[-1.28,1.48,0.04]} size={[0.58,2.96,1.34]} color=\"#0e1514\" roughness={0.72} /><PouredStone position={[1.28,1.48,0.04]} size={[0.58,2.96,1.34]} color=\"#0e1514\" roughness={0.72} /><PouredStone position={[0,2.84,0.04]} size={[3.14,0.42,1.34]} color=\"#0d1413\" roughness={0.7} /><PouredStone position={[0,0.09,0.52]} size={[2.52,0.18,1.22]} color=\"#111817\" roughness={0.62} /><PouredStone position={[0,1.42,-0.76]} size={[2.18,2.62,0.12]} color=\"#08100f\" metalness={0.1} roughness={0.76} /><MetalTrim position={[-0.92,1.42,-0.48]} size={[0.02,2.3,0.04]} color={accent} emissive={accent} intensity={0.02} /><MetalTrim position={[0.92,1.42,-0.48]} size={[0.02,2.3,0.04]} color={accent} emissive={accent} intensity={0.02} /><MetalTrim position={[0,2.54,-0.48]} size={[1.82,0.02,0.04]} color={accent} emissive={accent} intensity={0.018} /><PortalGlass tone={tone} />{authoredPortal?<group position={[0,1.35,-0.67]} scale={0.135}><primitive object={model} /></group>:null}<mesh position={[0,1.45,0.05]} onClick={(event)=>{event.stopPropagation();onActivate()}}><boxGeometry args={[3.35,3.55,2.45]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group>}",
    'layered architectural thresholds',
)

once(
    "<mesh name=\"home-orb-non-spherical-core\" scale={[0.18,0.3,0.18]} rotation={[0.12,0.38,-0.05]} castShadow><sphereGeometry args={[1,48,48]} /><meshPhysicalMaterial color=\"#374544\" emissive={stateColor} emissiveIntensity={intensity*0.2} roughness={0.34} metalness={0.48} clearcoat={0.34} clearcoatRoughness={0.3} envMapIntensity={0.94} /></mesh>",
    "<group name=\"home-orb-engineered-body\" rotation={[0.08,0.34,-0.04]}><mesh name=\"home-orb-non-spherical-core\" scale={[0.22,0.27,0.19]} castShadow><dodecahedronGeometry args={[1,2]} /><meshPhysicalMaterial color=\"#18201f\" emissive={stateColor} emissiveIntensity={intensity*0.045} roughness={0.24} metalness={0.78} clearcoat={0.18} clearcoatRoughness={0.38} envMapIntensity={1.16} /></mesh><mesh name=\"home-orb-upper-cap\" position={[0,0.245,0]} rotation={[0,0.18,0]} castShadow><cylinderGeometry args={[0.105,0.155,0.09,12]} /><meshStandardMaterial color=\"#303a38\" metalness={0.9} roughness={0.23} envMapIntensity={1.12} /></mesh><mesh name=\"home-orb-lower-cap\" position={[0,-0.245,0]} rotation={[0,-0.16,0]} castShadow><cylinderGeometry args={[0.155,0.105,0.09,12]} /><meshStandardMaterial color=\"#252e2d\" metalness={0.88} roughness={0.25} envMapIntensity={1.08} /></mesh><mesh name=\"home-orb-equatorial-seam\" rotation={[Math.PI/2,0,0]}><torusGeometry args={[0.205,0.012,8,72]} /><meshStandardMaterial color=\"#69716d\" metalness={0.92} roughness={0.22} /></mesh></group>",
    'engineered Orb shell',
)
once("<mesh scale={[0.072,0.12,0.072]}><sphereGeometry args={[1,32,32]} />", "<mesh scale={[0.055,0.082,0.055]}><sphereGeometry args={[1,32,32]} />", 'restrained Orb luminous core')
once("emissiveIntensity={intensity*0.88}", "emissiveIntensity={intensity*0.62}", 'Orb core emission')
once("<pointLight color={stateColor} intensity={intensity*0.34} distance={3.2} decay={2} />", "<pointLight color={stateColor} intensity={intensity*0.2} distance={2.6} decay={2} />", 'Orb practical light')

once("<mesh position={[-0.22,1.32,0.07]} rotation={[0,0,-0.72]} castShadow><boxGeometry args={[0.07,0.5,0.07]} />", "<mesh position={[-0.22,1.32,0.07]} rotation={[0,0,-0.72]} castShadow><cylinderGeometry args={[0.034,0.05,0.5,12]} />", 'left yoke strut')
once("<mesh position={[0.22,1.32,0.07]} rotation={[0,0,0.72]} castShadow><boxGeometry args={[0.07,0.5,0.07]} />", "<mesh position={[0.22,1.32,0.07]} rotation={[0,0,0.72]} castShadow><cylinderGeometry args={[0.034,0.05,0.5,12]} />", 'right yoke strut')

once("function PhysicalEnvironment(){return <Environment files={HOME_HDR} background={false} environmentIntensity={0.62} />}", "function PhysicalEnvironment(){return <Environment files={HOME_HDR} background={false} environmentIntensity={0.74} />}", 'environment response')
once("args={[cosmic?'#060918':'#0b1315',cosmic?0.0022:0.021]}", "args={[cosmic?'#060918':'#0b1315',cosmic?0.0022:0.0145]}", 'fog depth')
once("<ambientLight intensity={0.11} color=\"#bac5c3\" />", "<ambientLight intensity={0.145} color=\"#bac5c3\" />", 'ambient exposure')
once("<hemisphereLight args={['#7f979d','#080b09',0.34]} />", "<hemisphereLight args={['#7f979d','#080b09',0.4]} />", 'hemisphere exposure')
once("<directionalLight position={[-13,18,9]} intensity={1.06}", "<directionalLight position={[-13,18,9]} intensity={0.94}", 'moon key balance')
once("<spotLight position={[0,7.5,4]} intensity={0.42}", "<spotLight position={[0,7.5,4]} intensity={0.34}", 'practical key balance')
once("<SanctuaryArchitecture /><SanctuaryCeiling />", "<SanctuaryArchitecture /><SanctuaryGlazing /><SanctuaryCeiling />", 'render structural glazing')
once("gl.toneMappingExposure=1.16", "gl.toneMappingExposure=1.23", 'filmic exposure')

s = s.replace('data-home-final-art-revision=\"v21-visual-certification\"', 'data-home-final-art-revision=\"v22-photoreal-architecture\"')
s = s.replace('architectural-depth-v21-no-card', 'architectural-depth-v22-no-card')
s = s.replace('data-home-visual-grade=\"cinematic-pbr-v19-final-built-sanctuary\"', 'data-home-visual-grade=\"cinematic-pbr-v22-photoreal-built-sanctuary\"')

for bad in [
    'scale={[0.18,0.3,0.18]}',
    '<sphereGeometry args={[1,48,48]} />',
    "deep-recessed-architectural-threshold-v20",
    'data-home-final-art-revision=\"v21-visual-certification\"',
]:
    if bad in s:
        raise SystemExit(f'forbidden retained V21 visual pattern: {bad}')

for required in [
    'v22-photoreal-architecture',
    'smoked-structural-glass-v22',
    'layered-deep-architectural-threshold-v22',
    'home-orb-engineered-body',
    '<dodecahedronGeometry args={[1,2]} />',
    'RoundedBox',
]:
    if required not in s:
        raise SystemExit(f'missing V22 marker: {required}')

p.write_text(s)
print('Applied Home V22 photoreal architecture pass.')
