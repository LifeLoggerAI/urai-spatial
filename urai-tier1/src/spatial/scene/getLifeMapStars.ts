export type LifeMapMode = "home" | "replay"

export type LifeMapStar = {
  id: string
  x: number
  y: number
  z: number
  r: number
  color: string
  tone: string
  soft: number
  sort: number
  title: string
  era: string
  narrator: string
  major?: boolean
  relatedTo?: string[]
}

const TONES = ["focus", "grief", "joy", "tense", "neutral", "awe", "recovery", "calm"] as const
const COLORS = ["#9fd3ff", "#c6a7ff", "#ffd18e", "#7ce2ff", "#ff9fb8", "#9cffc7", "#d9e8ff", "#a7c7ff"] as const

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback
}

function buildSeededStars() {
  const majorCount = 8
  const backgroundCount = 56

  const majors: LifeMapStar[] = Array.from({ length: majorCount }, (_, index) => {
    const angle = (index / majorCount) * Math.PI * 2
    const radius = 11 + (index % 3) * 2.5
    const id = `major-${index}`
    return {
      id,
      x: Math.cos(angle) * radius,
      y: 12 + Math.sin(angle * 1.4) * 4.5,
      z: -38 - index * 4.2,
      r: 1.25 + (index % 3) * 0.08,
      color: COLORS[index % COLORS.length],
      tone: TONES[index % TONES.length],
      soft: 1,
      sort: index,
      title: ["First Signal", "Grief Thread", "Bright Return", "Tension Gate", "Quiet Pattern", "Awe Window", "Recovery Bloom", "Calm Anchor"][index] ?? `Memory ${index + 1}`,
      era: `Cycle ${index + 1}`,
      narrator: "A signal from your emotional field.",
      major: true,
      relatedTo: [`major-${(index + 1) % majorCount}`, `major-${(index + majorCount - 1) % majorCount}`],
    }
  })

  const background: LifeMapStar[] = Array.from({ length: backgroundCount }, (_, index) => ({
    id: `bg-${index}`,
    x: ((index * 37) % 54) - 27,
    y: 4 + ((index * 23) % 22),
    z: -30 - ((index * 41) % 60),
    r: 0.09 + ((index * 13) % 8) * 0.015,
    color: "#8ea3c7",
    tone: "neutral",
    soft: 0.62,
    sort: 100 + index,
    title: "Background",
    era: "",
    narrator: "",
    major: false,
  }))

  return [...majors, ...background]
}

export function getLifeMapStars(remoteStars?: LifeMapStar[] | null): { stars: LifeMapStar[]; source: "seed" | "fallback" } {
  const seeded = buildSeededStars()
  const fromRemote = Array.isArray(remoteStars) ? remoteStars : []
  const candidate = fromRemote.length > 0 ? fromRemote : seeded

  const normalized = candidate.map((star) => ({
    ...star,
    x: finite(star.x, 0),
    y: finite(star.y, 8),
    z: finite(star.z, -48),
    r: finite(star.r, star.major ? 0.9 : 0.08),
    tone: star.tone || "neutral",
    soft: finite(star.soft, star.major ? 0.95 : 0.62),
    title: star.title || "Memory",
    era: star.era || "",
    narrator: star.narrator || "",
  }))

  return {
    stars: normalized.length > 0 ? normalized : seeded,
    source: fromRemote.length > 0 ? "fallback" : "seed",
  }
}
