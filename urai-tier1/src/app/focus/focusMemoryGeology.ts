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
// V273 removed the upright-rock / flat-cap read. V274 removed the bilateral
// clam/mouth seam. V275 grounded the form and warmed the palette, but literal
// desktop/mobile pixels still collapsed into a ribbed stone/lump silhouette.
// V276 fixed that silhouette failure with a materially longer S-curve, unequal
// ends and a slimmer center, but current pixels still read too much like a smooth
// floating cloth/manta/ribbon. V277 therefore preserves the V276 silhouette win
// while increasing localized physical thickness, crease depth, tactile tissue
// relief and warm weathered material contrast. It must remain one watertight
// sculptural memory phenomenon rather than becoming a rock, sheet or pickup.
//
// The form must read as one held memory phenomenon. It must not regress into a
// crystal crown/shard cluster, boulder, sphere/orb, flower, portal, ring, cage,
// doorway, sheet fan, stack of cards, shell/mouth or generic game pickup.
const MEMORY_SECTIONS = 15
const MEMORY_RING_POINTS = 12
const MEMORY_SURFACE_DETAIL = 4
const MEMORY_RENDER_SECTIONS = (MEMORY_SECTIONS - 1) * MEMORY_SURFACE_DETAIL + 1
const MEMORY_RENDER_RING_POINTS = MEMORY_RING_POINTS * MEMORY_SURFACE_DETAIL

function wrappedAngleDistance(a: number, b: number) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))
}

function livingMemoryVertexColor(section: number, radial: number, t: number, furrow: number, ridge: number, secondaryFurrow: number) {
  const deep = new THREE.Color().setRGB(.050, .060, .045)
  const mineral = new THREE.Color().setRGB(.32, .36, .25)
  const weathered = new THREE.Color().setRGB(.48, .36, .22)
  const warm = new THREE.Color().setRGB(.62, .33, .13)
  const litMineral = new THREE.Color().setRGB(.68, .60, .40)
  const phase = .5 + .5 * Math.sin(section * .27 + radial * .43)
  const strata = .5 + .5 * Math.sin(section * .91 + radial * .36)
  const edge = Math.pow(Math.abs(t), 1.5)
  const scar = Math.max(furrow, secondaryFurrow)
  const color = deep.clone()
    .lerp(mineral, .43 + phase * .22)
    .lerp(weathered, .32 + .20 * (1 - edge))
  if (scar > .24) color.lerp(deep, .20 + scar * .25)
  if (ridge > .38) color.lerp(weathered, .29 + ridge * .12)
  color.lerp(warm, .16 * strata * (1 - scar) + .040 * Math.max(0, -t))
  color.lerp(litMineral, .16 + .08 * (1 - edge) + .055 * ridge)
  if ((section * 5 + radial * 3) % 23 === 0) color.lerp(warm, .24)
  color.multiplyScalar(1.19)
  color.r = Math.min(.88, color.r)
  color.g = Math.min(.78, color.g)
  color.b = Math.min(.58, color.b)
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
    const endTaper = Math.pow(Math.max(0, Math.sin(u * Math.PI)), .82)
    const shoulder = Math.pow(Math.max(0, Math.sin(u * Math.PI)), .52)
    const leadingHook = Math.exp(-Math.pow((t + .70) / .23, 2))
    const counterTuck = Math.exp(-Math.pow((t - .66) / .27, 2))
    const middleWaist = Math.exp(-Math.pow((t - .04) / .31, 2))
    const foldedShoulder = Math.exp(-Math.pow((t + .22) / .30, 2))

    // Preserve V276's phone-readable S-gesture while increasing unequal end
    // articulation. The leading end rises toward camera; the counter end tucks
    // down and away rather than mirroring it.
    const centerX = t * 1.28 + .13 * Math.sin(t * 2.62) + .048 * Math.sin(t * 5.55)
    const centerY = -.62
      + .18 * Math.sin(t * 1.94 + .30)
      + .090 * Math.sin(t * 4.25 - .24)
      - .072 * t
      + .34 * leadingHook
      - .16 * counterTuck
      + .055 * foldedShoulder
    const centerZ = -.10
      + .205 * Math.sin(t * 1.68 - .18)
      + .078 * Math.sin(t * 4.45 + .12)
      + .21 * leadingHook
      - .105 * counterTuck
    sectionCenters.push(new THREE.Vector3(centerX, centerY, centerZ))

    // V277 adds localized sculptural thickness without restoring the V275
    // swollen center. The middle remains waisted and ends remain asymmetric.
    const widthProfile = 1 - .24 * middleWaist + .18 * leadingHook - .10 * counterTuck + .08 * foldedShoulder
    const height = .018 + endTaper * (.225 + .048 * Math.sin(section * .31) + .066 * leadingHook + .030 * foldedShoulder) * widthProfile
    const depth = .016 + endTaper * (.158 + .030 * Math.cos(section * .35) + .040 * leadingHook + .020 * foldedShoulder) * (.94 + .06 * shoulder)
    const twist = .34 * Math.sin(t * 1.86) + .20 * t + .092 * Math.sin(t * 4.7) + .12 * leadingHook

    // The crease remains bounded rather than becoming a tip-to-tip mouth seam.
    // V277 deepens the local fold and displaced ridge so light can describe the
    // object as tactile mineral/tissue rather than a smooth cloth surface.
    const furrowAngle = Math.PI * .24 + .64 * t - twist + .17 * Math.sin(t * 2.4)
    const secondaryFurrowAngle = furrowAngle + Math.PI * .56 + .20 * Math.sin(t * 1.72 + .52)
    const ridgeAngle = furrowAngle + Math.PI * .76
    const primaryWindow = Math.exp(-Math.pow((t + .02) / .48, 4)) * (.68 + .13 * Math.sin(t * 2.65 + .6))
    const branchWindow = Math.exp(-Math.pow((t + .31) / .30, 2))
    const ridgeWindow = .42 + .68 * Math.exp(-Math.pow((t - .12) / .60, 2))

    for (let radial = 0; radial < MEMORY_RENDER_RING_POINTS; radial += 1) {
      const radialU = radial / MEMORY_RENDER_RING_POINTS
      const angle = radialU * Math.PI * 2
      const furrowDistance = wrappedAngleDistance(angle, furrowAngle)
      const secondaryFurrowDistance = wrappedAngleDistance(angle, secondaryFurrowAngle)
      const ridgeDistance = wrappedAngleDistance(angle, ridgeAngle)
      const furrow = Math.exp(-Math.pow(furrowDistance / .215, 2)) * Math.max(0, primaryWindow)
      const secondaryFurrow = Math.exp(-Math.pow(secondaryFurrowDistance / .275, 2)) * (.15 + .13 * shoulder) * branchWindow
      const ridge = Math.exp(-Math.pow(ridgeDistance / .36, 2)) * ridgeWindow

      const dominantMass = 1
        + .22 * Math.cos(angle - furrowAngle - 1.00)
        + .082 * t * Math.sin(angle + .36)
        + .070 * Math.sin(angle * 3 + t * 2.30)
        + .034 * Math.cos(angle * 5 - t * 3.05)
        + .080 * leadingHook * Math.cos(angle + .18)
      const tissue = 1
        + .062 * Math.sin(angle * 7 + section * .22)
        + .034 * Math.cos(angle * 11 - section * .17)
        + .016 * Math.sin(angle * 17 + section * .09)
      const longitudinalRill = .022 * endTaper * Math.sin(section * 1.18 + angle * 5.35)
        + .011 * endTaper * Math.cos(section * .54 - angle * 10.7)
      const asymmetricFold = .068 * endTaper * Math.sin(angle - t * 3.10 + .72)
        + .034 * endTaper * Math.sin(angle * 2.7 + t * 2.0)
        + .021 * endTaper * t * Math.cos(angle * 4.0)
        + .050 * leadingHook * Math.sin(angle - .12)
        + .030 * foldedShoulder * Math.cos(angle + .75)
      const ridgeLift = .078 * endTaper * ridge * (.72 + .28 * Math.sin(t * 3.0 + .35))
      const pinch = Math.max(.58, 1 - .27 * furrow - .095 * secondaryFurrow)

      const localY = Math.cos(angle) * height * dominantMass * tissue * pinch + asymmetricFold + ridgeLift
      const localZ = Math.sin(angle) * depth * (1 + .20 * ridge)
        - furrow * depth * .34
        - secondaryFurrow * depth * .12
        + ridge * depth * .24
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
  colors.push(.11, .105, .070)
  uvs.push(.5, 0)
  const endCap = positions.length / 3
  const end = sectionCenters[sectionCenters.length - 1]
  positions.push(end.x, end.y, end.z)
  colors.push(.13, .115, .070)
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
  geometry.userData.focusLiteralPixelRefinement = 'v277-sculptural-tactile-weathered-fold-no-boulder-no-cloth-no-mouth'
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
