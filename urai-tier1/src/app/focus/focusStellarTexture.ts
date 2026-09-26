import * as THREE from 'three'

function hash(x: number, y: number) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return value - Math.floor(value)
}

function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy)
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), u),
    THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), u), v)
}

/** A luminous density field, not an opaque circular surface with a painted limb. */
export function focusPlasmaSample(x: number, y: number) {
  const radius = Math.hypot(x, y)
  if (radius >= 1) return { heat: 0, alpha: 0 }
  const coarse = noise(x * 5 + 12, y * 5 + 9)
  const warpX = x + (coarse - .5) * .14
  const warpY = y + (noise(x * 6 - 8, y * 6 + 3) - .5) * .14
  const detail = noise(warpX * 34, warpY * 34)
  const fine = noise(warpX * 91, warpY * 91)
  const angle = Math.atan2(y, x)
  const filament = Math.pow(Math.max(0, Math.sin(angle * 17 + coarse * 3.2 + radius * 12)), 6)
  const core = Math.exp(-radius * radius * 7.6)
  const diffuse = Math.exp(-radius * radius * 4.1)
  const edge = 1 - THREE.MathUtils.smoothstep(radius, .70, .98)
  const alpha = Math.min(1, (core * .76 + diffuse * (.12 + detail * .15 + filament * .22)) * edge)
  const heat = THREE.MathUtils.clamp(.18 + core * .56 + coarse * .11 + detail * .11 + fine * .06, 0, 1)
  return { heat, alpha }
}

export function makeFocusPlasmaTexture(size = 512) {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const sample = focusPlasmaSample(((x + .5) / size - .5) * 2, ((y + .5) / size - .5) * 2)
    const offset = (y * size + x) * 4
    data[offset] = 255
    data[offset + 1] = Math.round(112 + sample.heat * 143)
    data[offset + 2] = Math.round(32 + sample.heat * 207)
    data[offset + 3] = Math.round(sample.alpha * 255)
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/** Feather the original media in its native aspect; no circular crop or frame. */
export function makeFocusMemoryMask(size = 128) {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = ((x + .5) / size - .5) * 2, dy = ((y + .5) / size - .5) * 2
    const edge = Math.max(Math.abs(dx), Math.abs(dy))
    const alpha = Math.round((1 - THREE.MathUtils.smoothstep(edge, .48, 1)) * 255)
    const offset = (y * size + x) * 4
    data[offset] = data[offset + 1] = data[offset + 2] = alpha
    data[offset + 3] = 255
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

export function focusMediaSize(width: number, height: number): [number, number, number] {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return [0, 0, 1]
  const scale = .74 / Math.max(width, height)
  return [width * scale, height * scale, 1]
}
