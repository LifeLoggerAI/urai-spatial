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
const storageKey = (ownerId: string, memoryId: string) => `${STORAGE_PREFIX}${ownerId}:${memoryId}`
const emptyState = (): ReplayOperationState => ({ saved: false, hidden: false, pending: [], audit: [] })

function isOperation(value: unknown): value is ReplayOperation {
  if (!value || typeof value !== 'object') return false
  const operation = value as Partial<ReplayOperation>
  return typeof operation.id === 'string'
    && typeof operation.memoryId === 'string'
    && typeof operation.manifestId === 'string'
    && typeof operation.ownerId === 'string'
    && (operation.kind === 'save' || operation.kind === 'hide' || operation.kind === 'correct')
    && typeof operation.createdAt === 'string'
}

export function readReplayOperationState(storage: Pick<ReplayOperationStorage, 'getItem'>, ownerId: string, memoryId: string): ReplayOperationState {
  try {
    const raw = storage.getItem(storageKey(ownerId, memoryId))
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<ReplayOperationState>
    return {
      saved: parsed.saved === true,
      hidden: parsed.hidden === true,
      correction: parsed.correction,
      pending: Array.isArray(parsed.pending) ? parsed.pending.filter(isOperation) : [],
      audit: Array.isArray(parsed.audit) ? parsed.audit.filter(isOperation).slice(-MAX_AUDIT_ENTRIES) : [],
      error: typeof parsed.error === 'string' ? parsed.error : undefined,
    }
  } catch { return emptyState() }
}

export function writeReplayOperationState(storage: Pick<ReplayOperationStorage, 'setItem'>, ownerId: string, memoryId: string, state: ReplayOperationState) {
  storage.setItem(storageKey(ownerId, memoryId), JSON.stringify({ ...state, audit: state.audit.slice(-MAX_AUDIT_ENTRIES) }))
}

export function applyReplayOperation(state: ReplayOperationState, operation: ReplayOperation): ReplayOperationState {
  const next: ReplayOperationState = { ...state, error: undefined, pending: [...state.pending, operation], audit: [...state.audit, operation].slice(-MAX_AUDIT_ENTRIES) }
  if (operation.kind === 'save') next.saved = true
  if (operation.kind === 'hide') next.hidden = true
  if (operation.kind === 'correct' && operation.correction) next.correction = operation.correction
  return next
}

export function rollbackReplayOperation(state: ReplayOperationState, operation: ReplayOperation, message: string): ReplayOperationState {
  const previousAudit = state.audit.filter((entry) => entry.id !== operation.id)
  const replayed = previousAudit.reduce<ReplayOperationState>((current, entry) => ({ ...applyReplayOperation({ ...current, pending: [] }, entry), pending: [] }), emptyState())
  return { ...replayed, pending: state.pending.filter((entry) => entry.id !== operation.id), audit: previousAudit, error: message }
}

export function settleReplayOperation(state: ReplayOperationState, operationId: string): ReplayOperationState {
  return { ...state, pending: state.pending.filter((entry) => entry.id !== operationId), error: undefined }
}

export async function executeReplayOperation(options: { storage: ReplayOperationStorage; transport: ReplayOperationTransport; operation: ReplayOperation; onOptimistic?: (state: ReplayOperationState) => void; onSettled?: (state: ReplayOperationState) => void }): Promise<ReplayOperationState> {
  const { storage, transport, operation, onOptimistic, onSettled } = options
  const current = readReplayOperationState(storage, operation.ownerId, operation.memoryId)
  const optimistic = applyReplayOperation(current, operation)
  writeReplayOperationState(storage, operation.ownerId, operation.memoryId, optimistic)
  onOptimistic?.(optimistic)
  try {
    await transport.persist(operation)
    const settled = settleReplayOperation(optimistic, operation.id)
    writeReplayOperationState(storage, operation.ownerId, operation.memoryId, settled)
    onSettled?.(settled)
    return settled
  } catch (error) {
    const rolledBack = rollbackReplayOperation(optimistic, operation, error instanceof Error ? error.message : 'Replay operation could not be saved.')
    writeReplayOperationState(storage, operation.ownerId, operation.memoryId, rolledBack)
    onSettled?.(rolledBack)
    return rolledBack
  }
}

export async function flushReplayOperationQueue(options: { storage: ReplayOperationStorage; transport: ReplayOperationTransport; ownerId: string; memoryId: string }): Promise<ReplayOperationState> {
  const { storage, transport, ownerId, memoryId } = options
  let state = readReplayOperationState(storage, ownerId, memoryId)
  for (const operation of [...state.pending]) {
    try {
      await transport.persist(operation)
      state = settleReplayOperation(state, operation.id)
      writeReplayOperationState(storage, ownerId, memoryId, state)
    } catch { break }
  }
  return state
}
