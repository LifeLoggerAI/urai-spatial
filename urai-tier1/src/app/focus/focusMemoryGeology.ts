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
// V273 reclined the form and removed the prior upright-rock / flat-cap read, but
// exact-head retained pixels still read as a clam/mouth because a camera-facing
// full-width cleft split two similarly sized lobes. V274 keeps one watertight
// phenomenon but replaces that bilateral mouth seam with a partial, migrating,
// diagonal fold: one dominant mass, one subordinate shoulder, uneven depth and a
// branch scar that fades before both ends. The silhouette must not resolve into
// two opposing lips even when viewed front-on.
//
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
  const litMineral = new THREE.Color().setRGB(.48, .56, .43)
  const phase = .5 + .5 * Math.sin(section * .27 + radial * .43)
  const strata = .5 + .5 * Math.sin(section * .91 + radial * .36)
  const edge = Math.pow(Math.abs(t), 1.5)
  const scar = Math.max(furrow, secondaryFurrow)
  const color = deep.clone()
    .lerp(mineral, .48 + phase * .25)
    .lerp(weathered, .22 + .16 * (1 - edge))
  if (scar > .24) color.lerp(deep, .14 + scar * .17)
  if (ridge > .42) color.lerp(weathered, .20 + ridge * .08)
  color.lerp(warm, .060 * strata * (1 - scar))
  color.lerp(litMineral, .16 + .08 * (1 - edge) + .05 * ridge)
  if ((section * 5 + radial * 3) % 29 === 0) color.lerp(warm, .14)
  color.multiplyScalar(1.16)
  color.r = Math.min(.70, color.r)
  color.g = Math.min(.72, color.g)
  color.b = Math.min(.64, color.b)
  return color
}

function createLivingMemoryFold() {
  const positions: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const sectionCenters: THREE.Vector3[] = []

  for (let section = 0; section < MEMORY_RENDER_SECTIONS; section += 1) {
    const u = section / (MEMORY_RENDER_SECTIONS - 1)
    const t = THREE.MathUtils.lerp(-1, 1, u)
    const endTaper = Math.pow(Math.max(0, Math.sin(u * Math.PI)), .58)
    const shoulder = Math.pow(Math.max(0, Math.sin(u * Math.PI)), .36)

    // Keep the body reclined, but make the spine itself rise/fall and shift in
    // depth so the arrival view does not project to one symmetrical horizontal
    // shell silhouette.
    const centerX = t * .98 + .11 * Math.sin(t * 2.55) + .045 * Math.sin(t * 6.1)
    const centerY = -.06 + .20 * Math.sin(t * 1.42 + .34) - .105 * t + .038 * Math.sin(t * 4.4)
    const centerZ = -.08 + .13 * Math.sin(t * 1.66) - .050 * Math.cos(t * 4.15) + .035 * t
    sectionCenters.push(new THREE.Vector3(centerX, centerY, centerZ))

    const height = .024 + endTaper * (.43 + .058 * Math.sin(section * .29))
    const depth = .022 + endTaper * (.285 + .034 * Math.cos(section * .31))
    const twist = .13 * Math.sin(t * 2.15) + .07 * Math.sin(t * 5.0) + .08 * t

    // V274: the primary fold migrates diagonally across the camera-facing side
    // and fades before the tips. It is intentionally not a continuous mouth seam.
    const furrowAngle = Math.PI * .34 + .39 * t - twist + .12 * Math.sin(t * 2.6)
    const secondaryFurrowAngle = furrowAngle + Math.PI * .57 + .24 * Math.sin(t * 1.8 + .6)
    const ridgeAngle = furrowAngle + Math.PI * .82
    const primaryWindow = Math.exp(-Math.pow((t - .08) / .74, 4)) * (.66 + .20 * Math.sin(t * 2.8 + .7))
    const branchWindow = Math.exp(-Math.pow((t + .30) / .44, 2))

    for (let radial = 0; radial < MEMORY_RENDER_RING_POINTS; radial += 1) {
      const radialU = radial / MEMORY_RENDER_RING_POINTS
      const angle = radialU * Math.PI * 2
      const furrowDistance = wrappedAngleDistance(angle, furrowAngle)
      const secondaryFurrowDistance = wrappedAngleDistance(angle, secondaryFurrowAngle)
      const ridgeDistance = wrappedAngleDistance(angle, ridgeAngle)
      const furrow = Math.exp(-Math.pow(furrowDistance / .25, 2)) * Math.max(0, primaryWindow)
      const secondaryFurrow = Math.exp(-Math.pow(secondaryFurrowDistance / .30, 2)) * (.18 + .18 * shoulder) * branchWindow
      const ridge = Math.exp(-Math.pow(ridgeDistance / .48, 2))

      // V274 deliberately removes the near-bilateral cos(2a) shoulder pair. A
      // first-harmonic bias creates one dominant mass; smaller higher-frequency
      // variation keeps the material alive without constructing two opposing lips.
      const dominantMass = 1
        + .20 * Math.cos(angle - furrowAngle - .88)
        + .085 * t * Math.sin(angle + .42)
        + .050 * Math.sin(angle * 3 + t * 2.35)
        + .026 * Math.cos(angle * 5 - t * 3.0)
      const tissue = 1
        + .035 * Math.sin(angle * 7 + section * .22)
        + .020 * Math.cos(angle * 11 - section * .17)
        + .011 * Math.sin(angle * 17 + section * .09)
      const longitudinalRill = .014 * endTaper * Math.sin(section * 1.25 + angle * 5.6)
        + .008 * endTaper * Math.cos(section * .58 - angle * 11.0)
      const asymmetricFold = .068 * endTaper * Math.sin(angle - t * 2.9 + .8)
        + .034 * endTaper * Math.sin(angle * 2.6 + t * 2.2)
        + .018 * endTaper * t * Math.cos(angle * 4.1)
      const pinch = Math.max(.52, 1 - .29 * furrow - .10 * secondaryFurrow)

      const localY = Math.cos(angle) * height * dominantMass * tissue * pinch + asymmetricFold
      const localZ = Math.sin(angle) * depth * (1 + .18 * ridge)
        - furrow * depth * .34
        - secondaryFurrow * depth * .12
        + ridge * depth * .13
        + longitudinalRill

      const y = centerY + localY * Math.cos(twist) - localZ * Math.sin(twist)
      const z = centerZ + localY * Math.sin(twist) + localZ * Math.cos(twist)
      positions.push(centerX, y, z)
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

  // The end rings already taper almost to points. Cap them at the actual section
  // centers so the arrival camera cannot see a broad flat rectangular cut while
  // the mesh remains watertight.
  const startCap = positions.length / 3
  const start = sectionCenters[0]
  positions.push(start.x, start.y, start.z)
  colors.push(.070, .115, .100)
  uvs.push(.5, 0)
  const endCap = positions.length / 3
  const end = sectionCenters[sectionCenters.length - 1]
  positions.push(end.x, end.y, end.z)
  colors.push(.090, .132, .108)
  uvs.push(.5, 1)

  for (let radial = 0; radial < MEMORY_RENDER_RING_POINTS; radial += 1) {
    const next = (radial + 1) % MEMORY_RENDER_RING_POINTS
    indices.push(startCap, next, radial)
    const endRow = (MEMORY_RENDER_SECTIONS - 1) * MEMORY_RENDER_RING_POINTS
    indices.push(endCap, endRow + radial, endRow + next)
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
  geometry.userData.focusMemoryEnergy = 'weathered-mineral-restrained-warm-cool-response'
  geometry.userData.focusLiteralPixelRepair = 'v272-no-crystal-crown-no-card-stack'
  geometry.userData.focusSilhouetteRule = 'one-coherent-memory-phenomenon-not-discrete-objects'
  geometry.userData.focusSurfaceDensity = `${MEMORY_RENDER_SECTIONS}x${MEMORY_RENDER_RING_POINTS}-continuous-tactile-surface`
  geometry.userData.focusLiteralPixelRefinement = 'v274-partial-diagonal-fold-one-dominant-mass-no-bilateral-mouth-seam'
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
