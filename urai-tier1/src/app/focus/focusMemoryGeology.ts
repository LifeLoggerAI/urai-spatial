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
// a long smooth slab/tongue on desktop and portrait. V298 therefore changes silhouette and
// height-field structure rather than merely color: the visible footprint is materially
// narrower and shorter, the central incision is deeper/darker, one mineral lip appears in
// irregular pressure windows, the counter-side is nearly flush, and both terminals remain
// buried. The V295 closed/watertight under-grade topology is preserved unchanged in kind.
//
// The form must read as memory pressure physically held by place. It must not regress
// into a crystal crown, boulder, orb, flower, portal, ring, shell/mouth, manta, tent,
// aircraft, animal, shoe, boat, bowl, helmet, body-part silhouette, smooth blob,
// disconnected pair, card/slab, ribbon pair, tongue, or generic pickup.
const MEMORY_SECTIONS = 41
const MEMORY_CROSS_POINTS = 9

function fractureCenter(t: number) {
  const x = 1.56 * t
    + .17 * Math.sin(t * 3.12 + .18)
    + .060 * Math.sin(t * 8.6 - .31)
  const z = -1.02 * t
    + .31 * Math.sin(t * 2.34 - .48)
    + .095 * Math.sin(t * 6.1 + .66)
  return new THREE.Vector2(x, z)
}

function livingMemoryVertexColor(section: number, cross: number, t: number, lateral: number, furrow: number, ridge: number) {
  const deep = new THREE.Color().setRGB(.006, .010, .008)
  const mineral = new THREE.Color().setRGB(.105, .095, .060)
  const weathered = new THREE.Color().setRGB(.34, .225, .090)
  const warm = new THREE.Color().setRGB(.56, .225, .035)
  const edgeMineral = new THREE.Color().setRGB(.43, .30, .13)
  const centerWindow = 1 - Math.min(1, Math.abs(t))
  const age = .5 + .5 * Math.sin(section * .51 + cross * .79)
  const edge = THREE.MathUtils.smoothstep(Math.abs(lateral), .44, 1)
  const color = deep.clone()
    .lerp(mineral, .30 + .15 * age)
    .lerp(weathered, .07 + .11 * centerWindow)
  if (furrow > .2) color.lerp(deep, .74 + .18 * furrow)
  if (ridge > .16) color.lerp(edgeMineral, .32 + .26 * ridge)
  color.lerp(warm, .07 * centerWindow * ridge)
  color.lerp(deep, edge * .30)
  color.r = Math.min(.54, color.r)
  color.g = Math.min(.36, color.g)
  color.b = Math.min(.17, color.b)
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
    const before = fractureCenter(Math.max(-1, t - .018))
    const after = fractureCenter(Math.min(1, t + .018))
    const tangent = after.clone().sub(before).normalize()
    const side = new THREE.Vector2(-tangent.y, tangent.x)

    const endFade = Math.pow(Math.max(0, Math.sin(u * Math.PI)), .50)
    const terminalSink = THREE.MathUtils.smoothstep(Math.abs(t), .66, 1) * .34
    const centralScar = Math.exp(-Math.pow((t + .04) / .36, 2))
    const nearPressure = Math.exp(-Math.pow((t + .40) / .19, 2))
    const farPressure = Math.exp(-Math.pow((t - .30) / .22, 2))
    const brokenKnot = Math.exp(-Math.pow((t - .02) / .14, 2))
    const pulse = .5 + .5 * Math.sin(t * 12.9 + .62)
    const pressureWindow = .34 + .66 * Math.pow(.5 + .5 * Math.sin(t * 10.8 + .35), 1.55)
    const baseHalfWidth = (.155 + .072 * centralScar + .040 * nearPressure + .022 * farPressure) * (.40 + .60 * endFade)
    const centerY = -1.255
      + .014 * Math.sin(t * 5.4)
      + .010 * Math.sin(t * 12.7 + .4)
      - terminalSink

    for (let cross = 0; cross < MEMORY_CROSS_POINTS; cross += 1) {
      const crossU = cross / (MEMORY_CROSS_POINTS - 1)
      const lateral = THREE.MathUtils.lerp(-1, 1, crossU)
      const absLateral = Math.abs(lateral)
      const jaggedEdge = 1
        + .20 * Math.sin(section * 1.81 + (lateral < 0 ? .4 : 2.1))
        + .11 * Math.sin(section * 3.47 + cross * .91)
      const halfWidth = baseHalfWidth * (absLateral > .52 ? jaggedEdge : 1)
      const furrowCenter = .10 * Math.sin(t * 3.65 + .28) - .045 * nearPressure + .030 * farPressure
      const furrow = Math.exp(-Math.pow((lateral - furrowCenter) / .115, 2)) * (.68 + .32 * centralScar)
      const dominantLipCenter = -.43 + .10 * Math.sin(t * 3.1 - .25)
      const counterLipCenter = .40 + .05 * Math.sin(t * 4.4 + .7)
      const dominantLip = Math.exp(-Math.pow((lateral - dominantLipCenter) / .115, 2))
        * pressureWindow
        * (.28 + .72 * nearPressure + .38 * centralScar)
      const counterLip = Math.exp(-Math.pow((lateral - counterLipCenter) / .14, 2))
        * (.025 + .075 * farPressure + .045 * brokenKnot)
      const ridge = Math.max(dominantLip, counterLip)
      const edgeSink = THREE.MathUtils.smoothstep(absLateral, .50, 1) * (.10 + .055 * endFade)
      const micro = (.018 * Math.sin(section * 2.71 + cross * 1.27)
        + .010 * Math.cos(section * 4.33 - cross * .83)) * endFade
      const scarCore = Math.exp(-Math.pow((lateral - furrowCenter) / .44, 2))
      const minimalContinuity = scarCore * (
        .075 * centralScar
        + .034 * nearPressure
        + .018 * farPressure
      )
      const localBuckling = .035 * Math.sin(t * 8.1 + lateral * 2.8 + .55)
        * centralScar * (1 - .65 * absLateral)

      // V298 deliberately avoids a broad raised panel. Most of the top stays at or below
      // sanctuary grade; the deep dark incision and one discontinuous lip carry the read.
      const y = centerY
        + minimalContinuity
        - .175 * furrow
        + .205 * dominantLip
        + .012 * counterLip
        + .010 * pulse * dominantLip
        + localBuckling
        + micro
        - edgeSink
      const lateralDistance = lateral * halfWidth
      const edgeBreak = absLateral > .55
        ? .050 * Math.sin(section * 2.19 + cross * 1.43)
        : .010 * Math.sin(section * 1.41 + cross * .59) * absLateral
      const x = center.x + side.x * (lateralDistance + edgeBreak)
      const z = center.y + side.y * (lateralDistance + edgeBreak)

      positions.push(x, y, z)
      uvs.push(crossU, u)
      const color = livingMemoryVertexColor(section, cross, t, lateral, furrow, ridge)
      colors.push(color.r, color.g, color.b)
    }
  }

  const topVertexCount = positions.length / 3
  const bottomOffset = topVertexCount

  // Watertight closure remains physically present but buried enough that it cannot become
  // a portable slab silhouette. The visual event is the scar at grade, not its underside.
  for (let vertex = 0; vertex < topVertexCount; vertex += 1) {
    const i = vertex * 3
    const uv = vertex * 2
    positions.push(positions[i], positions[i + 1] - .18, positions[i + 2])
    colors.push(colors[i] * .38, colors[i + 1] * .38, colors[i + 2] * .38)
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
  geometry.userData.focusMemoryEnergy = 'weathered-mineral-restrained-warm-cool-response'
  geometry.userData.focusLiteralPixelRepair = 'v272-no-crystal-crown-no-card-stack'
  geometry.userData.focusSilhouetteRule = 'one-closed-ground-owned-scar-no-split-pair-no-portable-outline'
  geometry.userData.focusSurfaceDensity = `${MEMORY_SECTIONS}x${MEMORY_CROSS_POINTS}-closed-ground-scar-volume`
  geometry.userData.focusLiteralPixelSuccessorV294 = 'v294-continuous-open-sanctuary-scar-jagged-edges-dark-furrow-asymmetric-lips'
  geometry.userData.focusLiteralPixelSuccessorV295 = 'v295-closed-watertight-scar-ribbon-buried-underside-sides-caps-asymmetric-lips'
  geometry.userData.focusLiteralPixelSuccessorV296 = 'v296-interior-continuity-lift-buried-edges-closed-scar-volume'
  geometry.userData.focusLiteralPixelSuccessorV297 = 'v297-off-axis-s-fracture-shallow-meandering-furrow-one-dominant-lip-portrait-legibility'
  geometry.userData.focusLiteralPixelSuccessorV298 = 'v298-narrow-short-deep-incision-broken-dominant-lip-counter-side-buried-no-panel'
  geometry.userData.focusVisualAuthority = 'v295-sanctuary-memory-scar-volume'
  geometry.userData.focusCurrentVisualAuthority = 'v298-narrow-broken-ground-held-memory-scar'
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