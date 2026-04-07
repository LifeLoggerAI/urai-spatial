import type { LifeMapStar, StarTone, Vec3 } from './starTypes'

const DEFAULT_TONE: StarTone = 'neutral'
const DEFAULT_INTENSITY = 0.65
const DEFAULT_STABILITY = 0.75

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function toFiniteNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function normalizePosition(v: unknown): Vec3 {
  if (Array.isArray(v) && v.length === 3) {
    return [
      toFiniteNumber(v[0], 0),
      toFiniteNumber(v[1], 0),
      toFiniteNumber(v[2], 0),
    ]
  }

  if (isObject(v)) {
    return [
      toFiniteNumber(v.x, 0),
      toFiniteNumber(v.y, 0),
      toFiniteNumber(v.z, 0),
    ]
  }

  return [0, 0, 0]
}

function normalizeString(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback
}

export function normalizeLifeMapStar(input: unknown, fallbackId?: string): LifeMapStar {
  const raw = isObject(input) ? input : {}

  const id =
    normalizeString(raw.id, '') ||
    normalizeString((raw as Record<string, unknown>).docId, '') ||
    fallbackId ||
    `star_${Date.now()}`

  const label =
    normalizeString(raw.label, '') ||
    normalizeString((raw as Record<string, unknown>).title, '') ||
    normalizeString((raw as Record<string, unknown>).name, '') ||
    'Untitled Star'

  const tone = normalizeString(raw.tone, DEFAULT_TONE)
  const intensity = clamp(
    toFiniteNumber(raw.intensity, DEFAULT_INTENSITY),
    0,
    1
  )
  const stability = clamp(
    toFiniteNumber(raw.stability, DEFAULT_STABILITY),
    0,
    1
  )

  const createdAt =
    typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt)
      ? raw.createdAt
      : null

  const updatedAt =
    typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt)
      ? raw.updatedAt
      : null

  return {
    id,
    label,
    position: normalizePosition(raw.position),
    tone,
    intensity,
    stability,
    createdAt,
    updatedAt,
    source: normalizeString(raw.source, 'unknown'),
    metadata: isObject(raw.metadata) ? raw.metadata : {},
  }
}

export function isLifeMapStar(input: unknown): input is LifeMapStar {
  if (!isObject(input)) return false
  if (typeof input.id !== 'string' || !input.id.trim()) return false
  if (typeof input.label !== 'string' || !input.label.trim()) return false
  if (!Array.isArray(input.position) || input.position.length !== 3) return false
  if (typeof input.intensity !== 'number' || !Number.isFinite(input.intensity)) return false
  if (typeof input.stability !== 'number' || !Number.isFinite(input.stability)) return false
  return true
}

export function assertLifeMapStar(input: unknown, context = 'unknown'): asserts input is LifeMapStar {
  if (!isLifeMapStar(input)) {
    throw new Error(`Invalid LifeMapStar in ${context}`)
  }
}
