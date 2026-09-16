import * as THREE from 'three'

// V263 selected-memory manifestation. Focus must resolve the selected Memory Star
// into one irregular, layered, inhabitable memory formation — never a doorway,
// ring, cage, bubble, planet, flower, or pair of framing horns.
function createMemoryLamella(layer: number) {
  const segments = 15
  const frontZ = .08 + layer * .055
  const backZ = -.20 - layer * .045
  const radiusX = 1.08 - layer * .075
  const radiusY = 1.22 - layer * .065
  const offsetX = Math.sin(layer * 1.73) * .16
  const offsetY = -.02 + Math.cos(layer * 1.31) * .09
  const rotation = -.16 + layer * .075
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const cool = new THREE.Color('#9fc7d7')
  const mineral = new THREE.Color('#d8d0ba')
  const warm = new THREE.Color('#efd8b4')

  const points: Array<[number, number]> = []
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2
    const fracture = 1
      + .12 * Math.sin(angle * 3.1 + layer * .81)
      + .07 * Math.sin(angle * 6.7 - layer * .46)
      + .045 * Math.cos(angle * 9.2 + layer * 1.17)
    const rawX = Math.cos(angle) * radiusX * fracture
    const rawY = Math.sin(angle) * radiusY * fracture
    const x = rawX * Math.cos(rotation) - rawY * Math.sin(rotation) + offsetX
    const y = rawX * Math.sin(rotation) + rawY * Math.cos(rotation) + offsetY
    points.push([x, y])
  }

  positions.push(offsetX, offsetY, frontZ, offsetX, offsetY, backZ)
  colors.push(mineral.r, mineral.g, mineral.b, cool.r, cool.g, cool.b)

  for (let i = 0; i < segments; i += 1) {
    const [x, y] = points[i]
    positions.push(x, y, frontZ, x * .94 + offsetX * .06, y * .94 + offsetY * .06, backZ)
    const edge = i / segments
    const faceColor = cool.clone().lerp(mineral, .42 + .26 * Math.sin(edge * Math.PI * 2 + layer)).lerp(warm, .10 + layer * .025)
    colors.push(faceColor.r, faceColor.g, faceColor.b, faceColor.r * .76, faceColor.g * .80, faceColor.b * .82)
  }

  for (let i = 0; i < segments; i += 1) {
    const next = (i + 1) % segments
    const frontA = 2 + i * 2
    const backA = frontA + 1
    const frontB = 2 + next * 2
    const backB = frontB + 1
    indices.push(0, frontA, frontB)
    indices.push(1, backB, backA)
    indices.push(frontA, backA, frontB, frontB, backA, backB)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

export function createFocusStrata() {
  return Array.from({ length: 6 }, (_, layer) => createMemoryLamella(layer))
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
    const broad = valueNoise(u, v, 3.2)
    const medium = valueNoise(u + .17, v - .11, 8.7)
    const fine = valueNoise(u - .31, v + .23, 22.0)
    const mineral = valueNoise(u + medium * .08, v - broad * .06, 13.5)
    const vein = Math.max(0, .17 - Math.abs(mineral - .5)) / .17
    const value = .43 + broad * .15 + medium * .075 + fine * .035
    const history = Math.pow(vein, 3.0)
    h[y * size + x] = value - history * .018

    const i = (y * size + x) * 4
    const r = Math.min(255, 58 + value * 118 + history * 92)
    const g = Math.min(255, 72 + value * 128 + history * 82)
    const b = Math.min(255, 78 + value * 134 + history * 66)
    rgba.set([r, g, b, 255], i)
    const roughness = Math.min(255, 205 + fine * 28 - history * 20)
    rough.set([255, roughness, 0, 255], i)
  }

  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const dx = (h[y * size + (x + 1) % size] - h[y * size + (x + size - 1) % size]) * 1.18
    const dy = (h[((y + 1) % size) * size + x] - h[((y + size - 1) % size) * size + x]) * 1.18
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
