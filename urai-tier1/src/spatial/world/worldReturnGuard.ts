type ReturnPhase = 'idle' | 'descending' | 'ascending' | 'travelling'

/**
 * Claim the world return synchronously before minting any single-use view
 * handoff. React batches the provider state update, so a second Escape or
 * explicit return in the same turn must not supersede the first navigation.
 * The provider later supplies 'idle' on a completed route transition.
 */
export function claimWorldReturn(phase: { current: ReturnPhase }): boolean {
  if (phase.current !== 'idle') return false
  phase.current = 'travelling'
  return true
}
