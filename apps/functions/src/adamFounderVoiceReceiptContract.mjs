/**
 * Founder audio receipt contract. This is NOT an issuer or approval registry.
 * The current production endpoint has no admitted Founder model/voice issuer:
 * founderVoiceIssuerReadiness therefore always denies issuance. No feature flag,
 * HTTP status, audio blob, or client-provided object can alter that outcome.
 */
const SHA = /^[a-f0-9]{64}$/
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const NONCE = /^[A-Za-z0-9_-]{22,128}$/
const SIGNATURE = /^[A-Za-z0-9_-]{43,512}$/
const MAX_LIFETIME_MS = 60_000
export const FOUNDER_VOICE_RECEIPT_VERSION = 'urai.founder-voice.receipt.v1'
export const FOUNDER_VOICE_RECEIPT_DENIED = 'FOUNDER_PLAYBACK_AUTHORITY_NOT_READY'

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const validId = value => typeof value === 'string' && ID.test(value)
const validSha = value => typeof value === 'string' && SHA.test(value)
const refusal = reason => Object.freeze({ valid: false, reason })

/** Shape validation is explicitly NOT authorization. Never use it to play audio. */
function inspectFounderVoiceReceiptShapeUnchecked(receipt, expected = {}, nowMs = Date.now()) {
  if (!record(receipt) || !record(expected)) return refusal('missing-receipt-or-binding')
  if (receipt.version !== FOUNDER_VOICE_RECEIPT_VERSION
    || receipt.audience !== 'urai:adam-founder-voice'
    || receipt.subjectId !== 'adam' || receipt.identityKind !== 'founder') return refusal('wrong-receipt-purpose')
  for (const key of ['accountId', 'actorEpoch', 'voiceId', 'issuerId', 'consentRevision', 'providerReceiptId']) {
    if (!validId(receipt[key])) return refusal('invalid-' + key)
  }
  for (const key of ['modelSha256', 'voiceApprovalSha256', 'audioSha256']) {
    if (!validSha(receipt[key])) return refusal('invalid-' + key)
  }
  if (!Number.isSafeInteger(receipt.turnId) || receipt.turnId < 1) return refusal('invalid-turn-id')
  if (!NONCE.test(String(receipt.nonce ?? ''))
    || !SIGNATURE.test(String(receipt.signature ?? ''))
    || !record(receipt.providerReceipt)) return refusal('untrusted-or-missing-proof-shape')
  if (!Number.isSafeInteger(nowMs) || !Number.isSafeInteger(receipt.issuedAtMs)
    || !Number.isSafeInteger(receipt.expiresAtMs)
    || receipt.issuedAtMs > nowMs || receipt.expiresAtMs <= nowMs
    || receipt.expiresAtMs <= receipt.issuedAtMs
    || receipt.expiresAtMs - receipt.issuedAtMs > MAX_LIFETIME_MS) return refusal('stale-or-invalid-time')
  for (const key of ['accountId', 'actorEpoch', 'turnId', 'audioSha256']) {
    if (receipt[key] !== expected[key]) return refusal('incorrect-' + key)
  }
  // Exact canonical payload for a future server-controlled cryptographic verifier.
  // Provider proof itself is independently checked against providerReceiptId.
  const canonicalPayload = JSON.stringify([
    receipt.version, receipt.audience, receipt.accountId, receipt.subjectId,
    receipt.identityKind, receipt.actorEpoch, receipt.turnId, receipt.modelSha256,
    receipt.voiceId, receipt.voiceApprovalSha256, receipt.consentRevision,
    receipt.audioSha256, receipt.providerReceiptId, receipt.issuerId,
    receipt.nonce, receipt.issuedAtMs, receipt.expiresAtMs,
  ])
  return Object.freeze({ valid: true, canonicalPayload })
}

/** Safe fail-closed parser: untrusted object accessors and proxies cannot throw outward. */
export function inspectFounderVoiceReceiptShape(receipt, expected = {}, nowMs = Date.now()) {
  try {
    return inspectFounderVoiceReceiptShapeUnchecked(receipt, expected, nowMs)
  } catch {
    return refusal('untrusted-receipt-or-binding')
  }
}

/**
 * Server-owned adapters MUST perform real issuer-signature verification,
 * independently verify provider execution, read live admission/consent, and
 * atomically consume the nonce. Without every adapter this rejects.
 * Caller must still revalidate current admission immediately before playback.
 */
export async function verifyFounderVoiceReceipt(receipt, expected, trustedServer = null, nowMs = Date.now()) {
  try {
    const shape = inspectFounderVoiceReceiptShape(receipt, expected, nowMs)
    if (!shape.valid || !record(trustedServer)
      || typeof trustedServer.verifyIssuerSignature !== 'function'
      || typeof trustedServer.verifyProviderExecution !== 'function'
      || typeof trustedServer.readCurrentAdmission !== 'function'
      || typeof trustedServer.consumeNonceOnce !== 'function') return false
    if (await trustedServer.verifyIssuerSignature(receipt, shape.canonicalPayload) !== true) return false
    if (await trustedServer.verifyProviderExecution(receipt.providerReceipt, receipt.providerReceiptId, receipt.audioSha256) !== true) return false
    const admitted = await trustedServer.readCurrentAdmission(receipt.accountId)
    if (!record(admitted) || admitted.accountId !== receipt.accountId
      || admitted.actorEpoch !== receipt.actorEpoch || admitted.subjectId !== 'adam'
      || admitted.identityKind !== 'founder' || admitted.aiConsent !== true
      || admitted.voiceConsent !== true || admitted.likenessApproved !== true
      || admitted.modelAdmitted !== true || admitted.voiceAdmitted !== true
      || admitted.providerEnabled !== true || admitted.revoked === true
      || admitted.modelSha256 !== receipt.modelSha256
      || admitted.approvedVoiceId !== receipt.voiceId
      || admitted.voiceApprovalSha256 !== receipt.voiceApprovalSha256
      || admitted.consentRevision !== receipt.consentRevision) return false
    return await trustedServer.consumeNonceOnce({
      accountId: receipt.accountId, issuerId: receipt.issuerId,
      nonce: receipt.nonce, turnId: receipt.turnId,
      expiresAtMs: receipt.expiresAtMs,
    }) === true
  } catch { return false }
}

/** No authenticated issuer/admission/nonce service is connected in production. */
export function founderVoiceIssuerReadiness() {
  return Object.freeze({ ready: false, code: FOUNDER_VOICE_RECEIPT_DENIED,
    message: 'Founder playback authority issuer and verified voice admission are not configured.' })
}
