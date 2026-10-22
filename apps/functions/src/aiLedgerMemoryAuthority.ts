import { isCanonicalStoredPolicy } from './consentPolicyAuthority'

/** Account-level gate for private AI Ledger reads and delayed trigger writes. */
export type AILedgerMemoryAuthorityInput = {
  uid: string
  ownerExists: boolean
  ownerDeleted: unknown
  accountStatus: unknown
  ownerPrivacyRevision: unknown
  tombstoneExists: boolean
  fenceExists: boolean
  pendingDeletions: unknown
  policy: unknown
}

export type AILedgerMemoryDecision =
  | 'active'
  | 'inactive-owner'
  | 'invalid-policy'
  | 'memory-not-granted'
  | 'enforcement-pending'
  | 'privacy-revision-mismatch'
  | 'deletion-fence-invalid'
  | 'deletion-pending'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function aiLedgerMemoryAuthorityDecision(input: AILedgerMemoryAuthorityInput): AILedgerMemoryDecision {
  if (!input || typeof input.uid !== 'string' || !input.uid) return 'invalid-policy'
  if (!input.ownerExists || input.ownerDeleted === true || input.tombstoneExists
    || ['deleting', 'deleted', 'disabled'].includes(String(input.accountStatus ?? ''))) return 'inactive-owner'
  if (!isCanonicalStoredPolicy(input.policy, input.uid)) return 'invalid-policy'
  if (input.policy.domains.memory.mode !== 'granted') return 'memory-not-granted'
  if (input.policy.enforcement.state !== 'fully-enforced') return 'enforcement-pending'
  const projection = input.ownerPrivacyRevision
  if (projection !== null && projection !== undefined
    && (!Number.isSafeInteger(projection) || projection !== input.policy.revision)) {
    return 'privacy-revision-mismatch'
  }
  if (input.fenceExists) {
    if (!isRecord(input.pendingDeletions)) return 'deletion-fence-invalid'
    const states = Object.values(input.pendingDeletions)
    if (states.some(state => state !== true && state !== false)) return 'deletion-fence-invalid'
    if (states.some(state => state === true)) return 'deletion-pending'
  }
  return 'active'
}
