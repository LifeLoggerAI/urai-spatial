import { createHash } from 'node:crypto'

type RecordLike = Record<string, unknown>
const SHA256 = /^[a-f0-9]{64}$/
const OPERATION = /^firstlife_[a-f0-9]{40}$/
const asRow = (value: unknown): RecordLike => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordLike : {}

/** The upload-authority preview must use the same selected-memory consent
 * boundary as the actual prepared source upload. This does not establish
 * account C1, owner identity, or deletion authority; readOwner must do that. */
export function assertPreparedPrivateMediaUploadAuthority(memory: unknown): void {
  const selected = asRow(memory)
  const source = asRow(selected.sourceProvenance)
  const prepared = Object.prototype.hasOwnProperty.call(source, 'derivativeSha256')
    || source.authenticity === 'source-derivative-not-generated-autobiography'
    || Object.prototype.hasOwnProperty.call(selected, 'firstPrivateMemoryConsent')
    || Object.prototype.hasOwnProperty.call(selected, 'firstPrivateMemoryActivation')
  if (!prepared) return // Ordinary legacy records retain their existing admission contract.
  if (selected.consentState !== 'authorized' || (selected.sourceMedia !== undefined && !Array.isArray(selected.sourceMedia))) {
    throw new Error('FIRST_PRIVATE_MEDIA_BINDING_INVALID')
  }
}

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
  const isPrepared = Object.prototype.hasOwnProperty.call(provenance, 'derivativeSha256')
    || provenance.authenticity === 'source-derivative-not-generated-autobiography'
    || Object.prototype.hasOwnProperty.call(row, 'firstPrivateMemoryConsent')
    || Object.prototype.hasOwnProperty.call(row, 'firstPrivateMemoryActivation')
  const marked = operationId.startsWith('firstlife_')
  const current = row.sourceMedia
  if (current !== undefined && !Array.isArray(current)) throw new Error('FIRST_PRIVATE_MEDIA_BINDING_INVALID')
  if (!isPrepared) {
    if (marked) throw new Error('FIRST_PRIVATE_MEDIA_BINDING_INVALID')
    return
  }
  // The server-authored first-memory record has an explicit selected-memory
  // consent state. A missing or unrecognized state must never make a prepared
  // recording uploadable, including on ordinary subsequent attachments.
  if (row.consentState !== 'authorized') throw new Error('FIRST_PRIVATE_MEDIA_BINDING_INVALID')
  // Subsequent ordinary attachments remain supported after an actual first
  // audio receipt exists, but erasing provenance must never downgrade a
  // server-marked first memory into an ordinary attachment path.
  if (Array.isArray(current) && current.length > 0 && !marked) {
    const boundAudio = current.some(entry => {
      const media = asRow(entry)
      return media.kind === 'audio' && SHA256.test(String(media.mediaReceiptId))
    })
    if (provenance.authenticity !== 'source-derivative-not-generated-autobiography'
      || !SHA256.test(String(provenance.originalSha256))
      || !SHA256.test(String(provenance.derivativeSha256))
      || !boundAudio) throw new Error('FIRST_PRIVATE_MEDIA_BINDING_INVALID')
    return
  }
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
  const prepared = Object.prototype.hasOwnProperty.call(source, 'derivativeSha256')
    || source.authenticity === 'source-derivative-not-generated-autobiography'
    || Object.prototype.hasOwnProperty.call(selected, 'firstPrivateMemoryConsent')
    || Object.prototype.hasOwnProperty.call(selected, 'firstPrivateMemoryActivation')
  if (!prepared) return
  // Current account-wide C1 is necessary but does not replace the selected
  // memory's own authorization. Keep ordinary legacy memories unaffected.
  if (selected.consentState !== 'authorized') throw new Error('FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED')
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
