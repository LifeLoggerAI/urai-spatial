import * as THREE from 'three'

// V272 literal-pixel repair established the selected-memory manifestation as one
// continuous, closed living-memory fold rather than cards, shards, a sphere, or a
// generic game pickup. That lineage remains the semantic contract.
//
// V290 passed mechanical proof but literal desktop and phone pixels still read as a
// small portable shoe / boat / shell-like object sitting on the sanctuary floor.
// V291 removes the portable-object silhouette at the geometry source. Both terminals
// now descend below the authored ground plane, the visible mass stretches into a
// diagonal ground-fused seam, and the primary visual event becomes a deep longitudinal
// furrow with broken asymmetric ridges rising out of the sanctuary instead of a closed
// collectible-shaped outline. The memory remains one connected phenomenon, but its
// visible boundary is deliberately incomplete because the ends disappear into place.
//
// The form must read as memory matter held by the world: grounded, scarred, irregular,
// tactile and non-anatomical. It must not regress into a crystal crown, boulder, orb,
// flower, portal, ring, shell/mouth, manta, tent, aircraft, animal, shoe, boat, bowl,
// helmet, body-part silhouette, smooth blob, or generic pickup.
const MEMORY_SECTIONS = 15
const MEMORY_RING_POINTS = 12
const MEMORY_SURFACE_DETAIL = 4
const MEMORY_RENDER_SECTIONS = (MEMORY_SECTIONS - 1) * MEMORY_SURFACE_DETAIL + 1
const MEMORY_RENDER_RING_POINTS = MEMORY_RING_POINTS * MEMORY_SURFACE_DETAIL

function wrappedAngleDistance(a: number, b: number) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))
}

function livingMemoryVertexColor(section: number, radial: number, t: number, furrow: number, ridge: number, burial: number) {
  const deep = new THREE.Color().setRGB(.028, .040, .031)
  const mineral = new THREE.Color().setRGB(.20, .25, .20)
  const weathered = new THREE.Color().setRGB(.40, .30, .17)
  const warm = new THREE.Color().setRGB(.62, .31, .09)
  const litMineral = new THREE.Color().setRGB(.58, .52, .34)
  const phase = .5 + .5 * Math.sin(section * .31 + radial * .37)
  const strata = .5 + .5 * Math.sin(section * .86 + radial * .41)
  const center = 1 - Math.min(1, Math.abs(t))
  const color = deep.clone()
    .lerp(mineral, .48 + .18 * phase)
    .lerp(weathered, .18 + .22 * center)
  if (furrow > .18) color.lerp(deep, .30 + furrow * .34)
  if (ridge > .24) color.lerp(litMineral, .16 + ridge * .18)
  color.lerp(warm, .10 * strata * center + .08 * ridge)
  color.lerp(deep, burial * .42)
  color.r = Math.min(.78, color.r)
  color.g = Math.min(.64, color.g)
  color.b = Math.min(.42, color.b)
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
    const endTaper = Math.pow(Math.max(0, Math.sin(u * Math.PI)), .78)
    const terminalBurial = THREE.MathUtils.smoothstep(Math.abs(t), .56, 1)
    const centralScar = Math.exp(-Math.pow((t + .07) / .30, 2))
    const nearRidge = Math.exp(-Math.pow((t + .34) / .18, 2))
    const farRidge = Math.exp(-Math.pow((t - .29) / .21, 2))
    const brokenKnot = Math.exp(-Math.pow((t - .02) / .16, 2))
    const detailWindow = .22 + .78 * endTaper

    // A diagonal seam in x/z space. The visible ends are not terminals: they are
    // buried continuations, so the eye reads an event in the ground rather than an
    // isolated object with a nose/tail or bow/stern.
    const centerX = 1.44 * t
      + .13 * Math.sin(t * 3.30 + .20)
      + .060 * Math.sin(t * 7.10 - .35)
      - .08 * brokenKnot
    const centerZ = -.42 * t
      + .24 * Math.sin(t * 2.18 - .45)
      + .095 * Math.sin(t * 5.30 + .70)
      - .12 * centralScar
    const centerY = -1.34
      + .36 * centralScar
      + .18 * nearRidge
      + .11 * farRidge
      + .08 * brokenKnot
      + .07 * t * (1 - terminalBurial)
      - .54 * terminalBurial

    const height = .035 + endTaper * (
      .095
      + .21 * centralScar
      + .10 * nearRidge
      + .055 * farRidge
      + .065 * brokenKnot
    )
    const depth = .050 + endTaper * (
      .19
      + .085 * centralScar
      + .055 * nearRidge
      + .035 * farRidge
    )
    const width = .50 + .18 * centralScar - .08 * farRidge
    const twist = .30 * t
      + .52 * Math.sin(t * 1.86 + .28)
      + .18 * nearRidge
      - .24 * farRidge
      + .26 * brokenKnot

    const furrowAngle = -.38 + .74 * t - twist + .18 * Math.sin(t * 3.1)
    const ridgeAngle = furrowAngle + Math.PI * .78
    const counterRidgeAngle = furrowAngle - Math.PI * .63
    const scarWindow = .18 + .92 * centralScar + .30 * nearRidge

    for (let radial = 0; radial < MEMORY_RENDER_RING_POINTS; radial += 1) {
      const radialU = radial / MEMORY_RENDER_RING_POINTS
      const angle = radialU * Math.PI * 2
      const furrowDistance = wrappedAngleDistance(angle, furrowAngle)
      const ridgeDistance = wrappedAngleDistance(angle, ridgeAngle)
      const counterRidgeDistance = wrappedAngleDistance(angle, counterRidgeAngle)
      const furrow = Math.exp(-Math.pow(furrowDistance / .17, 2)) * scarWindow
      const ridge = Math.exp(-Math.pow(ridgeDistance / .24, 2)) * (.30 + .78 * centralScar + .42 * nearRidge)
      const counterRidge = Math.exp(-Math.pow(counterRidgeDistance / .30, 2)) * (.12 + .44 * farRidge)

      const crag = 1
        + detailWindow * .10 * Math.sin(angle * 3 + t * 5.8)
        + detailWindow * .055 * Math.cos(angle * 5 - t * 4.1)
        + detailWindow * .026 * Math.sin(angle * 9 + t * 2.6)
      const asymmetry = .045 * endTaper * Math.sin(angle - t * 2.7 + .62)
        + .025 * nearRidge * Math.sin(angle * 2.0 + .25)
        - .020 * farRidge * Math.cos(angle * 3.0 - .55)
      const localY = Math.cos(angle) * height * width * crag
        + asymmetry
        + .095 * ridge
        + .045 * counterRidge
        - .115 * furrow
      const localZ = Math.sin(angle) * depth * crag
        + .060 * ridge
        - .045 * counterRidge
        - .11 * furrow

      const edgeSink = terminalBurial * (.20 + .14 * (.5 + .5 * Math.sin(angle + t * 4.2)))
      const x = centerX
        + localZ * .42
        + localY * .08
        + .025 * ridge
      const y = centerY
        + localY
        - edgeSink
        - .035 * Math.abs(Math.sin(angle * 2.0 + t * 3.7)) * terminalBurial
      const z = centerZ
        + localZ
        + localY * .16
        - .035 * furrow

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
  positions.push(-1.48, -1.93, .34)
  colors.push(.020, .028, .022)
  uvs.push(.5, 0)
  positions.push(1.45, -1.94, -.47)
  colors.push(.020, .028, .022)
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

  // V272 lineage metadata remains stable for integration contracts; V291 is the
  // current literal-pixel authority.
  geometry.userData.focusMemoryRole = 'v272-single-connected-living-memory-fold'
  geometry.userData.focusMemoryTopology = 'closed-twisted-longitudinal-fold-with-deep-furrow'
  geometry.userData.focusMemoryEnergy = 'weathered-mineral-restrained-warm-cool-response'
  geometry.userData.focusLiteralPixelRepair = 'v272-no-crystal-crown-no-card-stack'
  geometry.userData.focusSilhouetteRule = 'one-coherent-memory-phenomenon-not-discrete-objects'
  geometry.userData.focusSurfaceDensity = `${MEMORY_RENDER_SECTIONS}x${MEMORY_RENDER_RING_POINTS}-continuous-tactile-surface`
  geometry.userData.focusLiteralPixelSuccessorV291 = 'v291-ground-fused-memory-seam-submerged-terminals-nonportable-scar-ridges'
  geometry.userData.focusVisualAuthority = 'v291-ground-fused-memory-seam'
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
