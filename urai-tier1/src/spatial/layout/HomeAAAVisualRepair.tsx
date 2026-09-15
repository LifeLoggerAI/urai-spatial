'use client'

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { LIFE_MAP, height } from './HomeWorldProductionV223Geometry'

function buildCelestialVolume() {
  const count = 920
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const pearl = new THREE.Color('#d8eee5')
  const jade = new THREE.Color('#78b7a8')
  const violet = new THREE.Color('#a8a0c8')

  for (let index = 0; index < count; index += 1) {
    const t = (index + 0.5) / count
    const angle = index * 2.39996323 + Math.sin(index * 0.17) * 0.22
    const widening = 0.16 + Math.pow(t, 0.72) * 1.28
    const radialJitter = 0.74 + 0.26 * Math.sin(index * 1.91 + 0.4)
    const radius = widening * radialJitter
    const x = Math.cos(angle) * radius * (0.74 + 0.12 * Math.sin(index * 0.31))
    const y = 0.18 + t * 4.45 + 0.10 * Math.sin(index * 0.43)
    const z = -0.82 - t * 1.42 + Math.sin(angle) * radius * 0.50
    positions.set([x, y, z], index * 3)

    const color = pearl.clone().lerp(jade, 0.18 + 0.54 * t)
    if (index % 7 === 0) color.lerp(violet, 0.34)
    colors.set([color.r, color.g, color.b], index * 3)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function buildConstellationBranches(side: -1 | 1) {
  const points: THREE.Vector3[] = []
  for (let branch = 0; branch < 7; branch += 1) {
    let previous = new THREE.Vector3(side * (0.18 + branch * 0.045), 0.06, -0.73)
    for (let step = 1; step <= 18; step += 1) {
      const t = step / 18
      const spread = (0.18 + branch * 0.11) * Math.pow(t, 1.26)
      const current = new THREE.Vector3(
        side * (0.15 + spread) + Math.sin(step * 0.63 + branch) * 0.035,
        0.08 + t * (3.20 + branch * 0.12),
        -0.76 - t * (0.82 + branch * 0.045) + Math.cos(step * 0.51 + branch) * 0.035,
      )
      points.push(previous, current)
      previous = current
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points)
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
        artRevision: 'aaa-celestial-ascent-v1',
        visualIntent: 'rooted-threshold-expanding-upward-into-deep-personal-constellation-space',
        semanticOwner: 'home-current-life-map-rooted-ascent',
      }}
    >
      <mesh position={[0, 2.16, -1.72]} scale={[1.26, 2.34, 1]}>
        <circleGeometry args={[1, 72]} />
        <meshBasicMaterial color="#071411" transparent opacity={0.58} depthWrite={false} />
      </mesh>

      <points geometry={stars}>
        <pointsMaterial vertexColors size={0.035} sizeAttenuation transparent opacity={0.88} depthWrite={false} />
      </points>

      <lineSegments geometry={left}>
        <lineBasicMaterial color="#7eb5a7" transparent opacity={0.27} />
      </lineSegments>
      <lineSegments geometry={right}>
        <lineBasicMaterial color="#9c91b7" transparent opacity={0.23} />
      </lineSegments>

      <pointLight position={[0, 1.25, -1.16]} color="#8fc8b8" intensity={0.88} distance={5.1} decay={2} />
      <pointLight position={[0.36, 3.25, -1.94]} color="#aaa4cf" intensity={0.62} distance={4.6} decay={2} />
    </group>
  )
}

export function HomeAAAVisualRepair() {
  return (
    <group name="home-aaa-visual-repair-v1">
      <hemisphereLight color="#a7c2b8" groundColor="#18201c" intensity={0.18} />
      <directionalLight position={[-5.5, 7.2, 3.6]} color="#b6c8bd" intensity={0.24} />
      <CelestialAscent />
    </group>
  )
}
