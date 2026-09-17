import * as THREE from 'three'

// V272 established one connected living-memory phenomenon rather than cards, shards,
// a sphere, or a generic pickup. V290 still read as a portable shoe/boat/shell. V291
// became a raised arch / manta / ramp. V292 buried the closed tube until the memory event
// nearly vanished. V293 locally re-exposed that tube, but exact retained pixels still
// failed to give the scar enough visual authority. V294 proved a continuous scar-ribbon
// direction can remove the split-pair read, but it weakened the locked release contract
// by making the manifestation an open surface with no underside or terminal closure.
//
// V295 keeps the useful V294 top-surface language while restoring the non-negotiable
// topology: one connected CLOSED volumetric manifestation. The visible top remains a
// ground-owned jagged scar with a dark longitudinal furrow and asymmetric mineral lips;
// its thin underside, side walls, and terminal caps are deliberately buried below grade
// so closure cannot become a portable slab, shell, card, arch, or collectible silhouette.
//
// V296 restored rendered continuity but retained pixels read as broad parallel ribbons.
// V297 removed the split-pair read but exposed too much continuous top surface, producing
// a long smooth slab/tongue on desktop and portrait. V298 narrowed the event, but retained
// pixels still read as a small cool-blue ribbon/leaf/fish sitting on the sanctuary floor.
// V299 changes ownership, not merely silhouette: the visible event is a broader readable
// DARK MINERAL FISSURE at grade. The central incision stays just above the authored ground
// so it cannot disappear behind the sanctuary mesh, the outer edges sink into grade, only
// one broken lip rises modestly in irregular pressure windows, and warmer mineral albedo
// survives the higher-level neutral material multiplier and cool selected-memory lights.
//
// V300 responds to exact V299 pixels, where the fixed local Y plane intersected the real
// eroded sanctuary at different heights and produced one left strip plus detached islands;
// portrait then buried the manifestation another .28 units. V300 seats every visible vertex
// against the SAME sanctuary-height equation for both desktop and portrait transforms, keeps
// the central incision continuously readable just above grade, removes the portrait bury
// offset, narrows the footprint, and reduces cool emissive contamination. One continuous
// ground-owned fissure must survive both viewport families; disconnected islands are failure.
//
// V301 responds to literal V300 pixels: terrain seating removed detached islands, but the
// continuous raised brown surface still read as a rope/ribbon object. V301 collapses the
// visible footprint to crack scale, shortens the run, keeps the dark incision at grade,
// raises only intermittent mineral crust on one side, suppresses the counter-side, and
// removes meaningful cast-shadow ownership. The first read must be a fissure IN the place,
// never a strip laid ON the place.
//
// V302 responds to retained V301 pixels: crack scale and terrain seating are correct, but
// the whole visible skin still rides about .03 above grade and the dominant crust can lift
// about .07 more, so silhouette reads as a dark rope/worm laid on the floor. V302 makes the
// continuously readable event a hairline near-grade incision, thresholds the one-sided crust
// into genuinely broken pressure windows, and reduces crust amplitude so ground owns silhouette.
// Closed V295 underside/side/cap topology remains buried and unchanged.
//
// V303 removes the remaining structural mismatch exposed by V302 pixels. The selected
// memory now uses one fixed world transform on every viewport and calls the exact same
// exported sanctuary ground-height function used by the terrain mesh. There is no
// desktop/portrait max-height proxy. The crack core receives only a near-zero reveal,
// while lateral edges and terminal closure remain below the exact local grade.
//
// V304 responds to exact V303 pixels: even exact grade alignment left a continuous top face
// that first-read as a twig/seam. The V295 closed body is therefore buried completely below
// grade while a separate zero-thickness, ground-conforming incision skin carries the visible
// dark crack. The skin has no volume, no shadow ownership and no emissive glow; it samples
// the same canonical ground function at every vertex and is polygon-offset only at material
// time to prevent z-fighting. The place now owns the visible event while the buried closed
// volume preserves the non-negotiable topology contract underneath.
//
// The form must read as memory pressure physically held by place. It must not regress
// into a crystal crown, boulder, orb, flower, portal, ring, shell/mouth, manta, tent,
// aircraft, animal, shoe, boat, bowl, helmet, body-part silhouette, smooth blob,
// disconnected pair, card/slab, ribbon pair, rope, tongue, leaf, fish, or generic pickup.
const MEMORY_SECTIONS = 45
const MEMORY_CROSS_POINTS = 9

function fractureCenter(t: number) {
  const x = 1.24 * t
    + .13 * Math.sin(t * 3.08 + .18)
    + .055 * Math.sin(t * 8.9 - .31)
  const z = -.78 * t
    + .23 * Math.sin(t * 2.31 - .48)
    + .075 * Math.sin(t * 6.35 + .66)
  return new THREE.Vector2(x, z)
}

export const FOCUS_MEMORY_WORLD_X = .15
export const FOCUS_MEMORY_WORLD_Z = -1.56

export function focusGroundHeight(x: number, z: number) {
  const side = Math.pow(Math.max(0, (Math.abs(x) - 4.2) / 10.8), 1.7) * 8.5
  const weather = 0.18 * Math.sin(x * 0.64 + z * 0.23)
    + 0.08 * Math.sin(x * 1.73 - z * 0.82)
    + 0.038 * Math.cos(x * 4.1 + z * 2.7)
  const threshold = 0.48 * Math.exp(-((x + 3.8) ** 2 / 18 + (z + 3.4) ** 2 / 28))
  const archive = 0.72 * Math.exp(-((x - 5.1) ** 2 / 14 + (z + 8.8) ** 2 / 22))
  const bank = THREE.MathUtils.smoothstep(Math.abs(x), 4.2, 5.8)
    * 2.1
    * Math.exp(-((Math.abs(x) - 6.1) ** 2 / 10))
    * THREE.MathUtils.smoothstep(-z, 5.5, 12.5)
  return -1.5 + side + weather + threshold + archive + bank
}

function livingMemoryVertexColor(section: number, cross: number, t: number, lateral: number, furrow: number, ridge: number) {
  const deep = new THREE.Color().setRGB(.012, .006, .003)
  const mineral = new THREE.Color().setRGB(.30, .18, .065)
  const weathered = new THREE.Color().setRGB(.58, .34, .10)
  const warm = new THREE.Color().setRGB(.78, .36, .055)
  const edgeMineral = new THREE.Color().setRGB(.64, .40, .13)
  const centerWindow = 1 - Math.min(1, Math.abs(t))
  const age = .5 + .5 * Math.sin(section * .49 + cross * .83)
  const edge = THREE.MathUtils.smoothstep(Math.abs(lateral), .50, 1)
  const color = deep.clone()
    .lerp(mineral, .48 + .18 * age)
    .lerp(weathered, .10 + .13 * centerWindow)
  if (furrow > .2) color.lerp(deep, .88 + .08 * furrow)
  if (ridge > .12) color.lerp(edgeMineral, .42 + .28 * ridge)
  color.lerp(warm, .10 * centerWindow * ridge)
  color.lerp(deep, edge * .38)
  color.r = Math.min(.76, color.r)
  color.g = Math.min(.44, color.g)
  color.b = Math.min(.15, color.b)
  return color
}

function createLivingMemoryFold() {
  const positions: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let section = 0; section < MEMORY_SECTIONS; section += 1) {
    const u = section / (MEMORY_SECTIONS - 1)
    const t = THREE.MathUtils.lerp(-1, 1, u)
    const center = fractureCenter(t)
    const before = fractureCenter(Math.max(-1, t - .016))
    const after = fractureCenter(Math.min(1, t + .016))
    const tangent = after.clone().sub(before).normalize()
    const side = new THREE.Vector2(-tangent.y, tangent.x)

    const endFade = Math.pow(Math.max(0, Math.sin(u * Math.PI)), .46)
    const terminalSink = THREE.MathUtils.smoothstep(Math.abs(t), .70, 1) * .30
    const centralScar = Math.exp(-Math.pow((t + .04) / .40, 2))
    const nearPressure = Math.exp(-Math.pow((t + .41) / .20, 2))
    const farPressure = Math.exp(-Math.pow((t - .31) / .23, 2))
    const brokenKnot = Math.exp(-Math.pow((t - .01) / .15, 2))
    const pulse = .5 + .5 * Math.sin(t * 12.7 + .62)
    const pressureWave = .5 + .5 * Math.sin(t * 10.5 + .38)
    const pressureWindow = THREE.MathUtils.smoothstep(pressureWave, .56, .84)
    const baseHalfWidth = (.055 + .022 * centralScar + .013 * nearPressure + .008 * farPressure) * (.42 + .58 * endFade)

    for (let cross = 0; cross < MEMORY_CROSS_POINTS; cross += 1) {
      const crossU = cross / (MEMORY_CROSS_POINTS - 1)
      const lateral = THREE.MathUtils.lerp(-1, 1, crossU)
      const absLateral = Math.abs(lateral)
      const jaggedEdge = 1
        + .32 * Math.sin(section * 1.79 + (lateral < 0 ? .4 : 2.1))
        + .18 * Math.sin(section * 3.51 + cross * .93)
      const halfWidth = baseHalfWidth * (absLateral > .50 ? jaggedEdge : 1)
      const furrowCenter = .11 * Math.sin(t * 3.75 + .28) - .050 * nearPressure + .032 * farPressure
      const furrow = Math.exp(-Math.pow((lateral - furrowCenter) / .10, 2)) * (.72 + .28 * centralScar)
      const dominantLipCenter = -.50 + .12 * Math.sin(t * 3.0 - .25)
      const counterLipCenter = .43 + .05 * Math.sin(t * 4.5 + .7)
      const dominantLip = Math.exp(-Math.pow((lateral - dominantLipCenter) / .085, 2))
        * pressureWindow
        * (.26 + .70 * nearPressure + .34 * centralScar)
      const counterLip = Math.exp(-Math.pow((lateral - counterLipCenter) / .13, 2))
        * (.012 + .045 * farPressure + .025 * brokenKnot)
      const ridge = Math.max(dominantLip, counterLip)
      const edgeSink = THREE.MathUtils.smoothstep(absLateral, .48, 1) * (.070 + .038 * endFade)
      const micro = (.015 * Math.sin(section * 2.73 + cross * 1.29)
        + .009 * Math.cos(section * 4.39 - cross * .81)) * endFade
      const scarCore = Math.exp(-Math.pow((lateral - furrowCenter) / .42, 2))
      const minimalContinuity = scarCore * (
        .022 * centralScar
        + .010 * nearPressure
        + .006 * farPressure
      )
      const localBuckling = .020 * Math.sin(t * 8.2 + lateral * 2.9 + .55)
        * centralScar * (1 - .68 * absLateral)

      // V303 samples the exact sanctuary grade at the fixed world-space aperture transform.
      const lateralDistance = lateral * halfWidth
      const edgeBreak = absLateral > .54
        ? .042 * Math.sin(section * 2.23 + cross * 1.47)
        : .008 * Math.sin(section * 1.39 + cross * .61) * absLateral
      const x = center.x + side.x * (lateralDistance + edgeBreak)
      const z = center.y + side.y * (lateralDistance + edgeBreak)
      const groundY = focusGroundHeight(FOCUS_MEMORY_WORLD_X + x, FOCUS_MEMORY_WORLD_Z + z)
      const incisionReveal = .004 + .0015 * centralScar
      const burialDepth = .060
      const y = groundY
        - burialDepth
        + incisionReveal * .05
        + minimalContinuity * .012
        - .0015 * furrow
        + .002 * dominantLip
        + .0001 * counterLip
        + .0002 * pulse * dominantLip
        + localBuckling * .008
        + micro * .010
        - edgeSink * .52
        - terminalSink * .62

      positions.push(x, y, z)
      uvs.push(crossU, u)
      const color = livingMemoryVertexColor(section, cross, t, lateral, furrow, ridge)
      colors.push(color.r, color.g, color.b)
    }
  }

  const topVertexCount = positions.length / 3
  const bottomOffset = topVertexCount

  // Watertight closure remains physically present but buried enough that it cannot become
  // a portable slab silhouette. The visual event is the fissure at grade, not its underside.
  for (let vertex = 0; vertex < topVertexCount; vertex += 1) {
    const i = vertex * 3
    const uv = vertex * 2
    positions.push(positions[i], positions[i + 1] - .18, positions[i + 2])
    colors.push(colors[i] * .32, colors[i + 1] * .32, colors[i + 2] * .32)
    uvs.push(uvs[uv], uvs[uv + 1])
  }

  for (let section = 0; section < MEMORY_SECTIONS - 1; section += 1) {
    const row = section * MEMORY_CROSS_POINTS
    const nextRow = (section + 1) * MEMORY_CROSS_POINTS
    for (let cross = 0; cross < MEMORY_CROSS_POINTS - 1; cross += 1) {
      const a = row + cross
      const b = row + cross + 1
      const c = nextRow + cross
      const d = nextRow + cross + 1
      indices.push(a, b, c, b, d, c)
      indices.push(a + bottomOffset, c + bottomOffset, b + bottomOffset, b + bottomOffset, c + bottomOffset, d + bottomOffset)
    }
  }

  for (let section = 0; section < MEMORY_SECTIONS - 1; section += 1) {
    const row = section * MEMORY_CROSS_POINTS
    const nextRow = (section + 1) * MEMORY_CROSS_POINTS
    const leftA = row
    const leftB = nextRow
    const rightA = row + MEMORY_CROSS_POINTS - 1
    const rightB = nextRow + MEMORY_CROSS_POINTS - 1
    indices.push(leftA, leftB, leftA + bottomOffset, leftB, leftB + bottomOffset, leftA + bottomOffset)
    indices.push(rightA, rightA + bottomOffset, rightB, rightB, rightA + bottomOffset, rightB + bottomOffset)
  }

  const endRow = (MEMORY_SECTIONS - 1) * MEMORY_CROSS_POINTS
  for (let cross = 0; cross < MEMORY_CROSS_POINTS - 1; cross += 1) {
    const startA = cross
    const startB = cross + 1
    indices.push(startA, startA + bottomOffset, startB, startB, startA + bottomOffset, startB + bottomOffset)

    const endA = endRow + cross
    const endB = endRow + cross + 1
    indices.push(endA, endB, endA + bottomOffset, endB, endB + bottomOffset, endA + bottomOffset)
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
  geometry.userData.focusMemoryTopology = 'v295-closed-ground-fused-scar-volume-with-buried-closure'
  geometry.userData.focusMemoryEnergy = 'weathered-warm-mineral-dark-fissure-response'
  geometry.userData.focusLiteralPixelRepair = 'v272-no-crystal-crown-no-card-stack'
  geometry.userData.focusSilhouetteRule = 'one-closed-ground-owned-fissure-no-split-pair-no-portable-outline'
  geometry.userData.focusSurfaceDensity = `${MEMORY_SECTIONS}x${MEMORY_CROSS_POINTS}-closed-ground-fissure-volume`
  geometry.userData.focusLiteralPixelSuccessorV294 = 'v294-continuous-open-sanctuary-scar-jagged-edges-dark-furrow-asymmetric-lips'
  geometry.userData.focusLiteralPixelSuccessorV295 = 'v295-closed-watertight-scar-ribbon-buried-underside-sides-caps-asymmetric-lips'
  geometry.userData.focusLiteralPixelSuccessorV296 = 'v296-interior-continuity-lift-buried-edges-closed-scar-volume'
  geometry.userData.focusLiteralPixelSuccessorV297 = 'v297-off-axis-s-fracture-shallow-meandering-furrow-one-dominant-lip-portrait-legibility'
  geometry.userData.focusLiteralPixelSuccessorV298 = 'v298-narrow-short-deep-incision-broken-dominant-lip-counter-side-buried-no-panel'
  geometry.userData.focusLiteralPixelSuccessorV299 = 'v299-ground-grade-dark-mineral-fissure-readable-footprint-warm-broken-lip-no-blue-object'
  geometry.userData.focusLiteralPixelSuccessorV300 = 'v300-terrain-seated-continuous-dark-mineral-fissure-desktop-portrait-no-islands'
  geometry.userData.focusLiteralPixelSuccessorV301 = 'v301-crack-scale-dark-incision-intermittent-mineral-crust-no-raised-strip'
  geometry.userData.focusLiteralPixelSuccessorV302 = 'v302-grade-flush-hairline-incision-fragmented-low-crust-ground-owned-silhouette'
  geometry.userData.focusLiteralPixelSuccessorV303 = 'v303-shared-world-exact-grade-dark-crack-buried-closure-no-viewport-lift'
  geometry.userData.focusLiteralPixelSuccessorV304 = 'v304-buried-closed-body-coplanar-ground-incision-no-object-edge'
  geometry.userData.focusVisualAuthority = 'v295-sanctuary-memory-scar-volume'
  geometry.userData.focusCurrentVisualAuthority = 'v304-ground-owned-coplanar-incision-buried-closed-body'
  return geometry
}

export function createFocusStrata() {
  return [createLivingMemoryFold()]
}

const INCISION_CROSS_POINTS = 5

export function createFocusGroundIncision() {
  const positions: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const edgeColor = new THREE.Color().setRGB(.080, .066, .045)
  const innerColor = new THREE.Color().setRGB(.012, .006, .004)

  for (let section = 0; section < MEMORY_SECTIONS; section += 1) {
    const u = section / (MEMORY_SECTIONS - 1)
    const t = THREE.MathUtils.lerp(-1, 1, u)
    const center = fractureCenter(t)
    const before = fractureCenter(Math.max(-1, t - .018))
    const after = fractureCenter(Math.min(1, t + .018))
    const tangent = after.clone().sub(before).normalize()
    const side = new THREE.Vector2(-tangent.y, tangent.x)
    const endFade = Math.pow(Math.max(0, Math.sin(u * Math.PI)), .55)
    const centralScar = Math.exp(-Math.pow((t + .05) / .38, 2))
    const halfWidth = (.034 + .014 * centralScar) * (.12 + .88 * endFade)

    for (let cross = 0; cross < INCISION_CROSS_POINTS; cross += 1) {
      const crossU = cross / (INCISION_CROSS_POINTS - 1)
      const lateral = THREE.MathUtils.lerp(-1, 1, crossU)
      const edgeJitter = Math.abs(lateral) > .55
        ? .010 * Math.sin(section * 2.47 + cross * 1.31)
        : .0025 * Math.sin(section * 1.71 + cross * .83) * Math.abs(lateral)
      const lateralDistance = lateral * halfWidth + edgeJitter
      const x = center.x + side.x * lateralDistance
      const z = center.y + side.y * lateralDistance
      const y = focusGroundHeight(FOCUS_MEMORY_WORLD_X + x, FOCUS_MEMORY_WORLD_Z + z) + .00035
      positions.push(x, y, z)
      uvs.push(crossU, u)
      const core = Math.exp(-Math.pow(lateral / .34, 2))
      const color = edgeColor.clone().lerp(innerColor, .36 + .64 * core)
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let section = 0; section < MEMORY_SECTIONS - 1; section += 1) {
    const row = section * INCISION_CROSS_POINTS
    const nextRow = (section + 1) * INCISION_CROSS_POINTS
    for (let cross = 0; cross < INCISION_CROSS_POINTS - 1; cross += 1) {
      const a = row + cross
      const b = row + cross + 1
      const c = nextRow + cross
      const d = nextRow + cross + 1
      indices.push(a, b, c, b, d, c)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  geometry.userData.focusIncisionAuthority = 'v304-coplanar-ground-owned-dark-incision'
  geometry.userData.focusIncisionTopology = 'zero-thickness-open-visual-skin-over-buried-v295-closed-authority'
  geometry.userData.focusIncisionRule = 'no-raised-edge-no-shadow-no-emissive-no-portable-silhouette'
  return geometry
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
