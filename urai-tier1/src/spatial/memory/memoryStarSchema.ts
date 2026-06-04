import { DEMO_MEMORY_STARS, DemoMemoryStar } from '../demo/demoMemoryStars'

export type MemoryStarPrivacyState = 'demo' | 'public' | 'private' | 'locked' | 'archived' | 'deleted' | 'vaulted'
export type MemoryStarSourceType = 'demo' | 'audio' | 'location' | 'journal' | 'relationship' | 'system' | 'unknown'

export type MemoryStarEmotionalSignature = {
  primary: DemoMemoryStar['emotionalTone'] | 'unknown'
  intensity: number
  valence: number
  arousal: number
}

export type MemoryStarFieldPrimitive = {
  auraColor: DemoMemoryStar['tone']
  radius: number
  intensity: number
  x: number
  y: number
}

export type MemoryStarNode = {
  id: string
  userId: string | null
  sourceType: MemoryStarSourceType
  sourceId: string
  provenanceSummary: string
  title: string
  label: string
  description: string
  emotionalSignature: MemoryStarEmotionalSignature
  field: MemoryStarFieldPrimitive
  privacyState: MemoryStarPrivacyState
  createdAt: string
  updatedAt: string
  replayId: string
  focusHref: string
  replayHref: string
  memoryPlaceId?: string
  canEnterPlace: boolean
  enterPlaceHref?: string
  deletedAt?: string
  archivedAt?: string
  lockedReason?: string
}

export type MemoryStarResolution =
  | { ok: true; star: MemoryStarNode; status: 200 }
  | { ok: false; status: 404 | 410 | 423; reason: string; safeHref: string }

const DEMO_TIMESTAMP = '2026-05-21T00:00:00.000Z'

function percentToNumber(value: string) {
  const parsed = Number.parseFloat(value.replace('%', ''))
  return Number.isFinite(parsed) ? parsed / 100 : 0.5
}

function emotionalSignature(star: DemoMemoryStar): MemoryStarEmotionalSignature {
  const intensityByTone: Record<DemoMemoryStar['emotionalTone'], number> = {
    calm: 0.42,
    recovery: 0.68,
    threshold: 0.82,
    mirror: 0.58,
    ritual: 0.62,
    dream: 0.55,
  }

  const valenceByTone: Record<DemoMemoryStar['emotionalTone'], number> = {
    calm: 0.72,
    recovery: 0.64,
    threshold: 0.18,
    mirror: 0.52,
    ritual: 0.58,
    dream: 0.5,
  }

  return {
    primary: star.emotionalTone,
    intensity: intensityByTone[star.emotionalTone],
    valence: valenceByTone[star.emotionalTone],
    arousal: star.emotionalTone === 'threshold' ? 0.78 : star.emotionalTone === 'calm' ? 0.24 : 0.48,
  }
}

function demoMemoryPlaceIdForStar(star: DemoMemoryStar) {
  return `place-${star.manifestId}`
}

export function demoMemoryStarToNode(star: DemoMemoryStar): MemoryStarNode {
  const id = star.manifestId
  const memoryPlaceId = demoMemoryPlaceIdForStar(star)
  return {
    id,
    userId: null,
    sourceType: 'demo',
    sourceId: `demo:${id}`,
    provenanceSummary: 'Demo-only memory star generated from bundled launch-safe sample data. No private user data is used.',
    title: star.title,
    label: star.label,
    description: star.description,
    emotionalSignature: emotionalSignature(star),
    field: {
      auraColor: star.tone,
      radius: Number.parseInt(star.size, 10) || 16,
      intensity: emotionalSignature(star).intensity,
      x: percentToNumber(star.left),
      y: percentToNumber(star.top),
    },
    privacyState: 'demo',
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
    replayId: id,
    focusHref: `/focus?manifestId=${encodeURIComponent(id)}`,
    replayHref: `/replay?manifestId=${encodeURIComponent(id)}`,
    memoryPlaceId,
    canEnterPlace: true,
    enterPlaceHref: `/place/${encodeURIComponent(memoryPlaceId)}`,
  }
}

export const DEMO_MEMORY_STAR_NODES: MemoryStarNode[] = DEMO_MEMORY_STARS.map(demoMemoryStarToNode)
export const DEMO_MEMORY_STAR_NODE_BY_ID: Record<string, MemoryStarNode> = Object.fromEntries(
  DEMO_MEMORY_STAR_NODES.map((star) => [star.id, star]),
)

export function canRenderMemoryStar(star: Pick<MemoryStarNode, 'privacyState'>) {
  return star.privacyState === 'demo' || star.privacyState === 'public' || star.privacyState === 'private'
}

export function canEnterMemoryPlace(star: Pick<MemoryStarNode, 'canEnterPlace' | 'memoryPlaceId' | 'privacyState'>) {
  return Boolean(star.canEnterPlace && star.memoryPlaceId && canRenderMemoryStar(star))
}

export function resolveDemoMemoryStar(starId: string | undefined | null): MemoryStarResolution {
  if (!starId) return { ok: false, status: 404, reason: 'missing-memory-star-id', safeHref: '/life-map' }
  const star = DEMO_MEMORY_STAR_NODE_BY_ID[starId]
  if (!star) return { ok: false, status: 404, reason: 'unknown-or-private-memory-star', safeHref: '/life-map' }
  if (star.privacyState === 'deleted') return { ok: false, status: 410, reason: 'deleted-memory-star', safeHref: '/life-map' }
  if (star.privacyState === 'locked' || star.privacyState === 'vaulted') {
    return { ok: false, status: 423, reason: 'locked-memory-star', safeHref: '/life-map' }
  }
  if (!canRenderMemoryStar(star)) return { ok: false, status: 404, reason: 'non-renderable-memory-star', safeHref: '/life-map' }
  return { ok: true, status: 200, star }
}

export function redactMemoryStarForPublic(star: MemoryStarNode): MemoryStarNode {
  if (star.privacyState === 'demo' || star.privacyState === 'public') return star
  return {
    ...star,
    userId: null,
    sourceId: 'redacted',
    provenanceSummary: 'Private provenance redacted for public/fallback rendering.',
    description: 'Private memory details are hidden until authenticated access and consent are verified.',
    memoryPlaceId: undefined,
    canEnterPlace: false,
    enterPlaceHref: undefined,
  }
}

export function resolveDemoReplay(replayId: string | undefined | null): MemoryStarResolution {
  return resolveDemoMemoryStar(replayId)
}
