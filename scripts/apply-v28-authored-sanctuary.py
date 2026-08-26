from pathlib import Path

path = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
source = path.read_text()

def replace_block(start_marker: str, end_marker: str, replacement: str) -> None:
    global source
    start = source.index(start_marker)
    end = source.index(end_marker, start)
    source = source[:start] + replacement.rstrip() + '\n\n' + source[end:]

replace_block(
    'function cloneCompatibilitySanctuary(source: THREE.Object3D) {',
    'function clonePortalModel',
    r'''function cloneCompatibilitySanctuary(source: THREE.Object3D) {
  const root = cloneModel(source)
  const retiredFamilies = [
    'mirror-basin-', 'orb-sanctuary-pedestal', 'sanctuary-waterfall-', 'inhabited-village-',
    'living-growth-', 'embodied-presence-', 'memory-place-anchor-'
  ]
  root.visible = true
  root.userData.retainedForGovernedCompatibilityOnly = false
  root.userData.visibleWorldOwner = 'home-authored-sanctuary-horizon-thresholds-v28'
  root.userData.treatment = 'v28-filtered-authored-spatial-depth-no-fantasy-families'
  root.traverse((object) => {
    if (retiredFamilies.some((prefix) => object.name.startsWith(prefix))) object.visible = false
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue
      material.roughness = Math.max(material.roughness, 0.5)
      material.metalness = Math.min(material.metalness, 0.58)
      material.envMapIntensity = Math.min(material.envMapIntensity, 0.78)
      material.emissiveIntensity = Math.min(material.emissiveIntensity, 0.12)
      material.needsUpdate = true
    }
  })
  return root
}'''
)

source = source.replace('const pack = useStonePack(2.15, 2.55)', 'const pack = useStonePack(0.72, 0.86)')
source = source.replace("userData={{ treatment: 'large-format-photographic-stone-court-v24', source: HOME_PHOTOGRAPHIC_PBR_V19 }}", "userData={{ treatment: 'large-format-photographic-stone-court-v28-low-frequency', source: HOME_PHOTOGRAPHIC_PBR_V19 }}")
source = source.replace('<PouredStone position={[0,-0.16,-1.45]} size={[16.6,0.3,19.3]} color="#0d1211" roughness={0.82} />', '<PouredStone position={[0,-0.28,-1.45]} size={[16.6,0.18,19.3]} color="#0d1211" roughness={0.84} />')
source = source.replace('position={[0,0.002,-1.45]}', 'position={[0,-0.18,-1.45]}')
source = source.replace('color="#232a27" relief={0.006}', 'color="#202724" relief={0.003}')

replace_block(
    'function SanctuaryArchitecture() {',
    'function SanctuaryGlazing()',
    r'''function StructuralRib({ points, radius = 0.055, color = '#66706a', metalness = 0.86, roughness = 0.28 }: { points: Vec3[]; radius?: number; color?: string; metalness?: number; roughness?: number }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))), [points])
  return <mesh castShadow receiveShadow><tubeGeometry args={[curve,48,radius,8,false]} /><meshStandardMaterial color={color} metalness={metalness} roughness={roughness} envMapIntensity={1.08} /></mesh>
}

function SanctuaryArchitecture() {
  const pack = useStonePack(0.54,0.78)
  return <group name="home-sanctuary-pavilion" userData={{ visualOwner:'authored-nonprimitive-sacred-tech-sanctuary-v28',construction:'filtered-authored-horizon-plus-asymmetric-tapered-piers-and-curved-ribs',visualTreatment:'v28-authored-threshold-court-no-box-walls' }}>
    <group name="home-asymmetric-tapered-piers">
      <mesh position={[-5.45,1.55,1.85]} rotation={[0.04,0.11,-0.055]} castShadow receiveShadow><cylinderGeometry args={[0.26,0.48,3.15,7,1,false]} /><StoneTopMaterial pack={pack} color="#27302b" relief={0.002} /></mesh>
      <mesh position={[5.25,1.92,0.55]} rotation={[-0.03,-0.08,0.065]} castShadow receiveShadow><cylinderGeometry args={[0.22,0.43,3.82,7,1,false]} /><StoneTopMaterial pack={pack} color="#202824" relief={0.002} /></mesh>
      <mesh position={[-5.72,1.34,-5.25]} rotation={[-0.025,-0.12,0.04]} castShadow receiveShadow><cylinderGeometry args={[0.2,0.4,2.72,6,1,false]} /><StoneTopMaterial pack={pack} color="#313933" relief={0.002} /></mesh>
      <mesh position={[5.58,1.66,-6.18]} rotation={[0.02,0.13,-0.045]} castShadow receiveShadow><cylinderGeometry args={[0.24,0.46,3.28,7,1,false]} /><StoneTopMaterial pack={pack} color="#222b26" relief={0.002} /></mesh>
    </group>
    <group name="home-curved-structural-ribs" userData={{ treatment:'v28-curved-machined-load-paths-attached-to-piers' }}>
      <StructuralRib points={[[-5.45,3.05,1.85],[-4.5,3.72,0.9],[-2.7,4.16,-0.15],[-0.7,4.32,-0.7]]} radius={0.065} color="#77705b" />
      <StructuralRib points={[[5.25,3.78,0.55],[4.35,4.12,-0.45],[2.7,4.34,-1.35],[0.8,4.4,-1.75]]} radius={0.06} color="#55706c" />
      <StructuralRib points={[[-5.72,2.62,-5.25],[-4.7,3.28,-5.75],[-3.1,3.82,-6.2],[-1.35,4.02,-6.45]]} radius={0.058} color="#646c63" />
      <StructuralRib points={[[5.58,3.2,-6.18],[4.72,3.68,-6.5],[3.2,4.02,-6.72],[1.65,4.08,-6.86]]} radius={0.054} color="#867a60" />
      <StructuralRib points={[[-0.72,4.32,-0.7],[-0.15,4.5,-2.35],[0.15,4.42,-4.3],[-0.25,4.12,-6.4]]} radius={0.045} color="#5d6d69" />
    </group>
    <group name="home-recessed-machine-anchors">
      <mesh position={[-5.25,0.2,1.9]} castShadow><cylinderGeometry args={[0.38,0.52,0.22,7]} /><meshStandardMaterial color="#151d1a" metalness={0.45} roughness={0.38} /></mesh>
      <mesh position={[5.05,0.2,0.65]} castShadow><cylinderGeometry args={[0.34,0.5,0.22,7]} /><meshStandardMaterial color="#171f1c" metalness={0.48} roughness={0.36} /></mesh>
      <mesh position={[-5.52,0.2,-5.18]} castShadow><cylinderGeometry args={[0.34,0.47,0.22,6]} /><meshStandardMaterial color="#18211d" metalness={0.44} roughness={0.4} /></mesh>
      <mesh position={[5.38,0.2,-6.1]} castShadow><cylinderGeometry args={[0.36,0.5,0.22,7]} /><meshStandardMaterial color="#151d1a" metalness={0.5} roughness={0.35} /></mesh>
    </group>
    <RecessedPractical position={[-5.18,0.23,2.05]} /><RecessedPractical position={[5.0,0.23,0.8]} warm={false} />
    <RecessedPractical position={[-5.45,0.23,-5.0]} warm={false} /><RecessedPractical position={[5.32,0.23,-5.92]} />
  </group>
}'''
)

replace_block(
    'function SanctuaryCeiling() {',
    'function FloorPanelJoints()',
    r'''function SanctuaryCeiling() {
  return <group name="home-architectural-canopy" userData={{ treatment:'asymmetric-load-bearing-canopy-v28',visualTreatment:'v28-continuous-curved-rib-skylight-no-floating-bars' }}>
    <StructuralRib points={[[-4.45,3.76,0.92],[-3.1,4.18,0.2],[-1.35,4.42,-0.35],[0.45,4.5,-0.8],[2.15,4.42,-1.35],[4.25,4.1,-0.5]]} radius={0.052} color="#716a58" />
    <StructuralRib points={[[-4.72,3.32,-5.72],[-3.25,3.9,-6.12],[-1.65,4.18,-6.42],[0.15,4.22,-6.58],[1.85,4.18,-6.7],[4.7,3.7,-6.48]]} radius={0.05} color="#526a67" />
    <StructuralRib points={[[-3.0,4.2,0.12],[-2.2,4.38,-1.65],[-1.7,4.4,-3.55],[-1.65,4.2,-6.38]]} radius={0.034} color="#7b735e" />
    <StructuralRib points={[[2.25,4.38,-1.3],[2.05,4.45,-2.85],[2.25,4.38,-4.45],[2.0,4.18,-6.68]]} radius={0.032} color="#60736f" />
  </group>
}'''
)

source = source.replace("data-home-final-art-revision=\"v27-open-pier-faceted-relic-final-candidate\"", "data-home-final-art-revision=\"v28-authored-threshold-curved-rib-final-candidate\"")
source = source.replace("cinematic-pbr-v27-open-pier-faceted-relic-sanctuary", "cinematic-pbr-v28-authored-threshold-curved-rib-sanctuary")

path.write_text(source)
