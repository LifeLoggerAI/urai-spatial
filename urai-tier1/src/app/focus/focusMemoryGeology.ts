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
// The form must read as memory pressure physically held by place. It must not regress
// into a crystal crown, boulder, orb, flower, portal, ring, shell/mouth, manta, tent,
// aircraft, animal, shoe, boat, bowl, helmet, body-part silhouette, smooth blob,
// disconnected pair, card/slab, or generic pickup.
const MEMORY_SECTIONS = 41
const MEMORY_CROSS_POINTS = 9

function fractureCenter(t: number) {
  const x = 2.62 * t
    + .18 * Math.sin(t * 3.05 + .18)
    + .055 * Math.sin(t * 8.4 - .31)
  const z = -.54 * t
    + .27 * Math.sin(t * 2.26 - .48)
    + .085 * Math.sin(t * 5.8 + .66)
  return new THREE.Vector2(x, z)
}

function livingMemoryVertexColor(section: number, cross: number, t: number, lateral: number, furrow: number, ridge: number) {
  const deep = new THREE.Color().setRGB(.016, .024, .019)
  const mineral = new THREE.Color().setRGB(.115, .135, .105)
  const weathered = new THREE.Color().setRGB(.265, .215, .125)
  const warm = new THREE.Color().setRGB(.46, .215, .060)
  const edgeMineral = new THREE.Color().setRGB(.39, .36, .23)
  const centerWindow = 1 - Math.min(1, Math.abs(t))
  const age = .5 + .5 * Math.sin(section * .47 + cross * .73)
  const edge = THREE.MathUtils.smoothstep(Math.abs(lateral), .48, 1)
  const color = deep.clone()
    .lerp(mineral, .38 + .18 * age)
    .lerp(weathered, .10 + .15 * centerWindow)
  if (furrow > .2) color.lerp(deep, .42 + .30 * furrow)
  if (ridge > .16) color.lerp(edgeMineral, .16 + .18 * ridge)
  color.lerp(warm, .045 * centerWindow * (1 - edge))
  color.lerp(deep, edge * .18)
  color.r = Math.min(.52, color.r)
  color.g = Math.min(.42, color.g)
  color.b = Math.min(.25, color.b)
  return color
}

function createLivingMemoryFold() {
  const positions: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  // Build the visible scar surface first. Edge and terminal sinks make the top surface
  // dissolve into the sanctuary instead of presenting a detachable outer silhouette.
  for (let section = 0; section < MEMORY_SECTIONS; section += 1) {
    const u = section / (MEMORY_SECTIONS - 1)
    const t = THREE.MathUtils.lerp(-1, 1, u)
    const center = fractureCenter(t)
    const before = fractureCenter(Math.max(-1, t - .018))
    const after = fractureCenter(Math.min(1, t + .018))
    const tangent = after.clone().sub(before).normalize()
    const side = new THREE.Vector2(-tangent.y, tangent.x)

    const endFade = Math.pow(Math.max(0, Math.sin(u * Math.PI)), .42)
    const terminalSink = THREE.MathUtils.smoothstep(Math.abs(t), .72, 1) * .24
    const centralScar = Math.exp(-Math.pow((t + .05) / .38, 2))
    const nearPressure = Math.exp(-Math.pow((t + .43) / .20, 2))
    const farPressure = Math.exp(-Math.pow((t - .34) / .24, 2))
    const brokenKnot = Math.exp(-Math.pow((t - .02) / .15, 2))
    const pulse = .5 + .5 * Math.sin(t * 12.7 + .62)
    const baseHalfWidth = (.38 + .17 * centralScar + .08 * nearPressure + .055 * farPressure) * (.48 + .52 * endFade)
    const centerY = -1.225
      + .018 * Math.sin(t * 5.2)
      + .012 * Math.sin(t * 12.4 + .4)
      - terminalSink

    for (let cross = 0; cross < MEMORY_CROSS_POINTS; cross += 1) {
      const crossU = cross / (MEMORY_CROSS_POINTS - 1)
      const lateral = THREE.MathUtils.lerp(-1, 1, crossU)
      const absLateral = Math.abs(lateral)
      const jaggedEdge = 1
        + .10 * Math.sin(section * 1.73 + (lateral < 0 ? .4 : 2.1))
        + .055 * Math.sin(section * 3.31 + cross * .91)
      const halfWidth = baseHalfWidth * (absLateral > .72 ? jaggedEdge : 1)
      const furrow = Math.exp(-Math.pow(lateral / .20, 2)) * (.62 + .38 * centralScar)
      const leftLip = Math.exp(-Math.pow((lateral + .48) / .17, 2)) * (.28 + .62 * nearPressure + .30 * centralScar)
      const rightLip = Math.exp(-Math.pow((lateral - .42) / .19, 2)) * (.16 + .46 * farPressure + .34 * brokenKnot)
      const ridge = Math.max(leftLip, rightLip)
      const edgeSink = THREE.MathUtils.smoothstep(absLateral, .66, 1) * (.065 + .030 * endFade)
      const micro = (.009 * Math.sin(section * 2.57 + cross * 1.21)
        + .006 * Math.cos(section * 4.19 - cross * .77)) * endFade

      // Scar first: the furrow cuts down, one lip dominates and the counter-lip recedes.
      // Only this top skin is intended to be visible; all closure geometry is below grade.
      const y = centerY
        - .070 * furrow
        + .082 * leftLip
        + .040 * rightLip
        + .018 * pulse * (1 - absLateral)
        + micro
        - edgeSink
      const lateralDistance = lateral * halfWidth
      const edgeBreak = absLateral > .78
        ? .025 * Math.sin(section * 2.11 + cross * 1.37)
        : 0
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

  // Restore watertight closure without restoring a visible portable object. The thin
  // underside copies the top footprint but is pushed materially below sanctuary grade;
  // side walls and caps therefore exist only to satisfy closed-volume topology.
  for (let vertex = 0; vertex < topVertexCount; vertex += 1) {
    const i = vertex * 3
    const uv = vertex * 2
    positions.push(positions[i], positions[i + 1] - .16, positions[i + 2])
    colors.push(colors[i] * .42, colors[i + 1] * .42, colors[i + 2] * .42)
    uvs.push(uvs[uv], uvs[uv + 1])
  }

  // Top + bottom surfaces.
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

  // Long side walls close the two lateral boundaries.
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

  // Both terminal caps are below grade and complete the watertight manifold.
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
  geometry.userData.focusVisualAuthority = 'v295-sanctuary-memory-scar-volume'
  geometry.userData.focusCurrentVisualAuthority = 'v295-closed-continuous-ground-held-memory-rupture'
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
