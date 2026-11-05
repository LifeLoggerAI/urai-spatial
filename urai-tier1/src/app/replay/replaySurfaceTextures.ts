import * as THREE from 'three'

export type ReplaySurfaceKind = 'soil' | 'bark' | 'stone'
export type ReplaySurfaceTextures = {
  color: THREE.DataTexture
  normal: THREE.DataTexture
  dispose: () => void
}

// Authored, deterministic micro-surfaces for the disclosed Replay demonstration.
// These are runtime material details, not photogrammetry or admitted hero art.
// All lattice samples wrap to avoid visible tiling seams and require no network.
function hash(x: number, y: number, salt: number): number {
  let n = Math.imul(x + 1013, 374761393) ^ Math.imul(y + 911, 668265263) ^ Math.imul(salt, 2246822519)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

function periodicNoise(u: number, v: number, cells: number, salt: number): number {
  const x = u * cells, y = v * cells
  const floorX = Math.floor(x), floorY = Math.floor(y)
  const a = x - floorX, b = y - floorY
  const smoothX = a * a * (3 - 2 * a), smoothY = b * b * (3 - 2 * b)
  const px = ((floorX % cells) + cells) % cells
  const py = ((floorY % cells) + cells) % cells
  const qx = (px + 1) % cells, qy = (py + 1) % cells
  const top = hash(px, py, salt) * (1 - smoothX) + hash(qx, py, salt) * smoothX
  const bottom = hash(px, qy, salt) * (1 - smoothX) + hash(qx, qy, salt) * smoothX
  return top * (1 - smoothY) + bottom * smoothY
}

function sampleSurface(u: number, v: number, kind: ReplaySurfaceKind): [number, number, number, number] {
  const broad = periodicNoise(u, v, 6, 7)
  const middle = periodicNoise(u, v, 18, 11)
  const fine = periodicNoise(u, v, 52, 17)
  if (kind === 'bark') {
    // Directional fissures with a slowly warped grain, not concentric cylinders.
    const warp = (broad - 0.5) * 0.09 + (middle - 0.5) * 0.035
    const ridges = Math.abs(Math.sin((u + warp) * Math.PI * 2 * 17))
    const fissure = Math.pow(1 - ridges, 4)
    const height = 0.24 + 0.5 * middle + 0.22 * fine - 0.28 * fissure
    const grain = middle * 0.38 + fine * 0.32 + broad * 0.3
    const shade = grain * 38 - fissure * 36
    return [109 + shade, 89 + shade * 0.84, 68 + shade * 0.7, height]
  }
  if (kind === 'stone') {
    const fleck = Math.max(0, fine - 0.63) * 0.7
    const height = broad * 0.48 + middle * 0.33 + fine * 0.19
    const shade = broad * 38 + middle * 32 + fine * 30 + fleck * 38
    return [74 + shade, 78 + shade, 73 + shade * 0.9, height]
  }
  // Earth, grass thatch, worn gravel and moss break up the otherwise flat floor.
  const moss = Math.max(0, Math.min(1, (broad * 0.62 + middle * 0.38 - 0.38) * 2.15))
  const speck = (fine - 0.5) * 31
  const height = broad * 0.45 + middle * 0.37 + fine * 0.18
  return [100 + moss * 9 + speck, 95 + moss * 31 + speck,
    74 + moss * 18 + speck * 0.65, height]
}

function byte(x: number): number { return Math.min(255, Math.max(0, Math.round(x))) }

export function makeReplaySurfaceTextures(kind: ReplaySurfaceKind, dimension = 128): ReplaySurfaceTextures {
  if (!Number.isInteger(dimension) || dimension < 16 || dimension > 512 || (dimension & (dimension - 1))) {
    throw new Error('Replay surface texture dimension must be a bounded power of two')
  }
  const colorBytes = new Uint8Array(dimension * dimension * 4)
  const normalBytes = new Uint8Array(dimension * dimension * 4)
  const heights = new Float32Array(dimension * dimension)
  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const i = y * dimension + x, p = i * 4
      const [r, g, b, height] = sampleSurface(x / dimension, y / dimension, kind)
      colorBytes[p] = byte(r); colorBytes[p + 1] = byte(g); colorBytes[p + 2] = byte(b); colorBytes[p + 3] = 255
      heights[i] = height
    }
  }
  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const left = heights[y * dimension + (x + dimension - 1) % dimension]
      const right = heights[y * dimension + (x + 1) % dimension]
      const up = heights[((y + dimension - 1) % dimension) * dimension + x]
      const down = heights[((y + 1) % dimension) * dimension + x]
      const strength = kind === 'bark' ? 0.95 : kind === 'stone' ? 0.82 : 0.65
      const normal = new THREE.Vector3((left - right) * strength, (up - down) * strength, 1).normalize()
      const p = (y * dimension + x) * 4
      normalBytes[p] = byte((normal.x * .5 + .5) * 255)
      normalBytes[p + 1] = byte((normal.y * .5 + .5) * 255)
      normalBytes[p + 2] = byte((normal.z * .5 + .5) * 255)
      normalBytes[p + 3] = 255
    }
  }
  const color = new THREE.DataTexture(colorBytes, dimension, dimension, THREE.RGBAFormat)
  const normal = new THREE.DataTexture(normalBytes, dimension, dimension, THREE.RGBAFormat)
  const repeat: [number, number] = kind === 'soil' ? [5, 7] : kind === 'bark' ? [2, 2] : [2, 2]
  for (const t of [color, normal]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(...repeat)
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.magFilter = THREE.LinearFilter
    t.generateMipmaps = true
    t.needsUpdate = true
  }
  color.name = 'urai-replay-' + kind + '-color-v1'
  color.colorSpace = THREE.SRGBColorSpace
  normal.name = 'urai-replay-' + kind + '-normal-v1'
  return { color, normal, dispose: () => { color.dispose(); normal.dispose() } }
}
