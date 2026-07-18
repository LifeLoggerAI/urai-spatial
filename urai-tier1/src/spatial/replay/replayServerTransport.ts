import { getAuth } from 'firebase/auth'
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import type { ReplayOperation, ReplayOperationState, ReplayOperationTransport } from './replayOperations'

export type ReplayServerState = Pick<ReplayOperationState, 'saved' | 'hidden' | 'correction' | 'audit'> & { version: number }

function requireAuthenticatedOwner(ownerId: string) {
  if (!firebasePublicEnvReady) throw new Error('Replay persistence is unavailable.')
  const user = getAuth(app).currentUser
  if (!user) throw new Error('Sign in to change this Replay.')
  if (user.uid !== ownerId) throw new Error('This Replay belongs to another account.')
  return user
}

function parseState(value: unknown): ReplayServerState {
  if (!value || typeof value !== 'object') return { saved: false, hidden: false, version: 0, audit: [] }
  const raw = value as Partial<ReplayServerState>
  return {
    saved: raw.saved === true,
    hidden: raw.hidden === true,
    correction: raw.correction,
    version: typeof raw.version === 'number' && Number.isFinite(raw.version) ? raw.version : 0,
    audit: Array.isArray(raw.audit) ? raw.audit.slice(-50) : [],
  }
}

const safeDocumentToken = (value: string) => value.replaceAll(':', '_')
const stateDocumentId = (memoryId: string) => `state-${safeDocumentToken(memoryId)}`
const operationDocumentId = (operationId: string) => `operation-${safeDocumentToken(operationId)}`

function isAlreadyApplied(state: ReplayServerState, operation: ReplayOperation) {
  if (operation.kind === 'save') return state.saved
  if (operation.kind === 'hide') return state.hidden === (operation.hidden ?? true)
  return false
}

export function createAuthenticatedReplayTransport(): ReplayOperationTransport {
  return {
    async persist(operation) {
      const authenticated = requireAuthenticatedOwner(operation.ownerId)
      const db = getFirebaseDb()
      const operationRef = doc(db, 'users', authenticated.uid, 'replayEvents', operationDocumentId(operation.id))
      const stateRef = doc(db, 'users', authenticated.uid, 'replayEvents', stateDocumentId(operation.memoryId))

      await runTransaction(db, async (transaction) => {
        const [existingOperation, stateSnapshot] = await Promise.all([
          transaction.get(operationRef),
          transaction.get(stateRef),
        ])
        if (existingOperation.exists()) return

        const current = parseState(stateSnapshot.data())
        const duplicate = isAlreadyApplied(current, operation)
        const next: ReplayServerState = duplicate ? current : {
          ...current,
          saved: operation.kind === 'save' ? true : current.saved,
          hidden: operation.kind === 'hide' ? operation.hidden ?? true : current.hidden,
          correction: operation.kind === 'correct' ? operation.correction : current.correction,
          version: current.version + 1,
          audit: [...current.audit.filter((entry) => entry.id !== operation.id), operation].slice(-50),
        }

        transaction.set(operationRef, {
          id: operation.id,
          memoryId: operation.memoryId,
          manifestId: operation.manifestId,
          kind: operation.kind,
          createdAt: operation.createdAt,
          ...(operation.correction ? { correction: operation.correction } : {}),
          ...(operation.hidden === undefined ? {} : { hidden: operation.hidden }),
          userId: authenticated.uid,
          ownerId: authenticated.uid,
          authenticatedUid: authenticated.uid,
          eventType: 'replay-operation',
          outcome: duplicate ? 'already-applied' : 'committed',
          committedAt: serverTimestamp(),
          stateVersion: next.version,
        })
        if (!duplicate) {
          transaction.set(stateRef, {
            saved: next.saved,
            hidden: next.hidden,
            correction: next.correction ?? null,
            version: next.version,
            audit: next.audit,
            userId: authenticated.uid,
            ownerId: authenticated.uid,
            memoryId: operation.memoryId,
            manifestId: operation.manifestId,
            eventType: 'replay-state',
            updatedAt: serverTimestamp(),
          }, { merge: true })
        }
      })

      const current = requireAuthenticatedOwner(operation.ownerId)
      if (current.uid !== authenticated.uid) throw new Error('The signed-in account changed before Replay persistence completed.')
    },
  }
}

export async function readAuthenticatedReplayServerState(ownerId: string, memoryId: string): Promise<ReplayServerState> {
  const authenticated = requireAuthenticatedOwner(ownerId)
  const snapshot = await getDoc(doc(getFirebaseDb(), 'users', authenticated.uid, 'replayEvents', stateDocumentId(memoryId)))
  const current = requireAuthenticatedOwner(ownerId)
  if (current.uid !== authenticated.uid) throw new Error('The signed-in account changed while Replay history was loading.')
  return parseState(snapshot.data())
}
