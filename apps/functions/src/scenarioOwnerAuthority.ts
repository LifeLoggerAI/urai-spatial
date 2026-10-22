/**
 * Fail-closed account/deletion authority for private Scenario transactions.
 * All snapshots are read inside the transaction that reads or mutates Scenario data.
 * This check does not grant media access or model/evidence consent.
 */
export type ScenarioOwnerAuthorityInput = Readonly<{
  ownerExists: boolean
  ownerDeleted: unknown
  accountStatus: unknown
  tombstoneExists: boolean
  fenceExists: boolean
  pendingDeletions: unknown
}>

export type ScenarioOwnerAuthorityDecision =
  | 'active'
  | 'inactive-owner'
  | 'deletion-fence-invalid'
  | 'deletion-pending'

export function scenarioOwnerAuthorityDecision(input: ScenarioOwnerAuthorityInput): ScenarioOwnerAuthorityDecision {
  if (!input || !input.ownerExists || input.tombstoneExists
    || (input.ownerDeleted !== undefined && input.ownerDeleted !== null && input.ownerDeleted !== false)
    || ['deleting', 'deleted', 'disabled'].includes(String(input.accountStatus ?? ''))) {
    return 'inactive-owner'
  }
  if (input.fenceExists) {
    const pending = input.pendingDeletions
    if (!pending || typeof pending !== 'object' || Array.isArray(pending)) return 'deletion-fence-invalid'
    const values = Object.values(pending as Record<string, unknown>)
    if (values.some(value => value !== true && value !== false)) return 'deletion-fence-invalid'
    if (values.some(value => value === true)) return 'deletion-pending'
  }
  return 'active'
}
