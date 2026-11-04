export interface TierLockBoundDecision<T> {
  uid: string
  epoch: number
  featureId: string
  userTier: string
  decision: T
}
export interface TierLockAuthIdentity {
  uid: string | null
  epoch: number
}
export function currentTierLockDecision<T>(
  resolved: TierLockBoundDecision<T> | null,
  identity: TierLockAuthIdentity,
  featureId: string,
  userTier: string,
): T | null
