import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveOwnerBoundStudioRender as resolve } from '../src/spatial/memory/ownerBoundStudioRenderResolver.ts'

const hashA = 'a'.repeat(64)
const hashB = 'b'.repeat(64)
const good = () => ({
  authenticatedOwnerUid: 'owner_01',
  activeStudioTenantId: 'tenant_01',
  ownerDeletionFenced: false,
  selectedMemory: { id:'memory-01', ownerId:'owner_01', deleted:false, demo:false,
    replayManifest: { id:'manifest-01', version:7 } },
  protectedBinding: { authority:'protected-server-record', sourceSystem:'urai-jobs',
    ownerUid:'owner_01', tenantId:'tenant_01', memoryId:'memory-01',
    replayManifestId:'manifest-01', manifestVersion:7, jobId:'render_1234567890',
    jobType:'studio.render.video', renderPlanDigest:hashA,
    decisionReceiptId:hashB, revoked:false },
  currentRenderConsent: { issuer:'urai-privacy', ownerUid:'owner_01', tenantId:'tenant_01',
    purpose:'life-movie.render', policyVersion:'1.1.0', decisionReceiptId:hashB,
    status:'granted', revoked:false },
  currentJobsReadback: { jobId:'render_1234567890', ownerUid:'owner_01', tenantId:'tenant_01',
    sourceSystem:'urai-studio', jobType:'studio.render.video', status:'SUCCESS',
    outputDeletedAt:null, output:{renderPlanDigest:hashA},
    consent:{purpose:'life-movie.render',policyVersion:'1.1.0',decisionReceiptId:hashB} },
})

test('synthetic protected fixture returns candidate reference ONLY, not playback', () => {
  const candidate = resolve(good())
  assert.deepEqual(candidate,{status:'candidate',tenantId:'tenant_01',jobId:'render_1234567890'})
  assert.doesNotMatch(JSON.stringify(candidate),/url|signed|media|consent|scope|token/i)
})

const cases = [
  ['missing owner', v => { v.authenticatedOwnerUid = null }],
  ['cross-owner identity', v => { v.authenticatedOwnerUid = 'owner_02' }],
  ['no tenant', v => { v.activeStudioTenantId = null }],
  ['tenant mismatch', v => { v.activeStudioTenantId = 'tenant_02' }],
  ['deletion fence', v => { v.ownerDeletionFenced = true }],
  ['unknown deletion fence', v => { v.ownerDeletionFenced = undefined }],
  ['missing memory', v => { v.selectedMemory = null }],
  ['demo memory', v => { v.selectedMemory.demo = true }],
  ['deleted memory', v => { v.selectedMemory.deleted = true }],
  ['foreign memory', v => { v.selectedMemory.ownerId = 'owner_02' }],
  ['missing manifest', v => { v.selectedMemory.replayManifest = null }],
  ['wrong manifest', v => { v.selectedMemory.replayManifest.id = 'manifest-02' }],
  ['manifest version changed', v => { v.selectedMemory.replayManifest.version = 8 }],
  ['manifest version absent', v => { delete v.selectedMemory.replayManifest.version }],
  ['missing binding', v => { v.protectedBinding = null }],
  ['spoofable client authority label', v => { v.protectedBinding.authority = 'client' }],
  ['missing Jobs-origin field', v => { delete v.protectedBinding.sourceSystem }],
  ['revoked binding', v => { v.protectedBinding.revoked = true }],
  ['missing binding revocation', v => { delete v.protectedBinding.revoked }],
  ['wrong bound owner', v => { v.protectedBinding.ownerUid = 'owner_02' }],
  ['wrong bound tenant', v => { v.protectedBinding.tenantId = 'tenant_02' }],
  ['wrong bound memory', v => { v.protectedBinding.memoryId = 'memory-02' }],
  ['wrong bound manifest', v => { v.protectedBinding.replayManifestId = 'manifest-02' }],
  ['wrong bound manifest version', v => { v.protectedBinding.manifestVersion = 9 }],
  ['bad job ID', v => { v.protectedBinding.jobId = '../../other' }],
  ['wrong bound job type', v => { v.protectedBinding.jobType = 'studio.download' }],
  ['bad plan digest', v => { v.protectedBinding.renderPlanDigest = 'abc' }],
  ['bad consent receipt', v => { v.protectedBinding.decisionReceiptId = 'claimed' }],
  ['missing issuer', v => { v.currentRenderConsent = null }],
  ['incorrect issuer', v => { v.currentRenderConsent.issuer = 'client' }],
  ['render not registered', v => { v.currentRenderConsent.status = 'pending' }],
  ['render grant revoked', v => { v.currentRenderConsent.revoked = true }],
  ['wrong grant owner', v => { v.currentRenderConsent.ownerUid = 'owner_02' }],
  ['wrong grant tenant', v => { v.currentRenderConsent.tenantId = 'tenant_02' }],
  ['wrong grant purpose', v => { v.currentRenderConsent.purpose = 'memory.store' }],
  ['wrong grant policy', v => { v.currentRenderConsent.policyVersion = '0.1.0' }],
  ['grant receipt not bound', v => { v.currentRenderConsent.decisionReceiptId = hashA }],
  ['missing job', v => { v.currentJobsReadback = null }],
  ['public-safe Jobs status projection NOT an authorization', v => {
    v.currentJobsReadback = {jobId:'render_1234567890',ownerUid:'owner_01',
      tenantId:'tenant_01',jobType:'studio.render.video',status:'SUCCESS'}
  }],
  ['jobs source missing', v => { delete v.currentJobsReadback.sourceSystem }],
  ['jobs source changed', v => { v.currentJobsReadback.sourceSystem = 'unknown' }],
  ['foreign Jobs owner', v => { v.currentJobsReadback.ownerUid = 'owner_02' }],
  ['foreign Jobs tenant', v => { v.currentJobsReadback.tenantId = 'tenant_02' }],
  ['different Jobs ID', v => { v.currentJobsReadback.jobId = 'render_another12345' }],
  ['wrong Jobs job type', v => { v.currentJobsReadback.jobType = 'studio.export' }],
  ['Jobs pending', v => { v.currentJobsReadback.status = 'PENDING' }],
  ['Jobs failed', v => { v.currentJobsReadback.status = 'FAILED' }],
  ['Jobs output deleted', v => { v.currentJobsReadback.outputDeletedAt = '2026-11-23' }],
  ['Jobs output plan altered', v => { v.currentJobsReadback.output.renderPlanDigest = hashB }],
  ['Jobs output missing', v => { v.currentJobsReadback.output = undefined }],
  ['Jobs consent missing', v => { v.currentJobsReadback.consent = undefined }],
  ['Jobs consent wrong purpose', v => { v.currentJobsReadback.consent.purpose = 'other' }],
  ['Jobs consent old policy', v => { v.currentJobsReadback.consent.policyVersion = '0.1.0' }],
  ['Jobs consent wrong receipt', v => { v.currentJobsReadback.consent.decisionReceiptId = hashA }],
]
for (const [reason, mutate] of cases) test('fail closed: '+reason,()=>{
  const fixture = good()
  mutate(fixture)
  const out = resolve(fixture)
  assert.equal(out.status,'unavailable')
  assert.equal('jobId' in out,false)
})

test('accessor data is rejected without evaluating getter',()=>{
  const fixture = good()
  let accessed = 0
  fixture.protectedBinding = Object.defineProperty({},'authority',{enumerable:true,get(){accessed++;throw Error('called')}})
  assert.equal(resolve(fixture).status,'unavailable')
  assert.equal(accessed,0)
})
test('throwing proxy is denied rather than allowing authority',()=>{
  const fixture = good()
  fixture.protectedBinding = new Proxy({}, {getPrototypeOf(){throw Error('proxy denied')}})
  assert.equal(resolve(fixture).status,'unavailable')
})
test('resolver never mutates authoritative inputs',()=>{
  const fixture = good()
  const before = JSON.stringify(fixture)
  resolve(fixture)
  assert.equal(JSON.stringify(fixture),before)
})
