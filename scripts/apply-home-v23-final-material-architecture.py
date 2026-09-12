from pathlib import Path
import re

p = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
s = p.read_text()


def once(old: str, new: str, label: str) -> None:
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected one match, found {n}')
    s = s.replace(old, new, 1)


def replace_function(start: str, end: str, replacement: str, label: str) -> None:
    global s
    pattern = re.escape(start) + r'.*?(?=' + re.escape(end) + r')'
    out, n = re.subn(pattern, replacement.rstrip() + '\n\n', s, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f'{label}: expected one function range, found {n}')
    s = out


once(
    "function MetalTrim({ position, size, color = '#7a735e', emissive = '#302b20', intensity = 0.025 }: { position: Vec3; size: Vec3; color?: string; emissive?: string; intensity?: number }) {\n  return <mesh position={position as [number,number,number]} castShadow><boxGeometry args={size as [number,number,number]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={intensity} metalness={0.82} roughness={0.32} envMapIntensity={1.05} /></mesh>\n}",
    "function MetalTrim({ position, size, color = '#7a735e', emissive = '#302b20', intensity = 0.025 }: { position: Vec3; size: Vec3; color?: string; emissive?: string; intensity?: number }) {\n  return <mesh position={position as [number,number,number]} castShadow><boxGeometry args={size as [number,number,number]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={intensity} metalness={0.82} roughness={0.32} envMapIntensity={1.05} /></mesh>\n}\n\nfunction ArchitecturalStone({ pack, position, size, color = '#111716', roughness = 0.68, metalness = 0.03 }: { pack: SurfacePack; position: Vec3; size: Vec3; color?: string; roughness?: number; metalness?: number }) {\n  const radius = Math.min(0.09, Math.max(0.014, Math.min(size[0], size[1], size[2]) * 0.14))\n  return <RoundedBox args={size as [number,number,number]} radius={radius} smoothness={5} position={position as [number,number,number]} castShadow receiveShadow><meshPhysicalMaterial color={color} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(0.28,0.28)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={0.004} displacementBias={-0.002} roughness={roughness} metalness={metalness} clearcoat={0.07} clearcoatRoughness={0.72} envMapIntensity={0.72} /></RoundedBox>\n}",
    'architectural PBR stone helper',
)

once('const pack = useStonePack(2.15, 2.55)', 'const pack = useStonePack(0.58, 0.78)', 'floor photographic scale')
once('<StoneTopMaterial pack={pack} color="#202827" relief={0.012} />', '<StoneTopMaterial pack={pack} color="#111918" relief={0.008} />', 'floor material')
once('<circleGeometry args={[1.28,128]} />', '<circleGeometry args={[0.92,128]} />', 'ritual disk')
once('<ringGeometry args={[0.84,0.852,160]} />', '<ringGeometry args={[0.68,0.69,160]} />', 'ritual ring one')
once('<ringGeometry args={[1.08,1.092,160]} />', '<ringGeometry args={[0.82,0.83,160]} />', 'ritual ring two')

replace_function(
    'const FIN_Z = [3.9, -2.15, -7.35] as const\nfunction SanctuaryArchitecture() {',
    'function SanctuaryGlazing()',
    '''const FIN_Z = [3.4, -2.0, -7.2] as const
function SanctuaryArchitecture() {
  const pack = useStonePack(0.42,0.74)
  return <group name="home-sanctuary-pavilion" userData={{ visualOwner: 'material-authored-sacred-tech-sanctuary-v23', construction: 'physical-enclosure-not-fantasy-prop' }}>
    <ArchitecturalStone pack={pack} position={[-7.24,0.42,-1.5]} size={[0.34,0.82,19.2]} color="#080d0d" roughness={0.8} />
    <ArchitecturalStone pack={pack} position={[7.24,0.42,-1.5]} size={[0.34,0.82,19.2]} color="#080d0d" roughness={0.8} />
    {FIN_Z.map((z,index)=><group key={`piers-${z}`}>
      <ArchitecturalStone pack={pack} position={[-6.88,2.08,z]} size={[0.24,3.52,0.48]} color="#0b1110" roughness={0.7} />
      <ArchitecturalStone pack={pack} position={[6.88,2.08,z]} size={[0.24,3.52,0.48]} color="#0b1110" roughness={0.7} />
      <MetalTrim position={[-6.72,2.15,z]} size={[0.018,2.1,0.16]} color={index%2===0?'#5c6259':'#3e595a'} intensity={0.008} />
      <MetalTrim position={[6.72,2.15,z]} size={[0.018,2.1,0.16]} color={index%2===0?'#3e595a':'#5c6259'} intensity={0.008} />
    </group>)}
    <ArchitecturalStone pack={pack} position={[0,2.12,-9.82]} size={[12.2,3.7,0.22]} color="#09100f" roughness={0.76} />
    <MetalTrim position={[0,3.62,-9.66]} size={[7.8,0.02,0.025]} color="#465d5e" emissive="#102829" intensity={0.02} />
    <MetalTrim position={[0,0.52,-9.66]} size={[5.4,0.015,0.02]} color="#625c4d" emissive="#17140f" intensity={0.006} />
    <RecessedPractical position={[-6.58,0.09,3.5]} /><RecessedPractical position={[6.58,0.09,2.8]} warm={false} />
    <RecessedPractical position={[-6.58,0.09,-1.1]} warm={false} /><RecessedPractical position={[6.58,0.09,-2.4]} />
    <RecessedPractical position={[-6.58,0.09,-6.3]} /><RecessedPractical position={[6.58,0.09,-6.9]} warm={false} />
  </group>
}''',
    'sanctuary architecture',
)

replace_function(
    'function SanctuaryCeiling() {',
    'function FloorPanelJoints()',
    '''function SanctuaryCeiling() {
  const pack = useStonePack(0.36,0.68)
  const zBays = [4.2, -0.2, -4.6, -8.4] as const
  return <group name="home-architectural-canopy" userData={{ treatment:'slender-material-canopy-v23' }}>
    {zBays.map((z,index)=><group key={`canopy-${z}`}>
      <ArchitecturalStone pack={pack} position={[0,4.02,z]} size={[12.15,0.15,0.22]} color="#070c0c" roughness={0.7} />
      <MetalTrim position={[0,3.91,z+0.02]} size={[index===1?4.8:3.1,0.012,0.018]} color={index%2===0?'#555344':'#385455'} emissive={index%2===0?'#17140f':'#0c2526'} intensity={0.006} />
    </group>)}
    <ArchitecturalStone pack={pack} position={[-5.92,3.94,-2.0]} size={[0.22,0.16,13.7]} color="#070c0c" roughness={0.72} />
    <ArchitecturalStone pack={pack} position={[5.92,3.94,-2.0]} size={[0.22,0.16,13.7]} color="#070c0c" roughness={0.72} />
    <group name="home-orb-architectural-reliquary" position={[0,0,-2.52]} userData={{treatment:'compact-relic-bay-v23'}}>
      <mesh position={[0,2.3,-0.34]} rotation={[0,0,0]} castShadow><torusGeometry args={[0.78,0.035,10,96,Math.PI]} /><meshStandardMaterial color="#252d2b" metalness={0.88} roughness={0.28} envMapIntensity={0.92} /></mesh>
      <mesh position={[-0.74,1.58,-0.34]} rotation={[0,0,0.05]} castShadow><cylinderGeometry args={[0.035,0.055,1.32,12]} /><meshStandardMaterial color="#1c2523" metalness={0.84} roughness={0.31} /></mesh>
      <mesh position={[0.74,1.58,-0.34]} rotation={[0,0,-0.05]} castShadow><cylinderGeometry args={[0.035,0.055,1.32,12]} /><meshStandardMaterial color="#1c2523" metalness={0.84} roughness={0.31} /></mesh>
      <MetalTrim position={[0,2.28,-0.38]} size={[0.46,0.014,0.025]} color="#5f5a4b" intensity={0.005} />
    </group>
  </group>
}''',
    'slender canopy',
)

replace_function(
    'function FloorPanelJoints() {',
    'function ReflectingChannel',
    '''function FloorPanelJoints() {
  const zLines = [3.1, -1.25, -5.6] as const
  return <group name="home-floor-panel-joints" userData={{ treatment:'sparse-large-format-stone-seams-v23' }}>
    {zLines.map((z)=><MetalTrim key={z} position={[0,0.026,z]} size={[9.2,0.006,0.008]} color="#181e1d" emissive="#000000" intensity={0} />)}
    <MetalTrim position={[-2.72,0.026,-1.1]} size={[0.008,0.006,11.8]} color="#181e1d" emissive="#000000" intensity={0} />
    <MetalTrim position={[2.72,0.026,-1.1]} size={[0.008,0.006,11.8]} color="#181e1d" emissive="#000000" intensity={0} />
  </group>
}''',
    'sparse floor seams',
)

once("<PouredStone position={[-6.26,0.22,-1.55]} size={[0.86,0.38,16.8]} color=\"#0c1110\" roughness={0.82} /><PouredStone position={[6.26,0.22,-1.55]} size={[0.86,0.38,16.8]} color=\"#0c1110\" roughness={0.82} />", "<PouredStone position={[-6.38,0.17,-1.55]} size={[0.54,0.28,16.2]} color=\"#080d0c\" roughness={0.86} /><PouredStone position={[6.38,0.17,-1.55]} size={[0.54,0.28,16.2]} color=\"#080d0c\" roughness={0.86} />", 'planter mass restraint')

replace_function(
    'function OrbPlatform()',
    'function OrbCradle()',
    '''function OrbPlatform(){return <group position={[0,0,-2.15]} userData={{treatment:'subtle-relic-inlay-v23'}}><mesh position={[0,0.027,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[0.5,0.509,128]} /><meshStandardMaterial color="#4b5550" emissive="#102324" emissiveIntensity={0.006} metalness={0.86} roughness={0.32} /></mesh></group>}''',
    'subtle Orb floor inlay',
)

replace_function(
    'function OrbCradle()',
    'const ORB_FRAGMENT_LAYOUT',
    '''function OrbCradle(){return <group position={[0,0,-2.15]} name="home-orb-physical-cradle" userData={{treatment:'machined-relic-pedestal-v23'}}>
  <mesh position={[0,0.075,0]} castShadow receiveShadow><cylinderGeometry args={[0.56,0.64,0.15,48]} /><meshPhysicalMaterial color="#080d0d" roughness={0.36} metalness={0.44} clearcoat={0.18} clearcoatRoughness={0.3} envMapIntensity={0.92} /></mesh>
  <mesh position={[0,0.17,0]} castShadow receiveShadow><cylinderGeometry args={[0.39,0.48,0.08,48]} /><meshStandardMaterial color="#151d1b" roughness={0.34} metalness={0.68} envMapIntensity={1.02} /></mesh>
  <mesh position={[0,0.72,0.1]} castShadow><cylinderGeometry args={[0.045,0.065,0.98,16]} /><meshStandardMaterial color="#18211f" metalness={0.82} roughness={0.3} /></mesh>
  <mesh position={[0,1.18,0.07]} rotation={[0,0,Math.PI]} castShadow><torusGeometry args={[0.31,0.026,10,64,Math.PI]} /><meshStandardMaterial color="#29312f" metalness={0.88} roughness={0.27} /></mesh>
  <mesh position={[-0.28,1.34,0.07]} rotation={[0,0,-0.62]} castShadow><cylinderGeometry args={[0.026,0.04,0.42,12]} /><meshStandardMaterial color="#2f3734" metalness={0.9} roughness={0.25} /></mesh>
  <mesh position={[0.28,1.34,0.07]} rotation={[0,0,0.62]} castShadow><cylinderGeometry args={[0.026,0.04,0.42,12]} /><meshStandardMaterial color="#2f3734" metalness={0.9} roughness={0.25} /></mesh>
  <mesh position={[0,0.215,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[0.32,0.335,96]} /><meshStandardMaterial color="#625c4d" emissive="#17140f" emissiveIntensity={0.006} metalness={0.88} roughness={0.28} /></mesh>
</group>}''',
    'machined Orb cradle',
)

once('scale={[0.22,0.27,0.19]}', 'scale={[0.275,0.325,0.235]}', 'Orb body scale')
once('args={[0.105,0.155,0.09,12]}', 'args={[0.12,0.18,0.085,16]}', 'Orb upper cap')
once('position={[0,0.245,0]}', 'position={[0,0.29,0]}', 'Orb upper cap position')
once('args={[0.155,0.105,0.09,12]}', 'args={[0.18,0.12,0.085,16]}', 'Orb lower cap')
once('position={[0,-0.245,0]}', 'position={[0,-0.29,0]}', 'Orb lower cap position')
once('args={[0.205,0.012,8,72]}', 'args={[0.245,0.009,8,88]}', 'Orb seam')
once('args={[0.385,0.006,10,112]}', 'args={[0.35,0.0045,10,112]}', 'Orb ring one')
once('args={[0.35,0.0055,10,112]}', 'args={[0.315,0.0042,10,112]}', 'Orb ring two')
once('args={[0.32,0.005,10,112]}', 'args={[0.285,0.004,10,112]}', 'Orb ring three')

replace_function(
    "function PortalGlass({tone}:{tone:'ground'|'life-map'})",
    'function Thresholds',
    '''function PortalGlass({tone}:{tone:'ground'|'life-map'}){const color=tone==='ground'?'#4f6f6c':'#5b5f82';return <mesh position={[0,1.34,-0.74]}><planeGeometry args={[1.34,2.2]} /><meshPhysicalMaterial color="#050b0a" emissive={color} emissiveIntensity={0.004} transparent opacity={0.2} transmission={0.02} roughness={0.56} metalness={0.1} clearcoat={0.16} clearcoatRoughness={0.42} side={THREE.DoubleSide} depthWrite /></mesh>}
function ThresholdAlcove({tone,onActivate,authoredPortal=false}:{tone:'ground'|'life-map';onActivate:()=>void;authoredPortal?:boolean}){
  const portal=useGLTF(PORTAL_MODEL); const model=useMemo(()=>clonePortalModel(portal.scene),[portal.scene]); const pack=useStonePack(0.34,0.62); const accent=tone==='ground'?'#4e6865':'#555978'
  return <group userData={{treatment:'integrated-material-doorway-v23',destination:tone}}>
    <ArchitecturalStone pack={pack} position={[-1.12,1.46,0]} size={[0.32,2.82,0.88]} color="#090f0e" roughness={0.72} />
    <ArchitecturalStone pack={pack} position={[1.12,1.46,0]} size={[0.32,2.82,0.88]} color="#090f0e" roughness={0.72} />
    <ArchitecturalStone pack={pack} position={[0,2.75,0]} size={[2.54,0.28,0.88]} color="#080e0d" roughness={0.7} />
    <ArchitecturalStone pack={pack} position={[0,0.08,0.32]} size={[2.18,0.14,0.82]} color="#0d1413" roughness={0.62} />
    <ArchitecturalStone pack={pack} position={[0,1.4,-0.78]} size={[2.0,2.52,0.1]} color="#060b0a" roughness={0.82} />
    <MetalTrim position={[-0.91,1.43,-0.48]} size={[0.014,2.18,0.024]} color={accent} emissive={accent} intensity={0.008} />
    <MetalTrim position={[0.91,1.43,-0.48]} size={[0.014,2.18,0.024]} color={accent} emissive={accent} intensity={0.008} />
    <MetalTrim position={[0,2.48,-0.48]} size={[1.76,0.014,0.024]} color={accent} emissive={accent} intensity={0.006} />
    <PortalGlass tone={tone} />
    {authoredPortal?<group position={[0,1.34,-0.71]} scale={0.09}><primitive object={model} /></group>:null}
    <mesh position={[0,1.45,0.04]} onClick={(event)=>{event.stopPropagation();onActivate()}}><boxGeometry args={[3.1,3.35,2.2]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
  </group>
}''',
    'integrated material thresholds',
)

once('<ReflectingChannel x={-5.45} /><ReflectingChannel x={5.45} /><SanctuaryArchitecture /><SanctuaryGlazing /><SanctuaryCeiling />', '<SanctuaryArchitecture /><SanctuaryCeiling />', 'remove game-rail channels and transparent wall-card glazing from final render')
once("args={[cosmic?'#060918':'#0b1315',cosmic?0.0022:0.0145]}", "args={[cosmic?'#060918':'#091112',cosmic?0.0022:0.0095]}", 'physical atmospheric depth')
once('<ambientLight intensity={0.145} color="#bac5c3" />', '<ambientLight intensity={0.105} color="#bac5c3" />', 'ambient contrast')
once("<hemisphereLight args={['#7f979d','#080b09',0.4]} />", "<hemisphereLight args={['#74898d','#060908',0.31]} />", 'hemisphere contrast')
once('<directionalLight position={[-13,18,9]} intensity={0.94}', '<directionalLight position={[-13,18,9]} intensity={0.78}', 'moon key contrast')
once('<spotLight position={[0,7.5,4]} intensity={0.34}', '<spotLight position={[0,7.5,4]} intensity={0.27}', 'practical key contrast')
once('gl.toneMappingExposure=1.23', 'gl.toneMappingExposure=1.12', 'filmic exposure')

s = s.replace('v22-photoreal-architecture', 'v23-final-material-architecture')
s = s.replace('architectural-depth-v22-no-card', 'architectural-depth-v23-no-card')
s = s.replace('cinematic-pbr-v22-photoreal-built-sanctuary', 'cinematic-pbr-v23-final-material-sanctuary')

for bad in [
    '<SanctuaryGlazing /><SanctuaryCeiling />',
    '<ReflectingChannel x={-5.45}',
    'layered-deep-architectural-threshold-v22',
    'scale={[0.22,0.27,0.19]}',
    'v22-photoreal-architecture',
]:
    if bad in s:
        raise SystemExit(f'forbidden retained V22 visual pattern: {bad}')

for required in [
    'v23-final-material-architecture',
    'material-authored-sacred-tech-sanctuary-v23',
    'slender-material-canopy-v23',
    'integrated-material-doorway-v23',
    'machined-relic-pedestal-v23',
    'sparse-large-format-stone-seams-v23',
    'home-orb-stabilizer-ring-3',
]:
    if required not in s:
        raise SystemExit(f'missing V23 marker: {required}')

p.write_text(s)
print('Applied Home V23 final material architecture pass.')
