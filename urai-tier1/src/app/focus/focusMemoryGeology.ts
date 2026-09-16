import * as THREE from 'three'

// V272 literal-pixel repair of the selected-memory manifestation.
//
// V271 proved that real volume removes the predecessor's paper-card silhouette,
// but retained pixels still read as five separate low-poly cyan crystal shards.
// V272 removes that object language at the geometry source. The selected Memory
// Star now resolves into one continuous, closed, asymmetrical living-memory fold:
// a tactile mineral/tissue volume with a deep longitudinal furrow, curved
// centerline, changing cross-section, restrained physical energy and enough
// continuous surface density to avoid a generic low-poly game-artifact read.
//
// Literal inspection of the first V272 retained pack found the topology coherent
// but too smooth and blob-like. This refinement keeps the one-piece authority and
// deep longitudinal furrow while adding a secondary folded crease, stronger
// asymmetric lobes, weathered striation and denser continuous surface relief.
// The form must read as one held memory phenomenon. It must not regress into a
// crystal crown/shard cluster, boulder, sphere/orb, flower, portal, ring, cage,
// doorway, sheet fan, stack of cards or generic game pickup.
const MEMORY_SECTIONS = 15
const MEMORY_RING_POINTS = 12
const MEMORY_SURFACE_DETAIL = 4
const MEMORY_RENDER_SECTIONS = (MEMORY_SECTIONS - 1) * MEMORY_SURFACE_DETAIL + 1
const MEMORY_RENDER_RING_POINTS = MEMORY_RING_POINTS * MEMORY_SURFACE_DETAIL

function wrappedAngleDistance(a: number, b: number) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))
}

function livingMemoryVertexColor(section: number, radial: number, t: number, furrow: number, ridge: number, secondaryFurrow: number) {
  const deep = new THREE.Color().setRGB(.026, .067, .064)
  const mineral = new THREE.Color().setRGB(.155, .245, .218)
  const weathered = new THREE.Color().setRGB(.285, .335, .278)
  const warm = new THREE.Color().setRGB(.405, .235, .115)
  const phase = .5 + .5 * Math.sin(section * .27 + radial * .43)
  const strata = .5 + .5 * Math.sin(section * .91 + radial * .36)
  const edge = Math.pow(Math.abs(t), 1.5)
  const scar = Math.max(furrow, secondaryFurrow)
  const color = deep.clone()
    .lerp(mineral, .42 + phase * .28)
    .lerp(weathered, .16 + .18 * (1 - edge))
  if (scar > .24) color.lerp(deep, .18 + scar * .24)
  if (ridge > .42) color.lerp(weathered, .16 + ridge * .08)
  color.lerp(warm, .035 * strata * (1 - scar))
  if ((section * 5 + radial * 3) % 29 === 0) color.lerp(warm, .16)
  return color
}

function createLivingMemoryFold() {
  const positions: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let section = 0; section < MEMORY_RENDER_SECTIONS; section += 1) {
    const u = section / (MEMORY_RENDER_SECTIONS - 1)
    const t = THREE.MathUtils.lerp(-1, 1, u)
    const envelope = Math.pow(Math.max(.025, 1 - Math.pow(Math.abs(t), 1.72)), .48)
    const shoulderBias = .86 + .14 * Math.sin(u * Math.PI)
    const centerX = .245 * Math.sin(t * 1.88) + .075 * Math.sin(t * 5.35 + .4)
    const centerY = t * 1.04 + .065 * Math.sin(t * 3.2)
    const centerZ = -.08 + .15 * Math.cos(t * 1.76) - .06 * Math.sin(t * 4.65)
    const width = .112 + envelope * (.43 * shoulderBias + .038 * Math.sin(section * .31))
    const depth = .102 + envelope * (.282 + .034 * Math.cos(section * .27))
    const twist = -.68 + u * 1.42 + .075 * Math.sin(section * .19)
    const furrowAngle = .12 + .22 * Math.sin(t * 1.75) + .045 * Math.sin(t * 5.2)
    const secondaryFurrowAngle = furrowAngle + Math.PI * .61 + .11 * Math.sin(t * 2.7)
    const ridgeAngle = furrowAngle + Math.PI * .88

    for (let radial = 0; radial < MEMORY_RENDER_RING_POINTS; radial += 1) {
      const radialU = radial / MEMORY_RENDER_RING_POINTS
      const angle = radialU * Math.PI * 2
      const furrowDistance = wrappedAngleDistance(angle, furrowAngle)
      const secondaryFurrowDistance = wrappedAngleDistance(angle, secondaryFurrowAngle)
      const ridgeDistance = wrappedAngleDistance(angle, ridgeAngle)
      const furrow = Math.exp(-Math.pow(furrowDistance / .30, 2))
      const secondaryFurrow = Math.exp(-Math.pow(secondaryFurrowDistance / .25, 2)) * (.44 + .34 * envelope)
      const ridge = Math.exp(-Math.pow(ridgeDistance / .46, 2))
      const broadLobe = 1
        + .18 * Math.cos((angle - furrowAngle) * 2)
        + .085 * Math.sin(angle * 3 + t * 2.1)
        + .042 * Math.cos(angle * 5 - t * 3.3)
      const tissue = 1
        + .052 * Math.sin(angle * 7 + section * .22)
        + .031 * Math.cos(angle * 11 - section * .17)
        + .018 * Math.sin(angle * 17 + section * .09)
      const striation = .018 * envelope * Math.sin(section * 1.74 + angle * 6.2)
        + .011 * envelope * Math.cos(section * .63 - angle * 13)
      const edgeFold = .075 * envelope * Math.sin(angle * 2 - t * 4.3)
        + .028 * envelope * Math.sin(angle * 4 + t * 2.8)
      const pinch = Math.max(.34, 1 - .49 * furrow - .24 * secondaryFurrow)
      const localX = Math.cos(angle) * width * broadLobe * tissue * pinch + edgeFold
      const localZ = Math.sin(angle) * depth * (1 + .15 * ridge)
        - furrow * depth * .39
        - secondaryFurrow * depth * .18
        + ridge * depth * .11
        + striation
      const x = centerX + localX * Math.cos(twist) - localZ * Math.sin(twist)
      const z = centerZ + localX * Math.sin(twist) + localZ * Math.cos(twist)
      const y = centerY
        + .075 * envelope * Math.sin(angle * 2 + section * .14)
        + .026 * envelope * Math.sin(angle * 5 - section * .11)
        + .012 * envelope * Math.cos(angle * 9 + section * .17)
      positions.push(x, y, z)
      uvs.push(radialU, u)
      const color = livingMemoryVertexColor(section, radial, t, furrow, ridge, secondaryFurrow)
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let section = 0; section < MEMORY_RENDER_SECTIONS - 1; section += 1) {
    const row = section * MEMORY_RENDER_RING_POINTS
    const nextRow = (section + 1) * MEMORY_RENDER_RING_POINTS
    for (let radial = 0; radial < MEMORY_RENDER_RING_POINTS; radial += 1) {
      const next = (radial + 1) % MEMORY_RENDER_RING_POINTS
      const a = row + radial
      const b = row + next
      const c = nextRow + radial
      const d = nextRow + next
      indices.push(a, c, b, b, c, d)
    }
  }

  const bottomCap = positions.length / 3
  positions.push(-.06, -1.065, .012)
  colors.push(.020, .052, .050)
  uvs.push(.5, 0)
  const topCap = positions.length / 3
  positions.push(.052, 1.075, -.018)
  colors.push(.055, .092, .078)
  uvs.push(.5, 1)

  for (let radial = 0; radial < MEMORY_RENDER_RING_POINTS; radial += 1) {
    const next = (radial + 1) % MEMORY_RENDER_RING_POINTS
    indices.push(bottomCap, next, radial)
    const topRow = (MEMORY_RENDER_SECTIONS - 1) * MEMORY_RENDER_RING_POINTS
    indices.push(topCap, topRow + radial, topRow + next)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  geometry.userData.focusMemoryRole = 'v272-single-connected-living-memory-fold'
  geometry.userData.focusMemoryTopology = 'closed-twisted-longitudinal-fold-with-deep-furrow'
  geometry.userData.focusMemoryEnergy = 'dark-weathered-mineral-restrained-warm-cool-response'
  geometry.userData.focusLiteralPixelRepair = 'v272-no-crystal-crown-no-card-stack'
  geometry.userData.focusSilhouetteRule = 'one-coherent-memory-phenomenon-not-discrete-objects'
  geometry.userData.focusSurfaceDensity = `${MEMORY_RENDER_SECTIONS}x${MEMORY_RENDER_RING_POINTS}-continuous-tactile-surface`
  geometry.userData.focusLiteralPixelRefinement = 'secondary-fold-raking-striation-and-asymmetric-lobe-relief'
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
