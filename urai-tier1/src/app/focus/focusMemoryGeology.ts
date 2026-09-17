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
// rotation. The result remains one watertight phenomenon rather than a creature,
// ribbon, rock, shell, collectible or generic game pickup.
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
    const endTaper = Math.pow(Math.max(0, Math.sin(u * Math.PI)), .98)
    const shoulder = Math.pow(Math.max(0, Math.sin(u * Math.PI)), .58)
    const detailWindow = .24 + .76 * endTaper

    // V281 uses spatial posture rather than end mass to distinguish the ends.
    const leadingCurl = Math.exp(-Math.pow((t + .73) / .19, 2))
    const leadingWaist = Math.exp(-Math.pow((t + .37) / .18, 2))
    const spineKnot = Math.exp(-Math.pow((t + .04) / .18, 2))
    const counterWaist = Math.exp(-Math.pow((t - .34) / .18, 2))
    const counterFold = Math.exp(-Math.pow((t - .58) / .20, 2))
    const counterTuck = Math.exp(-Math.pow((t - .78) / .17, 2))
    const foldedShoulder = Math.exp(-Math.pow((t + .20) / .23, 2))

    // Screen-space posture is intentionally pronounced: lifted curl -> tension
    // valley -> dominant knot -> second tension valley -> tucked/down-back end.
    // This breaks the smooth body line that caused V280's slug/fish read.
    const centerX = t * 1.24
      + .135 * Math.sin(t * 2.70)
      + .052 * Math.sin(t * 6.10)
      - .055 * leadingCurl
      - .045 * counterTuck
    const centerY = -.66
      + .095 * Math.sin(t * 2.20 + .28)
      + .045 * Math.sin(t * 5.10 - .18)
      + .305 * leadingCurl
      - .145 * leadingWaist
      + .245 * spineKnot
      - .185 * counterWaist
      - .105 * counterFold
      - .285 * counterTuck
    const centerZ = -.10
      + .205 * Math.sin(t * 1.82 - .18)
      + .082 * Math.sin(t * 4.90 + .16)
      + .165 * leadingCurl
      - .095 * leadingWaist
      + .145 * spineKnot
      + .085 * counterWaist
      - .205 * counterFold
      - .145 * counterTuck
    sectionCenters.push(new THREE.Vector3(centerX, centerY, centerZ))

    // Two pronounced waists bracket the central knot. The knot owns the mass;
    // neither end can become a head/body anchor. Depth stays substantial so the
    // stronger silhouette does not collapse into a ribbon or draped membrane.
    const widthProfile = Math.max(.43,
      1
      - .40 * leadingWaist
      - .38 * counterWaist
      - .10 * counterFold
      + .34 * spineKnot
      + .08 * foldedShoulder
      - .08 * counterTuck)
    const height = .015 + endTaper * (
      .178
      + .024 * Math.sin(t * 2.55 - .26)
      - .012 * leadingCurl
      + .040 * foldedShoulder
      + .115 * spineKnot
      - .018 * counterFold
      - .024 * counterTuck
    ) * widthProfile
    const depth = .016 + endTaper * (
      .184
      + .023 * Math.cos(t * 2.18 + .20)
      + .018 * leadingCurl
      + .026 * foldedShoulder
      + .105 * spineKnot
      + .016 * counterWaist
      - .018 * counterTuck
    ) * (.94 + .06 * shoulder)
    const twist = .50 * Math.sin(t * 1.90)
      + .29 * t
      + .145 * Math.sin(t * 4.75)
      + .18 * leadingCurl
      + .34 * spineKnot
      - .20 * counterWaist
      - .30 * counterFold
      - .14 * counterTuck

    // One oblique crease/ridge system crosses the central knot and turns with the
    // fold. A small subordinate branch exists only on the leading shoulder; there
    // is no bilateral seam that can become a mouth.
    const furrowAngle = Math.PI * .18 + .82 * t - twist + .26 * Math.sin(t * 2.55)
    const secondaryFurrowAngle = furrowAngle + Math.PI * .64 + .18 * Math.sin(t * 1.85 + .48)
    const ridgeAngle = furrowAngle + Math.PI * .70
    const primaryWindow = Math.exp(-Math.pow((t + .02) / .31, 4)) * (.91 + .07 * Math.sin(t * 2.8 + .5))
    const branchWindow = Math.exp(-Math.pow((t + .28) / .19, 2))
    const ridgeWindow = .20 + .98 * Math.exp(-Math.pow((t + .01) / .34, 2))

    for (let radial = 0; radial < MEMORY_RENDER_RING_POINTS; radial += 1) {
      const radialU = radial / MEMORY_RENDER_RING_POINTS
      const angle = radialU * Math.PI * 2
      const furrowDistance = wrappedAngleDistance(angle, furrowAngle)
      const secondaryFurrowDistance = wrappedAngleDistance(angle, secondaryFurrowAngle)
      const ridgeDistance = wrappedAngleDistance(angle, ridgeAngle)
      const furrow = Math.exp(-Math.pow(furrowDistance / .166, 2)) * Math.max(0, primaryWindow)
      const secondaryFurrow = Math.exp(-Math.pow(secondaryFurrowDistance / .250, 2)) * (.070 + .070 * shoulder) * branchWindow
      const ridge = Math.exp(-Math.pow(ridgeDistance / .285, 2)) * ridgeWindow

      const dominantMass = 1
        + .24 * Math.cos(angle - furrowAngle - .96)
        + .068 * t * Math.sin(angle + .31)
        + .055 * Math.sin(angle * 3 + t * 2.40)
        + .028 * Math.cos(angle * 5 - t * 3.10)
        + .030 * leadingCurl * Math.cos(angle - .40)
        + .145 * spineKnot * Math.cos(angle - ridgeAngle + .15)
        - .030 * counterFold * Math.sin(angle + .25)
      const tissue = 1
        + detailWindow * .036 * Math.sin(angle * 7 + t * 3.2)
        + detailWindow * .020 * Math.cos(angle * 11 - t * 2.4)
        + detailWindow * .010 * Math.sin(angle * 17 + t * 1.8)
      const longitudinalRill = detailWindow * .010 * endTaper * Math.sin(t * 5.2 + angle * 4.5)
        + detailWindow * .005 * endTaper * Math.cos(t * 3.1 - angle * 8.2)
      const asymmetricFold = .048 * endTaper * Math.sin(angle - t * 3.20 + .70)
        + .024 * endTaper * Math.sin(angle * 2.7 + t * 2.1)
        + .016 * endTaper * t * Math.cos(angle * 4.0)
        + .024 * leadingCurl * Math.sin(angle - .35)
        + .030 * foldedShoulder * Math.cos(angle + .68)
        + .058 * spineKnot * Math.sin(angle - ridgeAngle - .14)
        - .024 * counterFold * Math.cos(angle + .42)
        - .018 * counterTuck * Math.sin(angle + .20)
      const ridgeLift = .108 * endTaper * ridge * (.72 + .28 * Math.sin(t * 3.15 + .33))
      const creaseSink = .066 * endTaper * furrow * (1 + .62 * spineKnot)
      const pinch = Math.max(.47, 1 - .39 * furrow - .045 * secondaryFurrow)

      const localY = Math.cos(angle) * height * dominantMass * tissue * pinch
        + asymmetricFold
        + ridgeLift
        - creaseSink
      const localZ = Math.sin(angle) * depth * (1 + .28 * ridge + .17 * spineKnot)
        - furrow * depth * .50
        - secondaryFurrow * depth * .052
        + ridge * depth * .35
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
  // Preserve the tested V280 baseline marker as lineage while V281 is literally evaluated.
  geometry.userData.focusLiteralPixelRefinement = 'v280-lean-leading-tip-deep-waist-3d-s-gesture-tucked-counter-end-local-asymmetric-knot'
  geometry.userData.focusLiteralPixelIteration = 'v281-dominant-central-fold-dual-tension-waists-lifted-curl-downback-tuck-oblique-ridge'
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