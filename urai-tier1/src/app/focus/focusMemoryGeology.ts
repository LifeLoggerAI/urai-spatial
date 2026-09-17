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
// body taper. V280 removed that head-like mass, deepened the middle waist, increased
// true three-dimensional S displacement, strengthened the tucked counter-end and
// concentrated the crease/ridge hierarchy around one asymmetric central knot.
// V281 made the fold rather than the taper the identity, but still read too much
// like a smooth ribbon/wave. V282 compressed the terminal curls into short tucks
// and added volumetric knees, yet exact pixels still read as a draped tent/fabric
// crest or folded manta, especially in portrait.
//
// V283 deliberately removes that broad sheet silhouette. The whole manifestation is
// shorter, thicker and more compact. Its dominant mass is moved off-center, both
// terminals retain real section thickness, and a distinct tucked underfold creates
// readable three-dimensional return volume rather than a thin wing/flap. The two
// ends remain unequal in posture and depth without becoming head/tail anatomy.
//
// The form must read as one held memory phenomenon. It must not regress into a
// crystal crown/shard cluster, boulder, sphere/orb, flower, portal, ring, cage,
// doorway, sheet fan, stack of cards, shell/mouth, manta, tent or generic pickup.
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
    const endTaper = Math.pow(Math.max(0, Math.sin(u * Math.PI)), .82)
    const shoulder = Math.pow(Math.max(0, Math.sin(u * Math.PI)), .60)
    const detailWindow = .28 + .72 * endTaper

    // V283 uses a compact asymmetric knot with one visible underfold. The spatial
    // knees break the broad tent/manta crest while keeping the object continuous.
    const leadingTuck = Math.exp(-Math.pow((t + .73) / .16, 2))
    const leadingKnee = Math.exp(-Math.pow((t + .48) / .15, 2))
    const leadingWaist = Math.exp(-Math.pow((t + .29) / .16, 2))
    const spineKnot = Math.exp(-Math.pow((t + .13) / .18, 2))
    const underFold = Math.exp(-Math.pow((t - .16) / .16, 2))
    const counterWaist = Math.exp(-Math.pow((t - .35) / .17, 2))
    const counterKnee = Math.exp(-Math.pow((t - .53) / .16, 2))
    const counterTuck = Math.exp(-Math.pow((t - .72) / .16, 2))

    // Shorter horizontal reach, stronger depth separation and an off-center knot
    // prevent a centered fabric peak. The counter side dives under and returns.
    const centerX = t * .94
      + .075 * Math.sin(t * 2.85)
      + .038 * Math.sin(t * 6.40)
      + .110 * leadingTuck
      - .055 * leadingKnee
      - .042 * underFold
      - .105 * counterTuck
      + .042 * counterKnee
    const centerY = -.65
      + .060 * Math.sin(t * 2.35 + .28)
      + .028 * Math.sin(t * 5.60 - .15)
      + .125 * leadingTuck
      + .095 * leadingKnee
      - .112 * leadingWaist
      + .215 * spineKnot
      - .145 * underFold
      + .055 * counterWaist
      - .095 * counterKnee
      - .120 * counterTuck
    const centerZ = -.08
      + .145 * Math.sin(t * 1.95 - .22)
      + .060 * Math.sin(t * 5.25 + .10)
      + .210 * leadingTuck
      - .135 * leadingKnee
      - .055 * leadingWaist
      + .205 * spineKnot
      - .275 * underFold
      + .080 * counterWaist
      - .145 * counterKnee
      - .205 * counterTuck
    sectionCenters.push(new THREE.Vector3(centerX, centerY, centerZ))

    // Terminal base thickness remains substantial even where the longitudinal
    // taper approaches zero. The underfold gains depth instead of broad screen-area.
    const widthProfile = Math.max(.50,
      1
      - .28 * leadingWaist
      - .24 * counterWaist
      - .06 * leadingKnee
      - .07 * counterKnee
      + .34 * spineKnot
      + .20 * underFold
      + .13 * leadingTuck
      + .12 * counterTuck)
    const height = .052 + endTaper * (
      .135
      + .018 * Math.sin(t * 2.70 - .28)
      + .022 * leadingTuck
      + .028 * leadingKnee
      + .090 * spineKnot
      + .038 * underFold
      - .008 * counterKnee
      + .020 * counterTuck
    ) * widthProfile
    const depth = .058 + endTaper * (
      .188
      + .022 * Math.cos(t * 2.28 + .16)
      + .046 * leadingTuck
      + .020 * leadingKnee
      + .148 * spineKnot
      + .118 * underFold
      + .030 * counterWaist
      + .034 * counterKnee
      + .045 * counterTuck
    ) * (.95 + .05 * shoulder)
    const twist = .62 * Math.sin(t * 2.02)
      + .34 * t
      + .165 * Math.sin(t * 4.95)
      + .28 * leadingTuck
      - .20 * leadingKnee
      + .42 * spineKnot
      - .34 * underFold
      - .16 * counterWaist
      + .22 * counterKnee
      - .30 * counterTuck

    // One oblique crease/ridge system owns the dominant reading. The subordinate
    // branch is local and cannot form a bilateral shell/mouth seam.
    const furrowAngle = Math.PI * .14 + .90 * t - twist + .30 * Math.sin(t * 2.70)
    const secondaryFurrowAngle = furrowAngle + Math.PI * .66 + .16 * Math.sin(t * 1.90 + .44)
    const ridgeAngle = furrowAngle + Math.PI * .69
    const primaryWindow = Math.exp(-Math.pow((t + .06) / .28, 4)) * (.94 + .05 * Math.sin(t * 3.0 + .45))
    const branchWindow = Math.exp(-Math.pow((t + .24) / .18, 2))
    const ridgeWindow = .16 + 1.08 * Math.exp(-Math.pow((t + .07) / .31, 2))

    for (let radial = 0; radial < MEMORY_RENDER_RING_POINTS; radial += 1) {
      const radialU = radial / MEMORY_RENDER_RING_POINTS
      const angle = radialU * Math.PI * 2
      const furrowDistance = wrappedAngleDistance(angle, furrowAngle)
      const secondaryFurrowDistance = wrappedAngleDistance(angle, secondaryFurrowAngle)
      const ridgeDistance = wrappedAngleDistance(angle, ridgeAngle)
      const furrow = Math.exp(-Math.pow(furrowDistance / .158, 2)) * Math.max(0, primaryWindow)
      const secondaryFurrow = Math.exp(-Math.pow(secondaryFurrowDistance / .245, 2)) * (.058 + .058 * shoulder) * branchWindow
      const ridge = Math.exp(-Math.pow(ridgeDistance / .270, 2)) * ridgeWindow

      const dominantMass = 1
        + .27 * Math.cos(angle - furrowAngle - .90)
        + .060 * t * Math.sin(angle + .26)
        + .058 * Math.sin(angle * 3 + t * 2.52)
        + .030 * Math.cos(angle * 5 - t * 3.20)
        + .074 * leadingTuck * Math.cos(angle - .30)
        - .040 * leadingKnee * Math.sin(angle + .18)
        + .185 * spineKnot * Math.cos(angle - ridgeAngle + .12)
        + .110 * underFold * Math.sin(angle + .62)
        + .048 * counterKnee * Math.sin(angle - .25)
        + .070 * counterTuck * Math.cos(angle + .38)
      const tissue = 1
        + detailWindow * .036 * Math.sin(angle * 7 + t * 3.2)
        + detailWindow * .020 * Math.cos(angle * 11 - t * 2.4)
        + detailWindow * .010 * Math.sin(angle * 17 + t * 1.8)
      const longitudinalRill = detailWindow * .010 * endTaper * Math.sin(t * 5.2 + angle * 4.5)
        + detailWindow * .005 * endTaper * Math.cos(t * 3.1 - angle * 8.2)
      const asymmetricFold = .052 * endTaper * Math.sin(angle - t * 3.32 + .64)
        + .025 * endTaper * Math.sin(angle * 2.75 + t * 2.12)
        + .016 * endTaper * t * Math.cos(angle * 4.1)
        + .044 * leadingTuck * Math.sin(angle - .28)
        - .024 * leadingKnee * Math.cos(angle + .18)
        + .074 * spineKnot * Math.sin(angle - ridgeAngle - .10)
        - .086 * underFold * Math.cos(angle - .52)
        + .028 * counterKnee * Math.cos(angle - .34)
        - .042 * counterTuck * Math.sin(angle + .15)
      const ridgeLift = .122 * endTaper * ridge * (.71 + .29 * Math.sin(t * 3.25 + .28))
      const creaseSink = .074 * endTaper * furrow * (1 + .72 * spineKnot + .24 * underFold)
      const pinch = Math.max(.48, 1 - .41 * furrow - .040 * secondaryFurrow)

      const localY = Math.cos(angle) * height * dominantMass * tissue * pinch
        + asymmetricFold
        + ridgeLift
        - creaseSink
      const localZ = Math.sin(angle) * depth * (1 + .31 * ridge + .20 * spineKnot + .18 * underFold)
        - furrow * depth * .54
        - secondaryFurrow * depth * .045
        + ridge * depth * .40
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
  geometry.userData.focusLiteralPixelSuccessor = 'v283-compact-offcenter-knot-thick-terminals-tucked-underfold-no-tent-manta'
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