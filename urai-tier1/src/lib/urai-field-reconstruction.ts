import type { MemoryStarNode } from '@/spatial/memory/memoryStarSchema'
import { DEMO_MEMORY_STAR_NODES } from '@/spatial/memory/memoryStarSchema'

export type UraiFieldSourceType = 'memory-star' | 'weather' | 'relationship' | 'recovery' | 'demo'
export type UraiFieldRenderMode = 'css-2d' | 'svg' | 'r3f-points' | 'future-splat'
export type UraiFieldVisibility = 'demo' | 'public' | 'owner' | 'locked' | 'archived' | 'deleted' | 'vaulted'

export type UraiEmotionalVector = {
  valence: number
  arousal: number
  intensity: number
  recovery: number
  threshold: number
  calm: number
}

export type UraiFieldPrimitive = {
  id: string
  sourceType: UraiFieldSourceType
  sourceId: string
  userId: string | null
  position: { x: number; y: number; z: number }
  radius: number
  spread: number
  intensity: number
  emotionalVector: UraiEmotionalVector
  auraToken: 'cyan' | 'violet' | 'white' | 'pink'
  confidence: number
  decay: number
  timestamp: string
  visibility: UraiFieldVisibility
  provenanceSummary: string
  renderMode: UraiFieldRenderMode
}

export type UraiEmotionalSplat = UraiFieldPrimitive & {
  splatKind: 'emotional-field-v1'
  gaussian: { sigmaX: number; sigmaY: number; sigmaZ: number }
}

export type UraiFieldRenderState = {
  id: string
  mode: 'demo' | 'owner' | 'public'
  rendererVersion: 'urai-field-v1'
  generatedAt: string
  reducedMotionSafe: boolean
  primitives: UraiFieldPrimitive[]
  splats: UraiEmotionalSplat[]
  summary: {
    primitiveCount: number
    visiblePrimitiveCount: number
    dominantAuraToken: UraiFieldPrimitive['auraToken']
    averageIntensity: number
    averageValence: number
  }
}

export function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function dominantAuraToken(primitives: UraiFieldPrimitive[]): UraiFieldPrimitive['auraToken'] {
  const counts = new Map<UraiFieldPrimitive['auraToken'], number>()
  for (const primitive of primitives) counts.set(primitive.auraToken, (counts.get(primitive.auraToken) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'cyan'
}

function recoveryScore(star: MemoryStarNode) {
  if (star.emotionalSignature.primary === 'recovery') return 0.9
  if (star.emotionalSignature.primary === 'calm') return 0.66
  if (star.emotionalSignature.primary === 'ritual') return 0.58
  return 0.34
}

function thresholdScore(star: MemoryStarNode) {
  return star.emotionalSignature.primary === 'threshold' ? 0.92 : star.emotionalSignature.arousal * 0.5
}

function visibilityFromStar(star: MemoryStarNode): UraiFieldVisibility {
  if (star.privacyState === 'private') return 'owner'
  return star.privacyState
}

export function memoryStarToFieldPrimitive(star: MemoryStarNode): UraiFieldPrimitive {
  const visibility = visibilityFromStar(star)
  const limited = visibility !== 'demo' && visibility !== 'public'

  return {
    id: `field:${star.id}`,
    sourceType: 'memory-star',
    sourceId: limited ? 'limited' : star.sourceId,
    userId: limited ? null : star.userId,
    position: {
      x: clamp01(star.field.x),
      y: clamp01(star.field.y),
      z: clamp01((star.emotionalSignature.arousal + star.emotionalSignature.intensity) / 2),
    },
    radius: Math.max(8, star.field.radius),
    spread: clamp01(star.field.intensity) * 0.34 + 0.12,
    intensity: clamp01(star.emotionalSignature.intensity),
    emotionalVector: {
      valence: clamp01(star.emotionalSignature.valence),
      arousal: clamp01(star.emotionalSignature.arousal),
      intensity: clamp01(star.emotionalSignature.intensity),
      recovery: recoveryScore(star),
      threshold: thresholdScore(star),
      calm: star.emotionalSignature.primary === 'calm' ? 0.9 : 0.4,
    },
    auraToken: star.field.auraColor,
    confidence: visibility === 'demo' ? 0.82 : 0.58,
    decay: 0.08,
    timestamp: star.updatedAt,
    visibility,
    provenanceSummary: limited ? 'Source summary limited for fallback rendering.' : star.provenanceSummary,
    renderMode: 'css-2d',
  }
}

export function fieldPrimitiveToSplat(primitive: UraiFieldPrimitive): UraiEmotionalSplat {
  const sigma = Math.max(0.05, primitive.spread)
  return {
    ...primitive,
    id: primitive.id.replace('field:', 'splat:'),
    splatKind: 'emotional-field-v1',
    gaussian: {
      sigmaX: sigma,
      sigmaY: sigma * (0.72 + primitive.emotionalVector.valence * 0.28),
      sigmaZ: sigma * (0.55 + primitive.emotionalVector.arousal * 0.45),
    },
  }
}

export function fieldPrimitiveForFallback(primitive: UraiFieldPrimitive): UraiFieldPrimitive | null {
  if (primitive.visibility === 'deleted' || primitive.visibility === 'vaulted' || primitive.visibility === 'locked') return null
  if (primitive.visibility === 'demo' || primitive.visibility === 'public') return primitive
  return {
    ...primitive,
    userId: null,
    sourceId: 'limited',
    provenanceSummary: 'Source summary limited for fallback rendering.',
  }
}

export function createFieldRenderStateFromMemoryStars(
  stars: MemoryStarNode[],
  options: { mode?: UraiFieldRenderState['mode']; generatedAt?: string; reducedMotionSafe?: boolean } = {},
): UraiFieldRenderState {
  const primitives = stars
    .map(memoryStarToFieldPrimitive)
    .map(fieldPrimitiveForFallback)
    .filter((primitive): primitive is UraiFieldPrimitive => Boolean(primitive))
  const splats = primitives.map(fieldPrimitiveToSplat)

  return {
    id: `urai-field:${options.mode ?? 'demo'}:${primitives.length}`,
    mode: options.mode ?? 'demo',
    rendererVersion: 'urai-field-v1',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    reducedMotionSafe: options.reducedMotionSafe ?? true,
    primitives,
    splats,
    summary: {
      primitiveCount: stars.length,
      visiblePrimitiveCount: primitives.length,
      dominantAuraToken: dominantAuraToken(primitives),
      averageIntensity: average(primitives.map((primitive) => primitive.intensity)),
      averageValence: average(primitives.map((primitive) => primitive.emotionalVector.valence)),
    },
  }
}

export const DEMO_URAI_FIELD_RENDER_STATE = createFieldRenderStateFromMemoryStars(DEMO_MEMORY_STAR_NODES, {
  mode: 'demo',
  generatedAt: '2026-05-21T00:00:00.000Z',
  reducedMotionSafe: true,
})
