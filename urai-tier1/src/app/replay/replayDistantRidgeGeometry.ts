import * as THREE from 'three'

// Disclosed-demonstration terrain dressing only. These ridges are never
// evidence of an actual recorded place or an admitted production art asset.
export type ReplayRidgeSection = 'left' | 'right' | 'horizon'
type GroundHeight = (x: number, z: number) => number

const RIDGES = {
  left: { minX: -20, maxX: -4, minZ: -46, maxZ: -17, rise: 5.2 },
  right: { minX: 4, maxX: 20, minZ: -46, maxZ: -17, rise: 5.5 },
  horizon: { minX: -15, maxX: 15, minZ: -53, maxZ: -31, rise: 2.0 },
} as const

export function replayRidgeElevation(section: ReplayRidgeSection, x: number, z: number, groundHeight: GroundHeight): number {
  const ridge = RIDGES[section]
  const depth = THREE.MathUtils.smoothstep(-z, -ridge.maxZ, -ridge.minZ)
  const shoulder = section === 'horizon'
    ? 0.5 + 0.3 * Math.pow(Math.sin(x * 0.14 + z * 0.07), 2)
    : THREE.MathUtils.smoothstep(Math.abs(x), 4, 17.5)
  const contour = 0.84 + 0.1 * Math.sin(x * 0.34 - z * 0.13) + 0.06 * Math.cos(x * 0.19 + z * 0.27)
  // Front edge follows the existing real terrain mesh. Retreat toward the
  // horizon instead of exposing the silhouette of a scaled icosahedron.
  return groundHeight(x, z) + 0.045 + ridge.rise * Math.pow(depth, 1.25) * shoulder * contour
}

export function buildReplayDistantRidgeGeometry(section: ReplayRidgeSection, groundHeight: GroundHeight): THREE.PlaneGeometry {
  const ridge = RIDGES[section]
  const segmentsX = 32
  const segmentsZ = 40
  const geometry = new THREE.PlaneGeometry(ridge.maxX - ridge.minX, ridge.maxZ - ridge.minZ, segmentsX, segmentsZ)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const centerX = (ridge.minX + ridge.maxX) / 2
  const centerZ = (ridge.minZ + ridge.maxZ) / 2
  for (let index = 0; index < position.count; index += 1) {
    const x = centerX + position.getX(index)
    const z = centerZ + position.getZ(index)
    const y = replayRidgeElevation(section, x, z, groundHeight)
    if (![x, y, z].every(Number.isFinite)) {
      geometry.dispose()
      throw new Error('Replay demonstration ridge requires finite terrain elevation')
    }
    position.setXYZ(index, x, y, z)
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.userData = {
    truthClass: 'disclosed-demonstration',
    finalArtAdmitted: false,
    section,
    construction: 'terrain-conforming-ridge-surface-not-primitive-ellipsoid',
  }
  return geometry
}
