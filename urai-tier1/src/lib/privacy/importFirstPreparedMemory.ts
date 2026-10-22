'use client'

import { httpsCallable } from 'firebase/functions'
import { doc, getDocFromServer } from 'firebase/firestore'
import { getUraiAuth, getFirebaseDb, firebasePublicEnvReady, functions } from '@/lib/firebase/client'
import { attachOwnedMemoryFile, MEMORY_MEDIA_MAX_BYTES } from '@/lib/privacy/ownedMemoryMediaClient'

type Row = Record<string, unknown>
type Lifecycle = { signal: AbortSignal; isCurrent: () => boolean }
type FirstFile = Pick<File, 'size' | 'type' | 'arrayBuffer'>
const ID = /^[A-Za-z0-9_-]{1,128}$/
const SHA = /^[a-f0-9]{64}$/
const row = (value: unknown): Row => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
function invalid(): never { throw new Error('FIRST_MEMORY_PREPARED_PACKET_INVALID') }
const stopped = (): never => { throw new DOMException('First memory import cancelled.', 'AbortError') }

/** The offline packet is a claim, not authentication or consent. No media bytes or
 * owner-controlled Firestore fields are submitted until the protected callable
 * validates the packet again under current server authority. */
export async function importFirstPreparedMemory(packet: unknown, file: FirstFile,
  explicitOwnerConfirmation: boolean, lifecycle: Lifecycle, recovery?: { existingHiddenMemoryId: string }): Promise<{
    ownerId: string; memoryId: string; receiptId: string; visibility: 'hidden'; state: 'ready-but-hidden'
  }> {
  if (!firebasePublicEnvReady) throw new Error('FIREBASE_CONFIGURATION_REQUIRED')
  const auth = getUraiAuth(), owner = auth.currentUser
  if (!owner || !ID.test(owner.uid)) throw new Error('FIRST_MEMORY_OWNER_AUTH_REQUIRED')
  const isCurrent = () => !lifecycle.signal.aborted && lifecycle.isCurrent() && auth.currentUser === owner
  const check = () => { if (!isCurrent()) stopped() }
  check()
  if (explicitOwnerConfirmation !== true) throw new Error('FIRST_MEMORY_EXPLICIT_OWNER_CONFIRMATION_REQUIRED')
  const p = row(packet), m = row(p.memory), provenance = row(m.sourceProvenance), upload = row(p.upload)
  const request = row(upload.request), id = request.memoryId, sha = provenance.derivativeSha256
  if (p.schemaVersion !== 'urai-first-private-memory-preflight-v1' || p.status !== 'PREPARED_NOT_IMPORTED_NOT_PLAYBACK_PROVEN'
    || typeof id !== 'string' || !ID.test(id) || m.ownerId !== owner.uid
    || p.firestorePath !== `users/${owner.uid}/memories/${id}`
    || m.privacy !== 'hidden' || m.deleted !== false || !Array.isArray(m.sourceMedia) || m.sourceMedia.length !== 0
    || typeof sha !== 'string' || !SHA.test(sha) || upload.sha256 !== sha
    || upload.fileByteLength !== provenance.derivativeByteLength || upload.request === undefined
    || upload.initialVisibility !== 'hidden' || upload.offlinePreparationGrantsConsent !== false
    || typeof request.operationId !== 'string' || !ID.test(request.operationId)
    || request.kind !== 'audio' || request.contentType !== provenance.derivedContentType
    || (file.type !== 'audio/ogg' && file.type !== 'audio/mpeg') || file.type !== request.contentType
    || !Number.isSafeInteger(file.size) || file.size < 1 || file.size > MEMORY_MEDIA_MAX_BYTES
    || file.size !== upload.fileByteLength) invalid()
  // Keep narrowed untrusted packet values in stable typed bindings.
  const memoryId: string = id
  const operationId: string = request.operationId
  // Identity freshness precedes local media reads. A token refresh does not
  // reauthenticate an old session and must not authorize private file access.
  const token = await owner.getIdTokenResult(true); check()
  const authTime = token.claims.auth_time, now = Math.floor(Date.now() / 1000)
  if (!Number.isSafeInteger(authTime) || Number(authTime) <= 0 || Number(authTime) > now
    || now - Number(authTime) > 300) throw new Error('FIRST_MEMORY_RECENT_REAUTH_REQUIRED')
  if (recovery !== undefined) {
    // An incomplete upload is not permission to create or overwrite a memory.
    // Read the canonical server snapshot. Protected upload separately rechecks
    // current C1, policy, deletion, ownership and source fixity transactionally.
    if (recovery.existingHiddenMemoryId !== id) throw new Error('FIRST_MEMORY_RECOVERY_ID_MISMATCH')
    const snapshot = await getDocFromServer(doc(getFirebaseDb(), 'users', owner.uid, 'memories', id)); check()
    if (!snapshot.exists()) throw new Error('FIRST_MEMORY_RECOVERY_NOT_AVAILABLE')
    const stored = row(snapshot.data()), source = row(stored.sourceProvenance)
    const confirmation = row(stored.firstPrivateMemoryConsent), attachments = stored.sourceMedia
    if (stored.ownerId !== owner.uid || stored.deleted !== false || stored.privacy !== 'hidden'
      || stored.consentState !== 'authorized' || stored.firstPrivateMemoryActivation !== undefined
      || source.authenticity !== 'source-derivative-not-generated-autobiography'
      || source.derivativeSha256 !== sha || source.derivativeByteLength !== file.size
      || source.derivedContentType !== file.type
      || source.originalSha256 !== provenance.originalSha256
      || confirmation.status !== 'explicit-owner-confirmation' || confirmation.ownerId !== owner.uid
      || confirmation.memoryId !== id || confirmation.derivativeSha256 !== sha
      || !SHA.test(String(confirmation.canonicalConsentReceiptHash))
      || !Number.isSafeInteger(confirmation.consentRevision) || Number(confirmation.consentRevision) < 1
      || !Array.isArray(attachments) || attachments.length > 1
      || (attachments.length === 1 && (row(attachments[0]).kind !== 'audio'
        || !SHA.test(String(row(attachments[0]).mediaReceiptId))))) {
      throw new Error('FIRST_MEMORY_RECOVERY_NOT_AUTHORIZED')
    }
  }
  const bytes = new Uint8Array(await file.arrayBuffer()); check()
  if (bytes.byteLength !== file.size) throw new Error('FIRST_MEMORY_SELECTED_FILE_CHANGED')
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    value => value.toString(16).padStart(2, '0')).join(''); check()
  if (digest !== sha) throw new Error('FIRST_MEMORY_SELECTED_FILE_FIXITY_MISMATCH')
  if (recovery === undefined) {
    const create = httpsCallable<Record<string, unknown>, Record<string, unknown>>(functions, 'createFirstPrivateMemory')
    const created = await create({ packet, ownerConfirmation: {
      authorize: true, memoryId: id, derivativeSha256: sha, visibility: 'hidden',
    } }); check()
    const result = row(created.data)
    if (result.memoryId !== id || result.ownerId !== owner.uid || result.visibility !== 'hidden'
      || result.state !== 'created-without-media' || Object.keys(result).some(key =>
        !['memoryId', 'ownerId', 'visibility', 'state'].includes(key))) throw new Error('FIRST_MEMORY_CREATE_RECEIPT_INVALID')
    }
  // A failed upload must NEVER turn the hidden, media-less memory visible.
  // The record is deliberately left for later owner-authorized recovery.
  try {
    const receipt = await attachOwnedMemoryFile({ id, ownerId: owner.uid, privacy: 'hidden' }, file,
      lifecycle, operationId, sha)
    check()
    if (receipt.memoryId !== id || typeof receipt.receiptId !== 'string' || !SHA.test(receipt.receiptId))
      throw new Error('FIRST_MEMORY_UPLOAD_RECEIPT_INVALID')
    return { ownerId: owner.uid, memoryId: id, receiptId: receipt.receiptId,
      visibility: 'hidden', state: 'ready-but-hidden' }
  } catch (cause) {
    if (!isCurrent()) stopped()
    throw new FirstPrivateMemoryUploadIncomplete(memoryId, cause)
  }
}

export class FirstPrivateMemoryUploadIncomplete extends Error {
  constructor(readonly memoryId: string, cause: unknown) {
    super('FIRST_MEMORY_CREATED_BUT_MEDIA_UPLOAD_INCOMPLETE', { cause })
    this.name = 'FirstPrivateMemoryUploadIncomplete'
  }
}

/** Non-destructive owner-authorized retry for an ALREADY-created hidden memory.
 * Aborted/closing/revoked upload receipts remain fail-closed on the server. */
export function resumeFirstPreparedMemoryUpload(packet: unknown, file: FirstFile,
  explicitRecoveryConfirmation: boolean, lifecycle: Lifecycle, existingHiddenMemoryId: string) {
  return importFirstPreparedMemory(packet, file, explicitRecoveryConfirmation, lifecycle,
    { existingHiddenMemoryId })
}
