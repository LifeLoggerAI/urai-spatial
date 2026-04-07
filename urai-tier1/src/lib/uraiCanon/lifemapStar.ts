export type StarTone =
  | 'neutral'
  | 'warm'
  | 'cool'
  | 'joy'
  | 'grief'
  | 'focus'
  | 'memory'
  | 'mystery'
  | 'warning'
  | 'dream'

export type Vec3 = [number, number, number]

export type LifeMapStar = {
  id: string
  label: string
  position: Vec3
  tone: StarTone | string
  intensity: number
  stability: number
  createdAt?: number | null
  updatedAt?: number | null
  source?: string
  metadata?: Record<string, unknown>
}

export type LifeMapStarInput = {
  id?: string
  label: string
  position: Vec3
  tone: StarTone | string
  intensity: number
  stability: number
  source?: string
  metadata?: Record<string, unknown>
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

export function isVec3(v: any): v is Vec3 {
  return Array.isArray(v)
    && v.length === 3
    && typeof v[0] === 'number' && Number.isFinite(v[0])
    && typeof v[1] === 'number' && Number.isFinite(v[1])
    && typeof v[2] === 'number' && Number.isFinite(v[2])
}

export function normalizeLifeMapStar(raw: any): LifeMapStar | null {
  if (!raw || typeof raw !== 'object') return null
  const x = raw as Record<string, unknown>

  const id = typeof x.id === 'string' && x.id.trim() ? x.id.trim() : ''
  const label = typeof x.label === 'string' && x.label.trim() ? x.label.trim() : ''
  const tone = typeof x.tone === 'string' && x.tone.trim() ? x.tone.trim() : 'neutral'
  const position = isVec3(x.position) ? x.position : null

  if (!id || !label || !position) return null

  const intensity = clamp01(typeof x.intensity === 'number' ? x.intensity : 0.6)
  const stability = clamp01(typeof x.stability === 'number' ? x.stability : 0.6)

  return {
    id,
    label,
    position,
    tone,
    intensity,
    stability,
    createdAt: typeof x.createdAt === 'number' ? x.createdAt : null,
    updatedAt: typeof x.updatedAt === 'number' ? x.updatedAt : null,
    source: typeof x.source === 'string' ? x.source : 'unknown',
    metadata: x.metadata && typeof x.metadata === 'object' && !Array.isArray(x.metadata)
      ? (x.metadata as Record<string, unknown>)
      : {},
  }
}
