import * as THREE from 'three'

// V272 established one connected living-memory phenomenon rather than cards, shards,
// a sphere, or a generic pickup. V290 still read as a portable shoe/boat/shell. V291
// buried its terminals, but literal desktop and phone pixels still collapsed into a
// detached smooth arch / manta / ramp silhouette.
//
// V292 removes the remaining object read by changing the visible topology from a raised
// closed arch into a long, shallow sanctuary fracture. Most of the connected volume now
// intersects the authored ground plane. Only irregular scar lips, broken mineral ridges,
// and a dark central furrow remain above/at grade. Both ends continue below grade so the
// eye cannot find a bow/stern, head/tail, shell edge, or collectible silhouette.
//
// The form must read as memory pressure physically held by place: a weathered scar in
// the sanctuary, not an object placed on top of it. It must not regress into a crystal
// crown, boulder, orb, flower, portal, ring, shell/mouth, manta, tent, aircraft, animal,
// shoe, boat, bowl, helmet, body-part silhouette, smooth blob, or generic pickup.
const MEMORY_SECTIONS = 21
const MEMORY_RING_POINTS = 12
const MEMORY_SURFACE_DETAIL = 4
const MEMORY_RENDER_SECTIONS = (MEMORY_SECTIONS - 1) * MEMORY_SURFACE_DETAIL + 1
const MEMORY_RENDER_RING_POINTS = MEMORY_RING_POINTS * MEMORY_SURFACE_DETAIL

function wrappedAngleDistance(a: number, b: number) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))
}

function livingMemoryVertexColor(section: number, radial: number, t: number, furrow: number, ridge: number, burial: number) {
  const deep = new THREE.Color().setRGB(.018, .027, .022)
  const mineral = new THREE.Color().setRGB(.145, .165, .128)
  const weathered = new THREE.Color().setRGB(.30, .235, .135)
  const warm = new THREE.Color().setRGB(.49, .235, .065)
  const litMineral = new THREE.Color().setRGB(.43, .39, .25)
  const phase = .5 + .5 * Math.sin(section * .27 + radial * .41)
  const strata = .5 + .5 * Math.sin(section * .81 + radial * .37)
  const center = 1 - Math.min(1, Math.abs(t))
  const color = deep.clone()
    .lerp(mineral, .46 + .16 * phase)
    .lerp(weathered, .14 + .18 * center)
  if (furrow > .16) color.lerp(deep, .40 + furrow * .34)
  if (ridge > .20) color.lerp(litMineral, .12 + ridge * .17)
  color.lerp(warm, .065 * strata * center + .055 * ridge)
  color.lerp(deep, burial * .52)
  color.r = Math.min(.58, color.r)
  color.g = Math.min(.46, color.g)
  color.b = Math.min(.28, color.b)
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
    const endTaper = Math.pow(Math.max(0, Math.sin(u * Math.PI)), .70)
    const terminalBurial = THREE.MathUtils.smoothstep(Math.abs(t), .62, 1)
    const centralScar = Math.exp(-Math.pow((t + .05) / .34, 2))
    const nearRidge = Math.exp(-Math.pow((t + .42) / .19, 2))
    const farRidge = Math.exp(-Math.pow((t - .36) / .23, 2))
    const brokenKnot = Math.exp(-Math.pow((t - .02) / .13, 2))
    const fracturePulse = .5 + .5 * Math.sin(t * 13.2 + .7)
    const detailWindow = .16 + .84 * endTaper

    // Long diagonal fracture with no readable terminal silhouette. Its centerline
    // remains essentially at sanctuary grade while the final thirds sink below it.
    const centerX = 2.55 * t
      + .20 * Math.sin(t * 3.15 + .18)
      + .075 * Math.sin(t * 8.20 - .32)
      - .055 * brokenKnot
    const centerZ = -.58 * t
      + .30 * Math.sin(t * 2.30 - .52)
      + .11 * Math.sin(t * 5.70 + .63)
      - .08 * centralScar
    const centerY = -1.48
      + .018 * Math.sin(t * 9.1)
      + .028 * centralScar
      + .018 * nearRidge
      - .012 * farRidge
      - .34 * terminalBurial

    // V292 is intentionally shallow. Height no longer creates a closed arch; depth
    // and longitudinal extent carry the shape while scar lips barely rise above grade.
    const height = .010 + endTaper * (
      .020
      + .032 * centralScar
      + .022 * nearRidge
      + .015 * farRidge
      + .018 * fracturePulse
    )
    const depth = .075 + endTaper * (
      .13
      + .045 * centralScar
      + .030 * nearRidge
      + .025 * farRidge
    )
    const twist = .18 * t
      + .31 * Math.sin(t * 1.92 + .31)
      + .12 * nearRidge
      - .15 * farRidge

    const furrowAngle = -.52 + .58 * t - twist + .14 * Math.sin(t * 3.4)
    const ridgeAngle = furrowAngle + Math.PI * .72
    const counterRidgeAngle = furrowAngle - Math.PI * .58
    const scarWindow = .28 + .94 * centralScar + .28 * nearRidge + .16 * fracturePulse

    for (let radial = 0; radial < MEMORY_RENDER_RING_POINTS; radial += 1) {
      const radialU = radial / MEMORY_RENDER_RING_POINTS
      const angle = radialU * Math.PI * 2
      const furrowDistance = wrappedAngleDistance(angle, furrowAngle)
      const ridgeDistance = wrappedAngleDistance(angle, ridgeAngle)
      const counterRidgeDistance = wrappedAngleDistance(angle, counterRidgeAngle)
      const furrow = Math.exp(-Math.pow(furrowDistance / .16, 2)) * scarWindow
      const ridge = Math.exp(-Math.pow(ridgeDistance / .20, 2)) * (.22 + .72 * centralScar + .48 * nearRidge)
      const counterRidge = Math.exp(-Math.pow(counterRidgeDistance / .25, 2)) * (.10 + .42 * farRidge)

      const crag = 1
        + detailWindow * .13 * Math.sin(angle * 3 + t * 6.4)
        + detailWindow * .070 * Math.cos(angle * 5 - t * 4.7)
        + detailWindow * .032 * Math.sin(angle * 9 + t * 3.1)
      const brokenEdge = detailWindow * (
        .018 * Math.sin(angle * 7.0 + t * 11.0)
        + .012 * Math.cos(angle * 11.0 - t * 7.0)
      )
      const localY = Math.cos(angle) * height * crag
        + brokenEdge
        + .054 * ridge
        + .025 * counterRidge
        - .092 * furrow
      const localZ = Math.sin(angle) * depth * crag
        + .040 * ridge
        - .030 * counterRidge
        - .095 * furrow

      // Most of the underside is forced below grade, so there is no detached dark
      // oval shadow or continuous lower contour for the eye to read as a portable form.
      const undersideSink = Math.max(0, -Math.cos(angle)) * (.055 + .055 * endTaper)
      const edgeSink = terminalBurial * (.22 + .11 * (.5 + .5 * Math.sin(angle + t * 4.6)))
      const x = centerX
        + localZ * .34
        + localY * .05
        + .018 * ridge
      const y = centerY
        + localY
        - undersideSink
        - edgeSink
      const z = centerZ
        + localZ
        + localY * .10
        - .045 * furrow

      positions.push(x, y, z)
      uvs.push(radialU, u)
      const color = livingMemoryVertexColor(section, radial, t, furrow, Math.max(ridge, counterRidge), terminalBurial)
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
  const endCap = startCap + 1
  positions.push(-2.70, -1.98, .52)
  colors.push(.012, .019, .015)
  uvs.push(.5, 0)
  positions.push(2.67, -1.99, -.60)
  colors.push(.012, .019, .015)
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
  geometry.userData.focusMemoryTopology = 'v292-ground-intersecting-longitudinal-fracture-with-deep-furrow'
  geometry.userData.focusMemoryEnergy = 'weathered-mineral-restrained-warm-cool-response'
  geometry.userData.focusLiteralPixelRepair = 'v272-no-crystal-crown-no-card-stack'
  geometry.userData.focusSilhouetteRule = 'ground-held-fracture-not-portable-object'
  geometry.userData.focusSurfaceDensity = `${MEMORY_RENDER_SECTIONS}x${MEMORY_RENDER_RING_POINTS}-continuous-tactile-surface`
  geometry.userData.focusLiteralPixelSuccessorV292 = 'v292-shallow-ground-fracture-buried-ends-broken-scar-lips-no-closed-arch'
  geometry.userData.focusVisualAuthority = 'v292-sanctuary-memory-fracture'
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
