import { SpatialAssetManifest } from '../assets/manifestTypes'

export type CausalRelation = 'precedes' | 'correlates' | 'buffers' | 'amplifies' | 'recovers-from'

export interface CausalInsightEdge {
  fromManifestId: string
  toManifestId: string
  relation: CausalRelation
  confidence: number
  evidence: string[]
}

export interface CausalInsightSummary {
  insightId: string
  headline: string
  explanation: string
  edges: CausalInsightEdge[]
  recommendedFocusManifestId?: string
  safetyNote: string
}

function clamp01(value: number | undefined, fallback = 0.5) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(0, Math.min(1, value))
}

function weatherWeight(weather: string | undefined) {
  if (weather === 'overstimulated') return 0.9
  if (weather === 'threshold') return 0.82
  if (weather === 'grief') return 0.72
  if (weather === 'recovery') return 0.62
  if (weather === 'dream') return 0.48
  return 0.4
}

function relationForPair(from: SpatialAssetManifest, to: SpatialAssetManifest): CausalRelation {
  if (from.emotionalWeather === 'overstimulated' && to.emotionalWeather === 'recovery') return 'recovers-from'
  if (from.emotionalWeather === 'threshold' && to.emotionalWeather === 'recovery') return 'buffers'
  if (from.memoryKind === 'shadow' && to.emotionalWeather === 'overstimulated') return 'amplifies'
  if (from.memoryKind === to.memoryKind || from.emotionalWeather === to.emotionalWeather) return 'correlates'
  return 'precedes'
}

export function buildCausalInsightEngine(manifests: SpatialAssetManifest[]): CausalInsightSummary {
  const sorted = manifests
    .filter((manifest) => manifest.manifestId)
    .sort((a, b) => clamp01(b.importanceScore) - clamp01(a.importanceScore))
    .slice(0, 8)

  const edges: CausalInsightEdge[] = []

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const from = sorted[index]
    const to = sorted[index + 1]
    const relation = relationForPair(from, to)
    const strength = (clamp01(from.importanceScore) + clamp01(to.importanceScore) + weatherWeight(from.emotionalWeather) + weatherWeight(to.emotionalWeather)) / 4
    edges.push({
      fromManifestId: from.manifestId,
      toManifestId: to.manifestId,
      relation,
      confidence: Number(strength.toFixed(2)),
      evidence: [
        `${from.title || from.promptPreview} carries ${from.emotionalWeather || 'unknown'} weather`,
        `${to.title || to.promptPreview} carries ${to.emotionalWeather || 'unknown'} weather`,
        `importance ${Math.round(clamp01(from.importanceScore) * 100)} -> ${Math.round(clamp01(to.importanceScore) * 100)}`,
      ],
    })
  }

  const recoveryEdge = edges.find((edge) => edge.relation === 'recovers-from' || edge.relation === 'buffers')
  const recommendedFocusManifestId = recoveryEdge?.toManifestId || sorted[0]?.manifestId

  return {
    insightId: `causal-${sorted.map((manifest) => manifest.manifestId).join('-').slice(0, 48) || 'empty'}`,
    headline: recoveryEdge ? 'Recovery pattern detected after a high-load memory.' : 'Memory pattern chain ready for review.',
    explanation: recoveryEdge
      ? 'URAI found a sequence where a higher-pressure memory is followed by a stabilizing recovery or buffer pattern. This is a causal hypothesis, not a diagnosis.'
      : 'URAI connected memory stars by importance, emotional weather, and repeated symbolic type to generate a reviewable causal hypothesis.',
    edges,
    recommendedFocusManifestId,
    safetyNote: 'Causal insights are hypotheses for reflection only. They should not be treated as medical, legal, or crisis decisions.',
  }
}

export function explainCausalEdge(edge: CausalInsightEdge) {
  return `${edge.fromManifestId} ${edge.relation} ${edge.toManifestId} with ${Math.round(edge.confidence * 100)}% confidence.`
}
