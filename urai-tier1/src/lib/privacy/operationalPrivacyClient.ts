'use client'

import { collection, limit, onSnapshot, orderBy, query, type DocumentData, type Unsubscribe } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { getAuth } from 'firebase/auth'
import { app, firebasePublicEnvReady, functions, getFirebaseDb } from '@/lib/firebase/client'
import { fetchAuthorizedOperationalExport, validateOperationalExportDescriptor, type OperationalExportRequest } from './authorizedExportDownload'

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

export async function callOperationalPrivacyFunction<T extends PrivacyCallableResult = PrivacyCallableResult>(name: string, payload?: Record<string, unknown>): Promise<T> {
  const callable = httpsCallable<Record<string, unknown> | undefined, T>(functions, name)
  const response = await callable(payload)
  return response.data
}

export function applyOperationalConsentPolicy(payload: { domain: string; next: Record<string, unknown>; expectedRevision: number; operationId?: string }) {
  return callOperationalPrivacyFunction('applyConsentPolicy', { ...payload, operationId: payload.operationId ?? operationId('consent') })
}

export function getOperationalPassportSnapshot() { return callOperationalPrivacyFunction('getPassportSnapshot') }
export function createOperationalExportRequest(scopes: string[], suppliedOperationId?: string) {
  return callOperationalPrivacyFunction('createSpatialExportRequest', { scopes, operationId: suppliedOperationId ?? operationId('export') })
}
// Operational Spatial jobs remain users/{uid}/exportJobs. Privacy root jobs and
// downloadExportPackage have a separate authority and are never selected here.
export async function getOperationalExportDownloadUrl(payload: OperationalExportRequest) {
  const value = await callOperationalPrivacyFunction('getOperationalExportDownloadUrl', payload)
  return validateOperationalExportDescriptor(value, payload, app.options.projectId ?? '')
}
export async function downloadOperationalExportBytes(payload: OperationalExportRequest, lifecycle: { signal: AbortSignal; isCurrent: () => boolean }) {
  const auth = getAuth(app)
  const owner = auth.currentUser
  if (!firebasePublicEnvReady || !owner) throw new Error('AUTH_REQUIRED')
  const isCurrent = () => !lifecycle.signal.aborted && lifecycle.isCurrent() && auth.currentUser === owner
  if (!isCurrent()) throw new DOMException('Export transfer stopped.', 'AbortError')
  const descriptor = await getOperationalExportDownloadUrl(payload)
  if (!isCurrent()) throw new DOMException('Export transfer stopped.', 'AbortError')
  if (descriptor.ownerId !== owner.uid) throw new Error('AUTH_REQUIRED')
  return fetchAuthorizedOperationalExport({ descriptor, request: payload, projectId: app.options.projectId ?? '',
    signal: lifecycle.signal, isCurrent, getIdToken: () => owner.getIdToken(true) })
}
export function cancelOperationalExportRequest(jobId: string) { return callOperationalPrivacyFunction('cancelSpatialExportRequest', { jobId }) }
export function createOperationalDeletionRequest(payload: { scope: string; confirmation: string; reason?: string; operationId?: string }) {
  return callOperationalPrivacyFunction('createSpatialDeletionRequest', { ...payload, operationId: payload.operationId ?? operationId('deletion') })
}
export function cancelOperationalDeletionRequest(jobId: string) { return callOperationalPrivacyFunction('cancelSpatialDeletionRequest', { jobId }) }

export function subscribeOperationalUserCollection(collectionName: string, uid: string, onRows: (rows: PrivacyRow[]) => void, onError: (error: Error) => void): Unsubscribe {
  requireUserCollection(collectionName)
  const base = collection(getFirebaseDb(), 'users', uid, collectionName)
  const orderedCollections = new Set(['privacyReceipts', 'exportJobs', 'deletionJobs'])
  const request = orderedCollections.has(collectionName) ? query(base, orderBy('createdAt', 'desc'), limit(50)) : query(base, limit(100))
  return onSnapshot(request, (snapshot) => onRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), onError)
}
