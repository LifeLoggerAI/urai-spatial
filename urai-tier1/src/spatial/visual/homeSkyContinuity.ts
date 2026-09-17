export const HOME_SKY_CONTINUITY_SEED = 0x55415249 // ASCII-ish "URAI" identity seed.
export const HOME_SKY_PRECURSOR_COUNT = 31

export type HomeSkyContinuitySample = {
  readonly id: string
  readonly azimuth: number
  readonly elevation: number
  readonly depth: number
  readonly temperature: number
  readonly phase: number
  readonly radialBias: number
}

const TAU = Math.PI * 2
const fract = (value: number) => value - Math.floor(value)

function seeded(index: number, salt: number) {
  const seedOffset = (HOME_SKY_CONTINUITY_SEED % 9973) * .013
  return fract(Math.sin((index + 1) * 91.317 + salt * 17.731 + seedOffset) * 43758.5453123)
}

/**
 * Shared deterministic identity law for the small subset of Home memory lights
 * that resolve into Life Map anchors. Both worlds consume the same IDs and
 * angular ordering so the transition is revelation rather than a random-field
 * crossfade.
 */
export function homeSkyContinuitySample(index: number): HomeSkyContinuitySample {
  const safeIndex = Math.max(0, Math.floor(index)) % HOME_SKY_PRECURSOR_COUNT
  const azimuth = (safeIndex * 2.399963229728653 + (seeded(safeIndex, 1) - .5) * .18 + TAU) % TAU
  return {
    id: `urai-home-memory-precursor-${String(safeIndex + 1).padStart(2, '0')}`,
    azimuth,
    elevation: .36 + Math.pow(seeded(safeIndex, 2), .74) * .88,
    depth: seeded(safeIndex, 3),
    temperature: seeded(safeIndex, 4),
    phase: seeded(safeIndex, 5) * TAU,
    radialBias: seeded(safeIndex, 6),
  }
}

export function homeSkyContinuityIds() {
  return Array.from({ length: HOME_SKY_PRECURSOR_COUNT }, (_, index) => homeSkyContinuitySample(index).id)
}
