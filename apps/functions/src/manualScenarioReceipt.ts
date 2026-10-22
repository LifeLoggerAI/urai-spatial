/**
 * A manual What-If branch write may be retried after its HTTP response is lost.
 * Bind the operation ID to the exact normalized request and the currently
 * accepted branches. This decision never grants account or privacy authority:
 * the caller must check those in the SAME Firestore transaction.
 */
export type ManualScenarioReceipt = Readonly<{
  kind: 'scenario-manual-branches'
  ownerId: string
  scenarioId: string
  operationId: string
  requestHash: string
  branchIds: readonly string[]
}>

export type ManualBranchMutationDecision =
  | { status: 'create' }
  | { status: 'repeat'; branchIds: string[] }
  | { status: 'operation-conflict' | 'receipt-stale' | 'scenario-not-awaiting' }

type Input = {
  ownerId: string
  scenarioId: string
  operationId: string
  requestHash: string
  scenarioStatus: unknown
  activeBranchIds: unknown
  receipt: unknown
}

export function resolveManualBranchMutation(input: Input): ManualBranchMutationDecision {
  const receipt = input.receipt
  if (receipt === null || receipt === undefined) {
    return input.scenarioStatus === 'awaiting-assumptions'
      ? { status: 'create' } : { status: 'scenario-not-awaiting' }
  }
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    return { status: 'operation-conflict' }
  }
  const stored = receipt as Record<string, unknown>
  if (stored.kind !== 'scenario-manual-branches'
    || stored.ownerId !== input.ownerId
    || stored.scenarioId !== input.scenarioId
    || stored.operationId !== input.operationId
    || stored.requestHash !== input.requestHash) {
    return { status: 'operation-conflict' }
  }
  const ids = stored.branchIds
  const active = input.activeBranchIds
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 3
    || ids.some(id => typeof id !== 'string' || !/^br_[A-Za-z0-9_-]{12,96}$/.test(id))
    || new Set(ids).size !== ids.length
    || !Array.isArray(active)
    || active.length !== ids.length
    || ids.some((id, index) => active[index] !== id)
    || !['ready', 'saved'].includes(String(input.scenarioStatus))) {
    return { status: 'receipt-stale' }
  }
  return { status: 'repeat', branchIds: [...ids] }
}
