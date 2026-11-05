import { assessSpeechEvidence } from '../../src/lib/speechInference/guard.mjs'
import { createManualWeatherSession } from '../../src/lib/uraiEmotion/manualWeatherSession.ts'
import { isDeepStrictEqual } from 'node:util'

function deepFreeze(value) {
  if(value && typeof value==='object' && !Object.isFrozen(value)) {
    for(const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

/** Controlled synthetic ports. No case IDs, gold outputs, or real grants enter this adapter. */
export function createSpeechEvaluationPorts(input, hooks={}) {
  let revoked=false, features=structuredClone(input.acoustic_stub), baseline=structuredClone(input.baseline)
  let reads=0, baselineReads=0
  const effects={provider_calls:0,persistence_writes:0,raw_audio_bytes_retained:0,
    biometric_template_writes:0,training_writes:0,sensitive_log_entries:0,
    purged_inflight:false,baseline_read_owner:null}
  const events=[]
  const authority=()=>({owner_id:input.owner_id,
    revision:revoked?input.authority.current_revision:input.authority.request_revision,
    active:!revoked,transcription:input.authority.transcription,inference:input.authority.inference,
    session_baseline:input.authority.session_baseline})
  const forbidden=counter=>(()=>{effects[counter]++;throw new Error('SPEECH_FORBIDDEN_EFFECT:'+counter)})
  const ports={
    async readAuthority(){events.push('authority');return hooks.readAuthority?hooks.readAuthority(authority()):authority()},
    async readFeatures(){
      events.push('features');reads++
      const output=structuredClone(features)
      await hooks.afterFeatures?.()
      if(input.authority.revoked_during_request) revoked=true
      return output
    },
    async readBaseline(ownerId,speakerKey){
      events.push('baseline');baselineReads++;effects.baseline_read_owner=ownerId
      if(ownerId!==input.owner_id || speakerKey!==input.speaker.session_key) throw new Error('FOREIGN_BASELINE_READ')
      return hooks.baseline?hooks.baseline(ownerId,speakerKey):structuredClone(baseline)
    },
    async purge(){events.push('purge');features=null;baseline=null;effects.purged_inflight=true;await hooks.afterPurge?.()},
    provider:forbidden('provider_calls'),persist:forbidden('persistence_writes'),
    retainAudio:forbidden('raw_audio_bytes_retained'),writeBiometric:forbidden('biometric_template_writes'),
    train:forbidden('training_writes'),logSensitive:forbidden('sensitive_log_entries'),
  }
  return {ports,effects,events,revoke(){revoked=true},get featureReads(){return reads},
    get baselineReads(){return baselineReads},get purgedBuffers(){return features===null && baseline===null}}
}

export function speechRequest(input) {
  return deepFreeze({owner_id:input.owner_id,request_revision:input.authority.request_revision,
    utterance:structuredClone(input.utterance),speaker:structuredClone(input.speaker),
    baseline:input.baseline?{owner_id:input.baseline.owner_id,speaker_key:input.baseline.speaker_key}:null,
    language_pair_supported:input.language_pair_supported,context_assessment:structuredClone(input.context_assessment),
    correction:structuredClone(input.correction),prior_inference:structuredClone(input.prior_inference),
    acoustic_candidate:structuredClone(input.acoustic_candidate),lexical_candidate:structuredClone(input.lexical_candidate),
    async_reply_revision:input.async_reply_revision})
}

export async function evaluateSpeechFixture(input, hooks={}) {
  const f=createSpeechEvaluationPorts(input,hooks),request=speechRequest(input),before=structuredClone(request)
  const session=createManualWeatherSession()
  session.bind({},()=>true)
  if(input.profile==='current-manual' && input.manual.enabled) {
    session.setEnabled(session.getLease(),true)
    session.choose(session.getLease(),input.manual.choice)
  }
  const fetchBefore=globalThis.fetch
  const consoleBefore=Object.fromEntries(['log','info','warn','error','debug'].map(name=>[name,console[name]]))
  // Count attempted transport calls even when they fail before returning data.
  globalThis.fetch=async()=>{f.effects.provider_calls++;throw new Error('SPEECH_EXTERNAL_TRANSPORT_FORBIDDEN')}
  for(const name of Object.keys(consoleBefore)) console[name]=()=>{f.effects.sensitive_log_entries++;throw new Error('SPEECH_SENSITIVE_LOG_FORBIDDEN')}
  try {
    const decision=await assessSpeechEvidence(request,f.ports,{
      processingEnabled:input.profile==='offline-guard',
      manualReading:input.profile==='current-manual'?session.getSnapshot().reading:undefined,
    })
    decision.lifecycle.source_unchanged=isDeepStrictEqual(request,before)
    return {...decision,effects:{...f.effects}}
  } finally {
    globalThis.fetch=fetchBefore
    for(const [name,method] of Object.entries(consoleBefore)) console[name]=method
    session.end()
  }
}
