'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GROUND, LIFE_MAP, ORB, height } from './HomeWorldProductionV223Geometry'

function buildCelestialVolume() {
  const count = 1680
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const pearl = new THREE.Color('#e9fbf3')
  const jade = new THREE.Color('#7fc5b5')
  const violet = new THREE.Color('#b8a8d8')
  const warm = new THREE.Color('#e2c998')

  for (let index = 0; index < count; index += 1) {
    const t = (index + 0.5) / count
    const angle = index * 2.39996323 + Math.sin(index * 0.17) * 0.31
    const widening = 0.08 + Math.pow(t, 0.72) * 2.18
    const radialJitter = 0.56 + 0.44 * (0.5 + 0.5 * Math.sin(index * 1.91 + 0.4))
    const radius = widening * radialJitter
    const sideBias = Math.sin(t * 7.1) * 0.14 + (t - 0.5) * 0.12
    const x = Math.cos(angle) * radius * (0.82 + 0.22 * Math.sin(index * 0.31)) + sideBias
    const y = 0.08 + t * 5.15 + 0.14 * Math.sin(index * 0.43)
    const z = -0.62 - t * 2.68 + Math.sin(angle) * radius * 0.88 + 0.14 * Math.cos(index * 0.23)
    positions.set([x, y, z], index * 3)

    const color = pearl.clone().lerp(jade, 0.12 + 0.55 * t)
    if (index % 8 === 0) color.lerp(violet, 0.42)
    if (index % 19 === 0) color.lerp(warm, 0.34)
    colors.set([color.r, color.g, color.b], index * 3)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function buildConstellationBranches(side: -1 | 1) {
  const points: THREE.Vector3[] = []
  const branchCount = side < 0 ? 7 : 6
  for (let branch = 0; branch < branchCount; branch += 1) {
    let previous = new THREE.Vector3(side * (0.10 + branch * 0.048), 0.04 + branch * 0.012, -0.64)
    for (let step = 1; step <= 20; step += 1) {
      const t = step / 20
      const spread = (0.14 + branch * 0.13) * Math.pow(t, 1.18)
      const drift = Math.sin(step * 0.57 + branch * 0.91 + (side < 0 ? 0.4 : 1.7)) * (0.026 + t * 0.040)
      const current = new THREE.Vector3(
        side * (0.10 + spread) + drift,
        0.05 + t * (3.72 + branch * 0.14) + Math.sin(t * 5.2 + branch) * 0.04,
        -0.68 - t * (1.10 + branch * 0.056) + Math.cos(step * 0.47 + branch) * 0.05,
      )
      points.push(previous, current)
      previous = current
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function firstStandardMaterial(mesh: THREE.Mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  return materials.find((material): material is THREE.MeshStandardMaterial => material instanceof THREE.MeshStandardMaterial) ?? null
}

function TerrainNaturalismRepair() {
  const { scene } = useThree()
  const restoreRef = useRef<(() => void) | null>(null)

  useFrame(() => {
    if (restoreRef.current) return
    const terrain = scene.getObjectByName('home-v229-textured-inhabited-valley-and-distant-ridge')
    if (!terrain) return

    const meshes = terrain.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh)
    if (meshes.length < 2) return
    const [surface, ridge] = meshes
    const positions = surface.geometry.getAttribute('position')
    const surfaceMaterial = firstStandardMaterial(surface)
    const ridgeMaterial = firstStandardMaterial(ridge)
    if (!(positions instanceof THREE.BufferAttribute) || !surfaceMaterial || !ridgeMaterial) return

    const originalPositions = Float32Array.from(positions.array as ArrayLike<number>)
    const originalSurfaceColor = surfaceMaterial.color.clone()
    const originalRidgeColor = ridgeMaterial.color.clone()
    const originalSurfaceNormalScale = surfaceMaterial.normalScale.clone()
    const originalRidgeNormalScale = ridgeMaterial.normalScale.clone()
    const originalSurfaceRoughness = surfaceMaterial.roughness
    const originalRidgeRoughness = ridgeMaterial.roughness
    const originalSurfaceEnvMapIntensity = surfaceMaterial.envMapIntensity
    const originalRidgeEnvMapIntensity = ridgeMaterial.envMapIntensity
    const previousTerrainMarker = terrain.userData.uraiTerrainNaturalism

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index)
      const z = positions.getZ(index)
      const pathX = 0.30 * Math.sin((z + 2.4) * 0.22) + 0.09 * Math.sin((z - 1) * 0.63)
      const lane = Math.abs(x - pathX)
      const shoulder = THREE.MathUtils.smoothstep(lane, 0.90, 4.8)
      const broadWeather = 0.026 * Math.sin(x * 0.61 + z * 0.27)
        + 0.017 * Math.cos(x * 0.43 - z * 0.52)
      const mineralBreakup = 0.010 * Math.sin(x * 1.37 + z * 0.83)
        + 0.007 * Math.cos(x * 2.08 - z * 1.19)
      const footWear = Math.exp(-lane * lane / 1.7) * (-0.014 + 0.006 * Math.sin(z * 1.22))
      positions.setY(index, height(x, z) + 0.030 + shoulder * (broadWeather + mineralBreakup) + footWear)
    }

    positions.needsUpdate = true
    surface.geometry.computeVertexNormals()
    surface.geometry.computeBoundingBox()
    surface.geometry.computeBoundingSphere()

    surfaceMaterial.color.set('#918a77')
    surfaceMaterial.normalScale.set(0.34, 0.34)
    surfaceMaterial.roughness = 0.92
    surfaceMaterial.envMapIntensity = 0.48
    surfaceMaterial.needsUpdate = true

    ridgeMaterial.color.set('#5d6a62')
    ridgeMaterial.normalScale.set(0.30, 0.30)
    ridgeMaterial.roughness = 0.95
    ridgeMaterial.envMapIntensity = 0.42
    ridgeMaterial.needsUpdate = true

    terrain.userData.uraiTerrainNaturalism = 'aaa-v280-weathered-mineral-ground-readable-microrelief'

    restoreRef.current = () => {
      ;(positions.array as Float32Array).set(originalPositions)
      positions.needsUpdate = true
      surface.geometry.computeVertexNormals()
      surface.geometry.computeBoundingBox()
      surface.geometry.computeBoundingSphere()
      surfaceMaterial.color.copy(originalSurfaceColor)
      surfaceMaterial.normalScale.copy(originalSurfaceNormalScale)
      surfaceMaterial.roughness = originalSurfaceRoughness
      surfaceMaterial.envMapIntensity = originalSurfaceEnvMapIntensity
      surfaceMaterial.needsUpdate = true
      ridgeMaterial.color.copy(originalRidgeColor)
      ridgeMaterial.normalScale.copy(originalRidgeNormalScale)
      ridgeMaterial.roughness = originalRidgeRoughness
      ridgeMaterial.envMapIntensity = originalRidgeEnvMapIntensity
      ridgeMaterial.needsUpdate = true
      if (previousTerrainMarker === undefined) delete terrain.userData.uraiTerrainNaturalism
      else terrain.userData.uraiTerrainNaturalism = previousTerrainMarker
    }
  })

  useEffect(() => () => {
    restoreRef.current?.()
    restoreRef.current = null
  }, [])
  return null
}

function ForegroundVegetationCleanup() {
  const { scene } = useThree()
  const hidden = useRef(new Set<THREE.Object3D>())

  useFrame(() => {
    scene.traverse((object) => {
      if (!/^home-scanned-fern-\d+$/.test(object.name) || hidden.current.has(object) || !object.visible) return
      if (object.position.z <= -10.6) return
      object.visible = false
      hidden.current.add(object)
    })
  })

  useEffect(() => () => {
    hidden.current.forEach((object) => { object.visible = true })
    hidden.current.clear()
  }, [])
  return null
}

function stoneGeometry(seed: number) {
  const geometry = new THREE.IcosahedronGeometry(1, 2)
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index), y = positions.getY(index), z = positions.getZ(index)
    const irregular = 1 + 0.10 * Math.sin(x * 4.7 + seed) + 0.055 * Math.sin(y * 7.1 - z * 5.3 + seed * .7)
    positions.setXYZ(index, x * irregular, y * irregular * .72, z * irregular)
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function ValleyMicroDetail() {
  const geometries = useMemo(() => [0, 1, 2, 3].map(stoneGeometry), [])
  const stones = useMemo(() => Array.from({ length: 34 }, (_, index) => {
    const side = index % 2 ? -1 : 1
    const depth = index / 33
    const z = 3.0 - depth * 18.8 + Math.sin(index * 1.73) * .28
    const lane = 2.25 + (index % 7) * .55 + Math.sin(index * .87) * .18
    const x = side * lane
    const scale = .075 + (index % 6) * .027
    return { x, z, scale, rotation: index * .83, variant: index % geometries.length }
  }), [geometries.length])

  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries])

  return <group name="home-aaa-v280-weathered-micro-detail" userData={{ visualOnly: true, interactionOwner: false }} raycast={() => null}>
    {stones.map((stone, index) => <mesh
      key={index}
      geometry={geometries[stone.variant]}
      position={[stone.x, height(stone.x, stone.z) + .025, stone.z]}
      rotation={[.08 * Math.sin(index), stone.rotation, .05 * Math.cos(index * .7)]}
      scale={[stone.scale * 1.35, stone.scale * .72, stone.scale]}
      receiveShadow
      raycast={() => null}
    >
      <meshStandardMaterial color={index % 4 === 0 ? '#756b59' : index % 3 === 0 ? '#55655a' : '#67685b'} roughness={.98} metalness={0} />
    </mesh>)}
  </group>
}

function tube(points: THREE.Vector3[], radius: number, radial = 8) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal', .42), Math.max(42, points.length * 5), radius, radial, false)
}

function orbFilament(index: number) {
  const side = index % 2 ? -1 : 1
  const lane = Math.floor(index / 2)
  const points = Array.from({ length: 15 }, (_, step) => {
    const t = step / 14
    const y = -.62 + t * 1.28
    const arch = Math.sin(t * Math.PI)
    const x = side * (.055 + lane * .036 + arch * (.10 + lane * .015)) + .025 * Math.sin(t * 8 + index)
    const z = .57 - .10 * Math.abs(x) + .018 * Math.sin(t * 7 + index * .6)
    return new THREE.Vector3(x, y, z)
  })
  return tube(points, .0055 + (index % 3) * .0014, 6)
}

function LivingMemorySurfaceFinish() {
  const filaments = useMemo(() => Array.from({ length: 12 }, (_, index) => orbFilament(index)), [])
  const pearls = useMemo(() => Array.from({ length: 21 }, (_, index) => {
    const t = (index + .5) / 21
    const angle = index * 2.39996323
    return {
      position: [Math.cos(angle) * (.08 + .28 * Math.sqrt(t)) - .04, -.56 + t * 1.16, .59 + Math.sin(angle) * .055] as [number, number, number],
      scale: .018 + (index % 5) * .004,
      warm: index % 4 === 0,
    }
  }), [])
  useEffect(() => () => filaments.forEach((geometry) => geometry.dispose()), [filaments])
  const y = height(ORB.x, ORB.z)

  return <group position={[ORB.x, y + .92, ORB.z]} rotation={[.06, -.46, -.11]} name="home-aaa-v280-living-memory-surface-finish" userData={{ visualOnly: true, interactionOwner: false, finish: 'surface-bound-filaments-mineral-memory-pearls' }} raycast={() => null}>
    <mesh scale={[.77, 1.12, .73]} raycast={() => null}>
      <sphereGeometry args={[1, 48, 34]} />
      <meshPhysicalMaterial color="#9ab4a7" emissive="#365e55" emissiveIntensity={.14} transparent opacity={.055} roughness={.36} clearcoat={.34} clearcoatRoughness={.52} depthWrite={false} />
    </mesh>
    {filaments.map((geometry, index) => <mesh key={index} geometry={geometry} raycast={() => null}>
      <meshStandardMaterial color={index % 3 === 0 ? '#d3b98e' : '#8fc1b0'} emissive={index % 3 === 0 ? '#7b5b38' : '#315f53'} emissiveIntensity={.42} roughness={.50} metalness={0} transparent opacity={.72} depthWrite={false} />
    </mesh>)}
    {pearls.map((pearl, index) => <mesh key={`pearl-${index}`} position={pearl.position} scale={pearl.scale} raycast={() => null}>
      <sphereGeometry args={[1, 12, 9]} />
      <meshBasicMaterial color={pearl.warm ? '#f0d39d' : '#c4eee0'} transparent opacity={.84} toneMapped={false} />
    </mesh>)}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.77, .01]} raycast={() => null}>
      <ringGeometry args={[.48, .58, 72]} />
      <meshBasicMaterial color="#8eb3a5" transparent opacity={.13} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
    <pointLight position={[.12,.12,.58]} color="#a6d4c3" intensity={.28} distance={2.4} decay={2} />
  </group>
}

function groundFissure(index: number) {
  const side = index % 2 ? -1 : 1
  const offset = .11 + index * .045
  return tube([
    new THREE.Vector3(side * offset, .02, .78),
    new THREE.Vector3(side * (offset + .10), -.01, .26),
    new THREE.Vector3(side * (offset - .035), -.04, -.26),
    new THREE.Vector3(side * (offset + .12), -.11, -.82),
  ], .007 + index * .0011, 6)
}

function GroundThresholdFinish() {
  const fissures = useMemo(() => Array.from({ length: 5 }, (_, index) => groundFissure(index)), [])
  useEffect(() => () => fissures.forEach((geometry) => geometry.dispose()), [fissures])
  const y = height(GROUND.x, GROUND.z)
  return <group position={[GROUND.x, y + .08, GROUND.z]} rotation={[0,-.10,0]} name="home-aaa-v280-ground-memory-descent-finish" userData={{ visualOnly: true, interactionOwner: false }} raycast={() => null}>
    {fissures.map((geometry,index)=><mesh key={index} geometry={geometry} raycast={() => null}>
      <meshStandardMaterial color="#a86b4d" emissive="#a44b2b" emissiveIntensity={.62-index*.06} roughness={.70} transparent opacity={.68} />
    </mesh>)}
    {Array.from({ length: 7 }, (_, index) => {
      const side = index % 2 ? -1 : 1
      const z = .66 - index * .25
      return <mesh key={`ember-${index}`} position={[side*(.44+.05*(index%3)), -.03-index*.012, z]} scale={.022 + (index%3)*.006} raycast={() => null}>
        <sphereGeometry args={[1,10,8]} /><meshBasicMaterial color="#e7a475" transparent opacity={.74} toneMapped={false}/>
      </mesh>
    })}
    <pointLight position={[0,.18,-.45]} color="#bd7655" intensity={.44} distance={3.2} decay={2}/>
  </group>
}

function CelestialAscent() {
  const stars = useMemo(buildCelestialVolume, [])
  const left = useMemo(() => buildConstellationBranches(-1), [])
  const right = useMemo(() => buildConstellationBranches(1), [])
  useEffect(() => () => { stars.dispose(); left.dispose(); right.dispose() }, [left, right, stars])
  const baseY = height(LIFE_MAP.x, LIFE_MAP.z)

  return (
    <group position={[LIFE_MAP.x, baseY + 0.08, LIFE_MAP.z]} rotation={[0, 0.08, 0]} name="home-aaa-life-map-celestial-ascent" userData={{ artRevision: 'aaa-celestial-ascent-v3-gold-master-depth', visualIntent: 'rooted-threshold-expanding-upward-into-open-deep-personal-constellation-space', semanticOwner: 'home-current-life-map-rooted-ascent', constructionPlane: 'none', visualOnly: true, interactionOwner: false }} raycast={() => null}>
      <points geometry={stars} frustumCulled={false} raycast={() => null}>
        <pointsMaterial vertexColors size={0.034} sizeAttenuation transparent opacity={0.90} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <lineSegments geometry={left} frustumCulled={false} raycast={() => null}>
        <lineBasicMaterial color="#8ac4b4" transparent opacity={0.24} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <lineSegments geometry={right} frustumCulled={false} raycast={() => null}>
        <lineBasicMaterial color="#b3a2d0" transparent opacity={0.20} blending={THREE.AdditiveBlending} />
      </lineSegments>
      {[0,1,2].map((index)=><mesh key={`halo-${index}`} position={[0,1.46+index*.66,-1.10-index*.34]} rotation={[0,0,.08-index*.05]} scale={[1.0+index*.28,1.22+index*.32,1]} raycast={() => null}>
        <ringGeometry args={[.46+index*.10,.475+index*.10,96]}/><meshBasicMaterial color={index===1?'#b5a6d1':'#91cabb'} transparent opacity={.14-index*.018} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/>
      </mesh>)}
      {Array.from({ length: 12 },(_,index)=>{
        const angle=index*2.39996323, r=.32+(index%5)*.16
        return <mesh key={`memory-${index}`} position={[Math.cos(angle)*r,.68+(index%6)*.57,-.82-Math.sin(angle)*.28-(index%4)*.22]} scale={.025+(index%4)*.008} raycast={() => null}>
          <sphereGeometry args={[1,12,9]}/><meshBasicMaterial color={index%3===0?'#dbc9a0':index%3===1?'#a3d8c7':'#c2b4dd'} transparent opacity={.78} toneMapped={false}/>
        </mesh>
      })}
      <pointLight position={[-0.18, 1.18, -1.06]} color="#91cabb" intensity={0.86} distance={5.8} decay={2} />
      <pointLight position={[0.52, 3.18, -2.10]} color="#b0a8d3" intensity={0.60} distance={5.4} decay={2} />
      <pointLight position={[-0.72, 2.48, -2.48]} color="#d4c79d" intensity={0.28} distance={4.2} decay={2} />
    </group>
  )
}

export function HomeAAAVisualRepair() {
  return (
    <group name="home-aaa-visual-repair-v2-open-celestial-volume" userData={{ goldMasterRevision: 'v280-literal-pixel-convergence' }}>
      <hemisphereLight color="#a7c2b8" groundColor="#18201c" intensity={0.20} />
      <directionalLight position={[-5.5, 7.2, 3.6]} color="#c7d2c3" intensity={0.30} />
      <TerrainNaturalismRepair />
      <ForegroundVegetationCleanup />
      <ValleyMicroDetail />
      <LivingMemorySurfaceFinish />
      <GroundThresholdFinish />
      <CelestialAscent />
    </group>
  )
}
