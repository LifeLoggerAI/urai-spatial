import * as THREE from 'three'

// Adapted from the connected living-memory surface at repository commit
// 11c4626eaad39a64dea5d2fe4bea779be45fa0d9. Only the Orb geometry is retained;
// current Home placement, authored clips and sensory ownership stay unchanged.
const WIDTH_SEGMENTS = 64
const HEIGHT_SEGMENTS = 48
const SCALE = new THREE.Vector3(.60, .40, .60)
const INTERIOR_ORIGIN = new THREE.Vector3(-.11 * SCALE.x, 0, 0)

export function createLivingMemoryGeometry(): THREE.BufferGeometry {
  const sphere = new THREE.SphereGeometry(1, WIDTH_SEGMENTS, HEIGHT_SEGMENTS)
  const source = sphere.getAttribute('position') as THREE.BufferAttribute
  const pearl = new THREE.Color('#b7ded4')
  const teal = new THREE.Color('#66b9af')
  const warm = new THREE.Color('#f2d7a8')
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const vertices = new Map<string, number>()
  const remap: number[] = []

  for (let index = 0; index < source.count; index++) {
    const nx = source.getX(index), ny = source.getY(index), nz = source.getZ(index)
    const angle = Math.atan2(nz, nx)
    const upper = THREE.MathUtils.smoothstep(ny, -.08, .92)
    const lower = THREE.MathUtils.smoothstep(-ny, .10, .98)
    const cleftAxis = (nx + .13) * .92 + (nz - .05) * .40
    const cleft = Math.exp(-(cleftAxis * cleftAxis) / .030) * upper
    const leftLobe = Math.exp(-(((nx + .33) / .54) ** 2 + ((nz - .18) / .70) ** 2)) * upper
    const rightRecess = Math.exp(-(((nx - .54) / .38) ** 2 + ((nz + .12) / .48) ** 2)) * (.35 + .65 * upper)
    const forwardFold = Math.exp(-(((nz - .48) / .26) ** 2 + ((nx + .07) / .62) ** 2)) * (.26 + .74 * upper)
    // Integer angular frequencies meet at the longitude seam. Angular detail
    // fades at the poles, where longitude has no geometric meaning.
    const latitude = Math.sqrt(Math.max(0, 1 - ny * ny))
    const skin = latitude * (.030 * Math.sin(angle * 3 + ny * 6.3) + .012 * Math.sin(angle * 8 - ny * 9.1))
    const taper = THREE.MathUtils.lerp(.28, 1, THREE.MathUtils.smoothstep(ny, -.90, -.03))
    const radial = 1 + skin + .19 * leftLobe - .11 * rightRecess + .13 * forwardFold
    const x = nx * radial * .64 * taper + ny * .12 - .11 - upper * .045
    const z = nz * radial * .70 * taper + .10 * forwardFold - .035 * rightRecess
    const twist = (ny + .08) * .38
    const cos = Math.cos(twist), sin = Math.sin(twist)
    const yy = ny * 1.20 - .24 * cleft + .12 * leftLobe - .055 * rightRecess + .08 * forwardFold - lower * (.18 + .16 * lower)
    const point = new THREE.Vector3((x * cos - z * sin - lower * .08) * SCALE.x, yy * SCALE.y, (x * sin + z * cos) * SCALE.z)
    const key = [point.x, point.y, point.z].map(value => value.toFixed(6)).join(',')
    let vertex = vertices.get(key)
    if (vertex === undefined) {
      vertex = positions.length / 3
      vertices.set(key, vertex)
      positions.push(point.x, point.y, point.z)
      const height = THREE.MathUtils.clamp((yy + 1.3) / 2.55, 0, 1)
      const scar = THREE.MathUtils.clamp(cleft + forwardFold * .16 + rightRecess * .12, 0, 1)
      const color = teal.clone().lerp(pearl, .38 + .44 * height).lerp(warm, .06 + .28 * scar)
      colors.push(color.r, color.g, color.b)
    }
    remap.push(vertex)
  }

  const sourceIndices = sphere.getIndex()!
  for (let index = 0; index < sourceIndices.count; index += 3) {
    const a = remap[sourceIndices.getX(index)], b = remap[sourceIndices.getX(index + 1)], c = remap[sourceIndices.getX(index + 2)]
    if (a !== b && b !== c && c !== a) indices.push(a, b, c)
  }
  sphere.dispose()

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function interiorProjection(mantle: THREE.BufferGeometry) {
  const positions = mantle.getAttribute('position')
  const indices = mantle.getIndex()!
  const ray = new THREE.Ray(), hit = new THREE.Vector3()
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  return (point: THREE.Vector3) => {
    const direction = point.clone().sub(INTERIOR_ORIGIN)
    const distance = direction.length()
    if (distance < 1e-8) return point
    ray.set(INTERIOR_ORIGIN, direction.divideScalar(distance))
    let boundary = Infinity
    for (let index = 0; index < indices.count; index += 3) {
      a.fromBufferAttribute(positions, indices.getX(index))
      b.fromBufferAttribute(positions, indices.getX(index + 1))
      c.fromBufferAttribute(positions, indices.getX(index + 2))
      if (ray.intersectTriangle(a, b, c, false, hit)) {
        const depth = hit.distanceTo(INTERIOR_ORIGIN)
        if (depth > 1e-6) boundary = Math.min(boundary, depth)
      }
    }
    // Points remain recessed inside the actual surface rather than tracing a
    // visible cage around its silhouette. A malformed surface fails inward.
    return ray.at(Math.min(distance, Number.isFinite(boundary) ? boundary * .82 : 0), point)
  }
}

export function createMemoryFieldGeometry(existingMantle?: THREE.BufferGeometry): THREE.BufferGeometry {
  const mantle = existingMantle ?? createLivingMemoryGeometry()
  const project = interiorProjection(mantle)
  const count = 180, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3)
  const cool = new THREE.Color('#b1e9db'), warm = new THREE.Color('#f5d9a4')
  for (let index = 0; index < count; index++) {
    const t = (index + .5) / count
    const y = -.72 + ((index * 23) % count) / (count - 1) * 1.45
    const angle = index * 2.39996323 + .15 * Math.sin(index * .37)
    const radius = .13 + Math.pow(t, .72) * .38
    const point = project(new THREE.Vector3(
      Math.cos(angle) * radius * (.78 - .15 * Math.abs(y)) - .04,
      y,
      .34 + Math.sin(angle) * radius * .34 + .03 * Math.sin(index * .51),
    ).multiply(SCALE))
    positions.set([point.x, point.y, point.z], index * 3)
    const color = cool.clone().lerp(warm, .12 + .48 * ((index % 17) / 16))
    colors.set([color.r, color.g, color.b], index * 3)
  }
  if (!existingMantle) mantle.dispose()
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeBoundingSphere()
  return geometry
}

export function createMemoryFilamentGeometry(existingMantle?: THREE.BufferGeometry): THREE.BufferGeometry {
  const mantle = existingMantle ?? createLivingMemoryGeometry()
  const project = interiorProjection(mantle)
  const points: THREE.Vector3[] = []
  for (let trace = 0; trace < 7; trace++) {
    let previous: THREE.Vector3 | null = null
    for (let step = 0; step <= 24; step++) {
      const t = step / 24, y = -.68 + t * 1.36
      const angle = -1 + trace * .30 + t * (.70 + trace * .035) + .10 * Math.sin(t * 8 + trace)
      const envelope = .20 + .20 * Math.sin(t * Math.PI)
      const current = project(new THREE.Vector3(
        Math.cos(angle) * envelope + (trace - 3) * .013 - .04,
        y,
        .45 + Math.sin(angle) * .12,
      ).multiply(SCALE))
      if (previous) points.push(previous, current)
      previous = current
    }
  }
  if (!existingMantle) mantle.dispose()
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  geometry.computeBoundingSphere()
  return geometry
}
