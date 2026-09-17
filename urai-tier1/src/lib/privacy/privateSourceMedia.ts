export type PrivateSourceMediaKind = 'audio' | 'video' | 'image' | 'document'

export type PrivateSourcePurpose =
  | 'archive-integrity'
  | 'transcribe'
  | 'memory-index'
  | 'replay'
  | 'life-map'
  | 'orb-context'
  | 'dreaming'
  | 'relationship-context'
  | 'precise-location'
  | 'export'
  | 'public-share'
  | 'likeness'
  | 'voice-synthesis'

export type SourceConsentStatus = 'direct-subject' | 'owner-attested' | 'provider-recorded' | 'unknown' | 'revoked'
export type SourceConsentEvidence = 'subject' | 'owner-report' | 'provider' | 'unknown'
export type ConsentMode = 'granted' | 'limited' | 'paused' | 'denied'

export type PrivateSourceMediaConsentAttestation = {
  status: SourceConsentStatus
  evidence: SourceConsentEvidence
  assertedAt: string
  scopes: PrivateSourcePurpose[]
  evidenceRef?: string
}

export type PrivateSourceMediaReceipt = {
  version: 1
  sourceId: string
  mediaKind: PrivateSourceMediaKind
  sha256: string
  byteLength: number
  durationSeconds?: number
  immutableOriginal: true
  storageClass: 'private-owner-vault' | 'private-external'
  privacyClass: 'L5'
  subjectRef?: string
  placeRef?: string
  exactLocationStoredSeparately: boolean
  consent: PrivateSourceMediaConsentAttestation
}

export type PrivateSourceDomainPolicy = {
  mode: ConsentMode
  precise: boolean
  replayVisible: boolean
  lifeMapVisible: boolean
  modelContext: boolean
  sharingEnabled: boolean
  likenessEnabled: boolean
}

export type PrivateSourcePolicySnapshot = {
  memory: PrivateSourceDomainPolicy
  location: PrivateSourceDomainPolicy
  models: PrivateSourceDomainPolicy
  exports: PrivateSourceDomainPolicy
  identity: PrivateSourceDomainPolicy
}

export type PrivateSourceUseDecision = {
  allowed: boolean
  purpose: PrivateSourcePurpose
  reasons: string[]
  requiredDomains: Array<keyof PrivateSourcePolicySnapshot>
}

const ACTIVE_SOURCE_CONSENT = new Set<SourceConsentStatus>(['direct-subject', 'owner-attested', 'provider-recorded'])

function enabled(policy: PrivateSourceDomainPolicy) {
  return policy.mode === 'granted' || policy.mode === 'limited'
}

function requireDomain(
  domain: keyof PrivateSourcePolicySnapshot,
  policy: PrivateSourceDomainPolicy,
  requiredDomains: Array<keyof PrivateSourcePolicySnapshot>,
  reasons: string[],
) {
  requiredDomains.push(domain)
  if (!enabled(policy)) reasons.push(`${domain} consent is ${policy.mode}`)
}

export function isPrivateSourceMediaReceipt(value: unknown): value is PrivateSourceMediaReceipt {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<PrivateSourceMediaReceipt>
  if (candidate.version !== 1 || candidate.immutableOriginal !== true || candidate.privacyClass !== 'L5') return false
  if (!candidate.sourceId || !/^[A-Za-z0-9_-]{8,160}$/.test(candidate.sourceId)) return false
  if (!candidate.sha256 || !/^[a-f0-9]{64}$/i.test(candidate.sha256)) return false
  if (!Number.isSafeInteger(candidate.byteLength) || Number(candidate.byteLength) <= 0) return false
  if (candidate.durationSeconds !== undefined && (!Number.isFinite(candidate.durationSeconds) || Number(candidate.durationSeconds) < 0)) return false
  if (!candidate.consent || !Array.isArray(candidate.consent.scopes) || !candidate.consent.assertedAt) return false
  return ['direct-subject', 'owner-attested', 'provider-recorded', 'unknown', 'revoked'].includes(candidate.consent.status)
}

/**
 * Evaluates whether a private source may be used for one narrowly named purpose.
 * This is intentionally fail-closed. Source consent and runtime owner consent are
 * separate authorities: both must permit the requested use.
 */
export function evaluatePrivateSourceMediaUse(
  receipt: PrivateSourceMediaReceipt,
  policy: PrivateSourcePolicySnapshot,
  purpose: PrivateSourcePurpose,
): PrivateSourceUseDecision {
  const reasons: string[] = []
  const requiredDomains: Array<keyof PrivateSourcePolicySnapshot> = []

  if (!isPrivateSourceMediaReceipt(receipt)) {
    return { allowed: false, purpose, reasons: ['invalid private source receipt'], requiredDomains }
  }

  if (!ACTIVE_SOURCE_CONSENT.has(receipt.consent.status)) {
    reasons.push(receipt.consent.status === 'revoked' ? 'source consent was revoked' : 'source consent is not established')
  }
  if (!receipt.consent.scopes.includes(purpose)) reasons.push(`source consent does not include ${purpose}`)

  switch (purpose) {
    case 'archive-integrity':
      break
    case 'transcribe':
    case 'memory-index':
      requireDomain('memory', policy.memory, requiredDomains, reasons)
      requireDomain('models', policy.models, requiredDomains, reasons)
      if (!policy.models.modelContext) reasons.push('models consent does not permit model context')
      break
    case 'replay':
      requireDomain('memory', policy.memory, requiredDomains, reasons)
      if (!policy.memory.replayVisible) reasons.push('memory consent hides this source from Replay')
      break
    case 'life-map':
      requireDomain('memory', policy.memory, requiredDomains, reasons)
      if (!policy.memory.lifeMapVisible) reasons.push('memory consent hides this source from Life Map')
      break
    case 'orb-context':
    case 'dreaming':
      requireDomain('memory', policy.memory, requiredDomains, reasons)
      requireDomain('models', policy.models, requiredDomains, reasons)
      if (!policy.models.modelContext) reasons.push('models consent does not permit model context')
      break
    case 'relationship-context':
      requireDomain('identity', policy.identity, requiredDomains, reasons)
      requireDomain('models', policy.models, requiredDomains, reasons)
      if (!policy.models.modelContext) reasons.push('models consent does not permit model context')
      break
    case 'precise-location':
      requireDomain('location', policy.location, requiredDomains, reasons)
      if (!policy.location.precise) reasons.push('location consent does not permit precise place context')
      break
    case 'export':
      requireDomain('exports', policy.exports, requiredDomains, reasons)
      break
    case 'public-share':
      requireDomain('exports', policy.exports, requiredDomains, reasons)
      if (!policy.exports.sharingEnabled) reasons.push('exports consent does not permit sharing')
      break
    case 'likeness':
      requireDomain('identity', policy.identity, requiredDomains, reasons)
      if (!policy.identity.likenessEnabled) reasons.push('identity consent does not permit likeness use')
      break
    case 'voice-synthesis':
      requireDomain('identity', policy.identity, requiredDomains, reasons)
      requireDomain('models', policy.models, requiredDomains, reasons)
      if (!policy.identity.likenessEnabled) reasons.push('identity consent does not permit likeness use')
      if (!policy.models.modelContext) reasons.push('models consent does not permit model context')
      break
  }

  return { allowed: reasons.length === 0, purpose, reasons, requiredDomains: [...new Set(requiredDomains)] }
}
