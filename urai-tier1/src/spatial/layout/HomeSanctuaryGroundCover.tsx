'use client'

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { homeTerrainHeight } from './HomeSanctuaryGeometry'

// Optional authored landscaping study, never a scan or an approved photoreal
// asset. Entirely real 3D geometry, instanced in one draw call. It neither
// alters the retained Home GLB nor participates in movement/collision.
export type GroundCoverTier = 'low' | 'medium' | 'high'
type CoverPlacement = readonly [x: number, z: number, height: number, yaw: number, tint: number]

function noise(index: number, salt: number): number {
  const value = Math.sin((index + 1) * 131.731 + salt * 29.417) * 43758.5453
  return value - Math.floor(value)
}

function distanceFromSegment(x: number, z: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / Math.max(.0001, dx * dx + dz * dz)))
  return Math.hypot(x - ax - t * dx, z - az - t * dz)
}

function distanceFromPath(x: number, z: number, start: readonly [number, number], end: readonly [number, number], bend: number): number {
  let distance = Infinity
  let previousX = start[0], previousZ = start[1]
  for (let i = 1; i <= 16; i++) {
    const t = i / 16
    const nextX = start[0] + (end[0] - start[0]) * t + Math.sin(t * Math.PI) * bend
    const nextZ = start[1] + (end[1] - start[1]) * t
    distance = Math.min(distance, distanceFromSegment(x, z, previousX, previousZ, nextX, nextZ))
    previousX = nextX; previousZ = nextZ
  }
  return distance
}

export function homeGroundCoverAllowed(x: number, z: number): boolean {
  if (Math.abs(x) > 13.3 || z < -17.3 || z > 11.2) return false
  // Keep the original embodied paths, spawn, Orb, water and inhabited
  // courtyard clear. These are source-owned spatial coordinates in metres.
  if (distanceFromPath(x, z, [-.85, 8.4], [0, -5.4], -.72) < 1.12) return false
  if (distanceFromPath(x, z, [-.2, -5.15], [-5.4, -10.8], -.48) < .85) return false
  if (distanceFromPath(x, z, [.25, -5.15], [5.4, -10.8], .55) < .85) return false
  if (Math.hypot((x - 1.8) / 3.25, (z + 9.5) / 2.55) < 1) return false
  if (Math.hypot((x - 9.8) / 3.45, (z + 7.8) / 2.45) < 1) return false
  if (Math.hypot(x + .85, z - 8.4) < 1.4) return false
  for (const side of [-1, 1]) {
    const angle = side * -.14
    const dx = x - side * 4.45, dz = z + 4.5
    const localX = Math.cos(angle) * dx - Math.sin(angle) * dz
    const localZ = Math.sin(angle) * dx + Math.cos(angle) * dz
    if (Math.abs(localX) < 2.35 && Math.abs(localZ) < 3.1) return false
  }
  return true
}

export function buildHomeGroundCoverPlacements(tier: GroundCoverTier): CoverPlacement[] {
  const budget = tier === 'high' ? 1600 : tier === 'medium' ? 850 : 350
  const result: CoverPlacement[] = []
  // A relatively-prime permutation distributes lower tiers across the whole
  // environment instead of truncating one end of a grid. No random runtime
  // inputs, storage, requests or per-frame CPU regeneration.
  const cells = 65 * 56
  for (let i = 0; i < cells && result.length < budget; i++) {
    const cell = (i * 1789) % cells
    const column = cell % 65, row = Math.floor(cell / 65)
    const x = -13.3 + (column + .16 + noise(cell, 1) * .68) * (26.6 / 65)
    const z = -17.3 + (row + .16 + noise(cell, 2) * .68) * (28.5 / 56)
    if (!homeGroundCoverAllowed(x, z) || noise(cell, 4) < .16) continue
    result.push([x, z, .68 + noise(cell, 5) * .68, noise(cell, 6) * Math.PI * 2, noise(cell, 7)])
  }
  return result
}

function createBlades(): THREE.BufferGeometry {
  const vertices: number[] = [], indices: number[] = []
  // Five independently oriented tapered leaves per tuft, with bent upper
  // segments and no camera-facing billboard sprites or fake depth.
  for (let blade = 0; blade < 5; blade++) {
    const angle = blade * Math.PI * 2 / 5 + .27
    const cs = Math.cos(angle), sn = Math.sin(angle)
    const width = .030 + blade % 3 * .006
    const height = .21 + blade % 3 * .054
    const base = vertices.length / 3
    for (const [y, side, lean] of [[0, 1, 0], [0, -1, 0], [height * .58, 0.65, .034], [height * .58, -0.65, .034], [height, 0, .095]] as const) {
      vertices.push(cs * lean - sn * width * side, y, sn * lean + cs * width * side)
    }
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2, base + 2, base + 3, base + 4)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export default function HomeSanctuaryGroundCover({ tier }: { tier: GroundCoverTier }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const placements = useMemo(() => buildHomeGroundCoverPlacements(tier), [tier])
  const geometry = useMemo(createBlades, [])
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#8ba57b', roughness: .98, metalness: 0, side: THREE.DoubleSide,
  }), [])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const transform = new THREE.Object3D()
    const tint = new THREE.Color()
    placements.forEach(([x, z, scale, yaw, variation], index) => {
      transform.position.set(x, homeTerrainHeight(x, z) + .005, z)
      transform.rotation.set(0, yaw, 0)
      transform.scale.set(scale, scale * (.82 + variation * .45), scale)
      transform.updateMatrix()
      mesh.setMatrixAt(index, transform.matrix)
      tint.setRGB(.77 + variation * .20, .85 + variation * .14, .70 + variation * .19)
      mesh.setColorAt(index, tint)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [placements])

  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])
  return <instancedMesh
    ref={meshRef}
    name="home-authored-ground-cover-study"
    args={[geometry, material, placements.length]}
    castShadow={false}
    receiveShadow
    dispose={null}
    userData={{ source: 'URAI-procedural-authoring', admission: 'DEV_REVIEW_ONLY', collision: false, tier, instances: placements.length }}
  />
}
