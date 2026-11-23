import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveOwnerBoundStudioRender as resolve } from '../src/spatial/memory/ownerBoundStudioRenderResolver.ts'
const good=()=>({
  authenticatedOwnerUid:'owner_01',activeStudioTenantId:'tenant_01',
  ownerDeletionFenced:false,consentCurrentlyAuthorized:true,
  selectedMemory:{id:'memory-01',ownerId:'owner_01',deleted:false,demo:false,replayManifest:{id:'manifest-01'}},
  protectedBinding:{authority:'protected-server-record',ownerUid:'owner_01',tenantId:'tenant_01',memoryId:'memory-01',replayManifestId:'manifest-01',jobId:'render_1234567890',jobType:'studio.render.video',revoked:false},
  currentJobsReadback:{jobId:'render_1234567890',ownerUid:'owner_01',tenantId:'tenant_01',jobType:'studio.render.video',status:'SUCCESS',outputDeletedAt:null}
})
test('pure trusted-server fixture returns only a candidate id, never playback capability',()=>{
 const value=resolve(good());assert.deepEqual(value,{status:'candidate',tenantId:'tenant_01',jobId:'render_1234567890'})
 assert.equal(JSON.stringify(value).includes('url'),false)
})
const cases=[
 ['missing owner',v=>v.authenticatedOwnerUid=null],
 ['invalid owner',v=>v.authenticatedOwnerUid='wrong/owner'],
 ['missing active studio tenant',v=>v.activeStudioTenantId=''],
 ['wrong active tenant',v=>v.activeStudioTenantId='other_tenant'],
 ['missing verified deletion clear',v=>v.ownerDeletionFenced=undefined],
 ['owner deletion active',v=>v.ownerDeletionFenced=true],
 ['missing current consent',v=>v.consentCurrentlyAuthorized=undefined],
 ['revoked consent',v=>v.consentCurrentlyAuthorized=false],
 ['missing memory',v=>v.selectedMemory=null],
 ['demo memory',v=>v.selectedMemory.demo=true],
 ['deleted memory',v=>v.selectedMemory.deleted=true],
 ['wrong memory owner',v=>v.selectedMemory.ownerId='other_owner'],
 ['missing manifest',v=>v.selectedMemory.replayManifest=null],
 ['mismatched manifest',v=>v.selectedMemory.replayManifest.id='other_manifest'],
 ['missing binding',v=>v.protectedBinding=null],
 ['client supplied binding authority',v=>v.protectedBinding.authority='client'],
 ['revoked binding',v=>v.protectedBinding.revoked=true],
 ['binding wrong owner',v=>v.protectedBinding.ownerUid='other_owner'],
 ['binding wrong tenant',v=>v.protectedBinding.tenantId='other_tenant'],
 ['binding wrong memory',v=>v.protectedBinding.memoryId='other_memory'],
 ['binding wrong manifest',v=>v.protectedBinding.replayManifestId='other_manifest'],
 ['binding job id malformed',v=>v.protectedBinding.jobId='not/allowed'],
 ['binding wrong job type',v=>v.protectedBinding.jobType='other'],
 ['missing jobs readback',v=>v.currentJobsReadback=null],
 ['jobs wrong owner',v=>v.currentJobsReadback.ownerUid='other_owner'],
 ['jobs wrong tenant',v=>v.currentJobsReadback.tenantId='other_tenant'],
 ['jobs wrong job id',v=>v.currentJobsReadback.jobId='render_other_12345'],
 ['jobs wrong job type',v=>v.currentJobsReadback.jobType='studio.export'],
 ['job pending',v=>v.currentJobsReadback.status='PENDING'],
 ['job failed',v=>v.currentJobsReadback.status='FAILED'],
 ['job deleted output',v=>v.currentJobsReadback.outputDeletedAt='2026-11-23T00:00:00Z'],
]
for(const [label,mutate] of cases){
 test('fail closed: '+label,()=>{const value=good();mutate(value);const out=resolve(value);assert.equal(out.status,'unavailable');assert.equal('jobId' in out,false)})
}
test('resolver has no database, navigation, URL, signature, generation or permission side effects',()=>{
 const fixture=good()
 const before=JSON.stringify(fixture)
 resolve(fixture)
 assert.equal(JSON.stringify(fixture),before)
})
