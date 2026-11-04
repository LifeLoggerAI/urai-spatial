// This guard is intentionally pure so owner-transition rejection is testable
// without Firebase credentials, network access, or customer data.
export type TierDecisionScope = {
  featureId: string
  userTier: 'tier1' | 'tier2' | 'tier3'
  uid: string | null
  revision: number
  requiresAuth: boolean
}

export function canApplyTierDecision(
  request: TierDecisionScope,
  current: TierDecisionScope,
  response: unknown,
): boolean {
  if (
    !request || !current ||
    request.featureId !== current.featureId ||
    request.userTier !== current.userTier ||
    request.uid !== current.uid ||
    request.revision !== current.revision ||
    request.requiresAuth !== current.requiresAuth
  ) return false

  if (current.requiresAuth && !current.uid) return false
  if (!response || typeof response !== 'object' || Array.isArray(response)) return false

  const result = response as Record<string, unknown>
  if (
    result.featureId !== current.featureId ||
    typeof result.allowed !== 'boolean' ||
    !Array.isArray(result.reasons) ||
    !result.reasons.every((reason) => typeof reason === 'string') ||
    typeof result.requiredTier !== 'string' ||
    typeof result.userTier !== 'string'
  ) return false

  // A contradictory server response must never create an allowed UI decision.
  if (result.allowed && result.reasons.length !== 0) return false
  return true
}
