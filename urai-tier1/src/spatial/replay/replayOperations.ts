export type ReplayOperationKind = 'save' | 'hide' | 'correct'

export type ReplayCorrection = {
  field: 'title' | 'summary' | 'emotion' | 'people' | 'place'
  previousValue: unknown
  nextValue: unknown
  reason?: string
}

export type ReplayOperation = {
  id: string
  memoryId: string
  manifestId: string
  ownerId: string
  kind: ReplayOperationKind
  createdAt: string
  correction?: ReplayCorrection
}

export type ReplayOperationState = {
  saved: boolean
  hidden: boolean
  correction?: ReplayCorrection
  pending: ReplayOperation[]
  audit: ReplayOperation[]
  error?: string
}

export type ReplayOperationTransport = { persist(operation: ReplayOperation): Promise<void> }
export type ReplayOperationStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const STORAGE_PREFIX = 'urai-replay-operations-v1:'
const MAX_AUDIT_ENTRIES = 100
const CORRECTION_FIELDS = new Set<ReplayCorrection['field']>(['title', 'summary', 'emotion', 'people', 'place'])
const storageKey = (ownerId: string, memoryId: string) => `${STORAGE_PREFIX}${ownerId}:${memoryId}`
const emptyState = (): ReplayOperationState => ({ saved: false, hidden: false, pending: [], audit: [] })

function isCorrection(value: unknown): value is ReplayCorrection {
  if (!value || typeof value !== 'object') return false
  const correction = value as Partial<ReplayCorrection>
  return typeof correction.field === 'string'
    && CORRECTION_FIELDS.has(correction.field as ReplayCorrection['field'])
    && Object.prototype.hasOwnProperty.call(correction, 'previousValue')
    && Object.prototype.hasOwnProperty.call(correction, 'nextValue')
    && (correction.reason === undefined || typeof correction.reason === 'string')
}

function isOperation(value: unknown): value is ReplayOperation {
  if (!value || typeof value !== 'object') return false
  const operation = value as Partial<ReplayOperation>
  const kindIsValid = operation.kind === 'save' || operation.kind === 'hide' || operation.kind === 'correct'
  if (typeof operation.id !== 'string'
    || typeof operation.memoryId !== 'string'
    || typeof operation.manifestId !== 'string'
    || typeof operation.ownerId !== 'string'
    || !kindIsValid
    || typeof operation.createdAt !== 'string') return false
  if (operation.kind === 'correct') return isCorrection(operation.correction)
  return operation.correction === undefined || isCorrection(operation.correction)
}

function belongsTo(operation: ReplayOperation, ownerId: string, memoryId: string) {
  return operation.ownerId === ownerId && operation.memoryId === memoryId
}

export function readReplayOperationState(storage: Pick<ReplayOperationStorage, 'getItem'>, ownerId: string, memoryId: string): ReplayOperationState {
  try {
    const raw = storage.getItem(storageKey(ownerId, memoryId))
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<ReplayOperationState>
    const pending = Array.isArray(parsed.pending)
      ? parsed.pending.filter(isOperation).filter((operation) => belongsTo(operation, ownerId, memoryId))
      : []
    const audit = Array.isArray(parsed.audit)
      ? parsed.audit.filter(isOperation).filter((operation) => belongsTo(operation, ownerId, memoryId)).slice(-MAX_AUDIT_ENTRIES)
      : []
    return {
      saved: parsed.saved === true,
      hidden: parsed.hidden === true,
      correction: isCorrection(parsed.correction) ? parsed.correction : undefined,
      pending,
      audit,
      error: typeof parsed.error === 'string' ? parsed.error : undefined,
    }
  } catch {
    return emptyState()
  }
}

export function writeReplayOperationState(storage: Pick<ReplayOperationStorage, 'setItem'>, ownerId: string, memoryId: string, state: ReplayOperationState): boolean {
  try {
    storage.setItem(storageKey(ownerId, memoryId), JSON.stringify({ ...state, audit: state.audit.slice(-MAX_AUDIT_ENTRIES) }))
    return true
  } catch {
    return false
  }
}

export function applyReplayOperation(state: ReplayOperationState, operation: ReplayOperation): ReplayOperationState {
  const pending = state.pending.some((entry) => entry.id === operation.id) ? state.pending : [...state.pending, operation]
  const audit = state.audit.some((entry) => entry.id === operation.id)
    ? state.audit
    : [...state.audit, operation].slice(-MAX_AUDIT_ENTRIES)
  const next: ReplayOperationState = { ...state, error: undefined, pending, audit }
  if (operation.kind === 'save') next.saved = true
  if (operation.kind === 'hide') next.hidden = true
  if (operation.kind === 'correct' && operation.correction) next.correction = operation.correction
  return next
}

export function rollbackReplayOperation(state: ReplayOperationState, operation: ReplayOperation, message: string): ReplayOperationState {
  const retainedAudit = state.audit.filter((entry) => entry.id !== operation.id)
  const replayed = retainedAudit.reduce<ReplayOperationState>((current, entry) => {
    const applied = applyReplayOperation({ ...current, pending: [] }, entry)
    return { ...applied, pending: [] }
  }, emptyState())
  return {
    ...replayed,
    pending: state.pending.filter((entry) => entry.id !== operation.id),
    audit: retainedAudit,
    error: message,
  }
}

export function settleReplayOperation(state: ReplayOperationState, operationId: string): ReplayOperationState {
  return { ...state, pending: state.pending.filter((entry) => entry.id !== operationId), error: undefined }
}

export async function executeReplayOperation(options: {
  storage: ReplayOperationStorage
  transport: ReplayOperationTransport
  operation: ReplayOperation
  onOptimistic?: (state: ReplayOperationState) => void
  onSettled?: (state: ReplayOperationState) => void
}): Promise<ReplayOperationState> {
  const { storage, transport, operation, onOptimistic, onSettled } = options
  const current = readReplayOperationState(storage, operation.ownerId, operation.memoryId)
  const optimistic = applyReplayOperation(current, operation)
  writeReplayOperationState(storage, operation.ownerId, operation.memoryId, optimistic)
  onOptimistic?.(optimistic)
  try {
    await transport.persist(operation)
    const latest = readReplayOperationState(storage, operation.ownerId, operation.memoryId)
    const settled = settleReplayOperation(latest, operation.id)
    writeReplayOperationState(storage, operation.ownerId, operation.memoryId, settled)
    onSettled?.(settled)
    return settled
  } catch (error) {
    const latest = readReplayOperationState(storage, operation.ownerId, operation.memoryId)
    const rolledBack = rollbackReplayOperation(
      latest,
      operation,
      error instanceof Error ? error.message : 'Replay operation could not be saved.',
    )
    writeReplayOperationState(storage, operation.ownerId, operation.memoryId, rolledBack)
    onSettled?.(rolledBack)
    return rolledBack
  }
}

export async function flushReplayOperationQueue(options: {
  storage: ReplayOperationStorage
  transport: ReplayOperationTransport
  ownerId: string
  memoryId: string
}): Promise<ReplayOperationState> {
  const { storage, transport, ownerId, memoryId } = options
  const initial = readReplayOperationState(storage, ownerId, memoryId)
  let state = initial
  for (const operation of [...initial.pending]) {
    try {
      await transport.persist(operation)
      const latest = readReplayOperationState(storage, ownerId, memoryId)
      state = settleReplayOperation(latest, operation.id)
      writeReplayOperationState(storage, ownerId, memoryId, state)
    } catch {
      return readReplayOperationState(storage, ownerId, memoryId)
    }
  }
  return readReplayOperationState(storage, ownerId, memoryId)
}
