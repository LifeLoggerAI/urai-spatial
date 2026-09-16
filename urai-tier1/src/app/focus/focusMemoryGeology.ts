import * as THREE from 'three'

// V270 selected-memory manifestation. The selected Memory Star resolves into one
// compact living cluster of tapered, irregular volumetric memory branches. Every
// branch grows from the same core volume, bends in three dimensions, and carries
// authored cool / pearl / warm energy through a real multi-sided cross-section.
// This deliberately removes the broad extruded-sheet silhouette that made V269
// read as folded paper or stacked slabs while preserving a fractured lamellar soul.
function createMemoryLamella(layer: number) {
  const segments = 8
  const sides = 5
  const signed = layer - 3
  const branchAngle = signed * .24 + Math.sin(layer * 1.41) * .10
  const radialBias = Math.abs(signed) * .035
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []

  const cool = new THREE.Color().setRGB(.18, 1.28, 1.95)
  const pearl = new THREE.Color().setRGB(1.55, 1.72, 1.22)
  const warm = new THREE.Color().setRGB(1.92, .64, .16)
  const deep = new THREE.Color().setRGB(.035, .13, .19)

  const centers: THREE.Vector3[] = []
  const radii: number[] = []
  for (let segment = 0; segment <= segments; segment += 1) {
    const t = segment / segments
    const rise = -0.67 + t * (1.34 + .08 * Math.sin(layer * .83))
    const spread = Math.pow(t, 1.45) * (.34 + Math.abs(signed) * .055)
    const sway = Math.sin(t * Math.PI * 1.35 + layer * .91) * (.045 + t * .055)
    const twist = branchAngle + Math.sin(t * 2.8 + layer) * .12
    const x = Math.sin(twist) * spread + signed * .018 * (1 - t) + sway * Math.cos(branchAngle)
    const z = -.08 + Math.cos(twist) * spread * .55 + Math.cos(t * Math.PI * 1.7 + layer * .77) * .055 + radialBias
    centers.push(new THREE.Vector3(x, rise, z))
    const baseRadius = .145 - t * .082
    const fracture = .012 * Math.sin(segment * 2.17 + layer * 1.33)
    radii.push(Math.max(.042, baseRadius + fracture + (layer % 2) * .006))
  }

  for (let segment = 0; segment <= segments; segment += 1) {
    const center = centers[segment]
    const before = centers[Math.max(0, segment - 1)]
    const after = centers[Math.min(segments, segment + 1)]
    const tangent = after.clone().sub(before).normalize()
    const reference = Math.abs(tangent.y) > .88 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
    const axisA = new THREE.Vector3().crossVectors(tangent, reference).normalize()
    const axisB = new THREE.Vector3().crossVectors(tangent, axisA).normalize()
    const t = segment / segments

    for (let side = 0; side < sides; side += 1) {
      const phase = (side / sides) * Math.PI * 2 + layer * .39 + segment * .13
      const irregular = 1 + .16 * Math.sin(side * 2.31 + segment * 1.17 + layer)
      const radius = radii[segment] * irregular
      const point = center.clone()
        .addScaledVector(axisA, Math.cos(phase) * radius)
        .addScaledVector(axisB, Math.sin(phase) * radius)
      positions.push(point.x, point.y, point.z)

      const pulse = .5 + .5 * Math.sin(side * 1.73 + segment * .77 + layer * 1.21)
      const color = cool.clone()
        .lerp(pearl, .24 + pulse * .42)
        .lerp(warm, (segment === 2 || segment === 5 ? .10 : .025) + (side === layer % sides ? .07 : 0))
      if ((side + segment + layer) % 7 === 0) color.lerp(deep, .26)
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    for (let side = 0; side < sides; side += 1) {
      const next = (side + 1) % sides
      const a = segment * sides + side
      const b = segment * sides + next
      const c = (segment + 1) * sides + side
      const d = (segment + 1) * sides + next
      indices.push(a, c, b, b, c, d)
    }
  }

  // Close both ends without introducing a spherical or planar hero owner.
  const bottomCenter = positions.length / 3
  positions.push(centers[0].x, centers[0].y, centers[0].z)
  colors.push(deep.r, deep.g, deep.b)
  const topCenter = positions.length / 3
  const tipColor = pearl.clone().lerp(warm, .12)
  positions.push(centers[segments].x, centers[segments].y, centers[segments].z)
  colors.push(tipColor.r, tipColor.g, tipColor.b)
  for (let side = 0; side < sides; side += 1) {
    const next = (side + 1) % sides
    indices.push(bottomCenter, next, side)
    const topBase = segments * sides
    indices.push(topCenter, topBase + side, topBase + next)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  geometry.userData.focusLamellaLayer = layer
  geometry.userData.focusLamellaRole = 'v270-living-volumetric-memory-branch'
  geometry.userData.focusLamellaEnergy = 'cool-pearl-warm-volumetric-core'
  return geometry
}

export function createFocusStrata() {
  return Array.from({ length: 7 }, (_, layer) => createMemoryLamella(layer))
}

function hash2(x: number, y: number) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return value - Math.floor(value)
}

function valueNoise(x: number, y: number, scale: number) {
  const px = x * scale, py = y * scale
  const x0 = Math.floor(px), y0 = Math.floor(py)
  const fx = px - x0, fy = py - y0
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const a = THREE.MathUtils.lerp(hash2(x0, y0), hash2(x0 + 1, y0), sx)
  const b = THREE.MathUtils.lerp(hash2(x0, y0 + 1), hash2(x0 + 1, y0 + 1), sx)
  return THREE.MathUtils.lerp(a, b, sy)
}

export function createFocusSurfaceMaps(): [THREE.Texture, THREE.Texture, THREE.Texture] {
  const size = 512
  const h = new Float32Array(size * size)
  const rgba = new Uint8Array(size * size * 4)
  const normals = new Uint8Array(rgba.length)
  const rough = new Uint8Array(rgba.length)

  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const u = x / size, v = y / size
    const broad = valueNoise(u, v, 2.7)
    const medium = valueNoise(u + .17, v - .11, 7.1)
    const fine = valueNoise(u - .31, v + .23, 17.0)
    const value = .40 + broad * .11 + medium * .045 + fine * .022
    h[y * size + x] = value

    const i = (y * size + x) * 4
    const r = Math.min(255, 50 + value * 92)
    const g = Math.min(255, 61 + value * 98)
    const b = Math.min(255, 62 + value * 94)
    rgba.set([r, g, b, 255], i)
    const roughness = Math.min(255, 224 + fine * 20)
    rough.set([255, roughness, 0, 255], i)
  }

  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const dx = (h[y * size + (x + 1) % size] - h[y * size + (x + size - 1) % size]) * .52
    const dy = (h[((y + 1) % size) * size + x] - h[((y + size - 1) % size) * size + x]) * .52
    const n = new THREE.Vector3(-dx, -dy, 1).normalize()
    normals.set([(n.x * .5 + .5) * 255, (n.y * .5 + .5) * 255, (n.z * .5 + .5) * 255, 255], (y * size + x) * 4)
  }

  const maps = [rgba, normals, rough].map((data, index) => {
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.anisotropy = 4
    texture.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace
    texture.needsUpdate = true
    return texture
  })
  return [maps[0], maps[1], maps[2]]
}
