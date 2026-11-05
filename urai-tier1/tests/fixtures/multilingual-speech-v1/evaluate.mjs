import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual as equal } from 'node:util'

export const UNITS = Object.freeze({mean_f0_hz:'Hz',energy_dbfs:'dBFS',syllables_per_second:'syllables/s',pause_ratio:'ratio'})
const STATUS_KEYS={reported:'speech.you_said',unknown:'speech.unknown',disputed:'speech.unresolved',disabled:'speech.disabled',revoked:'speech.revoked'}
const problem=(errors,ok,code)=>{if(!ok)errors.push(code)}
function objectKeys(errors,obj,names,code){
  const ok=obj!==null && typeof obj==='object' && !Array.isArray(obj)
  problem(errors,ok,code+':OBJECT_REQUIRED')
  if(ok)problem(errors,equal(Object.keys(obj).sort(),[...names].sort()),code+':EXACT_KEYS_REQUIRED')
  return ok
}
const sorted=a=>Array.isArray(a)?[...a].sort():null
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex')

export function validateFixturePack(pack){
  const errors=[]
  problem(errors,pack?.schema_version==='urai.multilingual-speech-eval.v1','FIXTURE_VERSION')
  problem(errors,pack?.origin==='synthetic-authored' && pack?.private_recordings_used===false && equal(pack?.audio_assets,[]),'SYNTHETIC_ONLY')
  problem(errors,pack?.emotion_ground_truth==='not-established','NO_EMOTION_GROUND_TRUTH')
  problem(errors,Array.isArray(pack?.cases) && pack.cases.length===30,'EXPECTED_30_CASES')
  if(!Array.isArray(pack?.cases))return errors
  const ids=pack.cases.map(c=>c.id)
  problem(errors,new Set(ids).size===ids.length,'DUPLICATE_FIXTURE_ID')
  for(const c of pack.cases){
    const i=c.input,e=c.expected,prefix=c.id+':'
    problem(errors,/^[A-Z]{2}\d{2}$/.test(c.id),prefix+'INVALID_ID')
    problem(errors,i?.owner_id?.startsWith('synthetic-owner-'),prefix+'SYNTHETIC_OWNER')
    problem(errors,['offline-guard','current-manual'].includes(i?.profile),prefix+'PROFILE')
    problem(errors,typeof i?.utterance?.text==='string' && Array.isArray(i?.utterance?.language_spans),prefix+'UTTERANCE')
    if(Array.isArray(i?.utterance?.language_spans))problem(errors,i.utterance.language_spans.map(s=>s.text).join('')===i.utterance.text,prefix+'LOSSLESS_SPANS')
    problem(errors,e && Object.hasOwn(STATUS_KEYS,e.status),prefix+'STATUS')
    problem(errors,Array.isArray(e?.observation_fields) && new Set(e.observation_fields).size===e.observation_fields.length,prefix+'OBSERVATION_FIELDS')
    for(const field of e?.observation_fields||[])problem(errors,Object.hasOwn(UNITS,field) && Number.isFinite(i.acoustic_stub?.[field]),prefix+'FINITE_FEATURE:'+field)
    problem(errors,i?.acoustic_stub===null || i?.acoustic_stub?.origin==='synthetic-feature-stub',prefix+'STUB_ORIGIN')
    if(e?.baseline_z!==null){
      const b=i.baseline
      problem(errors,b?.origin==='synthetic-session-stub' && b.owner_id===i.owner_id && b.speaker_key===i.speaker.session_key,prefix+'BASELINE_BINDING')
      problem(errors,b?.samples>=5 && b?.scale_f0_hz>0 && i.authority.session_baseline===true,prefix+'BASELINE_ELIGIBILITY')
      const z=(i.acoustic_stub?.mean_f0_hz-b?.median_f0_hz)/b?.scale_f0_hz
      problem(errors,Number.isFinite(z) && Math.abs(z-e.baseline_z)<=1e-6,prefix+'BASELINE_MATH')
    }
    if(e?.assertion?.attribution==='typed-owner-correction')problem(errors,i.correction?.actor_id===i.owner_id,prefix+'CORRECTION_OWNER')
    if(['disabled','revoked'].includes(e?.status))problem(errors,e.observation_fields.length===0 && e.inference_enabled===false,prefix+'BLOCKED_HAS_NO_PROCESSING')
  }
  for(const g of pack.invariance_groups||[])problem(errors,g.case_ids.every(id=>ids.includes(id)),g.id+':UNKNOWN_CASE')
  return errors
}

export function evaluateCase(c,r){
  const errors=[],i=c.input,e=c.expected
  const keys=['case_id','status','observations','assertions','interpretations','language_spans','evidence_flags','conflict_refs','baseline','presentation','lifecycle','effects']
  if(!objectKeys(errors,r,keys,'RESULT'))return errors
  problem(errors,r.case_id===c.id,'CASE_ID_MISMATCH')
  problem(errors,r.status===e.status,'EXPECTED_STATUS')
  for(const key of ['observations','assertions','interpretations','language_spans','evidence_flags'])problem(errors,Array.isArray(r[key]),key.toUpperCase()+':ARRAY_REQUIRED')
  if(!['observations','assertions','interpretations','language_spans','evidence_flags'].every(k=>Array.isArray(r[k])))return errors

  const observed=r.observations.map(o=>o?.feature)
  problem(errors,equal(sorted(observed),sorted(e.observation_fields)) && new Set(observed).size===observed.length,'EXACT_OBSERVATION_COVERAGE')
  for(const o of r.observations){
    if(!objectKeys(errors,o,['feature','value','unit','truth_kind','origin','source_ref'],'OBSERVATION'))continue
    problem(errors,Object.hasOwn(UNITS,o.feature) && Number.isFinite(o.value) && o.value===i.acoustic_stub?.[o.feature],'OBSERVATION_VALUE')
    problem(errors,o.unit===UNITS[o.feature],'OBSERVATION_UNIT')
    problem(errors,o.truth_kind==='observation' && o.origin==='synthetic-feature-stub' && o.source_ref==='feature:'+o.feature,'OBSERVATION_PROVENANCE')
  }

  problem(errors,r.assertions.length===(e.assertion?1:0),'EXACT_ASSERTION_COVERAGE')
  for(const a of r.assertions){
    if(!objectKeys(errors,a,['label','attribution','source_ref','truth_kind','actor_id','scope'],'ASSERTION'))continue
    problem(errors,a.truth_kind==='user-assertion','EMOTION_NOT_ESTABLISHED_FACT')
    problem(errors,a.actor_id===i.owner_id && a.scope==='utterance:current','ASSERTION_OWNER_SCOPE')
    problem(errors,e.assertion && a.label===e.assertion.label && a.attribution===e.assertion.attribution && a.source_ref===e.assertion.source_ref,'ASSERTION_ATTRIBUTION')
  }
  problem(errors,r.interpretations.length===(e.interpretation?1:0),'EXACT_INTERPRETATION_COVERAGE')
  for(const a of r.interpretations){
    if(!objectKeys(errors,a,['label','truth_kind','qualifier','scope','evidence_refs'],'INTERPRETATION'))continue
    problem(errors,a.label===e.interpretation && a.truth_kind==='interpretation' && a.qualifier==='possible','INTERPRETATION_NOT_FACT')
    problem(errors,a.scope==='utterance-style' && equal(a.evidence_refs,['utterance:current']),'INTERPRETATION_EVIDENCE_SCOPE')
  }

  const blocked=['disabled','revoked'].includes(e.status) || i.profile==='current-manual'
  problem(errors,equal(r.language_spans,blocked?[]:i.utterance.language_spans),'LOSSLESS_MULTILINGUAL_SOURCE')
  problem(errors,equal(sorted(r.evidence_flags),sorted(e.flags)) && new Set(r.evidence_flags).size===r.evidence_flags.length,'CONTEXT_AND_CONFLICT_FLAGS')
  problem(errors,Array.isArray(r.conflict_refs) && equal(sorted(r.conflict_refs),sorted(e.conflict_refs)),'CONFLICT_EVIDENCE_REFERENCES')
  if(objectKeys(errors,r.baseline,['scope','speaker_key','z_f0'],'BASELINE')){
    const b=r.baseline
    problem(errors,b.scope===(e.baseline_z===null?'none':'session-only') && b.speaker_key===e.baseline_speaker_key,'BASELINE_ISOLATION')
    problem(errors,e.baseline_z===null?b.z_f0===null:Number.isFinite(b.z_f0)&&Math.abs(b.z_f0-e.baseline_z)<=1e-6,'BASELINE_NORMALIZATION')
  }
  if(objectKeys(errors,r.presentation,['key','qualifier','emotion_is_fact','inference_enabled','manual_weather'],'PRESENTATION')){
    const p=r.presentation
    problem(errors,p.key===STATUS_KEYS[e.status],'PRESENTATION_STATUS_KEY')
    problem(errors,p.qualifier===(e.assertion?'you-said':['unknown','disputed'].includes(e.status)?'uncertain':'none'),'VISIBLE_QUALIFIER')
    problem(errors,p.emotion_is_fact===false,'NO_FACTUAL_EMOTION_PRESENTATION')
    problem(errors,p.inference_enabled===e.inference_enabled,'INFERENCE_PERMISSION_AND_MODE')
    problem(errors,p.manual_weather===e.manual_weather,'MANUAL_CHOICE_AUTHORITY')
  }
  if(objectKeys(errors,r.lifecycle,['source_unchanged','applied_revision','superseded_claim_ids','stale_reply_dropped'],'LIFECYCLE')){
    problem(errors,r.lifecycle.source_unchanged===true,'SOURCE_IMMUTABLE')
    problem(errors,r.lifecycle.applied_revision===i.authority.current_revision,'CURRENT_AUTHORITY_REVISION')
    problem(errors,equal(sorted(r.lifecycle.superseded_claim_ids),sorted(e.superseded_claim_ids)),'CORRECTION_SUPERSEDES')
    problem(errors,r.lifecycle.stale_reply_dropped===e.stale_reply_dropped,'STALE_REPLY_SUPPRESSED')
  }
  const counters=['provider_calls','persistence_writes','raw_audio_bytes_retained','biometric_template_writes','training_writes','sensitive_log_entries']
  if(objectKeys(errors,r.effects,[...counters,'purged_inflight','baseline_read_owner'],'EFFECTS')){
    for(const key of counters)problem(errors,r.effects[key]===0 && Number.isInteger(r.effects[key]),'ZERO_SIDE_EFFECT:'+key)
    problem(errors,r.effects.purged_inflight===e.purged_inflight,'REVOCATION_PURGE')
    problem(errors,r.effects.baseline_read_owner===(e.baseline_z===null?null:i.owner_id),'BASELINE_OWNER_READ')
  }
  return errors
}

export function evaluateRun(pack,run,{fixtureHash,allowExample=false}={}){
  const errors=validateFixturePack(pack),caseResults=[]
  objectKeys(errors,run,['meta','results'],'RUN')
  const m=run?.meta
  if(objectKeys(errors,m,['evidence_scope','fixture_sha256','adapter_sha','model_calls'],'META')){
    problem(errors,m.evidence_scope===(allowExample?'example-only':'repository-adapter'),'EVIDENCE_SCOPE')
    problem(errors,m.fixture_sha256===fixtureHash && /^[a-f0-9]{64}$/.test(m.fixture_sha256),'FIXTURE_HASH')
    problem(errors,allowExample?m.adapter_sha===null:/^[a-f0-9]{40}$/.test(m.adapter_sha||''),'ADAPTER_SHA_REQUIRED')
    problem(errors,m.model_calls===0,'NO_MODEL_CALLS')
  }
  const results=run?.results
  problem(errors,Array.isArray(results),'RESULTS_ARRAY_REQUIRED')
  if(Array.isArray(results)){
    problem(errors,results.length===pack.cases.length,'NO_MISSING_OR_EXTRA_RESULTS')
    const ids=results.map(r=>r?.case_id)
    problem(errors,new Set(ids).size===ids.length,'DUPLICATE_RESULT_ID')
    problem(errors,ids.every(id=>pack.cases.some(c=>c.id===id)),'UNKNOWN_RESULT_ID')
    for(const c of pack.cases){
      const matches=results.filter(r=>r?.case_id===c.id)
      const found=matches.length===1
      const issues=found?evaluateCase(c,matches[0]):['EXACTLY_ONE_RESULT_REQUIRED']
      caseResults.push({case_id:c.id,passed:issues.length===0,errors:issues})
    }
    for(const group of pack.invariance_groups||[]){
      const selected=group.case_ids.map(id=>results.find(r=>r?.case_id===id))
      for(const field of group.equal_fields)problem(errors,selected.every(r=>r && equal(r[field],selected[0]?.[field])),'INVARIANCE:'+group.id+':'+field)
    }
  }
  const passed=errors.length===0 && caseResults.length===pack.cases.length && caseResults.every(r=>r.passed)
  return {scope:m?.evidence_scope||'invalid',fixture_cases:pack.cases.length,passed_cases:caseResults.filter(r=>r.passed).length,
    contract_passed:passed,production_speech_validated:false,asr_or_acoustic_model_validated:false,
    errors,case_results:caseResults}
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),allowExample=args[0]==='--example'
  const resultPath=args[allowExample?1:0]
  if(!resultPath || args.length!==(allowExample?2:1)){
    console.error('Usage: node evaluate.mjs [--example] RESULTS.json');process.exitCode=2
  }else try{
    const fixturePath=new URL('./cases.json',import.meta.url),bytes=fs.readFileSync(fixturePath)
    const report=evaluateRun(JSON.parse(bytes),JSON.parse(fs.readFileSync(resultPath,'utf8')),{fixtureHash:sha256(bytes),allowExample})
    console.log(JSON.stringify(report,null,2));process.exitCode=report.contract_passed?0:1
  }catch(error){console.error('Evaluation failed: '+error.message);process.exitCode=2}
}
