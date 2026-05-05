export type SelectionStatus = 'idle' | 'glow' | 'active' | 'resolved'

export type StarSelectionCandidate = {
  id: string
  intensity: number
  status: SelectionStatus
  lastSelectedAt?: number
  lastStatusChangeAt?: number
  selectedCountInWindow?: number
}

export type StarSelectionConfig = {
  now: number
  cooldownMs: number
  repeatWindowMs: number
  maxRepeatsInWindow: number
  fairnessBoostPerMs: number
  resolvedPenalty: number
  excludeResolvedByDefault: boolean
  allowResolvedIfReactivated: boolean
}

export function scoreStar(candidate: StarSelectionCandidate, config: StarSelectionConfig): number {
  const lastTouchedAt = Math.max(candidate.lastSelectedAt ?? 0, candidate.lastStatusChangeAt ?? 0)
  const elapsed = config.now - lastTouchedAt
  const inCooldown = (candidate.status === 'glow' || candidate.status === 'active') && elapsed < config.cooldownMs
  if (inCooldown) return 0

  const repeatCount = candidate.selectedCountInWindow ?? 0
  if (repeatCount >= config.maxRepeatsInWindow) return 0

  const base = Math.max(0.01, candidate.intensity)
  const neglectedForMs = Math.max(0, config.now - (candidate.lastSelectedAt ?? 0))
  const fairnessBoost = 1 + neglectedForMs * config.fairnessBoostPerMs

  const resolvedSuppressed = candidate.status === 'resolved' && config.excludeResolvedByDefault && !config.allowResolvedIfReactivated
  if (resolvedSuppressed) return 0

  const resolvedWeight = candidate.status === 'resolved' ? config.resolvedPenalty : 1
  const repeatPenalty = 1 / (1 + repeatCount)

  return base * fairnessBoost * repeatPenalty * resolvedWeight
}

export function buildWeights(candidates: StarSelectionCandidate[], config: StarSelectionConfig): Array<{ id: string; weight: number }> {
  return candidates.map((candidate) => ({ id: candidate.id, weight: scoreStar(candidate, config) }))
}

export function pickWeightedStar(
  candidates: StarSelectionCandidate[],
  config: StarSelectionConfig,
  rng: () => number,
): string | null {
  const weights = buildWeights(candidates, config).filter((entry) => entry.weight > 0)
  if (weights.length === 0) return null

  const total = weights.reduce((sum, entry) => sum + entry.weight, 0)
  const roll = rng() * total
  let cursor = 0
  for (const entry of weights) {
    cursor += entry.weight
    if (roll <= cursor) return entry.id
  }
  return weights[weights.length - 1]?.id ?? null
}
