'use client'

import { collection, limit, onSnapshot, orderBy, query, type DocumentData, type Unsubscribe } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { app, functions, getFirebaseDb } from '@/lib/firebase/client'
import { notifyManualWeatherRevocation } from '@/lib/uraiEmotion/manualWeatherSession'
import { requireOperationalPrivacyContract } from './privacyContractAuthority'
import { assertOperationalPrivacyBackendCapabilities } from './privacyBackendCapability'

export type PrivacyRow = DocumentData & { id: string }
export type PrivacyCallableResult = Record<string, unknown>
export type ConsentEnforcementState =
  | 'requested'
  | 'validating'
  | 'partially-enforced'
  | 'fully-enforced'
  | 'failed'
  | 'conflicted'

const USER_COLLECTIONS = new Set([
  'privacyReceipts',
  'exportJobs',
  'deletionJobs',
  'privacyRuntime',
  'dataSources',
  'devices',
  'providerConnections',
])

function requireUserCollection(collectionName: string) {
  if (!USER_COLLECTIONS.has(collectionName)) {
    throw new Error(`UNSUPPORTED_PRIVACY_COLLECTION:${collectionName}`)
  }
}

function operationId(prefix: string) {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${random}`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 96)
}

const SCOPED_COLLISION_CALLABLES = new Set(['createSpatialExportRequest', 'createSpatialDeletionRequest', 'getOperationalExportDownloadUrl'])

/** Fail closed when Firebase switches accounts while a scoped request is pending. */
function assertSameOwner(auth: ReturnType<typeof getAuth>, owner: NonNullable<ReturnType<typeof getAuth>['currentUser']>, projectId: string): void {
  if (!owner.uid || !projectId || auth.currentUser !== owner || auth.currentUser?.uid !== owner.uid || app.options.projectId !== projectId) {
    throw new Error('OPERATIONAL_PRIVACY_AUTH_CHANGED')
  }
}

async function verifyScopedOperationalPrivacyBackend(owner: NonNullable<ReturnType<typeof getAuth>['currentUser']>, projectId: string, assertCurrent: () => void): Promise<void> {
  assertCurrent()
  const prove = httpsCallable<undefined, unknown>(functions, 'getOperationalPrivacyCapabilities')
  const response = await prove()
  assertCurrent()
  assertOperationalPrivacyBackendCapabilities(response.data, { uid: owner.uid, projectId })
}

export async function callOperationalPrivacyFunction<T extends PrivacyCallableResult = PrivacyCallableResult>(name: string, payload?: Record<string, unknown>): Promise<T> {
  requireOperationalPrivacyContract(process.env.NEXT_PUBLIC_URAI_PRIVACY_CONTRACT)
  const auth = getAuth(app)
  const owner = auth.currentUser
  const projectId = app.options.projectId
  if (!owner?.uid || !projectId) throw new Error('OPERATIONAL_PRIVACY_BACKEND_UNVERIFIED')
  const assertCurrent = () => assertSameOwner(auth, owner, projectId)
  assertCurrent()
  // A canonical purpose grant cannot impersonate operational scoped authority.
  if (SCOPED_COLLISION_CALLABLES.has(name)) await verifyScopedOperationalPrivacyBackend(owner, projectId, assertCurrent)
  assertCurrent()
  const callable = httpsCallable<Record<string, unknown> | undefined, T>(functions, name)
  const response = await callable(payload)
  assertCurrent() // Never expose an obsolete account result after an auth switch.
  return response.data
}

export function applyOperationalConsentPolicy(payload: { domain: string; next: Record<string, unknown>; expectedRevision: number; operationId?: string }) {
  notifyManualWeatherRevocation()
  return callOperationalPrivacyFunction('applyConsentPolicy', { ...payload, operationId: payload.operationId ?? operationId('consent') })
}

export function getOperationalPassportSnapshot() { return callOperationalPrivacyFunction('getPassportSnapshot') }
export function createOperationalExportRequest(scopes: string[], suppliedOperationId?: string) {
  return callOperationalPrivacyFunction('createSpatialExportRequest', { scopes, operationId: suppliedOperationId ?? operationId('export') })
}
export function getOperationalExportDownloadUrl(payload: { jobId: string; file?: 'export' | 'manifest' | 'runtime'; assetId?: string }) { return callOperationalPrivacyFunction('getOperationalExportDownloadUrl', payload) }
export function cancelOperationalExportRequest(jobId: string) { return callOperationalPrivacyFunction('cancelSpatialExportRequest', { jobId }) }
export function createOperationalDeletionRequest(payload: { scope: string; confirmation: string; reason?: string; operationId?: string }) {
  notifyManualWeatherRevocation()
  return callOperationalPrivacyFunction('createSpatialDeletionRequest', { ...payload, operationId: payload.operationId ?? operationId('deletion') })
}
export function cancelOperationalDeletionRequest(jobId: string) { return callOperationalPrivacyFunction('cancelSpatialDeletionRequest', { jobId }) }

export function subscribeOperationalUserCollection(collectionName: string, uid: string, onRows: (rows: PrivacyRow[]) => void, onError: (error: Error) => void): Unsubscribe {
  requireOperationalPrivacyContract(process.env.NEXT_PUBLIC_URAI_PRIVACY_CONTRACT)
  requireUserCollection(collectionName)
  const base = collection(getFirebaseDb(), 'users', uid, collectionName)
  const orderedCollections = new Set(['privacyReceipts', 'exportJobs', 'deletionJobs'])
  const request = orderedCollections.has(collectionName) ? query(base, orderBy('createdAt', 'desc'), limit(50)) : query(base, limit(100))
  return onSnapshot(request, (snapshot) => onRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), onError)
}