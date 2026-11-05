export declare const FOUNDER_VOICE_RECEIPT_VERSION: 'urai.founder-voice.receipt.v1'
export declare const FOUNDER_VOICE_RECEIPT_DENIED: 'FOUNDER_PLAYBACK_AUTHORITY_NOT_READY'
export interface FounderVoiceReceipt {
  version: 'urai.founder-voice.receipt.v1'; audience: 'urai:adam-founder-voice'
  accountId: string; subjectId: 'adam'; identityKind: 'founder'
  actorEpoch: string; turnId: number; modelSha256: string
  voiceId: string; voiceApprovalSha256: string; consentRevision: string
  audioSha256: string; providerReceiptId: string; providerReceipt: Record<string, unknown>
  issuerId: string; nonce: string; issuedAtMs: number; expiresAtMs: number
  signature: string
}
export interface FounderVoiceReceiptExpected {
  accountId: string; actorEpoch: string; turnId: number; audioSha256: string
}
export type ReceiptShapeDecision = Readonly<
  | {valid: false; reason: string}
  | {valid: true; canonicalPayload: string}
>
export interface TrustedFounderReceiptServer {
  verifyIssuerSignature(receipt: FounderVoiceReceipt, canonicalPayload: string): Promise<boolean>
  verifyProviderExecution(receipt: Record<string, unknown>, receiptId: string, audioSha256: string): Promise<boolean>
  readCurrentAdmission(accountId: string): Promise<Record<string, unknown> | null>
  consumeNonceOnce(input: {accountId: string; issuerId: string; nonce: string; turnId: number; expiresAtMs: number}): Promise<boolean>
}
export declare function inspectFounderVoiceReceiptShape(receipt: unknown, expected: FounderVoiceReceiptExpected, nowMs?: number): ReceiptShapeDecision
export declare function verifyFounderVoiceReceipt(receipt: FounderVoiceReceipt, expected: FounderVoiceReceiptExpected, trustedServer?: TrustedFounderReceiptServer | null, nowMs?: number): Promise<boolean>
export declare function founderVoiceIssuerReadiness(): Readonly<{ready: false; code: typeof FOUNDER_VOICE_RECEIPT_DENIED; message: string}>
