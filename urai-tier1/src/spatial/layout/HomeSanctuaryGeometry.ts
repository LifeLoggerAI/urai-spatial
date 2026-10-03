import * as THREE from 'three'

// Original runtime construction in meters. These surfaces are not photographs,
// scans, or a reconstruction of the person's home.
export const HOME_POND = { x: 9.8, z: -7.8, radiusX: 2.55, radiusZ: 1.7 } as const
export const HOME_COURTYARD = { centerX: 4.45, centerZ: -4.5, angle: -.14, floorHeight: .09 } as const
export type HomePathPoint = readonly [number, number]

export function homeSeeded(index: number, salt = 0) {
  const value = Math.sin(index * 91.73 + salt * 37.17) * 43758.5453
  return value - Math.floor(value)
}

export function homeBaseTerrainHeight(x: number, z: number) {
  const broad = Math.sin(x * .12) * .34 + Math.cos(z * .09) * .28 + Math.sin((x + z) * .065) * .18
  const detail = Math.sin(x * .43 + z * .19) * .055 + Math.cos(z * .34 - x * .18) * .045
  const clearing = -Math.exp(-((x / 8.2) ** 2 + ((z + 1.5) / 9.8) ** 2)) * .32
  return broad + detail + clearing - .18
}

export const HOME_POND_WATER_LEVEL = homeBaseTerrainHeight(HOME_POND.x, HOME_POND.z) - .06

export function homeTerrainHeight(x: number, z: number) {
  const base = homeBaseTerrainHeight(x, z)
  const pondRadius = Math.hypot((x - HOME_POND.x) / HOME_POND.radiusX, (z - HOME_POND.z) / HOME_POND.radiusZ)
  const bank = THREE.MathUtils.smoothstep(pondRadius, .72, 1.14)
  const pondBed = HOME_POND_WATER_LEVEL - .28
  let height = THREE.MathUtils.lerp(Math.min(base, pondBed), base, bank)
  for (const side of [-1, 1]) {
    const local = homeCourtyardLocalPoint(side, x, z)
    const padRadius = Math.max(Math.abs(local.x) / 1.5, Math.abs(local.z - .05) / 2.35)
    const grading = THREE.MathUtils.smoothstep(padRadius, .9, 1.3)
    const level = homeBaseTerrainHeight(side * HOME_COURTYARD.centerX, HOME_COURTYARD.centerZ)
    height = THREE.MathUtils.lerp(level, height, grading)
  }
  return height
}

const GROUND_LOW = new THREE.Color('#3d5242')
const GROUND_HIGH = new THREE.Color('#69785b')

export function homeTerrainColor(x: number, z: number, target = new THREE.Color()) {
  const variation = THREE.MathUtils.clamp(.42 + homeBaseTerrainHeight(x, z) * .3 + Math.sin(x * .63 + z * .31) * .12 + Math.cos(z * 1.37 - x * .89) * .055, .12, .82)
  return target.copy(GROUND_LOW).lerp(GROUND_HIGH, variation)
}

export function projectHomeTerrainGeometry(source: THREE.BufferGeometry, worldTransform = new THREE.Matrix4(), clearance = .003) {
  // A clone keeps useGLTF's shared source and receipts untouched. Both retained
  // topology and the terrain extension now use one elevation and material field.
  const geometry = source.clone()
  const position = geometry.attributes.position as THREE.BufferAttribute
  const inverse = worldTransform.clone().invert()
  const point = new THREE.Vector3()
  const color = new THREE.Color()
  const colors = new Float32Array(position.count * 3)
  const uv = new Float32Array(position.count * 2)
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index).applyMatrix4(worldTransform)
    const { x, z } = point
    point.y = homeTerrainHeight(x, z) + clearance
    point.applyMatrix4(inverse)
    position.setXYZ(index, point.x, point.y, point.z)
    homeTerrainColor(x, z, color)
    colors.set([color.r, color.g, color.b], index * 3)
    uv.set([x, z], index * 2)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

export function makeHomeTerrainGeometry(retainedGround?: { minX: number; maxX: number; minZ: number; maxZ: number }) {
  const geometry = new THREE.PlaneGeometry(90, 90, 180, 180)
  geometry.rotateX(-Math.PI / 2)
  const result = projectHomeTerrainGeometry(geometry, new THREE.Matrix4(), 0)
  geometry.dispose()
  if (retainedGround && result.index) {
    // Remove the duplicate middle surface. A narrow overlap at the shared edge
    // closes the seam between the two grids without hiding the authored topology.
    const position = result.attributes.position as THREE.BufferAttribute
    const kept: number[] = []
    const inside = (vertex: number) => position.getX(vertex) > retainedGround.minX + .3
      && position.getX(vertex) < retainedGround.maxX - .3
      && position.getZ(vertex) > retainedGround.minZ + .3
      && position.getZ(vertex) < retainedGround.maxZ - .3
    for (let triangle = 0; triangle < result.index.count; triangle += 3) {
      const a = result.index.getX(triangle)
      const b = result.index.getX(triangle + 1)
      const c = result.index.getX(triangle + 2)
      if (!(inside(a) && inside(b) && inside(c))) kept.push(a, b, c)
    }
    result.setIndex(kept)
  }
  return result
}

export function makeHomeRibbonGeometry(points: readonly HomePathPoint[], width: number) {
  const positions: number[] = []
  const indices: number[] = []
  const columns = 5
  points.forEach(([x, z], index) => {
    const previous = points[Math.max(0, index - 1)]
    const next = points[Math.min(points.length - 1, index + 1)]
    const dx = next[0] - previous[0]
    const dz = next[1] - previous[1]
    const length = Math.max(.001, Math.hypot(dx, dz))
    const nx = -dz / length
    const nz = dx / length
    const half = width * (.46 + Math.sin(index * 1.71) * .028)
    for (let column = 0; column < columns; column += 1) {
      const offset = (1 - column / (columns - 1) * 2) * half
      const edgeX = x + nx * offset
      const edgeZ = z + nz * offset
      positions.push(edgeX, homeTerrainHeight(edgeX, edgeZ) + .022, edgeZ)
      if (index < points.length - 1 && column < columns - 1) {
        const a = index * columns + column
        indices.push(a, a + columns, a + 1, a + 1, a + columns, a + columns + 1)
      }
    }
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function makeHomePatchGeometry(centerX: number, centerZ: number, radiusX: number, radiusZ: number, salt: number, level?: number, segments = 48, rings = 6) {
  const positions: number[] = [centerX, level ?? homeTerrainHeight(centerX, centerZ) + .025, centerZ]
  const indices: number[] = []
  for (let ring = 1; ring <= rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = segment / segments * Math.PI * 2
      const radius = (.92 + homeSeeded(segment, salt) * .16) * ring / rings
      const x = centerX + Math.cos(angle) * radiusX * radius
      const z = centerZ + Math.sin(angle) * radiusZ * radius
      positions.push(x, level ?? homeTerrainHeight(x, z) + .025, z)
      const next = (segment + 1) % segments
      const a = 1 + (ring - 1) * segments + segment
      const b = 1 + (ring - 1) * segments + next
      if (ring === 1) indices.push(0, b, a)
      else {
        const innerA = a - segments
        const innerB = b - segments
        indices.push(innerA, b, a, innerA, innerB, b)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function makeHomeHorizonGeometry(width: number, amplitude: number, salt: number, segments = 72) {
  const geometry = new THREE.PlaneGeometry(width, 18, segments, 12)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position as THREE.BufferAttribute
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    const peak = Math.max(.2, 1.4 + Math.sin(x * .075 + salt) * amplitude + Math.sin(x * .17 + salt * 1.7) * amplitude * .34)
    const slope = Math.exp(-(((z + .8) / 5.4) ** 2))
    position.setY(index, -.85 + peak * slope + Math.sin(x * .31 + z * .19 + salt) * slope * .09)
  }
  geometry.computeVertexNormals()
  return geometry
}

export function homeCourtyardPoint(side: number, x: number, z: number) {
  const angle = side * HOME_COURTYARD.angle
  return {
    x: side * HOME_COURTYARD.centerX + Math.cos(angle) * x + Math.sin(angle) * z,
    z: HOME_COURTYARD.centerZ - Math.sin(angle) * x + Math.cos(angle) * z,
  }
}

export function homeCourtyardLocalPoint(side: number, x: number, z: number) {
  const angle = side * HOME_COURTYARD.angle
  const dx = x - side * HOME_COURTYARD.centerX
  const dz = z - HOME_COURTYARD.centerZ
  return { x: Math.cos(angle) * dx - Math.sin(angle) * dz, z: Math.sin(angle) * dx + Math.cos(angle) * dz }
}

export function homeCourtyardFloorHeight(side: number) {
  // A single floor stays level. Sink its shallow footing into the highest ground
  // beneath its corners, rather than floating the courtyard at a fixed Y.
  const corners = [-1.25, 1.25].flatMap((x) => [-2.08, 2.18].map((z) => homeCourtyardPoint(side, x, z)))
  return Math.max(...corners.map(({ x, z }) => homeTerrainHeight(x, z))) + HOME_COURTYARD.floorHeight
}

export function homeWalkSurfaceHeight(x: number, z: number) {
  let height = homeTerrainHeight(x, z)
  for (const side of [-1, 1]) {
    const local = homeCourtyardLocalPoint(side, x, z)
    if (Math.abs(local.x) <= 1.25 && Math.abs(local.z - .05) <= 2.125) height = Math.max(height, homeCourtyardFloorHeight(side))
  }
  return height
}

// Rounded circle chains fit the actual solid bench and wall footprints. The
// low footing is traversable; the seating, masonry and pond bed are not.
export const HOME_NAVIGATION_OBSTACLES = [-1, 1].flatMap((side) => {
  const footprints: { x: number; z: number; radius: number }[] = []
  for (const z of [-1.2, -.6, 0, .6, 1.2]) {
    footprints.push({ ...homeCourtyardPoint(side, 0, z), radius: .5 })
    footprints.push({ ...homeCourtyardPoint(side, side * .76, z), radius: .41 })
  }
  footprints.push({ ...homeCourtyardPoint(side, -side * .65, 1.82), radius: .54 })
  return footprints
}).concat([
  { x: -2.85, z: -6.15, radius: .98 },
  { x: 2.75, z: -6.35, radius: .94 },
  { x: -7, z: -7, radius: .93 },
  { x: 7, z: -7, radius: .93 },
  { x: 2.55, z: -5.55, radius: .84 },
  { x: HOME_POND.x, z: HOME_POND.z, radius: 2.75 },
])

export function resolveHomeSolidPenetration(position: THREE.Vector3, obstacles = HOME_NAVIGATION_OBSTACLES) {
  // The shared movement kernel handles continuous stepping. This final correction
  // handles an exact center or a restore inside a solid footprint, including the
  // center case that has no outward direction for the kernel's radial projection.
  for (let iteration = 0; iteration < 12; iteration += 1) {
    let corrected = false
    for (const obstacle of obstacles) {
      const dx = position.x - obstacle.x
      const dz = position.z - obstacle.z
      const distance = Math.hypot(dx, dz)
      if (distance >= obstacle.radius - .00001) continue
      const scale = (obstacle.radius + .001) / (distance || 1)
      position.x = obstacle.x + (distance ? dx * scale : obstacle.radius + .001)
      position.z = obstacle.z + (distance ? dz * scale : 0)
      corrected = true
    }
    if (!corrected) break
  }
  return position
}
