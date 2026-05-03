export type LifeMapMode = "home" | "replay"
export type LifeMapStar = { id: string; x: number; y: number; z: number; r: number; color: string; tone: string; soft: number; sort: number; title: string; era: string; narrator: string; major?: boolean }

const TONES = ["focus", "grief", "joy", "tense", "neutral", "awe", "recovery", "calm"]

function finite(n: number, fallback: number) { return Number.isFinite(n) ? n : fallback }

export function getLifeMapStars(): { stars: LifeMapStar[]; source: "seed" | "fallback" } {
  const stars: LifeMapStar[] = []
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2
    stars.push({ id: `major-${i}`, x: Math.cos(a) * (14 + (i % 3) * 3), y: 14 + Math.sin(a * 1.4) * 6, z: -48 - i * 4.2, r: 0.9, color: ["#9fd3ff", "#c6a7ff", "#ffd18e", "#7ce2ff", "#ff9fb8"][i % 5], tone: TONES[i % TONES.length], soft: 1, sort: i, title: `Memory ${i + 1}`, era: `Cycle ${i + 1}`, narrator: "A signal from your emotional field.", major: true })
  }
  for (let i = 0; i < 70; i += 1) {
    stars.push({ id: `bg-${i}`, x: ((i * 37) % 48) - 24, y: 4 + ((i * 23) % 24), z: -35 - ((i * 41) % 70), r: 0.06 + ((i * 13) % 8) * 0.01, color: "#8ea3c7", tone: "neutral", soft: 0.7, sort: 100 + i, title: "Background", era: "", narrator: "", major: false })
  }
  const normalized = stars.map((s) => ({ ...s, x: finite(s.x, 0), y: finite(s.y, 0), z: finite(s.z, -160), r: finite(s.r, 0.08) }))
  return { stars: normalized.length ? normalized : [], source: "seed" }
}
