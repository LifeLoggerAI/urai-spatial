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
// V276 fixed that silhouette failure with a materially longer S-curve and unequal
// ends. V277 added tactile relief and stronger weathering. V278 added a localized
// knot and deeper one-sided crease, but exact pixels still broadened into a soft
// manta/draped-membrane read and the counter-end broke into bead-like lobes.
// V279 narrowed the section and removed the manta/bead regression, but exact
// desktop/phone pixels still read as a soft slug/fish because the leading shoulder
// carried too much rounded mass and the centerline stayed too close to an animal
// body taper. V280 removes that head-like mass, deepens the middle waist, increases
// true three-dimensional S displacement, strengthens the tucked counter-end and
// concentrates the crease/ridge hierarchy around one asymmetric central knot.
// V280 remained too horizontally smooth in literal pixels: its two tapered ends
// still read as nose/head and tail. V281 therefore makes the fold itself—not the
// taper—the identity. It introduces two separated tension waists around a dominant
// central knot, a lifted inward leading curl, a down/back counter fold, a much
// stronger screen-space vertical gesture and greater asymmetric cross-section
// rotation. V281 materially reduced the creature read, but literal desktop/phone
// pixels still read too much like a smooth draped ribbon/wave with decorative curls.
// V282 compresses those terminal gestures into short volumetric tucks, introduces
// two controlled spatial knees, strengthens depth around the central knot, and
// raises terminal section thickness so neither end resolves as a ribbon tip.
// The object remains one watertight phenomenon rather than a creature, banner,
// rock, shell, collectible or generic game pickup.
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
  const deep = new THREE.Color().setRGB(.035, .045, .032)
  const mineral = new THREE.Color().setRGB(.37, .40, .255)
  const weathered = new THREE.Color().setRGB(.55, .39, .19)
  const warm = new THREE.Color().setRGB(.72, .36, .10)
  const litMineral = new THREE.Color().setRGB(.78, .66, .39)
  const phase = .5 + .5 * Math.sin(section * .27 + radial * .43)
  const strata = .5 + .5 * Math.sin(section * .91 + radial * .36)
  const edge = Math.pow(Math.abs(t), 1.5)
  const scar = Math.max(furrow, secondaryFurrow)
  const color = deep.clone()
    .lerp(mineral, .46 + phase * .22)
    .lerp(weathered, .35 + .19 * (1 - edge))
  if (scar > .20) color.lerp(deep, .26 + scar * .30)
  if (ridge > .34) color.lerp(weathered, .31 + ridge * .13)
  color.lerp(warm, .21 * strata * (1 - scar) + .055 * Math.max(0, -t) + .050 * ridge)
  color.lerp(litMineral, .18 + .09 * (1 - edge) + .070 * ridge)
  if ((section * 5 + radial * 3) % 23 === 0) color.lerp(warm, .28)
  color.multiplyScalar(1.23)
  color.r = Math.min(.96, color.r)
  color.g = Math.min(.84, color.g)
  color.b = Math.min(.60, color.b)
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
    const endTaper = Math.pow(Math.max(0, Math.sin(u * Math.PI)), .90)
    const shoulder = Math.pow(Math.max(0, Math.sin(u * Math.PI)), .58)
    const detailWindow = .24 + .76 * endTaper

    // V282 keeps the V281 dual-waist/knot structure but turns the former curled
    // tips into compressed spatial tucks. Two knees interrupt the long wave line
    // without segmenting the phenomenon into beads or discrete lobes.
    const leadingTuck = Math.exp(-Math.pow((t + .76) / .18, 2))
    const leadingKnee = Math.exp(-Math.pow((t + .56) / .16, 2))
    const leadingWaist = Math.exp(-Math.pow((t + .34) / .17, 2))
    const spineKnot = Math.exp(-Math.pow((t + .03) / .19, 2))
    const counterWaist = Math.exp(-Math.pow((t - .31) / .17, 2))
    const counterKnee = Math.exp(-Math.pow((t - .52) / .17, 2))
    const counterTuck = Math.exp(-Math.pow((t - .76) / .18, 2))
    const foldedShoulder = Math.exp(-Math.pow((t + .17) / .24, 2))

    // Both ends fold inward and through depth rather than drawing thin decorative
    // curls in screen space. The central knot remains the dominant high-energy mass.
    const centerX = t * 1.12
      + .105 * Math.sin(t * 2.75)
      + .045 * Math.sin(t * 6.35)
      + .145 * leadingTuck
      - .138 * counterTuck
      - .035 * leadingKnee
      + .032 * counterKnee
    const centerY = -.66
      + .080 * Math.sin(t * 2.30 + .24)
      + .035 * Math.sin(t * 5.30 - .12)
      + .195 * leadingTuck
      + .115 * leadingKnee
      - .130 * leadingWaist
      + .275 * spineKnot
      - .165 * counterWaist
      - .125 * counterKnee
      - .205 * counterTuck
    const centerZ = -.10
      + .175 * Math.sin(t * 1.88 - .16)
      + .072 * Math.sin(t * 5.10 + .14)
      + .245 * leadingTuck
      - .120 * leadingKnee
      - .080 * leadingWaist
      + .165 * spineKnot
      + .075 * counterWaist
      - .165 * counterKnee
      - .245 * counterTuck
    sectionCenters.push(new THREE.Vector3(centerX, centerY, centerZ))

    // The waists still hold tension, but end volumes no longer collapse into
    // paper-thin horns. The knot has stronger depth than height so the phenomenon
    // reads sculptural from portrait and landscape cameras rather than like fabric.
    const widthProfile = Math.max(.47,
      1
      - .34 * leadingWaist
      - .32 * counterWaist
      - .08 * leadingKnee
      - .08 * counterKnee
      + .39 * spineKnot
      + .08 * foldedShoulder
      + .10 * leadingTuck
      + .08 * counterTuck)
    const height = .028 + endTaper * (
      .165
      + .020 * Math.sin(t * 2.62 - .24)
      + .018 * leadingTuck
      + .032 * leadingKnee
      + .040 * foldedShoulder
      + .132 * spineKnot
      - .010 * counterKnee
      + .014 * counterTuck
    ) * widthProfile
    const depth = .030 + endTaper * (
      .202
      + .024 * Math.cos(t * 2.22 + .18)
      + .040 * leadingTuck
      + .020 * leadingKnee
      + .032 * foldedShoulder
      + .132 * spineKnot
      + .026 * counterWaist
      + .030 * counterKnee
      + .038 * counterTuck
    ) * (.94 + .06 * shoulder)
    const twist = .56 * Math.sin(t * 1.94)
      + .31 * t
      + .150 * Math.sin(t * 4.90)
      + .26 * leadingTuck
      - .18 * leadingKnee
      + .38 * spineKnot
      - .22 * counterWaist
      + .24 * counterKnee
      - .28 * counterTuck

    // One oblique crease/ridge system crosses the central knot and turns with the
    // fold. A small subordinate branch exists only on the leading shoulder; there
    // is no bilateral seam that can become a mouth.
    const furrowAngle = Math.PI * .18 + .84 * t - twist + .27 * Math.sin(t * 2.62)
    const secondaryFurrowAngle = furrowAngle + Math.PI * .64 + .18 * Math.sin(t * 1.85 + .48)
    const ridgeAngle = furrowAngle + Math.PI * .70
    const primaryWindow = Math.exp(-Math.pow((t + .01) / .30, 4)) * (.93 + .06 * Math.sin(t * 2.9 + .5))
    const branchWindow = Math.exp(-Math.pow((t + .27) / .19, 2))
    const ridgeWindow = .18 + 1.02 * Math.exp(-Math.pow((t + .01) / .33, 2))

    for (let radial = 0; radial < MEMORY_RENDER_RING_POINTS; radial += 1) {
      const radialU = radial / MEMORY_RENDER_RING_POINTS
      const angle = radialU * Math.PI * 2
      const furrowDistance = wrappedAngleDistance(angle, furrowAngle)
      const secondaryFurrowDistance = wrappedAngleDistance(angle, secondaryFurrowAngle)
      const ridgeDistance = wrappedAngleDistance(angle, ridgeAngle)
      const furrow = Math.exp(-Math.pow(furrowDistance / .164, 2)) * Math.max(0, primaryWindow)
      const secondaryFurrow = Math.exp(-Math.pow(secondaryFurrowDistance / .250, 2)) * (.066 + .066 * shoulder) * branchWindow
      const ridge = Math.exp(-Math.pow(ridgeDistance / .280, 2)) * ridgeWindow

      const dominantMass = 1
        + .25 * Math.cos(angle - furrowAngle - .94)
        + .064 * t * Math.sin(angle + .30)
        + .056 * Math.sin(angle * 3 + t * 2.44)
        + .029 * Math.cos(angle * 5 - t * 3.14)
        + .060 * leadingTuck * Math.cos(angle - .35)
        - .042 * leadingKnee * Math.sin(angle + .20)
        + .165 * spineKnot * Math.cos(angle - ridgeAngle + .14)
        + .045 * counterKnee * Math.sin(angle - .28)
        + .055 * counterTuck * Math.cos(angle + .42)
      const tissue = 1
        + detailWindow * .036 * Math.sin(angle * 7 + t * 3.2)
        + detailWindow * .020 * Math.cos(angle * 11 - t * 2.4)
        + detailWindow * .010 * Math.sin(angle * 17 + t * 1.8)
      const longitudinalRill = detailWindow * .010 * endTaper * Math.sin(t * 5.2 + angle * 4.5)
        + detailWindow * .005 * endTaper * Math.cos(t * 3.1 - angle * 8.2)
      const asymmetricFold = .050 * endTaper * Math.sin(angle - t * 3.24 + .68)
        + .024 * endTaper * Math.sin(angle * 2.7 + t * 2.1)
        + .016 * endTaper * t * Math.cos(angle * 4.0)
        + .036 * leadingTuck * Math.sin(angle - .32)
        - .025 * leadingKnee * Math.cos(angle + .22)
        + .032 * foldedShoulder * Math.cos(angle + .66)
        + .066 * spineKnot * Math.sin(angle - ridgeAngle - .12)
        + .024 * counterKnee * Math.cos(angle - .38)
        - .034 * counterTuck * Math.sin(angle + .18)
      const ridgeLift = .116 * endTaper * ridge * (.72 + .28 * Math.sin(t * 3.18 + .31))
      const creaseSink = .070 * endTaper * furrow * (1 + .66 * spineKnot)
      const pinch = Math.max(.46, 1 - .40 * furrow - .043 * secondaryFurrow)

      const localY = Math.cos(angle) * height * dominantMass * tissue * pinch
        + asymmetricFold
        + ridgeLift
        - creaseSink
      const localZ = Math.sin(angle) * depth * (1 + .30 * ridge + .19 * spineKnot)
        - furrow * depth * .52
        - secondaryFurrow * depth * .050
        + ridge * depth * .38
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
  colors.push(.13, .105, .052)
  uvs.push(.5, 0)
  const endCap = positions.length / 3
  const end = sectionCenters[sectionCenters.length - 1]
  positions.push(end.x, end.y, end.z)
  colors.push(.15, .12, .055)
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
  geometry.userData.focusLiteralPixelRefinement = 'v280-lean-leading-tip-deep-waist-3d-s-gesture-tucked-counter-end-local-asymmetric-knot'
  geometry.userData.focusLiteralPixelIteration = 'v281-dominant-central-fold-dual-tension-waists-lifted-curl-downback-tuck-oblique-ridge'
  geometry.userData.focusLiteralPixelCandidate = 'v282-compressed-terminal-tucks-volumetric-knees-central-depth-no-ribbon-tips'
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