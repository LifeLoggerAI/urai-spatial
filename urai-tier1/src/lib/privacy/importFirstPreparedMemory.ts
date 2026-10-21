'use client'

import { httpsCallable } from 'firebase/functions'
import { getUraiAuth, firebasePublicEnvReady, functions } from '@/lib/firebase/client'
import { attachOwnedMemoryFile, MEMORY_MEDIA_MAX_BYTES } from '@/lib/privacy/ownedMemoryMediaClient'

type Row = Record<string, unknown>
type Lifecycle = { signal: AbortSignal; isCurrent: () => boolean }
type FirstFile = Pick<File, 'size' | 'type' | 'arrayBuffer'>
const ID = /^[A-Za-z0-9_-]{1,128}$/
const SHA = /^[a-f0-9]{64}$/
const row = (value: unknown): Row => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
const invalid = (): never => { throw new Error('FIRST_MEMORY_PREPARED_PACKET_INVALID') }
const stopped = (): never => { throw new DOMException('First memory import cancelled.', 'AbortError') }

/** The offline packet is a claim, not authentication or consent. No media bytes or
 * owner-controlled Firestore fields are submitted until the protected callable
 * validates the packet again under current server authority. */
export async function importFirstPreparedMemory(packet: unknown, file: FirstFile,
  explicitOwnerConfirmation: boolean, lifecycle: Lifecycle): Promise<{
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
  const bytes = new Uint8Array(await file.arrayBuffer()); check()
  if (bytes.byteLength !== file.size) throw new Error('FIRST_MEMORY_SELECTED_FILE_CHANGED')
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    value => value.toString(16).padStart(2, '0')).join(''); check()
  if (digest !== sha) throw new Error('FIRST_MEMORY_SELECTED_FILE_FIXITY_MISMATCH')
  // Refresh ID token, but NEVER treat token refresh as recent reauthentication.
  const token = await owner.getIdTokenResult(true); check()
  const authTime = token.claims.auth_time, now = Math.floor(Date.now() / 1000)
  if (!Number.isSafeInteger(authTime) || Number(authTime) <= 0 || Number(authTime) > now
    || now - Number(authTime) > 300) throw new Error('FIRST_MEMORY_RECENT_REAUTH_REQUIRED')
  const create = httpsCallable<Record<string, unknown>, Record<string, unknown>>(functions, 'createFirstPrivateMemory')
  const created = await create({ packet, ownerConfirmation: {
    authorize: true, memoryId: id, derivativeSha256: sha, visibility: 'hidden',
  } }); check()
  const result = row(created.data)
  if (result.memoryId !== id || result.ownerId !== owner.uid || result.visibility !== 'hidden'
    || result.state !== 'created-without-media' || Object.keys(result).some(key =>
      !['memoryId', 'ownerId', 'visibility', 'state'].includes(key))) throw new Error('FIRST_MEMORY_CREATE_RECEIPT_INVALID')
  // A failed upload must NEVER turn the hidden, media-less memory visible.
  // The record is deliberately left for later owner-authorized recovery.
  try {
    const receipt = await attachOwnedMemoryFile({ id, ownerId: owner.uid, privacy: 'hidden' }, file,
      lifecycle, request.operationId, sha)
    check()
    if (receipt.memoryId !== id || typeof receipt.receiptId !== 'string' || !SHA.test(receipt.receiptId))
      throw new Error('FIRST_MEMORY_UPLOAD_RECEIPT_INVALID')
    return { ownerId: owner.uid, memoryId: id, receiptId: receipt.receiptId,
      visibility: 'hidden', state: 'ready-but-hidden' }
  } catch (cause) {
    if (!isCurrent()) stopped()
    throw new FirstPrivateMemoryUploadIncomplete(id, cause)
  }
}

export class FirstPrivateMemoryUploadIncomplete extends Error {
  constructor(readonly memoryId: string, cause: unknown) {
    super('FIRST_MEMORY_CREATED_BUT_MEDIA_UPLOAD_INCOMPLETE', { cause })
    this.name = 'FirstPrivateMemoryUploadIncomplete'
  }
}
