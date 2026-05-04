export type StarKind = 'major' | 'background'
export type StarTone = 'cool' | 'warm' | 'neutral' | 'mystic'

export type SpatialStarNode = {
  id: string
  x: number
  y: number
  z: number
  size: number
  memoryRef: string
  label: string
  kind: StarKind
  tone: StarTone
  connectedTo: string[]
}

const MAJOR_SEEDED_STARS: SpatialStarNode[] = [
  { id: 'major-threshold', x: 22, y: 30, z: 0, size: 16, memoryRef: 'memory_ref_threshold', label: 'Threshold', kind: 'major', tone: 'cool', connectedTo: ['major-signal'] },
  { id: 'major-signal', x: 36, y: 24, z: 1, size: 15, memoryRef: 'memory_ref_signal', label: 'Signal', kind: 'major', tone: 'warm', connectedTo: ['major-echo', 'major-threshold'] },
  { id: 'major-echo', x: 52, y: 34, z: 0, size: 15, memoryRef: 'memory_ref_echo', label: 'Echo', kind: 'major', tone: 'mystic', connectedTo: ['major-memory', 'major-return'] },
  { id: 'major-memory', x: 67, y: 48, z: 2, size: 14, memoryRef: 'memory_ref_memory', label: 'Memory', kind: 'major', tone: 'neutral', connectedTo: ['major-return'] },
  { id: 'major-return', x: 42, y: 61, z: 1, size: 15, memoryRef: 'memory_ref_return', label: 'Return', kind: 'major', tone: 'cool', connectedTo: ['major-origin'] },
  { id: 'major-origin', x: 27, y: 55, z: 2, size: 14, memoryRef: 'memory_ref_origin', label: 'Origin', kind: 'major', tone: 'warm', connectedTo: ['major-threshold'] },
]

function seededRandom(seed: number) {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function buildBackgroundStars(seed = 42, count = 48): SpatialStarNode[] {
  const rand = seededRandom(seed)
  const tones: StarTone[] = ['cool', 'warm', 'neutral', 'mystic']
  const stars: SpatialStarNode[] = []

  for (let i = 0; i < count; i += 1) {
    stars.push({
      id: `bg-${i + 1}`,
      x: 8 + rand() * 84,
      y: 10 + rand() * 78,
      z: Math.floor(rand() * 5),
      size: 5 + rand() * 3,
      memoryRef: `background_ref_${i + 1}`,
      label: `Background ${i + 1}`,
      kind: 'background',
      tone: tones[Math.floor(rand() * tones.length)],
      connectedTo: [],
    })
  }

  return stars
}

export function getSpatialStarData(seed = 42): SpatialStarNode[] {
  const major = MAJOR_SEEDED_STARS
  const background = buildBackgroundStars(seed, 48)
  return [...major, ...background]
}
