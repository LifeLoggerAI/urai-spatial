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
// branch scar that fades before both ends.
//
// V275 preserves the no-mouth topology but corrects the retained-pixel boulder /
// hovering-pickup failure. The spine now has one authored hooked shoulder and a
// lower tapered counter-end rather than a rounded symmetric mass, the whole form
// sits materially lower into the chamber ground, and the vertex palette carries
// stronger weathered mineral / ochre variation so it cannot collapse to teal
// rubber under the shared material response.
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
  const deep = new THREE.Color().setRGB(.045, .058, .047)
  const mineral = new THREE.Color().setRGB(.225, .255, .205)
  const weathered = new THREE.Color().setRGB(.39, .34, .235)
  const warm = new THREE.Color().setRGB(.50, .285, .115)
  const litMineral = new THREE.Color().setRGB(.57, .54, .39)
  const phase = .5 + .5 * Math.sin(section * .27 + radial * .43)
  const strata = .5 + .5 * Math.sin(section * .91 + radial * .36)
  const edge = Math.pow(Math.abs(t), 1.5)
  const scar = Math.max(furrow, secondaryFurrow)
  const color = deep.clone()
    .lerp(mineral, .40 + phase * .22)
    .lerp(weathered, .30 + .18 * (1 - edge))
  if (scar > .24) color.lerp(deep, .17 + scar * .20)
  if (ridge > .42) color.lerp(weathered, .24 + ridge * .10)
  color.lerp(warm, .11 * strata * (1 - scar) + .025 * Math.max(0, -t))
  color.lerp(litMineral, .13 + .07 * (1 - edge) + .04 * ridge)
  if ((section * 5 + radial * 3) % 23 === 0) color.lerp(warm, .20)
  color.multiplyScalar(1.12)
  color.r = Math.min(.74, color.r)
  color.g = Math.min(.68, color.g)
  color.b = Math.min(.52, color.b)
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
    const hookedShoulder = Math.exp(-Math.pow((t + .57) / .28, 2))
    const counterDip = Math.exp(-Math.pow((t - .54) / .34, 2))

    // V275 keeps the body reclined but stops the arrival view from resolving to
    // a rounded horizontal stone. One side rises and folds back in depth while
    // the opposite end narrows and settles toward the ground.
    const centerX = t * .92 + .15 * Math.sin(t * 2.35) + .055 * Math.sin(t * 5.6)
    const centerY = -.66
      + .18 * Math.sin(t * 1.42 + .34)
      - .12 * t
      + .040 * Math.sin(t * 4.4)
      + .24 * hookedShoulder
      - .11 * counterDip
    const centerZ = -.08
      + .14 * Math.sin(t * 1.66)
      - .052 * Math.cos(t * 4.15)
      + .038 * t
      + .17 * hookedShoulder
      - .07 * counterDip
    sectionCenters.push(new THREE.Vector3(centerX, centerY, centerZ))

    const height = .020 + endTaper * (.345 + .052 * Math.sin(section * .29) + .055 * hookedShoulder)
    const depth = .020 + endTaper * (.235 + .030 * Math.cos(section * .31) + .030 * hookedShoulder)
    const twist = .15 * Math.sin(t * 2.15) + .075 * Math.sin(t * 5.0) + .10 * t - .08 * hookedShoulder

    // The primary fold remains partial, diagonal and tip-faded. V275 only adds a
    // localized hooked-shoulder scar so the silhouette gains authored direction
    // without reconstructing two opposing lips.
    const furrowAngle = Math.PI * .34 + .42 * t - twist + .12 * Math.sin(t * 2.6)
    const secondaryFurrowAngle = furrowAngle + Math.PI * .57 + .24 * Math.sin(t * 1.8 + .6)
    const ridgeAngle = furrowAngle + Math.PI * .82
    const primaryWindow = Math.exp(-Math.pow((t - .06) / .70, 4)) * (.62 + .20 * Math.sin(t * 2.8 + .7))
    const branchWindow = Math.exp(-Math.pow((t + .30) / .42, 2))

    for (let radial = 0; radial < MEMORY_RENDER_RING_POINTS; radial += 1) {
      const radialU = radial / MEMORY_RENDER_RING_POINTS
      const angle = radialU * Math.PI * 2
      const furrowDistance = wrappedAngleDistance(angle, furrowAngle)
      const secondaryFurrowDistance = wrappedAngleDistance(angle, secondaryFurrowAngle)
      const ridgeDistance = wrappedAngleDistance(angle, ridgeAngle)
      const furrow = Math.exp(-Math.pow(furrowDistance / .23, 2)) * Math.max(0, primaryWindow)
      const secondaryFurrow = Math.exp(-Math.pow(secondaryFurrowDistance / .28, 2)) * (.16 + .16 * shoulder) * branchWindow
      const ridge = Math.exp(-Math.pow(ridgeDistance / .44, 2))

      const dominantMass = 1
        + .24 * Math.cos(angle - furrowAngle - .92)
        + .10 * t * Math.sin(angle + .42)
        + .065 * Math.sin(angle * 3 + t * 2.35)
        + .032 * Math.cos(angle * 5 - t * 3.0)
        + .080 * hookedShoulder * Math.cos(angle + .35)
      const tissue = 1
        + .048 * Math.sin(angle * 7 + section * .22)
        + .030 * Math.cos(angle * 11 - section * .17)
        + .016 * Math.sin(angle * 17 + section * .09)
      const longitudinalRill = .020 * endTaper * Math.sin(section * 1.25 + angle * 5.6)
        + .011 * endTaper * Math.cos(section * .58 - angle * 11.0)
      const asymmetricFold = .082 * endTaper * Math.sin(angle - t * 2.9 + .8)
        + .042 * endTaper * Math.sin(angle * 2.6 + t * 2.2)
        + .025 * endTaper * t * Math.cos(angle * 4.1)
        + .040 * hookedShoulder * Math.sin(angle - .25)
      const pinch = Math.max(.54, 1 - .27 * furrow - .09 * secondaryFurrow)

      const localY = Math.cos(angle) * height * dominantMass * tissue * pinch + asymmetricFold
      const localZ = Math.sin(angle) * depth * (1 + .22 * ridge)
        - furrow * depth * .31
        - secondaryFurrow * depth * .10
        + ridge * depth * .15
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

  const startCap = positions.length / 3
  const start = sectionCenters[0]
  positions.push(start.x, start.y, start.z)
  colors.push(.095, .105, .075)
  uvs.push(.5, 0)
  const endCap = positions.length / 3
  const end = sectionCenters[sectionCenters.length - 1]
  positions.push(end.x, end.y, end.z)
  colors.push(.115, .120, .080)
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
  geometry.userData.focusLiteralPixelRefinement = 'v275-grounded-hooked-asymmetric-weathered-fold-no-boulder-pickup'
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
