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
}

const TONES = ["focus", "grief", "joy", "tense", "neutral", "awe", "recovery", "calm"] as const

const COLORS = ["#9fd3ff", "#c6a7ff", "#ffd18e", "#7ce2ff", "#ff9fb8"] as const

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback
}

export function getLifeMapStars(): { stars: LifeMapStar[]; source: "seed" | "fallback" } {
  const stars: LifeMapStar[] = []

  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2
    const radius = 12 + (index % 3) * 3

    stars.push({
      id: `major-${index}`,
      x: Math.cos(angle) * radius,
      y: 13 + Math.sin(angle * 1.4) * 5,
      z: -38 - index * 3.8,
      r: 1.35,
      color: COLORS[index % COLORS.length],
      tone: TONES[index % TONES.length],
      soft: 1,
      sort: index,
      title: `Memory ${index + 1}`,
      era: `Cycle ${index + 1}`,
      narrator: "A signal from your emotional field.",
      major: true,
    })
  }

  for (let index = 0; index < 70; index += 1) {
    stars.push({
      id: `bg-${index}`,
      x: ((index * 37) % 48) - 24,
      y: 4 + ((index * 23) % 24),
      z: -30 - ((index * 41) % 58),
      r: 0.12 + ((index * 13) % 8) * 0.02,
      color: "#8ea3c7",
      tone: "neutral",
      soft: 0.7,
      sort: 100 + index,
      title: "Background",
      era: "",
      narrator: "",
      major: false,
    })
  }

  const normalized = stars.map((star) => ({
    ...star,
    x: finite(star.x, 0),
    y: finite(star.y, 8),
    z: finite(star.z, -48),
    r: finite(star.r, 0.08),
  }))

  return {
    stars: normalized,
    source: normalized.length > 0 ? "seed" : "fallback",
  }
}