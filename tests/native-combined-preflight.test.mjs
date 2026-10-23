import assert from 'node:assert/strict'
import test from 'node:test'
import { COMBINED_REQUIRED_PREFLIGHT, planNativeEvidenceStages,
  assertCombinedPreflightOutcome, nativeCombinedPreflightEnvironment } from '../scripts/lib/native-combined-preflight.mjs'
const base=[{id:'frozen_install',requiresInstall:false},{id:'functions_build',requiresInstall:true}]
const pin='bcf3ffcac4fa3cebdbc79c9ad87b13a8702b99af'
test('combined preflight includes source, privacy, Firestore and Ground gates before install',()=>{
 const stages=planNativeEvidenceStages(base,true)
 assert.equal(stages.length,base.length+6)
 assert.equal(stages[6].id,'frozen_install')
 assert.deepEqual(stages.slice(0,6).map(x=>x.id),[
 'combined_source_tree_contracts','combined_source_tree_admission','combined_semantic_privacy',
 'combined_firestore_java','combined_ground_contracts','combined_runner_contracts'])
 assert.ok(stages.slice(0,6).every(x=>x.requiresInstall===false))
})
test('normal R-FINAL stages unchanged',()=>assert.deepEqual(planNativeEvidenceStages(base),base))
test('all combined gates fail closed on every non-pass status',()=>{
 for(const stage of COMBINED_REQUIRED_PREFLIGHT){
  assert.doesNotThrow(()=>assertCombinedPreflightOutcome({combined:true,stageId:stage.id,outcome:'PASS'}))
  for(const outcome of ['FAIL','LIMITED','SKIP','NOT_RUN','BLOCKED'])
   assert.throws(()=>assertCombinedPreflightOutcome({combined:true,stageId:stage.id,outcome}),/COMBINED_PREFLIGHT_BLOCKED/)
 }
})
test('non-preflight results are handled by original result matrix',()=>{
 assert.equal(assertCombinedPreflightOutcome({combined:true,stageId:'production_build',outcome:'FAIL'}),true)
 assert.equal(assertCombinedPreflightOutcome({combined:false,stageId:'combined_source_tree_admission',outcome:'FAIL'}),true)
})
test('exact SHA is supplied only to source-tree admission',()=>{
 assert.deepEqual(nativeCombinedPreflightEnvironment({combined:true,stageId:'combined_source_tree_admission',pinnedSha:pin}),{URAI_SOURCE_SHA:pin})
 assert.deepEqual(nativeCombinedPreflightEnvironment({combined:true,stageId:'combined_ground_contracts',pinnedSha:pin}),{})
})
test('unpinned combined admission rejected',()=>{
 for(const bad of [undefined,null,'HEAD','x'.repeat(40),'a'.repeat(39)])
  assert.throws(()=>nativeCombinedPreflightEnvironment({combined:true,stageId:'combined_source_tree_admission',pinnedSha:bad}),/COMBINED_SOURCE_SHA_REQUIRED/)
})
test('duplicate stages and invalid base plans rejected',()=>{
 assert.throws(()=>planNativeEvidenceStages([{id:'combined_ground_contracts'}],true),/COMBINED_PREFLIGHT_DUPLICATE_STAGE/)
 assert.throws(()=>planNativeEvidenceStages([]),/INVALID_BASE_NATIVE_STAGES/)
 assert.throws(()=>planNativeEvidenceStages([{}]),/INVALID_BASE_NATIVE_STAGES/)
})

test('combined native contract stage executes preflight, redirect and original runner regressions',()=>{
 const stage=planNativeEvidenceStages(base,true).find(x=>x.id==='combined_runner_contracts')
 for(const name of ['tests/native-combined-preflight.test.mjs','tests/native-http-route-acceptance.test.mjs','tests/rfinal-native-evidence-runner.test.mjs'])
   assert.ok(stage.command.includes(name),'missing native regression: '+name)
 assert.equal(stage.requiresInstall,false)
})
