export type StarTone = 'focus' | 'grief' | 'joy' | 'tense' | 'neutral' | 'recovery' | 'relationship'

export type LifeMapStarNode = {
  id: string
  label: string
  x: number
  y: number
  z: number
  size: number
  color: string
  opacity: number
  tone: StarTone
  major: boolean
  memoryRef: string
}

export type ConstellationLink = {
  from: string
  to: string
  strength?: number
}

export type LifeMapSeededData = {
  stars: LifeMapStarNode[]
  links: ConstellationLink[]
}

const TONE_STYLE: Record<StarTone, { color: string; sizeBoost: number; opacity: number }> = {
  focus: { color: '#9bc7ff', sizeBoost: 1.24, opacity: 0.95 },
  grief: { color: '#a89bc9', sizeBoost: 1.1, opacity: 0.9 },
  joy: { color: '#ffe28a', sizeBoost: 1.22, opacity: 0.96 },
  tense: { color: '#ffab92', sizeBoost: 1.05, opacity: 0.87 },
  neutral: { color: '#c7d5ec', sizeBoost: 1, opacity: 0.82 },
  recovery: { color: '#8ce0c7', sizeBoost: 1.14, opacity: 0.93 },
  relationship: { color: '#f8afd2', sizeBoost: 1.18, opacity: 0.94 },
}

const MAJOR_STARS: Omit<LifeMapStarNode, 'color' | 'opacity' | 'size'> & { baseSize: number }[] = [
  { id: 'major-charged-memory', label: 'Charged Memory', x: 22, y: 28, z: 2, tone: 'tense', major: true, baseSize: 17, memoryRef: 'seed_charged_memory' },
  { id: 'major-recovery-signal', label: 'Recovery Signal', x: 35, y: 45, z: 1, tone: 'recovery', major: true, baseSize: 16, memoryRef: 'seed_recovery_signal' },
  { id: 'major-relationship-echo', label: 'Relationship Echo', x: 48, y: 26, z: 3, tone: 'relationship', major: true, baseSize: 15, memoryRef: 'seed_relationship_echo' },
  { id: 'major-focus-thread', label: 'Focus Thread', x: 56, y: 51, z: 2, tone: 'focus', major: true, baseSize: 16, memoryRef: 'seed_focus_thread' },
  { id: 'major-joy-marker', label: 'Joy Marker', x: 68, y: 36, z: 2, tone: 'joy', major: true, baseSize: 18, memoryRef: 'seed_joy_marker' },
  { id: 'major-quiet-shift', label: 'Quiet Shift', x: 74, y: 58, z: 1, tone: 'neutral', major: true, baseSize: 14, memoryRef: 'seed_quiet_shift' },
  { id: 'major-grief-lantern', label: 'Grief Lantern', x: 30, y: 62, z: 1, tone: 'grief', major: true, baseSize: 15, memoryRef: 'seed_grief_lantern' },
  { id: 'major-steady-orbit', label: 'Steady Orbit', x: 43, y: 68, z: 0, tone: 'recovery', major: true, baseSize: 14, memoryRef: 'seed_steady_orbit' },
]

const MAJOR_LINKS: ConstellationLink[] = [
  { from: 'major-charged-memory', to: 'major-recovery-signal', strength: 0.8 },
  { from: 'major-recovery-signal', to: 'major-relationship-echo', strength: 0.72 },
  { from: 'major-relationship-echo', to: 'major-focus-thread', strength: 0.8 },
  { from: 'major-focus-thread', to: 'major-joy-marker', strength: 0.76 },
  { from: 'major-joy-marker', to: 'major-quiet-shift', strength: 0.66 },
  { from: 'major-quiet-shift', to: 'major-steady-orbit', strength: 0.62 },
  { from: 'major-steady-orbit', to: 'major-grief-lantern', strength: 0.6 },
  { from: 'major-grief-lantern', to: 'major-charged-memory', strength: 0.56 },
]

function createSeededRandom(seed = 42013) {
  let s = seed >>> 0
  return () => {
    s = (1664525 * s + 1013904223) >>> 0
    return s / 4294967296
  }
}

function materializeTone(size: number, tone: StarTone, major: boolean) {
  const style = TONE_STYLE[tone]
  const majorBoost = major ? 1.18 : 0.78
  return {
    size: Number((size * style.sizeBoost * majorBoost).toFixed(2)),
    color: style.color,
    opacity: major ? style.opacity : Math.max(0.22, style.opacity * 0.45),
  }
}

function generateBackgroundStars(count = 48): LifeMapStarNode[] {
  const rand = createSeededRandom(90210)
  const tones = Object.keys(TONE_STYLE) as StarTone[]
  const stars: LifeMapStarNode[] = []
  for (let i = 0; i < count; i += 1) {
    const tone = tones[i % tones.length]
    const base = materializeTone(7 + rand() * 5, tone, false)
    stars.push({
      id: `bg-${i + 1}`,
      label: `Background ${i + 1}`,
      x: Math.round(10 + rand() * 80),
      y: Math.round(10 + rand() * 80),
      z: Math.round(rand() * 5),
      size: base.size,
      color: base.color,
      opacity: base.opacity,
      tone,
      major: false,
      memoryRef: `seed_background_${i + 1}`,
    })
  }
  return stars
}

export function getLifeMapStars(userStars?: Partial<LifeMapStarNode>[] | null): LifeMapSeededData {
  const majorStars = MAJOR_STARS.map((star) => {
    const toneApplied = materializeTone(star.baseSize, star.tone, true)
    return { ...star, ...toneApplied }
  })

  const backgroundStars = generateBackgroundStars(48)
  const fallback = [...majorStars, ...backgroundStars]

  const validUserStars = (userStars ?? [])
    .filter((s): s is Partial<LifeMapStarNode> & Pick<LifeMapStarNode, 'id'> => Boolean(s?.id))
    .map((star, idx) => {
      const tone = star.tone ?? 'neutral'
      const shaped = materializeTone(Number(star.size ?? 12), tone, Boolean(star.major))
      return {
        id: String(star.id),
        label: star.label ?? `Memory ${idx + 1}`,
        x: Number(star.x ?? 50),
        y: Number(star.y ?? 50),
        z: Number(star.z ?? (idx % 5)),
        size: shaped.size,
        color: star.color ?? shaped.color,
        opacity: Number(star.opacity ?? shaped.opacity),
        tone,
        major: Boolean(star.major),
        memoryRef: star.memoryRef ?? `user_memory_${idx + 1}`,
      }
    })

  return {
    stars: validUserStars.length > 0 ? validUserStars : fallback,
    links: MAJOR_LINKS,
  }
}
