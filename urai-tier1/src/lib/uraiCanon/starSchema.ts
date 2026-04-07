import type { StarRecord, StarTone } from '@/lib/uraiCanon/starData'

const ALLOWED_TONES: readonly StarTone[] = ['#88ccff', '#ffaa88', '#aaffcc', '#ffd700'] as const

export interface FirestoreStarDoc {
  id: any
  title?: any
  memoryRef?: any
  position: any
  size?: any
  color?: any
  intensity?: any
  chapter?: any
  order?: any
}

function isFiniteNumber(v: any): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function normalizeString(v: any, fallback: string): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback
}

function normalizeTone(v: any): StarTone {
  return typeof v === 'string' && (ALLOWED_TONES as readonly string[]).includes(v)
    ? (v as StarTone)
    : '#88ccff'
}

function normalizePosition(v: any): [number, number, number] | null {
  if (!Array.isArray(v) || v.length !== 3) return null

  const x = Number(v[0])
  const y = Number(v[1])
  const z = Number(v[2])

  if (![x, y, z].every(Number.isFinite)) return null

  return [
    clamp(x, -1000, 1000),
    clamp(y, -1000, 1000),
    clamp(z, -5000, 100),
  ]
}

export function normalizeStarDoc(raw: FirestoreStarDoc): StarRecord | null {
  const id = normalizeString(raw.id, '')
  if (!id) return null

  const position = normalizePosition(raw.position)
  if (!position) return null

  const title = normalizeString(raw.title, id)
  const memoryRef = normalizeString(raw.memoryRef, id)
  const chapter = normalizeString(raw.chapter, 'default')
  const color = normalizeTone(raw.color)

  const size = isFiniteNumber(raw.size) ? clamp(raw.size, 0.02, 0.2) : 0.05
  const intensity = isFiniteNumber(raw.intensity) ? clamp(raw.intensity, 0, 1.5) : 0.8

  return {
    id,
    title,
    memoryRef,
    position,
    size,
    color,
    intensity,
    chapter,
  }
}

export function normalizeStarDocs(rows: any[]): StarRecord[] {
  const out: StarRecord[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const normalized = normalizeStarDoc((row ?? {}) as FirestoreStarDoc)
    if (!normalized) continue
    if (seen.has(normalized.id)) continue
    seen.add(normalized.id)
    out.push(normalized)
  }

  return out
}
