import { createHash } from 'node:crypto'

type RecordLike = Record<string, unknown>
const SHA256 = /^[a-f0-9]{64}$/
const OPERATION = /^firstlife_[a-f0-9]{40}$/
const asRow = (value: unknown): RecordLike => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordLike : {}

/** A trusted Firestore memory can bind its FIRST audio attachment to an offline
 * prepared derivative. This does not grant consent or create a private memory.
 * The caller must separately verify current Auth, C1, deletion fences and owner.
 * Recheck within the receipt-claim AND attachment-commit transactions. */
export function assertPreparedPrivateMediaFirstUpload(
  memory: unknown, uid: string, memoryId: string, operationId: string,
  kind: unknown, contentType: string, digest: string, byteLength: number,
): void {
  const row = asRow(memory)
  const provenance = asRow(row.sourceProvenance)
  const isPrepared = Object.hasOwn(provenance, 'derivativeSha256')
    || provenance.authenticity === 'source-derivative-not-generated-autobiography'
  const marked = operationId.startsWith('firstlife_')
  const current = row.sourceMedia
  if (current !== undefined && !Array.isArray(current)) throw new Error('FIRST_PRIVATE_MEDIA_BINDING_INVALID')
  if (!isPrepared) {
    if (marked) throw new Error('FIRST_PRIVATE_MEDIA_BINDING_INVALID')
    return
  }
  // Ordinary subsequent attachments remain supported after an actual media
  // receipt exists, but the first source cannot be silently bypassed.
  if (Array.isArray(current) && current.length > 0 && !marked) return
  if (provenance.authenticity !== 'source-derivative-not-generated-autobiography'
    || typeof uid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)
    || typeof memoryId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(memoryId)
    || !SHA256.test(String(provenance.originalSha256))
    || !SHA256.test(String(provenance.derivativeSha256))
    || provenance.derivativeSha256 !== digest
    || !Number.isSafeInteger(provenance.derivativeByteLength)
    || provenance.derivativeByteLength !== byteLength
    || kind !== 'audio'
    || !['audio/ogg', 'audio/mpeg'].includes(contentType)
    || provenance.derivedContentType !== contentType
    || !OPERATION.test(operationId)) throw new Error('FIRST_PRIVATE_MEDIA_BINDING_INVALID')
  const expected = 'firstlife_' + createHash('sha256')
    .update(uid + '\n' + memoryId + '\n' + digest).digest('hex').slice(0, 40)
  if (operationId !== expected) throw new Error('FIRST_PRIVATE_MEDIA_BINDING_INVALID')
}


/**
 * A ready private audio receipt is NOT permission to play an initially hidden
 * first-life recording. Reads must prove the subsequent owner-confirmed
 * activation, bound to the exact source, media receipt and current C1 epoch.
 * This guard is used by both playback descriptor and byte-stream authorities.
 */
export function assertFirstPrivateMemoryPlaybackBinding(
  memory: unknown, uid: string, memoryId: string, receiptId: string,
  currentConsentRevision: number, currentConsentReceiptHash: string,
): void {
  const selected = asRow(memory)
  if (selected.privacy === 'hidden') throw new Error('FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED')
  const source = asRow(selected.sourceProvenance)
  const prepared = Object.hasOwn(source, 'derivativeSha256')
    || source.authenticity === 'source-derivative-not-generated-autobiography'
  if (!prepared) return
  const activation = asRow(selected.firstPrivateMemoryActivation)
  if (selected.privacy !== 'private'
    || source.authenticity !== 'source-derivative-not-generated-autobiography'
    || !SHA256.test(String(source.derivativeSha256))
    || typeof uid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)
    || typeof memoryId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(memoryId)
    || !SHA256.test(receiptId)
    || !Number.isSafeInteger(currentConsentRevision) || currentConsentRevision < 1
    || !SHA256.test(currentConsentReceiptHash)
    || activation.status !== 'explicit-owner-private-replay'
    || activation.ownerId !== uid || activation.memoryId !== memoryId
    || activation.mediaReceiptId !== receiptId
    || activation.derivativeSha256 !== source.derivativeSha256
    || activation.consentRevision !== currentConsentRevision
    || activation.consentReceiptHash !== currentConsentReceiptHash) {
    throw new Error('FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED')
  }
}
