import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_SPEAKER_AWARENESS_POLICY,
  normalizeSpeakerPolicy,
  revokeSpeakerEnrollment,
  validateSpeakerEnrollment,
  verifyKnownSpeaker,
} from '../src/lib/speaker/speakerAwareness.ts'

const embedding=(values)=>({values,capturedAt:Date.UTC(2026,9,1),source:'local'})
const enrollment={
  speakerId:'known-speaker-1',
  consented:true,
  consentRevision:'speaker-opt-in-v1',
  createdAt:Date.UTC(2026,9,1),
  embeddings:[
    embedding([1,0,0,0,0,0,0,0]),
    embedding([.99,.01,0,0,0,0,0,0]),
    embedding([.98,.02,0,0,0,0,0,0]),
  ],
}

test('speaker awareness is hard-off and never retains raw audio by policy',()=>{
  assert.equal(DEFAULT_SPEAKER_AWARENESS_POLICY.enabled,false)
  assert.equal(DEFAULT_SPEAKER_AWARENESS_POLICY.retainRawAudio,false)
})

test('policy floors prevent weak enrollment and low accept thresholds',()=>{
  const policy=normalizeSpeakerPolicy({enabled:true,minEnrollmentSamples:1,acceptThreshold:.2,rejectThreshold:.95})
  assert.equal(policy.minEnrollmentSamples,3)
  assert.ok(policy.acceptThreshold>=.8)
  assert.ok(policy.rejectThreshold<=policy.acceptThreshold-.05)
  assert.equal(policy.explicitOptInRequired,true)
})

test('enrollment requires explicit consent revision and sufficient samples',()=>{
  assert.equal(validateSpeakerEnrollment(enrollment,{enabled:true}).eligible,true)
  assert.equal(validateSpeakerEnrollment({...enrollment,consented:false},{enabled:true}).reason,'consent-required')
  assert.equal(validateSpeakerEnrollment({...enrollment,embeddings:enrollment.embeddings.slice(0,2)},{enabled:true}).reason,'insufficient-enrollment')
})

test('verification refuses to identify anyone without opt-in',()=>{
  const result=verifyKnownSpeaker({sample:embedding([1,0,0,0,0,0,0,0]),enrollments:[enrollment],consented:false,policy:{enabled:true}})
  assert.equal(result.status,'consent-required')
})

test('strong known match and unrelated unknown are distinguished probabilistically',()=>{
  const match=verifyKnownSpeaker({sample:embedding([1,.001,0,0,0,0,0,0]),enrollments:[enrollment],consented:true,policy:{enabled:true}})
  assert.equal(match.status,'match')
  if(match.status==='match') assert.equal(match.speakerId,'known-speaker-1')
  const unknown=verifyKnownSpeaker({sample:embedding([0,1,0,0,0,0,0,0]),enrollments:[enrollment],consented:true,policy:{enabled:true}})
  assert.equal(unknown.status,'unknown')
})

test('revocation deletes biometric templates and prevents matching',()=>{
  const revoked=revokeSpeakerEnrollment(enrollment,Date.UTC(2026,9,2))
  assert.equal(revoked.embeddings.length,0)
  const result=verifyKnownSpeaker({sample:embedding([1,0,0,0,0,0,0,0]),enrollments:[revoked],consented:true,policy:{enabled:true}})
  assert.equal(result.status,'revoked')
})
