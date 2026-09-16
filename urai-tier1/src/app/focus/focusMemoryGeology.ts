import * as THREE from 'three'

// V271 literal-pixel repair of the selected-memory manifestation.
//
// V269/V270 proved the route, material separation and responsive composition, but
// retained pixels still read as a stack of pale cards because each hero element
// was almost a metre tall while only 4–5 cm deep. V271 changes the silhouette at
// the geometry source: the selected Memory Star resolves into a compact cluster of
// genuinely volumetric, closed, irregular memory facets whose depth is comparable
// to their width. The facets interlock around an intentional dark central void and
// use restrained mineral energy rather than white/paper-like faces.
//
// The form must remain recognisably one selected memory, not a generic boulder,
// sphere/orb, flower, portal, ring, cage, doorway, sheet fan or pile of cards.
type MemoryFacetSpec = {
  center: readonly [number, number, number]
  size: readonly [number, number, number]
  rotation: readonly [number, number, number]
  phase: number
}

const MEMORY_FACETS: readonly MemoryFacetSpec[] = [
  { center: [-.28, .17, -.11], size: [.34, .78, .31], rotation: [.18, -.48, -.24], phase: .17 },
  { center: [.22, .14, .06], size: [.32, .86, .35], rotation: [-.14, .34, .21], phase: 1.13 },
  { center: [-.03, -.16, .22], size: [.42, .58, .40], rotation: [.31, .16, .61], phase: 2.21 },
  { center: [.31, -.22, -.20], size: [.29, .54, .34], rotation: [-.27, -.36, -.52], phase: 3.08 },
  { center: [-.31, -.25, .12], size: [.28, .49, .32], rotation: [.15, .54, .46], phase: 4.04 },
]

function facetVertexColor(facet: number, vertex: number, y: number) {
  const deep = new THREE.Color().setRGB(.030, .092, .104)
  const mineral = new THREE.Color().setRGB(.105, .285, .315)
  const cool = new THREE.Color().setRGB(.125, .405, .485)
  const warm = new THREE.Color().setRGB(.47, .205, .075)
  const phase = .5 + .5 * Math.sin((facet + 1) * 1.37 + vertex * 1.91)
  const color = deep.clone().lerp(mineral, .34 + phase * .24)
  if (y > .15) color.lerp(cool, .20 + phase * .12)
  if ((facet + vertex) % 7 === 0) color.lerp(warm, .12)
  return color
}

function createMemoryFacet(spec: MemoryFacetSpec, facet: number) {
  const [width, height, depth] = spec.size
  const local: THREE.Vector3[] = [
    new THREE.Vector3(.05 * width, .62 * height, -.04 * depth),
    new THREE.Vector3(-.07 * width, -.57 * height, .03 * depth),
  ]

  // Five irregular equatorial vertices create a closed asymmetric bipyramid.
  // Their Z radius is deliberately comparable to X radius, which is the key V271
  // rejection rule against the old paper-card / lamella silhouette.
  for (let index = 0; index < 5; index += 1) {
    const angle = spec.phase + index / 5 * Math.PI * 2
    const radialX = width * (.78 + .16 * Math.sin(index * 1.71 + spec.phase))
    const radialZ = depth * (.76 + .17 * Math.cos(index * 1.43 - spec.phase))
    const y = height * (.08 * Math.sin(index * 2.07 + spec.phase) - .03 * Math.cos(index * .83))
    local.push(new THREE.Vector3(Math.cos(angle) * radialX, y, Math.sin(angle) * radialZ))
  }

  const euler = new THREE.Euler(spec.rotation[0], spec.rotation[1], spec.rotation[2], 'XYZ')
  const center = new THREE.Vector3(...spec.center)
  const positions: number[] = []
  const colors: number[] = []
  for (let index = 0; index < local.length; index += 1) {
    const vertex = local[index].applyEuler(euler).add(center)
    positions.push(vertex.x, vertex.y, vertex.z)
    const color = facetVertexColor(facet, index, local[index].y)
    colors.push(color.r, color.g, color.b)
  }

  const indices: number[] = []
  for (let index = 0; index < 5; index += 1) {
    const current = 2 + index
    const next = 2 + ((index + 1) % 5)
    indices.push(0, current, next)
    indices.push(1, next, current)
  }

  const indexed = new THREE.BufferGeometry()
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  indexed.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  indexed.setIndex(indices)
  const geometry = indexed.toNonIndexed()
  indexed.dispose()
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  geometry.userData.focusFacetIndex = facet
  geometry.userData.focusFacetRole = 'v271-interlocked-volumetric-memory-facet'
  geometry.userData.focusFacetEnergy = 'dark-mineral-cool-edge-restrained-warm-vein'
  geometry.userData.focusLiteralPixelRepair = 'v271-no-card-slab-silhouette'
  geometry.userData.focusDepthRule = 'closed-volume-depth-comparable-to-width'
  return geometry
}

export function createFocusStrata() {
  return MEMORY_FACETS.map((spec, facet) => createMemoryFacet(spec, facet))
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
