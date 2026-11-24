'use client'

// Canonical account-wide requests, restricted to the existing disposable local lab.
// This does not translate named-purpose consent into operational-v1 authority.
import { fetchVerifiedExport, matchesExportEndpoint, CANONICAL_EXPORT_RANGE_BYTES, CANONICAL_SINGLE_RESPONSE_BYTES, MAX_OPERATIONAL_EXPORT_BYTES, OperationalExportDownloadSession } from './authorizedExportDownload'
import { notifyManualWeatherRevocation } from '@/lib/uraiEmotion/manualWeatherSession'
import type { User } from 'firebase/auth'
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { app, disposableFirebaseReviewAuthorized, functions, getFirebaseDb, getUrAiAuth, privacyExportEmulatorOrigin } from '@/lib/firebase/client'

export type CanonicalPurpose = 'memory.storage' | 'data.export'
export type CanonicalConsentStatus = 'granted' | 'denied' | 'revoked'
type Result = Record<string, unknown>
export type CanonicalExportRequest = { requestId: string; exportJobId: string; status: 'pending' }
export type CanonicalDeletionRequest = { requestId: string; status: 'pending' }
export type CanonicalExportState = {
  jobId: string; requestId: string; status: string; serverConfirmed: boolean
  complete: boolean; exportSha256: string | null; packageExpiresAt: number | null; downloadEligible: boolean
}
export type CanonicalDeletionState = {
  requestId: string; status: string; serverConfirmed: boolean; scope: 'account'
}
export type CanonicalDownload = {
  jobId: string; requestId: string; downloadExpiresAt: number
}

const EXPORT_STATUSES = new Set(['pending', 'approved', 'processing', 'completed', 'rejected', 'failed', 'expired', 'artifact_cleanup', 'cleanup_blocked'])
const DELETION_STATUSES = new Set(['pending', 'approved', 'processing', 'completed', 'rejected', 'failed'])
const PURPOSES = new Set(['memory.storage', 'data.export'])
const CONSENT_STATUSES = new Set(['granted', 'denied', 'revoked'])
const id = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(value)
const object = (value: unknown): Result => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('CANONICAL_RESPONSE_INVALID')
  return value as Result
}
function timestamp(value: unknown): number | null {
  if (!value || typeof (value as { toMillis?: unknown }).toMillis !== 'function') return null
  const millis = (value as { toMillis: () => number }).toMillis()
  return Number.isFinite(millis) && millis > 0 ? millis : null
}

export function createCanonicalAccountPrivacySession(owner: User) {
  if (!disposableFirebaseReviewAuthorized()) throw new Error('LOCAL_EMULATOR_ONLY')
  const auth = getUrAiAuth()
  const projectId = app.options.projectId
  let closed = false
  const stops = new Set<Unsubscribe>()
  const delivery = new OperationalExportDownloadSession()
  let grants = new WeakMap<CanonicalDownload, { row: CanonicalExportState; receipt: Result }>()
  const exportStates = new Map<string, CanonicalExportState>()
  const isCurrent = () => !closed && disposableFirebaseReviewAuthorized() && !!owner.uid
    && auth.currentUser === owner && auth.currentUser.uid === owner.uid
    && !!projectId && app.options.projectId === projectId
  const assertCurrent = () => {
    if (!isCurrent()) throw new Error('CANONICAL_ACCOUNT_AUTH_CHANGED')
  }
  assertCurrent()

  async function call(name: string, payload: Result = {}): Promise<Result> {
    assertCurrent()
    if (name === 'setCanonicalConsent' || name === 'createDeletionRequest') notifyManualWeatherRevocation()
    const callable = httpsCallable<Result, unknown>(functions, name, { timeout: 30000 })
    assertCurrent()
    const result = await callable(payload)
    assertCurrent()
    return object(result.data)
  }

  function watch<T>(collectionName: 'exportJobs' | 'deletionRequests', documentId: string,
    parse: (value: Result, confirmed: boolean) => T, onValue: (value: T) => void,
    onError: (error: Error) => void, invalidate: () => void): Unsubscribe {
    assertCurrent()
    if (!id(documentId)) throw new Error('CANONICAL_REQUEST_ID_INVALID')
    let active = true
    const fail = () => {
      invalidate()
      if (active && isCurrent()) onError(new Error('CANONICAL_REQUEST_STATUS_UNVERIFIED'))
    }
    const unsubscribe = onSnapshot(doc(getFirebaseDb(), collectionName, documentId), { includeMetadataChanges: true }, snapshot => {
      if (!active || !isCurrent()) return
      try {
        if (!snapshot.exists() || snapshot.id !== documentId) throw new Error('CANONICAL_REQUEST_UNAVAILABLE')
        const value = object(snapshot.data())
        if (value.uid !== owner.uid) throw new Error('CANONICAL_REQUEST_OWNER_MISMATCH')
        const confirmed = snapshot.metadata.fromCache === false && snapshot.metadata.hasPendingWrites === false
        const state = parse(value, confirmed)
        if (active && isCurrent()) onValue(state)
      } catch { fail() }
    }, fail)
    const stop = () => { active = false; invalidate(); unsubscribe(); stops.delete(stop) }
    stops.add(stop)
    return stop
  }

  function validateDownload(value: Result, state: CanonicalExportState) {
    assertCurrent()
    const { uid, jobId, requestId, file, auditId, authorityHash, generation, sha256, byteLength, downloadExpiresAt, packageExpiresAt } = value
    const now = Date.now()
    if (exportStates.get(state.jobId) !== state || !state.downloadEligible || state.packageExpiresAt === null || state.packageExpiresAt <= now) throw new Error('CANONICAL_EXPORT_STATE_CHANGED')
    if (value.schemaVersion !== 'urai-canonical-export-download-v1' || value.requiresAuthorization !== true
      || uid !== owner.uid || jobId !== state.jobId || requestId !== state.requestId || file !== 'export'
      || !id(auditId) || typeof authorityHash !== 'string' || !/^[a-f0-9]{64}$/.test(authorityHash)
      || typeof generation !== 'string' || !/^[1-9][0-9]{0,29}$/.test(generation)
      || typeof sha256 !== 'string' || sha256 !== state.exportSha256 || !/^[a-f0-9]{64}$/.test(sha256)
      || typeof byteLength !== 'number' || !Number.isSafeInteger(byteLength) || byteLength < 1
      || typeof downloadExpiresAt !== 'number' || !Number.isSafeInteger(downloadExpiresAt) || downloadExpiresAt <= now
      || downloadExpiresAt > Math.min(now + 15 * 60 * 1000, state.packageExpiresAt) || packageExpiresAt !== state.packageExpiresAt
      || typeof value.url !== 'string' || value.url.length > 3000) throw new Error('CANONICAL_DOWNLOAD_RECEIPT_INVALID')
    if (byteLength > MAX_OPERATIONAL_EXPORT_BYTES) throw new Error('This browser can download exports up to 64 MiB. Your export package has not been downloaded.')
    const needsRanges = byteLength > CANONICAL_SINGLE_RESPONSE_BYTES
    if (needsRanges ? value.rangeSize !== CANONICAL_EXPORT_RANGE_BYTES : value.rangeSize !== undefined) throw new Error('CANONICAL_DOWNLOAD_RECEIPT_INVALID')
    const range = needsRanges ? { size: CANONICAL_EXPORT_RANGE_BYTES, generation } as const : undefined
    let url: URL
    try { url = new URL(value.url) } catch { throw new Error('CANONICAL_DOWNLOAD_URL_INVALID') }
    const expected = { jobId: state.jobId, file, expiresAt: String(downloadExpiresAt), authorityHash, auditId }
    if (!projectId || !matchesExportEndpoint(url, projectId, 'downloadExportPackage', privacyExportEmulatorOrigin())
      || [...url.searchParams.keys()].length !== Object.keys(expected).length
      || Object.entries(expected).some(([k, v]) => url.searchParams.getAll(k).length !== 1 || url.searchParams.get(k) !== v)) throw new Error('CANONICAL_DOWNLOAD_URL_INVALID')
    return { url: url.href, file, jobId: state.jobId, checksum: sha256, contentType: 'application/json', byteLength, downloadExpiresAt, range } as const
  }
  return {
    isCurrent,
    stopDownload() { delivery.stop(); grants = new WeakMap() },
    close() {
      closed = true
      delivery.stop()
      for (const stop of [...stops]) stop()
      exportStates.clear()
    },
    async setConsent(purpose: CanonicalPurpose, status: CanonicalConsentStatus): Promise<Result> {
      if (!PURPOSES.has(purpose) || !CONSENT_STATUSES.has(status)) throw new Error('CANONICAL_CONSENT_INPUT_INVALID')
      delivery.stop(); grants = new WeakMap()
      return call('setCanonicalConsent', { purpose, status, surface: 'r1513-local-lab' })
    },
    async evaluateConsent(purpose: CanonicalPurpose): Promise<Result> {
      if (!PURPOSES.has(purpose)) throw new Error('CANONICAL_CONSENT_INPUT_INVALID')
      return call('evaluateCanonicalConsent', { purpose, correlationId: crypto.randomUUID() })
    },
    async requestExport(): Promise<CanonicalExportRequest> {
      const value = await call('createExportRequest')
      if (!id(value.requestId) || !id(value.exportJobId) || value.status !== 'pending') throw new Error('CANONICAL_EXPORT_RECEIPT_INVALID')
      return { requestId: value.requestId, exportJobId: value.exportJobId, status: 'pending' }
    },
    watchExport(request: CanonicalExportRequest, onValue: (value: CanonicalExportState) => void, onError: (error: Error) => void): Unsubscribe {
      if (!id(request.requestId) || !id(request.exportJobId)) throw new Error('CANONICAL_REQUEST_ID_INVALID')
      return watch('exportJobs', request.exportJobId, (value, serverConfirmed) => {
        if (value.requestId !== request.requestId || typeof value.status !== 'string' || !EXPORT_STATUSES.has(value.status)
          || (value.complete !== undefined && typeof value.complete !== 'boolean')) throw new Error('CANONICAL_EXPORT_STATE_INVALID')
        const completedAt = timestamp(value.completedAt)
        const packageExpiresAt = timestamp(value.packageExpiresAt) ?? (value.packageExpiresAt == null && completedAt !== null
          ? completedAt + 7 * 24 * 60 * 60 * 1000 : null)
        const exportSha256 = typeof value.exportSha256 === 'string' && /^[a-f0-9]{64}$/.test(value.exportSha256) ? value.exportSha256 : null
        const state = {
          jobId: request.exportJobId, requestId: request.requestId, status: value.status, serverConfirmed,
          complete: value.complete === true, exportSha256, packageExpiresAt,
          downloadEligible: serverConfirmed && value.status === 'completed' && value.complete === true
            && exportSha256 !== null && packageExpiresAt !== null && packageExpiresAt > Date.now(),
        }
        delivery.stop()
        exportStates.set(request.exportJobId, state)
        return state
      }, onValue, onError, () => { delivery.stop(); exportStates.delete(request.exportJobId) })
    },
    async requestDeletion(reason: string, confirmation: string): Promise<CanonicalDeletionRequest> {
      if (confirmation !== 'REQUEST ACCOUNT DELETION' || typeof reason !== 'string' || reason.trim().length < 8 || reason.trim().length > 1000) throw new Error('CANONICAL_DELETION_CONFIRMATION_REQUIRED')
      delivery.stop(); grants = new WeakMap()
      const value = await call('createDeletionRequest', { reason: reason.trim() })
      if (!id(value.requestId) || value.status !== 'pending') throw new Error('CANONICAL_DELETION_RECEIPT_INVALID')
      return { requestId: value.requestId, status: 'pending' }
    },
    watchDeletion(request: CanonicalDeletionRequest, onValue: (value: CanonicalDeletionState) => void, onError: (error: Error) => void): Unsubscribe {
      return watch('deletionRequests', request.requestId, (value, serverConfirmed) => {
        if (value.scope !== 'account' || typeof value.status !== 'string' || !DELETION_STATUSES.has(value.status)) throw new Error('CANONICAL_DELETION_STATE_INVALID')
        return { requestId: request.requestId, status: value.status, serverConfirmed, scope: 'account' }
      }, onValue, onError, () => {})
    },
    async getDownload(request: CanonicalExportRequest): Promise<CanonicalDownload> {
      assertCurrent()
      const state = exportStates.get(request.exportJobId)
      if (!state?.downloadEligible || state.requestId !== request.requestId || !state.packageExpiresAt || state.packageExpiresAt <= Date.now()) throw new Error('CANONICAL_EXPORT_NOT_READY')
      const value = await call('getExportDownloadUrl', { jobId: request.exportJobId, file: 'export' })
      if (exportStates.get(request.exportJobId) !== state) throw new Error('CANONICAL_EXPORT_STATE_CHANGED')
      const verified = validateDownload(value, state)
      const grant = { jobId: state.jobId, requestId: state.requestId, downloadExpiresAt: verified.downloadExpiresAt }
      grants.set(grant, { row: state, receipt: value })
      return grant
    },
    async saveDownload(grant: CanonicalDownload) {
      assertCurrent()
      const issued = grants.get(grant)
      if (!issued) throw new Error('CANONICAL_EXPORT_STATE_CHANGED')
      const validate = () => validateDownload(issued.receipt, issued.row)
      const descriptor = validate()
      const currentGrant = () => isCurrent() && exportStates.get(grant.jobId) === issued.row
        && Date.now() < descriptor.downloadExpiresAt && (typeof navigator === 'undefined' || navigator.onLine !== false)
      await delivery.download({ jobId: grant.jobId, file: 'export' }, currentGrant, async (_request, lifecycle) =>
        fetchVerifiedExport({ descriptor, validate, ...lifecycle, getIdToken: () => owner.getIdToken(true) }))
    },
  }
}

export type CanonicalAccountPrivacySession = ReturnType<typeof createCanonicalAccountPrivacySession>
export type CanonicalIssuedDownload = { receipt: CanonicalDownload; issuingSession: CanonicalAccountPrivacySession }

/** A newly valid session cannot use a previous session's rendered bearer link. */
export function canonicalDownloadIsCurrent(download: CanonicalIssuedDownload | null, current: CanonicalAccountPrivacySession | null, now = Date.now()): boolean {
  return !!download && !!current && download.issuingSession === current && current.isCurrent()
    && Number.isFinite(now) && now < download.receipt.downloadExpiresAt
}
