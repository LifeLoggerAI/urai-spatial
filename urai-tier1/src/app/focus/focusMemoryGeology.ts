import * as THREE from 'three'

// V268 selected-memory manifestation. Focus resolves the selected Memory Star
// into one coherent fan of visibly separated fractured memory plates. The
// fallback must read as a luminous living-memory artifact from the hero camera,
// never as a boulder, onion, sphere, doorway, ring, cage, bubble, planet,
// flower, or pair of framing horns.
function createMemoryLamella(layer: number) {
  const segments = 13
  const signed = layer - 3
  const depth = -.54 + layer * .18
  const thickness = .018 + (layer % 2) * .006
  const frontZ = depth + thickness
  const backZ = depth - thickness
  const radiusX = .34 + .035 * Math.sin(layer * 1.47) + (layer % 3) * .025
  const radiusY = .78 + .045 * Math.cos(layer * 1.31) - Math.abs(signed) * .014
  const offsetX = signed * .205 + Math.sin(layer * 1.73) * .055
  const offsetY = signed * .075 + Math.cos(layer * 1.19) * .055
  const rotation = -.52 + layer * .17
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []

  // Deliberately high vertex energy keeps the memory plates visually luminous
  // under the physically lit Focus material while terrain remains subdued.
  const cool = new THREE.Color().setRGB(3.6, 4.7, 5.4)
  const pearl = new THREE.Color().setRGB(5.2, 5.5, 4.5)
  const warm = new THREE.Color().setRGB(4.8, 3.1, 1.8)

  const points: Array<[number, number]> = []
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2
    const fracture = 1
      + .22 * Math.sin(angle * 2.65 + layer * .91)
      + .105 * Math.sin(angle * 5.35 - layer * .57)
      + .065 * Math.cos(angle * 8.6 + layer * 1.11)
    const pinch = .70 + .30 * Math.abs(Math.sin(angle * 1.45 + layer * .34))
    const rawX = Math.cos(angle) * radiusX * fracture * pinch
    const rawY = Math.sin(angle) * radiusY * fracture
    const x = rawX * Math.cos(rotation) - rawY * Math.sin(rotation) + offsetX
    const y = rawX * Math.sin(rotation) + rawY * Math.cos(rotation) + offsetY
    points.push([x, y])
  }

  positions.push(offsetX, offsetY, frontZ, offsetX, offsetY, backZ)
  const centerColor = pearl.clone().lerp(cool, .16 + layer * .045).lerp(warm, .035 + (layer % 2) * .018)
  colors.push(centerColor.r, centerColor.g, centerColor.b, cool.r * .72, cool.g * .74, cool.b * .78)

  for (let i = 0; i < segments; i += 1) {
    const [x, y] = points[i]
    positions.push(x, y, frontZ, x * .995 + offsetX * .005, y * .995 + offsetY * .005, backZ)
    const edge = i / segments
    const shimmer = .5 + .5 * Math.sin(edge * Math.PI * 4.2 + layer * .83)
    const faceColor = cool.clone().lerp(pearl, .28 + shimmer * .42).lerp(warm, .03 + (layer % 3) * .02)
    colors.push(faceColor.r, faceColor.g, faceColor.b, faceColor.r * .66, faceColor.g * .70, faceColor.b * .74)
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
  geometry.userData.focusLamellaLayer = layer
  geometry.userData.focusLamellaRole = 'luminous-separated-fractured-memory-plate'
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
    // Subdued weathered mineral texture. Bright contour veins are intentionally
    // absent so terrain cannot visually compete with the selected memory.
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
