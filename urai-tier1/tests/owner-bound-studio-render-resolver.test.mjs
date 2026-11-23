import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveOwnerBoundStudioRender as resolve, resolveCurrentOwnerBoundStudioRender as resolveCurrent } from '../src/spatial/memory/ownerBoundStudioRenderResolver.ts'

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

function readFixture() {
  const state = good()
  const calls = []
  let afterFirstJobRead = () => {}
  let jobReads = 0
  const readers = {
    async currentVerifiedIdentity() {
      calls.push('identity')
      return {uid:state.authenticatedOwnerUid,tenantId:state.activeStudioTenantId}
    },
    async readOwnerMemory(uid,memoryId,manifestId) {
      calls.push(['memory',uid,memoryId,manifestId])
      return structuredClone(state.selectedMemory)
    },
    async readProtectedBinding(uid,tenantId,memoryId,manifestId) {
      calls.push(['binding',uid,tenantId,memoryId,manifestId])
      return state.protectedBinding && structuredClone(state.protectedBinding)
    },
    async readCurrentRenderGrant(uid,tenantId,receiptId) {
      calls.push(['grant',uid,tenantId,receiptId])
      return state.currentRenderConsent && structuredClone(state.currentRenderConsent)
    },
    async readOwnerDeletionFence(uid) {
      calls.push(['deletion',uid])
      return state.ownerDeletionFenced
    },
    async readBoundJobsRecord(uid,tenantId,jobId) {
      calls.push(['job',uid,tenantId,jobId])
      const response = state.currentJobsReadback && structuredClone(state.currentJobsReadback)
      if (++jobReads === 1) afterFirstJobRead()
      return response
    },
  }
  return {state,calls,readers,afterFirstJob:fn=>{afterFirstJobRead=fn}}
}

const chosen = {memoryId:'memory-01',manifestId:'manifest-01'}
test('R1710 approved-reader fixture: two full protected passes return reference only',async()=>{
  const f=readFixture()
  const out=await resolveCurrent(chosen,f.readers)
  assert.deepEqual(out,{status:'candidate',tenantId:'tenant_01',jobId:'render_1234567890'})
  assert.equal(f.calls.filter(x=>x==='identity').length,2)
  for(const key of ['memory','binding','grant','deletion','job']) {
    assert.equal(f.calls.filter(x=>Array.isArray(x)&&x[0]===key).length,2)
  }
  assert.doesNotMatch(JSON.stringify(out),/url|signed|video|grant|token/i)
})

for (const [name,value] of [
  ['client-supplied jobId',{...chosen,jobId:'render_1234567890'}],
  ['client-supplied tenant',{...chosen,tenantId:'tenant_01'}],
  ['client-supplied owner',{...chosen,ownerUid:'owner_01'}],
  ['demo selection',{...chosen,memoryId:'demo:fake'}],
  ['missing manifest',{memoryId:'memory-01'}],
  ['path injection',{...chosen,memoryId:'../foreign'}],
]) test('R1710 preflight denies '+name+' before any authoritative reads',async()=>{
  const f=readFixture()
  const result=await resolveCurrent(value,f.readers)
  assert.equal(result.status,'unavailable')
  assert.deepEqual(f.calls,[])
})

test('R1710 rejects client getter without calling it or readers',async()=>{
  const f=readFixture()
  let touched=0
  const selection=Object.defineProperties({}, {
    memoryId:{enumerable:true,get(){touched++;throw Error('client getter')}},
    manifestId:{enumerable:true,value:'manifest-01'},
  })
  assert.equal((await resolveCurrent(selection,f.readers)).status,'unavailable')
  assert.equal(touched,0)
  assert.deepEqual(f.calls,[])
})

test('R1710 missing issuer fails before reading any Jobs record',async()=>{
  const f=readFixture()
  f.state.currentRenderConsent=null
  const result=await resolveCurrent(chosen,f.readers)
  assert.equal(result.status,'unavailable')
  assert.equal(f.calls.some(x=>Array.isArray(x)&&x[0]==='job'),false)
})
test('R1710 missing protected Memory-to-Jobs binding fails before Jobs',async()=>{
  const f=readFixture()
  f.state.protectedBinding=null
  assert.equal((await resolveCurrent(chosen,f.readers)).status,'unavailable')
  assert.equal(f.calls.some(x=>Array.isArray(x)&&x[0]==='job'),false)
})
test('R1710 sanitized Studio Jobs status cannot become protected provenance',async()=>{
  const f=readFixture()
  const j=f.state.currentJobsReadback
  f.state.currentJobsReadback={jobId:j.jobId,ownerUid:j.ownerUid,tenantId:j.tenantId,jobType:j.jobType,status:j.status}
  assert.equal((await resolveCurrent(chosen,f.readers)).status,'unavailable')
})
for (const [name,mutate] of [
  ['in-flight Memory manifest change',state=>{state.selectedMemory.replayManifest.version=8}],
  ['in-flight deletion fence',state=>{state.ownerDeletionFenced=true}],
  ['in-flight Privacy grant revocation',state=>{state.currentRenderConsent.revoked=true}],
  ['in-flight Jobs status regression',state=>{state.currentJobsReadback.status='PENDING'}],
  ['in-flight output deletion',state=>{state.currentJobsReadback.outputDeletedAt='2026-11-23'}],
  ['in-flight binding revocation',state=>{state.protectedBinding.revoked=true}],
  ['in-flight owner identity switch',state=>{state.authenticatedOwnerUid='owner_02'}],
  ['in-flight tenant switch',state=>{state.activeStudioTenantId='tenant_02'}],
  ['in-flight valid job ID replacement',state=>{
    state.protectedBinding.jobId='render_other_valid_12345'
    state.currentJobsReadback.jobId='render_other_valid_12345'
  }],
  ['in-flight mutually matching render plan replacement',state=>{
    state.protectedBinding.renderPlanDigest=hashB
    state.currentJobsReadback.output.renderPlanDigest=hashB
  }],
]) test('R1710 second authoritative pass denies '+name,async()=>{
  const f=readFixture()
  f.afterFirstJob(()=>mutate(f.state))
  assert.equal((await resolveCurrent(chosen,f.readers)).status,'unavailable')
})
test('R1710 backend read exception fails closed without exposing provider secret',async()=>{
  const f=readFixture()
  f.readers.readProtectedBinding=async()=>{throw Error('gs://hidden private token')}
  const result=await resolveCurrent(chosen,f.readers)
  assert.equal(result.status,'unavailable')
  assert.doesNotMatch(JSON.stringify(result),/gs:\/\/|token/i)
})
