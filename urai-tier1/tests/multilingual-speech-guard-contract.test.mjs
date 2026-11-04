import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { assessSpeechEvidence } from '../src/lib/speechInference/guard.mjs'
import { createSpeechEvaluationPorts, evaluateSpeechFixture, speechRequest } from './helpers/multilingualSpeechEvaluationAdapter.mjs'
import { evaluateCase, validateFixturePack } from './fixtures/multilingual-speech-v1/evaluate.mjs'

const pack=JSON.parse(fs.readFileSync(new URL('./fixtures/multilingual-speech-v1/cases.json',import.meta.url)))
const input=id=>structuredClone(pack.cases.find(c=>c.id===id).input)
async function probe(id,change=()=>{},hooks={},options={processingEnabled:true}) {
  const i=input(id);change(i)
  const fixture=createSpeechEvaluationPorts(i,hooks),request=speechRequest(i)
  const decision=await assessSpeechEvidence(request,fixture.ports,options)
  return {decision,fixture,request}
}

for(const c of pack.cases) test('actual speech policy guard: '+c.id+' '+c.title,async()=>{
  const output=await evaluateSpeechFixture(structuredClone(c.input))
  assert.deepEqual(evaluateCase(c,{case_id:c.id,...output}),[])
})
test('fixtures remain synthetic and upstream annotations do not declare emotional ground truth',()=>{
  assert.deepEqual(validateFixturePack(pack),[])
  assert.equal(pack.fixture_revision,'1.1.0')
  assert.equal(pack.native_language_review,'not-performed')
})
test('constructed equivalents retain policy invariance across language and speaker-baseline changes',async()=>{
  for(const group of pack.invariance_groups) {
    const outputs=await Promise.all(group.case_ids.map(id=>probe(id)))
    for(const field of group.equal_fields) for(const r of outputs) assert.deepEqual(r.decision[field],outputs[0].decision[field])
  }
})
test('processing is disabled unless explicitly enabled; protected readers are untouched',async()=>{
  const {decision,fixture}=await probe('CF01',()=>{},{},{})
  assert.equal(decision.status,'disabled');assert.equal(decision.presentation.inference_enabled,false)
  assert.equal(fixture.featureReads,0);assert.equal(fixture.baselineReads,0)
  assert.deepEqual(decision.assertions,[])
})
test('denied transcription prevents every feature read even when inference is allowed',async()=>{
  const {decision,fixture}=await probe('CS01',i=>{i.authority.transcription=false})
  assert.equal(decision.status,'disabled');assert.equal(fixture.featureReads,0)
})
test('a foreign authority snapshot is rejected before protected reads',async()=>{
  const {decision,fixture}=await probe('SA01',()=>{},{readAuthority:a=>({...a,owner_id:'synthetic-owner-b'})})
  assert.equal(decision.status,'revoked');assert.equal(fixture.featureReads,0);assert.equal(fixture.baselineReads,0)
})
test('post-feature permission withdrawal is checked even without a revision bump',async()=>{
  let reads=0
  const {decision,fixture}=await probe('CS01',()=>{},{readAuthority:a=>({...a,inference:++reads===1})})
  assert.equal(decision.status,'revoked');assert.deepEqual(decision.observations,[]);assert.equal(fixture.purgedBuffers,true)
})
test('baseline revocation at the final delivery check cannot publish a cached normalized value',async()=>{
  let reads=0
  const {decision,fixture}=await probe('SA01',()=>{},{readAuthority:a=>({...a,session_baseline:++reads<4})})
  assert.equal(decision.status,'revoked');assert.equal(decision.baseline.z_f0,null);assert.equal(fixture.purgedBuffers,true)
})
test('a baseline store returning another owner cannot supply normalization',async()=>{
  const i=input('SA01')
  const {decision}=await probe('SA01',()=>{},{baseline:()=>({...i.baseline,owner_id:'synthetic-owner-b'})})
  assert.equal(decision.baseline.scope,'none');assert.ok(decision.evidence_flags.includes('baseline-rejected'))
})
test('insufficient baseline samples do not create an adapted emotional reading',async()=>{
  const i=input('SA01')
  const {decision}=await probe('SA01',()=>{},{baseline:()=>({...i.baseline,samples:4})})
  assert.equal(decision.baseline.z_f0,null);assert.deepEqual(decision.assertions,[])
})
test('a zero or nonfinite baseline scale cannot create an infinite deviation',async()=>{
  for(const scale of [0,NaN,Infinity]) {
    const i=input('SA01')
    const {decision}=await probe('SA01',()=>{},{baseline:()=>({...i.baseline,scale_f0_hz:scale})})
    assert.equal(decision.baseline.z_f0,null)
  }
})
test('an acoustic candidate declaring itself an observation cannot become emotional fact',async()=>{
  const {decision}=await probe('CF01',i=>{i.acoustic_candidate.truth_kind='observation'})
  assert.ok(decision.evidence_flags.includes('candidate-promotion-rejected'))
  assert.equal(decision.assertions[0].label,'joy')
  assert.ok(decision.observations.every(o=>o.feature!=='grief'))
})
test('an acoustic candidate declaring user testimony cannot forge an assertion',async()=>{
  const {decision}=await probe('CF03',i=>{i.acoustic_candidate.truth_kind='user-assertion'})
  assert.deepEqual(decision.assertions,[]);assert.notEqual(decision.status,'reported')
})
test('unknown candidate evidence references cannot create a material dispute',async()=>{
  const {decision}=await probe('CF03',i=>{i.acoustic_candidate.evidence_refs=['feature:foreign-source']})
  assert.equal(decision.status,'unknown');assert.deepEqual(decision.conflict_refs,[])
})
test('a lexical style interpretation cannot be supported solely by pitch',async()=>{
  const {decision}=await probe('CX04',i=>{i.lexical_candidate.evidence_refs=['feature:mean_f0_hz']})
  assert.deepEqual(decision.interpretations,[])
})
test('unknown emotions and personality labels are rejected as classifier candidates',async()=>{
  const {decision}=await probe('CF03',i=>{i.acoustic_candidate.label='proven-deceptive-person'})
  assert.equal(decision.status,'unknown');assert.deepEqual(decision.assertions,[])
})
test('classifier score magnitude cannot turn a hypothesis into a confirmed emotion',async()=>{
  for(const score of [0,.1,.999999,Infinity]) {
    const {decision}=await probe('CS01',i=>{i.acoustic_candidate={id:'candidate:acoustic',label:'anger',truth_kind:'interpretation',evidence_refs:['feature:mean_f0_hz'],uncalibrated_score:score}})
    assert.equal(decision.status,'unknown');assert.deepEqual(decision.assertions,[]);assert.deepEqual(decision.interpretations,[])
  }
})
test('quiet happy speech without a conflicting classifier is not marked contradictory',async()=>{
  const {decision}=await probe('CF01',i=>{i.acoustic_candidate=null})
  assert.equal(decision.status,'reported');assert.ok(!decision.evidence_flags.includes('lexical-acoustic-conflict'))
})
test('loud calm speech without a conflicting classifier is not marked contradictory',async()=>{
  const {decision}=await probe('CF02',i=>{i.acoustic_candidate=null})
  assert.equal(decision.assertions[0].label,'calm');assert.ok(!decision.evidence_flags.includes('lexical-acoustic-conflict'))
})
test('a quotation cannot be upgraded to owner testimony by an injected self-report field',async()=>{
  const {decision}=await probe('CX03',i=>{i.utterance.reported_emotion={actor_id:i.owner_id,source:'speaker-self-report',label:'anger',evidence_text:'I am furious.'}})
  assert.deepEqual(decision.assertions,[])
})
test('an ambiguous transcript cannot become a reliable self-report',async()=>{
  const {decision}=await probe('CF01',i=>{i.utterance.transcript_quality='ambiguous'})
  assert.deepEqual(decision.assertions,[]);assert.equal(decision.status,'unknown')
})
test('an unsupported language capability cannot attest a parsed emotional self-report',async()=>{
  const {decision}=await probe('CF01',i=>{i.language_pair_supported=false})
  assert.deepEqual(decision.assertions,[]);assert.equal(decision.status,'unknown')
})
test('self-report evidence must be present in the original source',async()=>{
  const {decision}=await probe('CF01',i=>{i.utterance.reported_emotion.evidence_text='This was never said.'})
  assert.deepEqual(decision.assertions,[])
})
test('a foreign prior claim cannot be corrected as if it belongs to the current owner',async()=>{
  const {decision}=await probe('UC01',i=>{i.prior_inference.owner_id='synthetic-owner-b'})
  assert.deepEqual(decision.assertions,[]);assert.deepEqual(decision.lifecycle.superseded_claim_ids,[])
})
test('a mismatched correction target cannot supersede a different interpretation',async()=>{
  const {decision}=await probe('UC01',i=>{i.correction.target_claim_id='other-memory-claim'})
  assert.deepEqual(decision.lifecycle.superseded_claim_ids,[])
})
test('a future or stale correction revision cannot acquire current authority',async()=>{
  for(const revision of [1,3]) {
    const {decision}=await probe('UC01',i=>{i.correction.to_revision=revision})
    assert.deepEqual(decision.assertions,[])
  }
})
test('a stale classifier reply cannot add a new style interpretation after correction',async()=>{
  const {decision}=await probe('UC02',i=>{i.lexical_candidate={id:'candidate:lexical',label:'empathetic-language',truth_kind:'interpretation',evidence_refs:['utterance:current']}})
  assert.deepEqual(decision.interpretations,[]);assert.equal(decision.assertions[0].attribution,'typed-owner-correction')
})
test('invalid multilingual span reconstruction cannot yield partial rewritten source claims',async()=>{
  const {decision}=await probe('CS03',i=>{i.utterance.language_spans.pop()})
  assert.deepEqual(decision.language_spans,[]);assert.deepEqual(decision.assertions,[]);assert.equal(decision.status,'unknown')
})
test('nonfinite feature values are never emitted as observations',async()=>{
  const {decision}=await probe('CS01',i=>{i.acoustic_stub.mean_f0_hz=Infinity;i.acoustic_stub.pause_ratio=NaN})
  assert.ok(decision.observations.every(o=>Number.isFinite(o.value)))
  assert.ok(!decision.observations.some(o=>o.feature==='mean_f0_hz' || o.feature==='pause_ratio'))
})
test('a failed purge rejects delivery instead of returning a reusable private result',async()=>{
  await assert.rejects(probe('PR03',()=>{},{afterPurge:()=>{throw new Error('PURGE_FAILED')}}),/PURGE_FAILED/)
})
test('a mutable authority object cannot update the initial lease in place',async()=>{
  const i=input('CS01'),f=createSpeechEvaluationPorts(i),request=speechRequest(i)
  const shared={owner_id:i.owner_id,revision:2,active:true,transcription:true,inference:true,session_baseline:true}
  f.ports.readAuthority=async()=>shared
  f.ports.readFeatures=async()=>{shared.revision=3;return structuredClone(i.acoustic_stub)}
  const decision=await assessSpeechEvidence(request,f.ports,{processingEnabled:true})
  assert.equal(decision.status,'revoked');assert.deepEqual(decision.observations,[])
})
test('a caller changing input while authority is awaited cannot replace the captured source',async()=>{
  const i=input('CF01'),f=createSpeechEvaluationPorts(i),request=structuredClone(speechRequest(i))
  let release;const gate=new Promise(resolve=>{release=resolve}),read=f.ports.readAuthority
  let first=true
  f.ports.readAuthority=async()=>{if(first){first=false;await gate}return read()}
  const pending=assessSpeechEvidence(request,f.ports,{processingEnabled:true})
  request.utterance.text='Rewritten source';request.utterance.language_spans=[{language:'en',text:'Rewritten source'}]
  request.utterance.reported_emotion.label='anger';release()
  const decision=await pending
  assert.equal(decision.assertions[0].label,'joy');assert.equal(decision.language_spans[0].text,"I'm happy.")
})
test('the actual adapter rejects attempted external transport rather than trusting a zero counter',async()=>{
  await assert.rejects(evaluateSpeechFixture(input('CS01'),{afterFeatures:()=>fetch('https://example.invalid/never-requested')}),/SPEECH_EXTERNAL_TRANSPORT_FORBIDDEN/)
})
test('the actual adapter rejects direct sensitive console logging and restores console afterwards',async()=>{
  const before=console.log
  await assert.rejects(evaluateSpeechFixture(input('CS01'),{afterFeatures:()=>console.log('synthetic text only')}),/SPEECH_SENSITIVE_LOG_FORBIDDEN/)
  assert.equal(console.log,before)
})
