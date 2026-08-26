from pathlib import Path

path = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
source = path.read_text()

def replace_between(text: str, start: str, end: str, replacement: str) -> str:
    a = text.index(start)
    b = text.index(end, a)
    return text[:a] + replacement.rstrip() + '\n\n' + text[b:]

# V28 retained too much of the compatibility GLB (large glossy threshold arches,
# low-poly terrain/horizon masses). Keep the governed binary loaded for identity
# and provenance, but retire its visible fantasy shell. The production sanctuary
# is owned by the built V29 architecture below.
source = source.replace(
    "  root.visible = true\n  root.userData.retainedForGovernedCompatibilityOnly = false\n  root.userData.visibleWorldOwner = 'home-authored-sanctuary-horizon-thresholds-v28'\n  root.userData.treatment = 'v28-filtered-authored-spatial-depth-no-fantasy-families'",
    "  root.visible = false\n  root.userData.retainedForGovernedCompatibilityOnly = true\n  root.userData.visibleWorldOwner = 'home-built-sanctuary-envelope-v29'\n  root.userData.treatment = 'v29-compatibility-glb-provenance-only-no-visible-fantasy-shell'"
)

architecture = r'''function SanctuaryArchitecture() {
  const pack = useStonePack(0.42,0.66)
  const pierData: readonly [Vec3, number, number, number][] = [
    [[-5.45,1.72,2.75],3.48,0.5,0.28], [[5.45,1.72,2.75],3.48,0.5,0.28],
    [[-5.58,1.9,-1.55],3.82,0.52,0.27], [[5.58,1.9,-1.55],3.82,0.52,0.27],
    [[-5.42,1.58,-6.05],3.2,0.48,0.25], [[5.42,1.58,-6.05],3.2,0.48,0.25],
  ]
  return <group name="home-sanctuary-pavilion" userData={{ visualOwner:'grounded-cinematic-sacred-tech-sanctuary-v29',construction:'six-tapered-stone-piers-continuous-steel-vault-and-integrated-thresholds',visualTreatment:'v29-grounded-vaulted-machine-hall-no-fantasy-shell' }}>
    <group name="home-v29-load-bearing-piers">
      {pierData.map(([position,height,base,top],index)=><group key={`pier-${index}`}>
        <mesh position={position as [number,number,number]} rotation={[0,index%2?-.035:.035,index%2?.022:-.022]} castShadow receiveShadow>
          <cylinderGeometry args={[top,base,height,8,1,false]} />
          <StoneTopMaterial pack={pack} color={index<2?'#272d2a':index<4?'#202724':'#2a302c'} relief={0.0015} />
        </mesh>
        <mesh position={[position[0],0.12,position[2]]} castShadow receiveShadow><cylinderGeometry args={[base*1.18,base*1.38,0.24,8]} /><meshStandardMaterial color="#111715" metalness={0.34} roughness={0.46} /></mesh>
      </group>)}
    </group>
    <group name="home-v29-cross-vault" userData={{ treatment:'v29-continuous-structural-vault-load-paths' }}>
      <StructuralRib points={[[-5.45,3.44,2.75],[-4.2,3.78,2.7],[-2.2,4.08,2.58],[0,4.2,2.5],[2.2,4.08,2.58],[4.2,3.78,2.7],[5.45,3.44,2.75]]} radius={0.075} color="#535a55" />
      <StructuralRib points={[[-5.58,3.78,-1.55],[-4.25,4.04,-1.6],[-2.2,4.28,-1.68],[0,4.36,-1.72],[2.2,4.28,-1.68],[4.25,4.04,-1.6],[5.58,3.78,-1.55]]} radius={0.078} color="#636057" />
      <StructuralRib points={[[-5.42,3.16,-6.05],[-4.15,3.56,-6.08],[-2.15,3.9,-6.1],[0,4.02,-6.08],[2.15,3.9,-6.1],[4.15,3.56,-6.08],[5.42,3.16,-6.05]]} radius={0.07} color="#4d5d5a" />
      <StructuralRib points={[[-3.55,4.0,2.68],[-3.4,4.18,0.5],[-3.35,4.27,-1.62],[-3.34,4.12,-3.8],[-3.35,3.72,-6.08]]} radius={0.045} color="#6c6657" />
      <StructuralRib points={[[3.55,4.0,2.68],[3.4,4.18,0.5],[3.35,4.27,-1.62],[3.34,4.12,-3.8],[3.35,3.72,-6.08]]} radius={0.045} color="#536763" />
    </group>
    <group name="home-v29-pier-bracing" userData={{ treatment:'v29-ground-to-vault-bracing' }}>
      <StructuralRib points={[[-5.1,0.25,2.75],[-5.34,1.6,2.75],[-5.45,3.35,2.75]]} radius={0.038} color="#303a36" />
      <StructuralRib points={[[5.1,0.25,2.75],[5.34,1.6,2.75],[5.45,3.35,2.75]]} radius={0.038} color="#303a36" />
      <StructuralRib points={[[-5.18,0.25,-6.05],[-5.34,1.45,-6.05],[-5.42,3.05,-6.05]]} radius={0.034} color="#303a36" />
      <StructuralRib points={[[5.18,0.25,-6.05],[5.34,1.45,-6.05],[5.42,3.05,-6.05]]} radius={0.034} color="#303a36" />
    </group>
    <RecessedPractical position={[-5.05,0.26,2.65]} /><RecessedPractical position={[5.05,0.26,2.65]} warm={false} />
    <RecessedPractical position={[-5.12,0.26,-5.9]} warm={false} /><RecessedPractical position={[5.12,0.26,-5.9]} />
  </group>
}'''
source = replace_between(source, 'function SanctuaryArchitecture() {', 'function SanctuaryGlazing()', architecture)

glazing = r'''function SanctuaryGlazing(){
  const glass=<meshPhysicalMaterial color="#101b1a" roughness={0.22} metalness={0.02} transmission={0.28} transparent opacity={0.2} clearcoat={0.46} clearcoatRoughness={0.22} envMapIntensity={0.9} />
  return <group name="home-architectural-glazing" userData={{treatment:'v29-narrow-inset-glazing-between-load-bearing-piers'}}>
    <mesh position={[-5.62,1.68,0.55]} rotation={[0,0.018,0]} receiveShadow><planeGeometry args={[0.01,3.1]} />{glass}</mesh>
    <mesh position={[5.62,1.68,0.55]} rotation={[0,-0.018,0]} receiveShadow><planeGeometry args={[0.01,3.1]} />{glass}</mesh>
    <mesh position={[-5.53,1.56,-3.82]} rotation={[0,-0.012,0]} receiveShadow><planeGeometry args={[0.01,2.75]} />{glass}</mesh>
    <mesh position={[5.53,1.56,-3.82]} rotation={[0,0.012,0]} receiveShadow><planeGeometry args={[0.01,2.75]} />{glass}</mesh>
  </group>
}'''
source = replace_between(source, 'function SanctuaryGlazing(){', 'function SanctuaryCeiling()', glazing)

ceiling = r'''function SanctuaryCeiling() {
  return <group name="home-architectural-canopy" userData={{ treatment:'integrated-vault-canopy-v29',visualTreatment:'v29-canopy-is-vault-not-floating-bars' }}>
    <StructuralRib points={[[-5.25,3.52,1.55],[-3.6,4.0,1.38],[-1.8,4.24,1.24],[0,4.3,1.18],[1.8,4.24,1.24],[3.6,4.0,1.38],[5.25,3.52,1.55]]} radius={0.042} color="#454f4b" />
    <StructuralRib points={[[-5.38,3.65,-3.72],[-3.6,4.02,-3.76],[-1.8,4.2,-3.78],[0,4.26,-3.8],[1.8,4.2,-3.78],[3.6,4.02,-3.76],[5.38,3.65,-3.72]]} radius={0.04} color="#5a5a52" />
  </group>
}'''
source = replace_between(source, 'function SanctuaryCeiling() {', 'function FloorPanelJoints()', ceiling)

cradle = r'''function OrbCradle(){
  return <group name="home-orb-engineered-cradle" position={[0,0,-2.15]} userData={{treatment:'v29-three-point-articulated-relic-dock',visualTreatment:'v29-curved-load-arms-contact-orb-no-pedestal-stem'}}>
    <group name="home-orb-dock-footings">
      <PouredStone position={[-0.46,0.14,0.2]} size={[0.38,0.12,0.42]} color="#151d1a" metalness={0.5} roughness={0.34} />
      <PouredStone position={[0.46,0.14,0.2]} size={[0.38,0.12,0.42]} color="#151d1a" metalness={0.5} roughness={0.34} />
      <PouredStone position={[0,0.14,-0.46]} size={[0.42,0.12,0.34]} color="#1b221f" metalness={0.52} roughness={0.34} />
    </group>
    <StructuralRib points={[[-0.46,0.2,0.2],[-0.48,0.62,0.14],[-0.4,0.95,0.08],[-0.31,1.18,0.03]]} radius={0.055} color="#56635d" />
    <StructuralRib points={[[0.46,0.2,0.2],[0.48,0.62,0.14],[0.4,0.95,0.08],[0.31,1.18,0.03]]} radius={0.055} color="#56635d" />
    <StructuralRib points={[[0,0.2,-0.46],[0,0.58,-0.5],[0,0.9,-0.43],[0,1.16,-0.32]]} radius={0.052} color="#796f58" />
    <mesh position={[-0.31,1.2,0.03]} rotation={[0.1,0,-0.32]} castShadow><octahedronGeometry args={[0.115,0]} /><meshStandardMaterial color="#2c3934" metalness={0.82} roughness={0.25} /></mesh>
    <mesh position={[0.31,1.2,0.03]} rotation={[0.1,0,0.32]} castShadow><octahedronGeometry args={[0.115,0]} /><meshStandardMaterial color="#2c3934" metalness={0.82} roughness={0.25} /></mesh>
    <mesh position={[0,1.18,-0.32]} rotation={[0.5,0,0]} castShadow><octahedronGeometry args={[0.105,0]} /><meshStandardMaterial color="#625a49" metalness={0.84} roughness={0.24} /></mesh>
    <mesh position={[0,0.075,-0.02]} rotation={[-Math.PI/2,0,0]} receiveShadow><ringGeometry args={[0.46,0.58,32,1,0,Math.PI*1.35]} /><meshStandardMaterial color="#313b36" metalness={0.72} roughness={0.3} side={THREE.DoubleSide} /></mesh>
  </group>
}'''
source = replace_between(source, 'function OrbCradle(){', 'function SacredOrb(', cradle)

threshold = r'''function ThresholdAlcove({tone,onActivate,authoredPortal=false}:{tone:'ground'|'life-map';onActivate:()=>void;authoredPortal?:boolean}){
  const portal=useGLTF(PORTAL_MODEL); const model=useMemo(()=>clonePortalModel(portal.scene),[portal.scene]); const accent=tone==='ground'?'#526d68':'#626784'
  return <group userData={{treatment:'v29-integrated-vault-threshold',destination:tone}}>
    <PouredStone position={[-0.9,0.16,0.02]} size={[0.42,0.22,0.7]} color="#121916" metalness={0.24} roughness={0.58} />
    <PouredStone position={[0.9,0.16,0.02]} size={[0.42,0.22,0.7]} color="#121916" metalness={0.24} roughness={0.58} />
    <mesh position={[-0.9,1.35,0.02]} castShadow receiveShadow><cylinderGeometry args={[0.18,0.31,2.35,8]} /><meshStandardMaterial color="#202824" metalness={0.22} roughness={0.58} /></mesh>
    <mesh position={[0.9,1.35,0.02]} castShadow receiveShadow><cylinderGeometry args={[0.18,0.31,2.35,8]} /><meshStandardMaterial color="#202824" metalness={0.22} roughness={0.58} /></mesh>
    <StructuralRib points={[[-0.9,2.5,0.02],[-0.72,2.72,0.02],[-0.35,2.88,0.02],[0,2.93,0.02],[0.35,2.88,0.02],[0.72,2.72,0.02],[0.9,2.5,0.02]]} radius={0.065} color={accent} metalness={0.78} roughness={0.3} />
    <mesh position={[0,1.46,-0.12]}><planeGeometry args={[1.54,2.22]} /><meshPhysicalMaterial color="#070d0c" emissive={accent} emissiveIntensity={0.01} transparent opacity={0.22} transmission={0.08} roughness={0.48} metalness={0.06} side={THREE.DoubleSide} depthWrite /></mesh>
    {authoredPortal?<group position={[0,1.43,-0.2]} scale={0.052}><primitive object={model} /></group>:null}
    <mesh position={[0,1.45,0.04]} onClick={(event)=>{event.stopPropagation();onActivate()}}><boxGeometry args={[2.2,2.9,1.1]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
  </group>
}'''
source = replace_between(source, 'function ThresholdAlcove(', 'function Thresholds(', threshold)

source = source.replace('large-format-photographic-stone-court-v28-low-frequency', 'large-format-photographic-stone-court-v29-grounded-low-frequency')
source = source.replace('v28-authored-threshold-curved-rib-final-candidate', 'v29-grounded-vaulted-sanctuary-final-candidate')
source = source.replace('cinematic-pbr-v28-authored-threshold-curved-rib-sanctuary', 'cinematic-pbr-v29-grounded-vaulted-machine-sanctuary')

required = [
    'v29-compatibility-glb-provenance-only-no-visible-fantasy-shell',
    'v29-grounded-vaulted-machine-hall-no-fantasy-shell',
    'v29-continuous-structural-vault-load-paths',
    'v29-canopy-is-vault-not-floating-bars',
    'v29-three-point-articulated-relic-dock',
    'v29-curved-load-arms-contact-orb-no-pedestal-stem',
    'v29-integrated-vault-threshold',
]
for marker in required:
    assert marker in source, marker
for retired in ['v28-authored-threshold-court-no-box-walls', 'v28-curved-machined-load-paths-attached-to-piers', 'v28-continuous-curved-rib-skylight-no-floating-bars']:
    assert retired not in source, retired

path.write_text(source)
