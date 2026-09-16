import * as THREE from 'three'

// V269 selected-memory manifestation. Focus resolves the selected Memory Star
// into one coherent, compact stack of fractured luminous lamellae. The hero
// silhouette is deliberately crystalline/biomorphic rather than broad paper
// slabs: narrow irregular leaves interlock around one vertical memory core,
// with high-contrast cool / pearl / warm energy and dark inter-layer depth.
// It must never read as a boulder, onion, sphere, doorway, portal, ring, cage,
// bubble, planet, flower, pair of horns, folded paper fan, or terrain debris.
function createMemoryLamella(layer: number) {
  const signed = layer - 3
  const depth = -.45 + layer * .15
  const thickness = .024 + (layer % 2) * .006
  const frontZ = depth + thickness
  const backZ = depth - thickness
  const width = .26 + (layer % 3) * .035
  const height = .92 + .07 * Math.cos(layer * 1.31)
  const offsetX = signed * .105 + Math.sin(layer * 1.73) * .032
  const offsetY = Math.cos(layer * 1.19) * .038 - Math.abs(signed) * .006
  const rotation = signed * .055 + Math.sin(layer * .87) * .035
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []

  // HDR-ish authored vertex energy is intentional. Focus's physically lit
  // material tone-maps this energy, while the saturated ratios keep the memory
  // visually separate from the matte olive mineral terrain.
  const cool = new THREE.Color().setRGB(.34, 3.75, 6.20)
  const pearl = new THREE.Color().setRGB(5.35, 5.80, 3.55)
  const warm = new THREE.Color().setRGB(6.10, 2.15, .48)
  const deep = new THREE.Color().setRGB(.10, .34, .46)

  const template: Array<[number, number]> = [
    [-.16, -.72],
    [-.31, -.39],
    [-.27, .10],
    [-.12, .68],
    [.08, .79],
    [.29, .31],
    [.24, -.24],
    [.07, -.74],
  ]

  const points = template.map(([px, py], index): [number, number] => {
    const fractureX = Math.sin((index + 1) * 2.31 + layer * 1.17) * .045
    const fractureY = Math.cos((index + 1) * 1.73 - layer * .91) * .040
    const rawX = (px + fractureX) * (width / .30)
    const rawY = (py + fractureY) * height
    return [
      rawX * Math.cos(rotation) - rawY * Math.sin(rotation) + offsetX,
      rawX * Math.sin(rotation) + rawY * Math.cos(rotation) + offsetY,
    ]
  })

  positions.push(offsetX, offsetY, frontZ, offsetX, offsetY, backZ)
  const centerColor = pearl.clone().lerp(cool, .22 + layer * .035).lerp(warm, .035 + (layer % 2) * .018)
  colors.push(
    centerColor.r, centerColor.g, centerColor.b,
    deep.r, deep.g, deep.b,
  )

  for (let i = 0; i < points.length; i += 1) {
    const [x, y] = points[i]
    const backX = THREE.MathUtils.lerp(x, offsetX, .025)
    const backY = THREE.MathUtils.lerp(y, offsetY, .025)
    positions.push(x, y, frontZ, backX, backY, backZ)

    const edgePhase = .5 + .5 * Math.sin(i * 1.91 + layer * .83)
    const faceColor = cool.clone()
      .lerp(pearl, .20 + edgePhase * .38)
      .lerp(warm, (i === 0 || i === 3 || i === 6 ? .11 : .025) + (layer % 3) * .012)
    const rearColor = deep.clone().lerp(cool, .18 + edgePhase * .08)
    colors.push(faceColor.r, faceColor.g, faceColor.b, rearColor.r, rearColor.g, rearColor.b)
  }

  for (let i = 0; i < points.length; i += 1) {
    const next = (i + 1) % points.length
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
  geometry.userData.focusLamellaRole = 'v269-living-luminous-memory-lamella'
  geometry.userData.focusLamellaEnergy = 'cool-pearl-warm-with-dark-interlayer-depth'
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
