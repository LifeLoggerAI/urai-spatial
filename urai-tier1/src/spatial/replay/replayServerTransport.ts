import { getAuth } from 'firebase/auth'
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import type { ReplayOperation, ReplayOperationTransport } from './replayOperations'

export type ReplayServerState = { saved: boolean; hidden: boolean; correction?: ReplayOperation['correction']; version: number; audit: ReplayOperation[] }

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
  return { saved: raw.saved === true, hidden: raw.hidden === true, correction: raw.correction, version: typeof raw.version === 'number' && Number.isFinite(raw.version) ? raw.version : 0, audit: Array.isArray(raw.audit) ? raw.audit.slice(-50) : [] }
}

function firestoreDocumentId(prefix: 'state' | 'operation', value: string) {
  if (!value || value.length > 500) throw new Error('Replay identity is invalid.')
  return `${prefix}-${encodeURIComponent(value)}`
}

const stateDocumentId = (memoryId: string) => firestoreDocumentId('state', memoryId)
const operationDocumentId = (operationId: string) => firestoreDocumentId('operation', operationId)

export function createAuthenticatedReplayTransport(): ReplayOperationTransport {
  return { async persist(operation) {
    const user = requireAuthenticatedOwner(operation.ownerId)
    const db = getFirebaseDb()
    const operationRef = doc(db, 'users', user.uid, 'replayEvents', operationDocumentId(operation.id))
    const stateRef = doc(db, 'users', user.uid, 'replayEvents', stateDocumentId(operation.memoryId))
    await runTransaction(db, async (transaction) => {
      const [existingOperation, stateSnapshot] = await Promise.all([transaction.get(operationRef), transaction.get(stateRef)])
      if (existingOperation.exists()) return
      const state = parseState(stateSnapshot.data())
      const next: ReplayServerState = {
        ...state,
        saved: operation.kind === 'save' ? true : state.saved,
        hidden: operation.kind === 'hide' ? true : state.hidden,
        correction: operation.kind === 'correct' ? operation.correction : state.correction,
        version: state.version + 1,
        audit: [...state.audit.filter((entry) => entry.id !== operation.id), operation].slice(-50),
      }
      transaction.set(operationRef, { ...operation, userId: user.uid, authenticatedUid: user.uid, eventType: 'replay-operation', committedAt: serverTimestamp(), stateVersion: next.version })
      transaction.set(stateRef, { ...next, userId: user.uid, ownerId: user.uid, memoryId: operation.memoryId, manifestId: operation.manifestId, eventType: 'replay-state', updatedAt: serverTimestamp() }, { merge: true })
    })
  } }
}

export async function readAuthenticatedReplayServerState(ownerId: string, memoryId: string): Promise<ReplayServerState> {
  const user = requireAuthenticatedOwner(ownerId)
  const snapshot = await getDoc(doc(getFirebaseDb(), 'users', user.uid, 'replayEvents', stateDocumentId(memoryId)))
  return parseState(snapshot.data())
}
