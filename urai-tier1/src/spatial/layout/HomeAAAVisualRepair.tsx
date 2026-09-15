'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { LIFE_MAP, height } from './HomeWorldProductionV223Geometry'

function buildCelestialVolume() {
  const count = 1180
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const pearl = new THREE.Color('#e2f4ed')
  const jade = new THREE.Color('#7fc5b5')
  const violet = new THREE.Color('#b1a7d2')
  const warm = new THREE.Color('#d7c79e')

  for (let index = 0; index < count; index += 1) {
    const t = (index + 0.5) / count
    const angle = index * 2.39996323 + Math.sin(index * 0.17) * 0.26
    const widening = 0.10 + Math.pow(t, 0.78) * 1.95
    const radialJitter = 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(index * 1.91 + 0.4))
    const radius = widening * radialJitter
    const sideBias = Math.sin(t * 7.1) * 0.14 + (t - 0.5) * 0.10
    const x = Math.cos(angle) * radius * (0.84 + 0.18 * Math.sin(index * 0.31)) + sideBias
    const y = 0.10 + t * 4.70 + 0.12 * Math.sin(index * 0.43)
    const z = -0.70 - t * 2.34 + Math.sin(angle) * radius * 0.78 + 0.12 * Math.cos(index * 0.23)
    positions.set([x, y, z], index * 3)

    const color = pearl.clone().lerp(jade, 0.16 + 0.50 * t)
    if (index % 9 === 0) color.lerp(violet, 0.38)
    if (index % 17 === 0) color.lerp(warm, 0.28)
    colors.set([color.r, color.g, color.b], index * 3)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function buildConstellationBranches(side: -1 | 1) {
  const points: THREE.Vector3[] = []
  const branchCount = side < 0 ? 6 : 5
  for (let branch = 0; branch < branchCount; branch += 1) {
    let previous = new THREE.Vector3(side * (0.12 + branch * 0.052), 0.04 + branch * 0.012, -0.66)
    for (let step = 1; step <= 18; step += 1) {
      const t = step / 18
      const spread = (0.16 + branch * 0.13) * Math.pow(t, 1.23)
      const drift = Math.sin(step * 0.57 + branch * 0.91 + (side < 0 ? 0.4 : 1.7)) * (0.028 + t * 0.035)
      const current = new THREE.Vector3(
        side * (0.11 + spread) + drift,
        0.06 + t * (3.34 + branch * 0.13) + Math.sin(t * 5.2 + branch) * 0.035,
        -0.70 - t * (0.94 + branch * 0.052) + Math.cos(step * 0.47 + branch) * 0.045,
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
      const shoulder = THREE.MathUtils.smoothstep(lane, 0.95, 4.9)
      const broadWeather = 0.018 * Math.sin(x * 0.61 + z * 0.27)
        + 0.012 * Math.cos(x * 0.43 - z * 0.52)
      const mineralBreakup = 0.007 * Math.sin(x * 1.37 + z * 0.83)
        + 0.005 * Math.cos(x * 2.08 - z * 1.19)
      positions.setY(index, height(x, z) + 0.032 + shoulder * (broadWeather + mineralBreakup))
    }

    positions.needsUpdate = true
    surface.geometry.computeVertexNormals()
    surface.geometry.computeBoundingBox()
    surface.geometry.computeBoundingSphere()

    surfaceMaterial.color.set('#a49b89')
    surfaceMaterial.normalScale.set(0.18, 0.18)
    surfaceMaterial.roughness = 0.89
    surfaceMaterial.envMapIntensity = 0.68
    surfaceMaterial.needsUpdate = true

    ridgeMaterial.color.set('#65736b')
    ridgeMaterial.normalScale.set(0.23, 0.23)
    ridgeMaterial.roughness = 0.94
    ridgeMaterial.envMapIntensity = 0.56
    ridgeMaterial.needsUpdate = true

    terrain.userData.uraiTerrainNaturalism = 'aaa-v255-broad-weathered-ground-no-corrugated-relief'

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

function CelestialAscent() {
  const stars = useMemo(buildCelestialVolume, [])
  const left = useMemo(() => buildConstellationBranches(-1), [])
  const right = useMemo(() => buildConstellationBranches(1), [])

  useEffect(() => () => {
    stars.dispose()
    left.dispose()
    right.dispose()
  }, [left, right, stars])

  const baseY = height(LIFE_MAP.x, LIFE_MAP.z)

  return (
    <group
      position={[LIFE_MAP.x, baseY + 0.08, LIFE_MAP.z]}
      rotation={[0, 0.08, 0]}
      name="home-aaa-life-map-celestial-ascent"
      userData={{
        artRevision: 'aaa-celestial-ascent-v2-open-volume',
        visualIntent: 'rooted-threshold-expanding-upward-into-open-deep-personal-constellation-space',
        semanticOwner: 'home-current-life-map-rooted-ascent',
        constructionPlane: 'none',
      }}
    >
      <points geometry={stars} frustumCulled={false}>
        <pointsMaterial vertexColors size={0.030} sizeAttenuation transparent opacity={0.84} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      <lineSegments geometry={left} frustumCulled={false}>
        <lineBasicMaterial color="#83b9ac" transparent opacity={0.20} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <lineSegments geometry={right} frustumCulled={false}>
        <lineBasicMaterial color="#a79ac4" transparent opacity={0.16} blending={THREE.AdditiveBlending} />
      </lineSegments>

      <pointLight position={[-0.18, 1.18, -1.06]} color="#91cabb" intensity={0.74} distance={5.4} decay={2} />
      <pointLight position={[0.52, 3.18, -2.10]} color="#b0a8d3" intensity={0.48} distance={5.0} decay={2} />
      <pointLight position={[-0.72, 2.48, -2.48]} color="#d4c79d" intensity={0.22} distance={3.8} decay={2} />
    </group>
  )
}

export function HomeAAAVisualRepair() {
  return (
    <group name="home-aaa-visual-repair-v2-open-celestial-volume">
      <hemisphereLight color="#a7c2b8" groundColor="#18201c" intensity={0.18} />
      <directionalLight position={[-5.5, 7.2, 3.6]} color="#b6c8bd" intensity={0.24} />
      <TerrainNaturalismRepair />
      <CelestialAscent />
    </group>
  )
}
