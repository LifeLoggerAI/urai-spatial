// A Firebase Auth user/token revision binds each private tier-lock decision.
// This is a UI safety gate, not a replacement for server Auth/consent Rules.
export function currentTierLockDecision(resolved, identity, featureId, userTier) {
  if (!identity || !identity.uid || !Number.isSafeInteger(identity.epoch) || identity.epoch < 1) return null
  if (!resolved || resolved.uid !== identity.uid || resolved.epoch !== identity.epoch) return null
  if (resolved.featureId !== featureId || resolved.userTier !== userTier) return null
  return resolved.decision ?? null
}
