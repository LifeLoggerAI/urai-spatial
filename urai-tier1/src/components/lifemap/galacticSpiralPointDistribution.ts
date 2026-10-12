// Atmosphere-only dust fields. No records, identities, fake memories, or
// semantic nodes: actual memory sources remain owned by LifeMapProductionWorld.
export type GalacticDepthBand = 'foreground' | 'middle' | 'far'
export type GalacticQuality = 'low' | 'medium' | 'high'

export type GalacticSpiralPoints = {
  positions: Float32Array
  colors: Float32Array
  pointSizes: Float32Array
  band: GalacticDepthBand
  count: number
}

const BAND_COUNTS: Record<GalacticDepthBand, Record<GalacticQuality, number>> = {
  foreground: { low: 340, medium: 570, high: 900 },
  middle: { low: 780, medium: 1280, high: 2020 },
  far: { low: 990, medium: 1900, high: 3650 },
}

function rand(index: number, salt: number): number {
  const n = Math.sin((index + 1) * 17.237 + (salt + 1) * 31.771) * 43758.5453
  return n - Math.floor(n)
}

export function makeGalacticSpiralPoints(
  band: GalacticDepthBand,
  tier: GalacticQuality,
): GalacticSpiralPoints {
  const count = BAND_COUNTS[band][tier]
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const pointSizes = new Float32Array(count)
  const foreground = band === 'foreground'
  const far = band === 'far'
  const maxRadius = foreground ? 21 : far ? 71 : 42
  const coreRadius = foreground ? 3.2 : far ? 17 : 6
  const centerZ = foreground ? -9 : far ? -65 : -31
  const spreadY = foreground ? 4 : far ? 16 : 8.5
  // Related spiral arms share physical structure, but occupy different depths.
  // The central low-density opening leaves genuine authored Memory Stars visible.
  for (let i = 0; i < count; i += 1) {
    const random = rand(i, 7)
    const radial = coreRadius + Math.pow(random, 0.7) * maxRadius
    const arm = (i % 4) * Math.PI * 0.5
    const twist = radial * (far ? 0.052 : foreground ? 0.115 : 0.076)
    const phase = arm + twist + (rand(i, 11) - 0.5) * (far ? 0.35 : 0.27)
    const lane = (rand(i, 17) - 0.5) * (foreground ? 1.9 : far ? 8.6 : 4.4)
    const x = Math.cos(phase) * radial * (far ? 1.08 : 0.92) + lane
    const y = Math.sin(phase * 1.9) * (foreground ? 1.1 : far ? 5.4 : 2.6)
      + (rand(i, 23) - 0.5) * spreadY
    const z = centerZ + Math.sin(phase) * radial * (far ? 0.32 : 0.29)
      + (rand(i, 29) - 0.5) * (foreground ? 5 : far ? 19 : 11)
    positions.set([x, y, z], i * 3)
    const plume = rand(i, 31)
    const warm = Math.sin(phase * 2.1 + radial * 0.015) * 0.5 + 0.5
    // Cool ionized gas and sparse warmer dust: never recolor actual memory stars.
    const warmth = Math.max(0, Math.min(1, warm * 0.54 + plume * 0.28))
    colors.set([
      0.18 + 0.36 * warmth + (foreground ? 0.12 : 0),
      0.31 + 0.12 * (1 - warmth) + (foreground ? 0.16 : 0),
      0.53 + 0.22 * (1 - warmth),
    ], i * 3)
    pointSizes[i] = (foreground ? 0.24 : far ? 0.52 : 0.37) * (0.62 + rand(i, 37) * 1.1)
  }
  return { band, count, positions, colors, pointSizes }
}
