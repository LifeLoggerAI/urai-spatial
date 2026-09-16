import * as THREE from 'three'

// V270 literal-pixel repair of the V269 selected-memory manifestation.
// Focus resolves the selected Memory Star into one coherent, compact stack of
// fractured luminous lamellae. The hero must read as a deep living memory form,
// never as overexposed white paper/slabs. Geometry stays narrow, irregular and
// interlocked around one vertical core while restrained cool / pearl / warm
// energy preserves dark inter-layer depth under ACES tone mapping.
// It must never read as a boulder, onion, sphere, doorway, portal, ring, cage,
// bubble, planet, flower, pair of horns, broad folded-sheet fan, or terrain debris.
function createMemoryLamella(layer: number) {
  const signed = layer - 3
  const depth = -.72 + layer * .24
  const thickness = .040 + (layer % 2) * .010
  const frontZ = depth + thickness
  const backZ = depth - thickness
  const width = .235 + (layer % 3) * .032
  const height = .88 + .075 * Math.cos(layer * 1.31)
  const offsetX = signed * .088 + Math.sin(layer * 1.73) * .036
  const offsetY = Math.cos(layer * 1.19) * .044 - Math.abs(signed) * .008
  const rotation = signed * .082 + Math.sin(layer * .87) * .044
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []

  // Keep vertex energy in a physically plausible SDR range. The predecessor's
  // multi-unit RGB values tone-mapped to near-white and erased the authored
  // layering in retained proof. These values preserve color separation and
  // shadow depth while the runtime's emissive accent supplies restrained life.
  const cool = new THREE.Color().setRGB(.10, .46, .68)
  const pearl = new THREE.Color().setRGB(.72, .86, .82)
  const warm = new THREE.Color().setRGB(.92, .38, .12)
  const deep = new THREE.Color().setRGB(.018, .060, .082)

  const template: Array<[number, number]> = [
    [-.14, -.72],
    [-.29, -.42],
    [-.25, .07],
    [-.11, .65],
    [.07, .80],
    [.27, .32],
    [.22, -.22],
    [.055, -.75],
  ]

  const points = template.map(([px, py], index): [number, number] => {
    const fractureX = Math.sin((index + 1) * 2.31 + layer * 1.17) * .050
    const fractureY = Math.cos((index + 1) * 1.73 - layer * .91) * .044
    const taper = .92 + .08 * Math.cos(index * 1.47 + layer * .63)
    const rawX = (px + fractureX) * (width / .30) * taper
    const rawY = (py + fractureY) * height
    return [
      rawX * Math.cos(rotation) - rawY * Math.sin(rotation) + offsetX,
      rawX * Math.sin(rotation) + rawY * Math.cos(rotation) + offsetY,
    ]
  })

  positions.push(offsetX, offsetY, frontZ, offsetX, offsetY, backZ)
  const centerColor = pearl.clone().lerp(cool, .30 + layer * .025).lerp(warm, .028 + (layer % 2) * .018)
  colors.push(
    centerColor.r, centerColor.g, centerColor.b,
    deep.r, deep.g, deep.b,
  )

  for (let i = 0; i < points.length; i += 1) {
    const [x, y] = points[i]
    const backInset = .045 + .015 * Math.sin(i * 1.31 + layer)
    const backX = THREE.MathUtils.lerp(x, offsetX, backInset)
    const backY = THREE.MathUtils.lerp(y, offsetY, backInset)
    positions.push(x, y, frontZ, backX, backY, backZ)

    const edgePhase = .5 + .5 * Math.sin(i * 1.91 + layer * .83)
    const faceColor = cool.clone()
      .lerp(pearl, .18 + edgePhase * .34)
      .lerp(warm, (i === 0 || i === 3 || i === 6 ? .085 : .018) + (layer % 3) * .010)
      .multiplyScalar(.82 + edgePhase * .18)
    const rearColor = deep.clone().lerp(cool, .12 + edgePhase * .07)
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
  geometry.userData.focusLiteralPixelRepair = 'v270-sdr-energy-depth-separation'
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
