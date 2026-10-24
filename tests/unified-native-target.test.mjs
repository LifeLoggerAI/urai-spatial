import assert from 'node:assert/strict'
import test from 'node:test'
import { UNIFIED_CANDIDATE_BRANCH, UNIFIED_REQUIRED_PREFLIGHT, UNIFIED_REQUIRED_POSTINSTALL, selectNativeTarget, assertUnifiedHeadCurrent, planUnifiedStages, assertUnifiedPreflightOutcome } from '../scripts/lib/unified-native-target.mjs'
const baseBranch='repair/rfinal-convergence-candidate-20261020'
const pin='e21f6a727d45b01fce6ecaafb9eb0f651b2c4a39'
const other='3041b99b09c9804d517fe7a29734e102a273b2b2'
test('original native mode is unchanged',()=>{const v=selectNativeTarget({defaultBranch:baseBranch});assert.equal(v.branch,baseBranch);assert.equal(v.releaseAuthorized,false)})
test('unified mode must be pinned to a full SHA and cannot grant release',()=>{
 const v=selectNativeTarget({defaultBranch:baseBranch,unified:true,pinnedSha:pin});assert.equal(v.branch,UNIFIED_CANDIDATE_BRANCH);assert.equal(v.releaseAuthorized,false)
 for(const x of [null,undefined,'HEAD','a'.repeat(39),'A'.repeat(40)])assert.throws(()=>selectNativeTarget({defaultBranch:baseBranch,unified:true,pinnedSha:x}),/UNIFIED_EXACT_SHA_REQUIRED/)
})
test('untrusted branch or old invalid pin blocked',()=>{
 for(const defaultBranch of ['main',undefined,'verify/malicious',baseBranch+';echo'])assert.throws(()=>selectNativeTarget({defaultBranch}),/NATIVE_DEFAULT_BRANCH_AUTHORITY_CHANGED/)
 assert.throws(()=>selectNativeTarget({defaultBranch:baseBranch,pinnedSha:'HEAD'}),/NATIVE_PIN_INVALID/)
})
test('stale unified branch always fails closed',()=>{
 for(const stage of ['before_clone','after_clone','final']){
 assert.equal(assertUnifiedHeadCurrent({unified:true,pinnedSha:pin,remoteHead:pin,stage}),true)
 assert.throws(()=>assertUnifiedHeadCurrent({unified:true,pinnedSha:pin,remoteHead:other,stage}),/UNIFIED_SOURCE_HEAD_MOVED_OR_STALE/)
 assert.throws(()=>assertUnifiedHeadCurrent({unified:true,pinnedSha:pin,remoteHead:null,stage}),/UNIFIED_SOURCE_HEAD_INVALID/)
 }
})
test('dependency-free source/privacy gates run before installation; TS runtime gate runs after',()=>{
 const base = [{id:'source_integrity',requiresInstall:false},{id:'frozen_install',requiresInstall:false},
   {id:'bootstrap_check',requiresInstall:true},{id:'production_build',requiresInstall:true}]
 const stages=planUnifiedStages(base,true)
 assert.equal(stages.length,base.length+UNIFIED_REQUIRED_PREFLIGHT.length+UNIFIED_REQUIRED_POSTINSTALL.length)
 const install=stages.findIndex(x=>x.id==='frozen_install')
 const semantic=stages.findIndex(x=>x.id==='unified_lifemap_semantic_owner')
 assert.equal(semantic, install+1)
 assert.ok(stages.slice(0,install).every(s=>s.requiresInstall===false))
 assert.ok(stages.find(s=>s.id==='unified_lifemap_privacy').command.every(s=>!s.includes('lifemap-semantic-owner-contract.test.mjs')))
 assert.deepEqual(stages[semantic].command,['corepack','pnpm','--dir','urai-tier1','exec','node','--import','tsx','--test','tests/lifemap-semantic-owner-contract.test.mjs','tests/lifemap-software-threshold-handoff.test.mjs'])
 assert.equal(stages[semantic].requiresInstall,true)
 assert.deepEqual(planUnifiedStages(base),base)
})
test('fail closed if frozen install is missing, misplaced, or incorrectly requires prior dependencies',()=>{
 for (const broken of [[{id:'source_integrity',requiresInstall:false}],
   [{id:'frozen_install',requiresInstall:true}],
   [{id:'root_build',requiresInstall:true},{id:'frozen_install',requiresInstall:false}]]) {
   assert.throws(()=>planUnifiedStages(broken,true),/UNIFIED_FROZEN_INSTALL_STAGE_REQUIRED/)
 }
})
test('unified preflights fail closed and duplicate stages are rejected',()=>{
 for(const s of [...UNIFIED_REQUIRED_PREFLIGHT,...UNIFIED_REQUIRED_POSTINSTALL]){assert.equal(assertUnifiedPreflightOutcome({unified:true,stageId:s.id,outcome:'PASS'}),true);for(const o of ['FAIL','SKIP','NOT_RUN','LIMITED'])assert.throws(()=>assertUnifiedPreflightOutcome({unified:true,stageId:s.id,outcome:o}),/UNIFIED_PREFLIGHT_BLOCKED/)}
 assert.throws(()=>planUnifiedStages([{id:'unified_source_authority'}],true),/UNIFIED_PREFLIGHT_DUPLICATE_STAGE/)
 assert.throws(()=>planUnifiedStages([{id:'unified_lifemap_semantic_owner'}],true),/UNIFIED_PREFLIGHT_DUPLICATE_STAGE/)
})
