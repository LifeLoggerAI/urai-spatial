'use client'

import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { functions, getFirebaseDb } from '@/lib/firebase/client'

export type PrivacyRow = DocumentData & { id: string }
export type PrivacyCallableResult = Record<string, unknown>

const USER_COLLECTIONS = new Set([
  'privacyRequests',
  'exportJobs',
  'deletionRequests',
  'consentRecords',
  'dataAccessEvents',
])

function requireUserCollection(collectionName: string) {
  if (!USER_COLLECTIONS.has(collectionName)) {
    throw new Error(`UNSUPPORTED_PRIVACY_COLLECTION:${collectionName}`)
  }
}

export async function callOperationalPrivacyFunction<T extends PrivacyCallableResult = PrivacyCallableResult>(
  name: string,
  payload?: Record<string, unknown>,
): Promise<T> {
  const callable = httpsCallable<Record<string, unknown> | undefined, T>(functions, name)
  const response = await callable(payload)
  return response.data
}

export function createOperationalExportRequest() {
  return callOperationalPrivacyFunction('createExportRequest')
}

export function getOperationalExportDownloadUrl(payload: { jobId: string; file?: 'export' | 'manifest' }) {
  return callOperationalPrivacyFunction('getExportDownloadUrl', payload)
}

export function createOperationalDeletionRequest(reason: string) {
  return callOperationalPrivacyFunction('createDeletionRequest', { reason })
}

export function subscribeOperationalUserCollection(
  collectionName: string,
  uid: string,
  onRows: (rows: PrivacyRow[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  requireUserCollection(collectionName)
  const request = query(collection(getFirebaseDb(), collectionName), where('uid', '==', uid), limit(50))
  return onSnapshot(
    request,
    (snapshot) => onRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    (error) => onError(error),
  )
}

export function subscribeOperationalAuditLogs(
  uid: string,
  onRows: (rows: PrivacyRow[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const request = query(
    collection(getFirebaseDb(), 'auditLogs'),
    where('targetUid', '==', uid),
    orderBy('timestamp', 'desc'),
    limit(50),
  )
  return onSnapshot(
    request,
    (snapshot) => onRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    (error) => onError(error),
  )
}
