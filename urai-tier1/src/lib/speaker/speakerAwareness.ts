export type SpeakerAwarenessPolicy = {
  enabled: boolean
  explicitOptInRequired: true
  minEnrollmentSamples: number
  acceptThreshold: number
  rejectThreshold: number
  retainRawAudio: false
}

export const DEFAULT_SPEAKER_AWARENESS_POLICY: SpeakerAwarenessPolicy = {
  enabled: false,
  explicitOptInRequired: true,
  minEnrollmentSamples: 3,
  acceptThreshold: 0.86,
  rejectThreshold: 0.72,
  retainRawAudio: false,
}

export type SpeakerEmbedding = {
  values: readonly number[]
  capturedAt: number
  source: 'local' | 'approved-provider'
}

export type SpeakerEnrollment = {
  speakerId: string
  consented: boolean
  consentRevision: string
  createdAt: number
  revokedAt?: number
  embeddings: SpeakerEmbedding[]
}

export type SpeakerVerificationResult =
  | { status:'disabled' | 'consent-required' | 'not-enrolled' | 'revoked' | 'invalid-sample'; confidence:0 }
  | { status:'match'; speakerId:string; confidence:number }
  | { status:'unknown'; confidence:number }
  | { status:'uncertain'; candidateSpeakerId?:string; confidence:number }

function clamp(value:number,min:number,max:number){ return Math.min(max,Math.max(min,value)) }

const SPEAKER_MATCH_MARGIN = 0.04

export function normalizeSpeakerPolicy(input: Partial<SpeakerAwarenessPolicy> = {}): SpeakerAwarenessPolicy {
  const accept = Number.isFinite(input.acceptThreshold) ? input.acceptThreshold! : DEFAULT_SPEAKER_AWARENESS_POLICY.acceptThreshold
  const reject = Number.isFinite(input.rejectThreshold) ? input.rejectThreshold! : DEFAULT_SPEAKER_AWARENESS_POLICY.rejectThreshold
  return {
    enabled: input.enabled === true,
    explicitOptInRequired: true,
    minEnrollmentSamples: Math.max(3, Math.floor(input.minEnrollmentSamples ?? DEFAULT_SPEAKER_AWARENESS_POLICY.minEnrollmentSamples)),
    acceptThreshold: clamp(accept, 0.80, 0.98),
    rejectThreshold: clamp(Math.min(reject, accept - 0.05), 0.55, 0.90),
    retainRawAudio: false,
  }
}

function validEmbedding(embedding: SpeakerEmbedding | null | undefined) {
  return Boolean(
    embedding
    && Array.isArray(embedding.values)
    && embedding.values.length >= 8
    && embedding.values.length <= 4096
    && embedding.values.every(value => Number.isFinite(value)),
  )
}

function normalize(values: readonly number[]) {
  const magnitude = Math.sqrt(values.reduce((sum,value)=>sum + value*value,0))
  if (!Number.isFinite(magnitude) || magnitude <= 1e-9) return null
  return values.map(value => value / magnitude)
}

export function speakerCosineSimilarity(left: SpeakerEmbedding, right: SpeakerEmbedding) {
  if (!validEmbedding(left) || !validEmbedding(right) || left.values.length !== right.values.length) return null
  const a=normalize(left.values), b=normalize(right.values)
  if (!a || !b) return null
  return clamp(a.reduce((sum,value,index)=>sum + value*b[index],0),-1,1)
}

export function validateSpeakerEnrollment(
  enrollment: SpeakerEnrollment,
  policyInput: Partial<SpeakerAwarenessPolicy> = {},
) {
  const policy=normalizeSpeakerPolicy(policyInput)
  if (!policy.enabled) return { eligible:false, reason:'disabled' as const }
  if (!enrollment.consented || !enrollment.consentRevision.trim()) return { eligible:false, reason:'consent-required' as const }
  if (enrollment.revokedAt) return { eligible:false, reason:'revoked' as const }
  const samples=enrollment.embeddings.filter(validEmbedding)
  if (samples.length < policy.minEnrollmentSamples) return { eligible:false, reason:'insufficient-enrollment' as const }
  const width=samples[0].values.length
  if (!samples.every(sample=>sample.values.length===width)) return { eligible:false, reason:'inconsistent-embedding-shape' as const }
  return { eligible:true, reason:'eligible' as const }
}

function enrollmentSimilarity(sample: SpeakerEmbedding, enrollment: SpeakerEnrollment) {
  const scores=enrollment.embeddings.map(reference=>speakerCosineSimilarity(sample,reference)).filter((score):score is number=>score!==null)
  if (!scores.length) return null
  scores.sort((a,b)=>b-a)
  const strongest=scores.slice(0,Math.min(3,scores.length))
  return strongest.reduce((sum,value)=>sum+value,0)/strongest.length
}

export function verifyKnownSpeaker(input: {
  sample: SpeakerEmbedding
  enrollments: SpeakerEnrollment[]
  consented: boolean
  policy?: Partial<SpeakerAwarenessPolicy>
}): SpeakerVerificationResult {
  const policy=normalizeSpeakerPolicy(input.policy)
  if (!policy.enabled) return { status:'disabled', confidence:0 }
  if (!input.consented) return { status:'consent-required', confidence:0 }
  if (!validEmbedding(input.sample)) return { status:'invalid-sample', confidence:0 }

  const active=input.enrollments.filter(enrollment=>validateSpeakerEnrollment(enrollment,policy).eligible)
  if (!active.length) {
    if (input.enrollments.some(enrollment=>Boolean(enrollment.revokedAt))) return { status:'revoked', confidence:0 }
    return { status:'not-enrolled', confidence:0 }
  }

  const candidates=active
    .map(enrollment=>({speakerId:enrollment.speakerId,score:enrollmentSimilarity(input.sample,enrollment)}))
    .filter((entry):entry is {speakerId:string;score:number}=>entry.score!==null)
    .sort((a,b)=>b.score-a.score)

  const best=candidates[0]
  if (!best) return { status:'invalid-sample', confidence:0 }
  const runnerUp=candidates[1]
  const confidence=clamp((best.score+1)/2,0,1)
  if (best.score >= policy.acceptThreshold) {
    // Fail closed when two enrolled speakers are too close to distinguish safely.
    // A near-tie must never be converted into a named biometric identity.
    if (runnerUp && best.score-runnerUp.score < SPEAKER_MATCH_MARGIN) {
      return { status:'uncertain', confidence }
    }
    return { status:'match', speakerId:best.speakerId, confidence }
  }
  if (best.score <= policy.rejectThreshold) return { status:'unknown', confidence }
  return { status:'uncertain', candidateSpeakerId:best.speakerId, confidence }
}

export function revokeSpeakerEnrollment(enrollment: SpeakerEnrollment, revokedAt=Date.now()): SpeakerEnrollment {
  return { ...enrollment, revokedAt, embeddings: [] }
}
