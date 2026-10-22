/**
 * Deterministic active-account guard for provider reads and paid reservations.
 * It cannot grant model consent; enforce canonical policy + provider status too.
 */
export type ProviderOwnerAuthorityInput = {
  ownerExists: boolean
  ownerDeleted: unknown
  accountStatus: unknown
  tombstoneExists: boolean
  fenceExists: boolean
  pendingDeletions: unknown
  ownerPrivacyRevision: unknown
  canonicalPolicyRevision: number
}

export type ProviderOwnerAuthorityDecision =
  | 'active'
  | 'inactive-owner'
  | 'deletion-fence-invalid'
  | 'deletion-pending'
  | 'privacy-revision-mismatch'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function providerOwnerAuthorityDecision(input: ProviderOwnerAuthorityInput): ProviderOwnerAuthorityDecision {
  if (!input || !input.ownerExists || input.tombstoneExists
    || (input.ownerDeleted !== undefined && input.ownerDeleted !== null && input.ownerDeleted !== false)
    || ['deleting', 'deleted', 'disabled'].includes(String(input.accountStatus ?? ''))) {
    return 'inactive-owner'
  }
  if (!Number.isSafeInteger(input.canonicalPolicyRevision) || input.canonicalPolicyRevision < 0) {
    return 'privacy-revision-mismatch'
  }
  // Legacy owner projection is optional. When present it must match exactly.
  const revision = input.ownerPrivacyRevision
  if (revision !== undefined && revision !== null
    && (!Number.isSafeInteger(revision) || revision !== input.canonicalPolicyRevision)) {
    return 'privacy-revision-mismatch'
  }
  if (input.fenceExists) {
    const pending = input.pendingDeletions
    if (!isRecord(pending)) return 'deletion-fence-invalid'
    const statuses = Object.values(pending)
    if (statuses.some(value => value !== true && value !== false)) return 'deletion-fence-invalid'
    if (statuses.some(value => value === true)) return 'deletion-pending'
  }
  return 'active'
}
