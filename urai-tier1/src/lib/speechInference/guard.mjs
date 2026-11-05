import { assertRealityIsolation, validateTruthRecord } from '../truth/truthValidation.ts'
import { correctionSupersedes } from '../truth/truthAuthority.ts'
import { URAI_EMOTIONAL_WEATHER } from '../uraiEmotion/weather.ts'
import { baselineEligibility, normalizeSessionPitch } from './baseline.mjs'

const UNITS = Object.freeze({mean_f0_hz:'Hz',energy_dbfs:'dBFS',syllables_per_second:'syllables/s',pause_ratio:'ratio'})
const EMOTIONS = new Set(['calm','joy','grief','anger','fear','focus','awe','loneliness','hope','overload','neutral'])
const CANDIDATE_LABELS = new Set([...EMOTIONS,'positive-appraisal','empathetic-language'])
const KEYS = Object.freeze({reported:'speech.you_said',unknown:'speech.unknown',disputed:'speech.unresolved',disabled:'speech.disabled',revoked:'speech.revoked'})
const emptyBaseline = () => ({scope:'none',speaker_key:null,z_f0:null})

function record({id,ownerId,kind,revision,refs,value}) {
  const now=new Date().toISOString()
  const item={id,ownerId,kind,value,userCorrectionRevision:revision,support:'low',
    sourceRefs:refs.map(id=>({id,provenance:kind==='user-assertion'?'user-confirmed':'derived'})),
    createdAt:now,updatedAt:now}
  if(validateTruthRecord(item).length) throw new Error('SPEECH_TRUTH_RECORD_INVALID')
  return item
}

function validAuthority(value, ownerId) {
  return value && value.owner_id===ownerId && value.active===true
    && Number.isInteger(value.revision) && value.revision>=0
}
function sameAuthority(value, initial, ownerId) {
  return validAuthority(value,ownerId) && value.revision===initial.revision
    && value.transcription===true && value.inference===true
    && value.session_baseline===initial.session_baseline
}
function validFeature(name, value) {
  if (!Number.isFinite(value)) return false
  if (name==='mean_f0_hz') return value>0
  if (name==='energy_dbfs') return value<=0
  if (name==='pause_ratio') return value>=0 && value<=1
  return value>=0
}
function validateSpans(utterance) {
  return typeof utterance?.text==='string' && Array.isArray(utterance.language_spans)
    && utterance.language_spans.every(span=>span && typeof span.language==='string'
      && /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(span.language) && typeof span.text==='string')
    && utterance.language_spans.map(span=>span.text).join('')===utterance.text
}

/**
 * Internal evidence-policy boundary, with processing disabled by default.
 *
 * readAuthority is a trusted current-owner/purpose-policy port, not request JSON.
 * readFeatures and readBaseline must read only the authorized source/session.
 * This function contains no provider, transport, persistence, or training API.
 * It must not be exposed as a callable that trusts client-supplied grant flags.
 * Context and lexical candidates are upstream hypotheses, not language detection.
 * @param {import('./guard.mjs').SpeechEvidenceRequest} request
 * @param {import('./guard.mjs').SpeechEvidencePorts} ports
 * @param {import('./guard.mjs').SpeechEvidenceOptions} [options]
 */
export async function assessSpeechEvidence(request, ports, options={}) {
  // Capture input values before asynchronous policy/source reads can mutate shared objects.
  request=structuredClone(request)
  options=structuredClone(options)
  const ownerId=request.owner_id
  if(typeof ownerId!=='string' || !ownerId || !ports || typeof ports.readAuthority!=='function') throw new Error('SPEECH_AUTHORITY_PORT_REQUIRED')
  const initial=await ports.readAuthority()
  const first=initial ? Object.freeze({owner_id:initial.owner_id,revision:initial.revision,active:initial.active,
    transcription:initial.transcription,inference:initial.inference,session_baseline:initial.session_baseline}) : null
  const revision=Number.isInteger(first?.revision)?first.revision:0
  let status='unknown', flags=[], observations=[], assertions=[], interpretations=[], spans=[], conflicts=[]
  let baseline=emptyBaseline(), superseded=[], stale=false, inferenceEnabled=false, manualWeather=null
  const result=()=>({status,observations,assertions,interpretations,language_spans:spans,
    evidence_flags:[...new Set(flags)],conflict_refs:conflicts,baseline,
    presentation:{key:KEYS[status],qualifier:assertions.length?'you-said':['unknown','disputed'].includes(status)?'uncertain':'none',
      emotion_is_fact:false,inference_enabled:inferenceEnabled,manual_weather:manualWeather},
    lifecycle:{source_unchanged:true,applied_revision:revision,superseded_claim_ids:superseded,stale_reply_dropped:stale}})
  const revoke=async(current)=>{
    if(typeof ports.purge!=='function') throw new Error('SPEECH_PURGE_PORT_REQUIRED')
    await ports.purge()
    status='revoked';flags=['authority-revoked'];observations=[];assertions=[];interpretations=[];spans=[];conflicts=[]
    baseline=emptyBaseline();superseded=[];stale=true;inferenceEnabled=false;manualWeather=null
    const output=result()
    output.lifecycle.applied_revision=Number.isInteger(current?.revision)?current.revision:revision
    return output
  }

  if(!validAuthority(first,ownerId)) return revoke(first)
  if(options.processingEnabled!==true) {
    flags=['inference-off'];status='disabled'
    const reading=options.manualReading
    if(reading?.source==='manual' && reading.medicalDiagnosis===false && URAI_EMOTIONAL_WEATHER.includes(reading.weather)) {
      manualWeather=reading.weather
      status='reported';assertions=[{label:reading.weather,attribution:'manual-choice',source_ref:'manual:current',truth_kind:'user-assertion',actor_id:ownerId,scope:'utterance:current'}]
    }
    return result()
  }
  if(first.transcription!==true || first.inference!==true) {
    status='disabled';flags=[first.transcription!==true?'transcription-consent-required':'inference-consent-required'];return result()
  }
  if(first.revision!==request.request_revision) return revoke(first)
  if(typeof ports.readFeatures!=='function') throw new Error('SPEECH_FEATURE_PORT_REQUIRED')
  const features=structuredClone(await ports.readFeatures())
  let current=await ports.readAuthority()
  if(!sameAuthority(current,first,ownerId)) return revoke(current)
  inferenceEnabled=true
  const utterance=request.utterance
  if(!validateSpans(utterance)) { flags=['invalid-language-spans'];return result() }
  // Context evidence positions must come from an actual array. A malformed or
  // missing context collection cannot mint usable context references or crash
  // the policy guard after protected feature reads.
  // Context references represent evidence positions, not arbitrary caller values.
  // Refuse malformed entries and unbounded collections before minting any refs.
  if(!Array.isArray(utterance.context) || utterance.context.length>32
      || !utterance.context.every(entry=>entry && typeof entry==='object' && !Array.isArray(entry)
        && typeof entry.speaker==='string' && entry.speaker.trim().length>0 && entry.speaker.length<=128
        && typeof entry.text==='string' && entry.text.trim().length>0 && entry.text.length<=4096)) {
    flags=['invalid-utterance-context'];return result()
  }
  spans=utterance.language_spans.map(span=>({...span}))
  const languages=new Set(spans.map(span=>span.language.split('-')[0].toLowerCase()))
  if(languages.size>1) flags.push('code-switch')
  if(request.language_pair_supported!==true) flags.push('unsupported-language-pair')
  if(utterance.transcript_quality==='ambiguous') flags.push('asr-ambiguous')
  if(utterance.role==='quoted-other') flags.push('quoted-other')
  if(!utterance.text.trim() && !features) flags.push('no-signal')
  const origins=['synthetic-feature-stub','recorded-feature']
  const reliable=features && origins.includes(features.origin) && Number.isFinite(features.reliability) && features.reliability>=.5 && features.reliability<=1
  if(features && !reliable) flags.push('acoustic-unreliable')
  if(reliable) {
    for(const [feature,unit] of Object.entries(UNITS)) {
      const value=features[feature]
      if(!validFeature(feature,value)) continue
      record({id:'feature:'+feature,ownerId,kind:'observation',revision,refs:['feature:'+feature],value})
      observations.push({feature,value,unit,truth_kind:'observation',origin:features.origin,source_ref:'feature:'+feature})
    }
  }

  const eligible=baselineEligibility({ownerId,speaker:request.speaker,descriptor:request.baseline,authority:first})
  flags.push(...eligible.flags)
  const f0=observations.find(item=>item.feature==='mean_f0_hz')?.value
  if(eligible.allowed && f0!==undefined) {
    // A reference is checked before reading any protected baseline values.
    if(typeof ports.readBaseline!=='function') throw new Error('SPEECH_BASELINE_PORT_REQUIRED')
    const distribution=structuredClone(await ports.readBaseline(ownerId,request.speaker.session_key))
    current=await ports.readAuthority()
    if(!sameAuthority(current,first,ownerId) || current.session_baseline!==true) return revoke(current)
    const normalized=normalizeSessionPitch({ownerId,speakerKey:request.speaker.session_key,descriptor:request.baseline,distribution,meanF0Hz:f0})
    if(normalized) baseline=normalized
    else flags.push('baseline-rejected')
  }

  const knownRefs=new Set(['utterance:current',...observations.map(item=>item.source_ref),
    ...utterance.context.map((_,index)=>'context:'+index)])
  const context=request.context_assessment
  const contextAmbiguous=context?.ambiguous===true && Array.isArray(context.evidence_refs)
    && context.evidence_refs.length>0 && context.evidence_refs.every(ref=>knownRefs.has(ref) && ref.startsWith('context:'))
  if(contextAmbiguous) flags.push('context-ambiguous')
  stale=request.async_reply_revision!==undefined && request.async_reply_revision!==revision
  if(stale) flags.push('stale-reply')

  function candidate(value,expectedId) {
    if(!value || stale || request.language_pair_supported!==true || utterance.transcript_quality!=='clear' || utterance.role!=='owner') return null
    try { assertRealityIsolation('interpretation',value.truth_kind) } catch { flags.push('candidate-promotion-rejected');return null }
    if(value.truth_kind!=='interpretation' || value.id!==expectedId || !CANDIDATE_LABELS.has(value.label)
        || !Array.isArray(value.evidence_refs) || !value.evidence_refs.length || !value.evidence_refs.every(ref=>knownRefs.has(ref))) {
      flags.push('invalid-candidate');return null
    }
    if(expectedId==='candidate:acoustic'
        ? !value.evidence_refs.every(ref=>ref.startsWith('feature:'))
        : !value.evidence_refs.includes('utterance:current') || value.evidence_refs.some(ref=>ref.startsWith('feature:'))) {
      flags.push('invalid-candidate');return null
    }
    record({id:value.id,ownerId,kind:'interpretation',revision,refs:value.evidence_refs,value:value.label})
    return value
  }
  const acoustic=candidate(request.acoustic_candidate,'candidate:acoustic')
  const lexical=candidate(request.lexical_candidate,'candidate:lexical')
  const report=utterance.reported_emotion
  if(request.language_pair_supported===true && utterance.role==='owner' && utterance.transcript_quality==='clear' && report?.actor_id===ownerId
      && report.source==='speaker-self-report' && EMOTIONS.has(report.label)
      && typeof report.evidence_text==='string' && report.evidence_text.trim() && utterance.text.includes(report.evidence_text)) {
    record({id:'utterance:current',ownerId,kind:'user-assertion',revision,refs:['utterance:current'],value:report.label})
    assertions=[{label:report.label,attribution:'speaker-self-report',source_ref:'utterance:current',truth_kind:'user-assertion',actor_id:ownerId,scope:'utterance:current'}]
  }
  const correction=request.correction
  if(correction) {
    if(correction.actor_id!==ownerId) flags.push('correction-owner-mismatch')
    else if(request.prior_inference && request.prior_inference.owner_id===ownerId
        && correction.target_claim_id===request.prior_inference.claim_id
        && correction.from_revision===request.prior_inference.revision && correction.to_revision===revision
        && EMOTIONS.has(correction.label) && typeof correction.text==='string' && correction.text.trim()
        && correctionSupersedes({ownerId,userCorrectionRevision:request.prior_inference.revision},{ownerId,userCorrectionRevision:correction.to_revision})) {
      record({id:'correction:current',ownerId,kind:'user-assertion',revision,refs:['correction:current'],value:correction.label})
      assertions=[{label:correction.label,attribution:'typed-owner-correction',source_ref:'correction:current',truth_kind:'user-assertion',actor_id:ownerId,scope:'utterance:current'}]
      superseded=[correction.target_claim_id]
    } else flags.push('invalid-correction')
  }
  if(acoustic && assertions.length && acoustic.label!==assertions[0].label) {
    flags.push('lexical-acoustic-conflict');conflicts=[assertions[0].source_ref,acoustic.id]
  } else if(acoustic && lexical && acoustic.label!==lexical.label) {
    flags.push('lexical-acoustic-conflict');conflicts=[lexical.id,acoustic.id];status='disputed'
  }
  if(lexical?.label==='empathetic-language' && !assertions.length) {
    interpretations=[{label:'empathetic-language',truth_kind:'interpretation',qualifier:'possible',scope:'utterance-style',evidence_refs:[...lexical.evidence_refs]}]
  }
  if(assertions.length) status='reported'
  current=await ports.readAuthority()
  if(!sameAuthority(current,first,ownerId)) return revoke(current)
  return result()
}
