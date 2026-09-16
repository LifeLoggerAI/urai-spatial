import * as THREE from 'three'

// V272 literal-pixel repair of the selected-memory manifestation.
//
// V271 proved that real volume removes the predecessor's paper-card silhouette,
// but retained pixels still read as five separate low-poly cyan crystal shards.
// V272 removes that object language at the geometry source. The selected Memory
// Star now resolves into one continuous, closed, asymmetrical living-memory fold:
// a softly faceted mineral/tissue volume with a deep longitudinal furrow, curved
// centerline, changing cross-section and restrained physical energy.
//
// The form must read as one held memory phenomenon. It must not regress into a
// crystal crown/shard cluster, boulder, sphere/orb, flower, portal, ring, cage,
// doorway, sheet fan, stack of cards or generic game pickup.
const MEMORY_SECTIONS = 15
const MEMORY_RING_POINTS = 12

function wrappedAngleDistance(a: number, b: number) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))
}

function livingMemoryVertexColor(section: number, radial: number, t: number, furrow: number) {
  const deep = new THREE.Color().setRGB(.026, .067, .064)
  const mineral = new THREE.Color().setRGB(.155, .245, .218)
  const weathered = new THREE.Color().setRGB(.285, .335, .278)
  const warm = new THREE.Color().setRGB(.405, .235, .115)
  const phase = .5 + .5 * Math.sin(section * .73 + radial * 1.37)
  const edge = Math.pow(Math.abs(t), 1.4)
  const color = deep.clone().lerp(mineral, .34 + phase * .24).lerp(weathered, .08 + .10 * (1 - edge))
  if (furrow > .6) color.lerp(deep, .34)
  if ((section * 3 + radial) % 17 === 0) color.lerp(warm, .10)
  return color
}

function createLivingMemoryFold() {
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []

  for (let section = 0; section < MEMORY_SECTIONS; section += 1) {
    const u = section / (MEMORY_SECTIONS - 1)
    const t = THREE.MathUtils.lerp(-.88, .88, u)
    const envelope = Math.pow(Math.max(.04, 1 - Math.pow(Math.abs(t), 1.55)), .52)
    const centerX = .11 * Math.sin(t * 2.7) + .035 * Math.sin(t * 7.1)
    const centerY = t * .86
    const centerZ = -.035 + .085 * Math.cos(t * 2.15) - .035 * Math.sin(t * 5.3)
    const width = .16 + envelope * (.34 + .035 * Math.sin(section * .83))
    const depth = .14 + envelope * (.255 + .028 * Math.cos(section * .71))
    const twist = -.34 + u * .72 + .08 * Math.sin(section * .91)

    for (let radial = 0; radial < MEMORY_RING_POINTS; radial += 1) {
      const angle = radial / MEMORY_RING_POINTS * Math.PI * 2
      const furrowDistance = wrappedAngleDistance(angle, .18 + .12 * Math.sin(t * 2.2))
      const furrow = Math.exp(-Math.pow(furrowDistance / .42, 2))
      const organic = 1 + .075 * Math.sin(angle * 3 + section * .57) + .035 * Math.cos(angle * 5 - section * .31)
      const localX = Math.cos(angle) * width * organic * (1 - .34 * furrow)
      const localZ = Math.sin(angle) * depth * (1 + .06 * Math.cos(angle * 2 - t * 3.1)) - furrow * depth * .16
      const x = centerX + localX * Math.cos(twist) - localZ * Math.sin(twist)
      const z = centerZ + localX * Math.sin(twist) + localZ * Math.cos(twist)
      const y = centerY + .045 * envelope * Math.sin(angle * 2 + section * .49)
      positions.push(x, y, z)
      const color = livingMemoryVertexColor(section, radial, t, furrow)
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let section = 0; section < MEMORY_SECTIONS - 1; section += 1) {
    const row = section * MEMORY_RING_POINTS
    const nextRow = (section + 1) * MEMORY_RING_POINTS
    for (let radial = 0; radial < MEMORY_RING_POINTS; radial += 1) {
      const next = (radial + 1) % MEMORY_RING_POINTS
      const a = row + radial
      const b = row + next
      const c = nextRow + radial
      const d = nextRow + next
      indices.push(a, c, b, b, c, d)
    }
  }

  const bottomCap = positions.length / 3
  positions.push(-.075, -.91, .012)
  colors.push(.020, .052, .050)
  const topCap = positions.length / 3
  positions.push(.066, .91, -.008)
  colors.push(.055, .092, .078)

  for (let radial = 0; radial < MEMORY_RING_POINTS; radial += 1) {
    const next = (radial + 1) % MEMORY_RING_POINTS
    indices.push(bottomCap, next, radial)
    const topRow = (MEMORY_SECTIONS - 1) * MEMORY_RING_POINTS
    indices.push(topCap, topRow + radial, topRow + next)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  geometry.userData.focusMemoryRole = 'v272-single-connected-living-memory-fold'
  geometry.userData.focusMemoryTopology = 'closed-twisted-longitudinal-fold-with-deep-furrow'
  geometry.userData.focusMemoryEnergy = 'dark-weathered-mineral-restrained-warm-cool-response'
  geometry.userData.focusLiteralPixelRepair = 'v272-no-crystal-crown-no-card-stack'
  geometry.userData.focusSilhouetteRule = 'one-coherent-memory-phenomenon-not-discrete-objects'
  return geometry
}

export function createFocusStrata() {
  return [createLivingMemoryFold()]
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
