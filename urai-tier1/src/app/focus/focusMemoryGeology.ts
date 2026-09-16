import * as THREE from 'three'

// V262 selected-memory threshold. Focus is not a ring, cage, rock, flower,
// ribbon or portal prop. Two asymmetric mineral-light branches frame a large
// open center so the selected stellar memory reads as a doorway rather than an object.
function createThresholdBranch(side: -1 | 1) {
  const segments = 18
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const cool = new THREE.Color(side < 0 ? '#b7ddff' : '#d8e9ff')
  const warm = new THREE.Color('#ffe6bc')

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments
    const y = THREE.MathUtils.lerp(-1.22, 1.34, t)
    const inward = Math.sin(t * Math.PI) * .28
    const sweep = .12 * Math.sin(t * 5.3 + (side < 0 ? .6 : 1.7))
    const x = side * (1.05 - inward + sweep + (1 - t) * .16)
    const z = -.03 + .08 * Math.sin(t * 4.2 + side)
    const width = .19 - t * .07 + .035 * Math.sin(t * Math.PI * 3.2 + side)
    positions.push(x - width, y, z, x + width, y + .035 * side, z + .045)

    const color = cool.clone().lerp(warm, .18 + .42 * t)
    colors.push(color.r, color.g, color.b, color.r * .96, color.g * .98, color.b)
  }

  for (let i = 0; i < segments; i += 1) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3
    indices.push(a, c, b, b, c, d)
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
  return [createThresholdBranch(-1), createThresholdBranch(1)]
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
