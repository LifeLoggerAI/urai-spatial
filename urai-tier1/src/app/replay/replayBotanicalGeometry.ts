import * as THREE from 'three'

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

type LeafMeshData = { vertices: number[]; colors: number[]; indices: number[] }

function variation(index: number, offset: number): number {
  const value = Math.sin((index + 1) * 19.271 + offset * 71.843) * 43758.5453
  return value - Math.floor(value)
}

function addLeaf(
  target: LeafMeshData,
  root: THREE.Vector3,
  tip: THREE.Vector3,
  width: number,
  shade: number,
): void {
  const tangent = new THREE.Vector3().subVectors(tip, root)
  const side = new THREE.Vector3(-tangent.z, 0.15 * tangent.y, tangent.x).normalize().multiplyScalar(width)
  const mid = new THREE.Vector3().lerpVectors(root, tip, 0.52)
  const ridge = mid.clone().add(new THREE.Vector3(0, width * 0.36, 0))
  const corners = [root, mid.clone().add(side), tip, mid.clone().sub(side), ridge]
  const base = target.vertices.length / 3
  for (let i = 0; i < corners.length; i += 1) {
    target.vertices.push(corners[i].x, corners[i].y, corners[i].z)
    const gradient = i === 0 ? 0.67 : i === 2 ? 1.08 : i === 4 ? 1 : 0.88
    target.colors.push(shade * 0.80 * gradient, shade * gradient, shade * 0.71 * gradient)
  }
  target.indices.push(base, base + 1, base + 4, base + 1, base + 2, base + 4,
    base + 2, base + 3, base + 4, base + 3, base, base + 4)
}

function finishGeometry(data: LeafMeshData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.vertices, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3))
  geometry.setIndex(data.indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

// A three-dimensional radial foliage spray: real folded, individual leaf
// surfaces with varied silhouettes, not faceted/ellipsoid canopy placeholders.
// This remains non-admitted demonstration art pending real render review.
export function buildReplayLeafSprayGeometry(): THREE.BufferGeometry {
  const data: LeafMeshData = { vertices: [], colors: [], indices: [] }
  for (let index = 0; index < 28; index += 1) {
    const angle = index * GOLDEN_ANGLE + variation(index, 1) * 0.32
    const radius = 0.08 + variation(index, 2) * 0.38
    const length = 0.28 + variation(index, 3) * 0.37
    const root = new THREE.Vector3(Math.cos(angle) * radius,
      -0.28 + variation(index, 4) * 0.58,
      Math.sin(angle) * radius)
    const tip = new THREE.Vector3(root.x + Math.cos(angle) * length,
      root.y + 0.06 + variation(index, 5) * 0.28,
      root.z + Math.sin(angle) * length)
    addLeaf(data, root, tip, 0.055 + variation(index, 6) * 0.075, 0.68 + variation(index, 7) * 0.35)
  }
  return finishGeometry(data)
}

// Bent thin grass leaves grouped into tufts. One geometry shared across
// terrain-anchored instances; no alpha billboard or frame-by-frame allocations.
export function buildReplayMeadowTuftGeometry(): THREE.BufferGeometry {
  const data: LeafMeshData = { vertices: [], colors: [], indices: [] }
  for (let index = 0; index < 9; index += 1) {
    const angle = index * GOLDEN_ANGLE + variation(index, 9) * 0.3
    const length = 0.56 + variation(index, 10) * 0.42
    const lean = 0.12 + variation(index, 11) * 0.28
    const root = new THREE.Vector3(0.022 * Math.cos(angle), 0, 0.022 * Math.sin(angle))
    const tip = new THREE.Vector3(Math.cos(angle) * lean, length, Math.sin(angle) * lean)
    addLeaf(data, root, tip, 0.024 + variation(index, 12) * 0.023, 0.73 + variation(index, 13) * 0.27)
  }
  return finishGeometry(data)
}
