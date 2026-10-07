'use client'

import { collection, limit, onSnapshot, orderBy, query, type DocumentData, type Unsubscribe } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { getAuth } from 'firebase/auth'
import { fetchAuthorizedOperationalExport } from './authorizedExportDownload'
import { app, functions, getFirebaseDb } from '@/lib/firebase/client'

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
  return callOperationalPrivacyFunction('createExportRequest', { scopes, operationId: suppliedOperationId ?? operationId('export') })
}
export function getOperationalExportDownloadUrl(payload: { jobId: string; file?: 'export' | 'manifest' | 'runtime'; assetId?: string }) { return callOperationalPrivacyFunction('getOperationalExportDownloadUrl', payload) }
export async function saveOperationalExportDownload(result: PrivacyCallableResult, isCurrent: () => boolean) {
  const auth = getAuth(app)
  const user = auth.currentUser
  const file = result.file === 'runtime' ? 'runtime' : result.file === 'manifest' ? 'manifest' : 'export'
  const requireCurrent = () => {
    if (!user || auth.currentUser !== user || result.ownerId !== user.uid || !isCurrent()) {
      throw new Error('Current owner authentication is required.')
    }
  }
  requireCurrent()
  if (typeof result.url !== 'string' || result.requiresAuthorization !== true) throw new Error('Authenticated export delivery is required.')
  const contents = await fetchAuthorizedOperationalExport({ url: result.url, origin: window.location.origin, projectId: app.options.projectId ?? '', jobId: String(result.jobId ?? ''), assetId: typeof result.assetId === 'string' ? result.assetId : undefined, file, current: () => !!user && auth.currentUser === user && isCurrent(),
    getIdToken: async () => { requireCurrent(); const token = await user!.getIdToken(true); requireCurrent(); return token },
  })
  requireCurrent()
  const objectUrl = URL.createObjectURL(contents)
  try {
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = `urai-${file}.${file === 'runtime' ? 'splat' : 'json'}`
    link.rel = 'noopener noreferrer'
    document.body.append(link); link.click(); link.remove()
  } finally { setTimeout(() => URL.revokeObjectURL(objectUrl), 1000) }
}

export function cancelOperationalExportRequest(jobId: string) { return callOperationalPrivacyFunction('cancelExportRequest', { jobId }) }
export function createOperationalDeletionRequest(payload: { scope: string; confirmation: string; reason?: string; operationId?: string }) {
  return callOperationalPrivacyFunction('createDeletionRequest', { ...payload, operationId: payload.operationId ?? operationId('deletion') })
}
export function cancelOperationalDeletionRequest(jobId: string) { return callOperationalPrivacyFunction('cancelDeletionRequest', { jobId }) }

export function subscribeOperationalUserCollection(collectionName: string, uid: string, onRows: (rows: PrivacyRow[]) => void, onError: (error: Error) => void): Unsubscribe {
  requireUserCollection(collectionName)
  const base = collection(getFirebaseDb(), 'users', uid, collectionName)
  const orderedCollections = new Set(['privacyReceipts', 'exportJobs', 'deletionJobs'])
  const request = orderedCollections.has(collectionName) ? query(base, orderBy('createdAt', 'desc'), limit(50)) : query(base, limit(100))
  return onSnapshot(request, (snapshot) => onRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), onError)
}