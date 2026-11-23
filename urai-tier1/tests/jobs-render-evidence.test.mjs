import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  readProtectedJobsMovieRecord as readJob,
  makeReadOnlyJobsMovieReader,
} from '../src/lib/server/jobs-render-evidence.ts'
import { resolveCurrentOwnerBoundStudioRender as resolve } from '../src/spatial/memory/ownerBoundStudioRenderResolver.ts'

const uid = 'owner_01', tenant = 'tenant_01', project = 'project_01'
const jobId = '01JQ0JOB000000000000000001'
const renderPlanDigest = 'a'.repeat(64)
const receipt = 'b'.repeat(64)
const sceneTruthReceiptRef = `str_${'m'.repeat(20)}_abcdef1234_${'n'.repeat(48)}`
const videoRef = `gs://render-bucket-01/tenants/${tenant}/life-movies/${project}/movie.mp4`
function jobFixture() {
  return {
    jobId, ownerUid:uid, tenantId:tenant,
    sourceSystem:'urai-studio', sourceProject:'urai-studio',
    jobType:'studio.render.video', type:'studio.render.video', status:'SUCCESS',
    consent:{purpose:'life-movie.render',policyVersion:'1.1.0',decisionReceiptId:receipt},
    payload:{schemaVersion:'urai-life-movie-render-v1',projectId:project,
      renderPlanDigest,sceneTruthReceiptRef,sceneTruthDigest:'c'.repeat(64),
      publicReleaseAuthorized:false,providerGenerationAuthorized:false,spatialRequired:false},
    output:{renderPlanDigest,outputs:[{kind:'mp4',mimeType:'video/mp4',ref:videoRef,
      checksum:'d'.repeat(64)}],providerCalled:false},
  }
}
function fixture() {
  const calls=[]
  const record=jobFixture()
  const docs={['jobs/'+jobId]:record}
  const reader={doc(path){calls.push(path);return {async get(){
    return {exists:Object.hasOwn(docs,path),data:()=>docs[path]}
  }}}}
  return {calls,record,docs,reader}
}
const expected=()=>({jobId,ownerUid:uid,tenantId:tenant,sourceSystem:'urai-studio',
  jobType:'studio.render.video',status:'SUCCESS',outputDeletedAt:null,
  consent:{purpose:'life-movie.render',policyVersion:'1.1.0',decisionReceiptId:receipt},
  output:{renderPlanDigest}})

test('R1716 redacts Jobs canonical document, returning no provider refs',async()=>{
  const f=fixture()
  assert.deepEqual(await readJob(uid,tenant,jobId,f.reader),expected())
  assert.deepEqual(f.calls,['jobs/'+jobId])
  assert.equal(JSON.stringify(expected()).includes(videoRef),false)
  assert.doesNotMatch(JSON.stringify(expected()),/sceneTruth|sourceMedia|bucket|url|signed|credential/i)
})
test('R1716 reader factory has no production registered credentials',async()=>{
  const f=fixture(),handler=makeReadOnlyJobsMovieReader(f.reader)
  assert.deepEqual(await handler(uid,tenant,jobId),expected())
  const source=readFileSync(new URL('../src/lib/server/jobs-render-evidence.ts',import.meta.url),'utf8')
  assert.doesNotMatch(source,/\bgetFirestore\(|\bgetSignedUrl\(|\bfetch\(|\bset\(|\bdelete\(|\blisten\(/)
})
test('R1716 invalid path inputs deny before any Jobs project read',async()=>{
  for(const [o,t,j] of [
    [null,tenant,jobId],[uid,null,jobId],[uid,tenant,null],
    ['../victim',tenant,jobId],[uid,'tenant/foreign',jobId],
    [uid,tenant,'../jobs/foreign'],[uid,tenant,'short'],[uid,tenant,'a'.repeat(65)],
  ]) {
    const f=fixture()
    assert.equal(await readJob(o,t,j,f.reader),null)
    assert.deepEqual(f.calls,[])
  }
})
const cases=[
  ['absent job',f=>{delete f.docs['jobs/'+jobId]}],
  ['job id mismatch',f=>{f.record.jobId='otherjobid123456789'}],
  ['wrong owner',f=>{f.record.ownerUid='victim_02'}],
  ['wrong tenant',f=>{f.record.tenantId='tenant_foreign'}],
  ['wrong source system',f=>{f.record.sourceSystem='client'}],
  ['missing source project',f=>{delete f.record.sourceProject}],
  ['wrong source project',f=>{f.record.sourceProject='another-project'}],
  ['wrong jobType',f=>{f.record.jobType='studio.export'}],
  ['conflicting type',f=>{f.record.type='studio.download'}],
  ['job pending',f=>{f.record.status='PENDING'}],
  ['job failed',f=>{f.record.status='FAILED'}],
  ['job output deleted',f=>{f.record.outputDeletedAt='2026-11-23T00:00:00Z'}],
  ['non-null deleted marker',f=>{f.record.outputDeletedAt=false}],
  ['missing payload',f=>{delete f.record.payload}],
  ['missing consent',f=>{delete f.record.consent}],
  ['missing output',f=>{delete f.record.output}],
  ['wrong payload version',f=>{f.record.payload.schemaVersion='old'}],
  ['wrong project',f=>{f.record.payload.projectId='project/foreign'}],
  ['no render plan',f=>{delete f.record.payload.renderPlanDigest}],
  ['bad render plan digest',f=>{f.record.payload.renderPlanDigest='bad'}],
  ['changed output digest',f=>{f.record.output.renderPlanDigest='e'.repeat(64)}],
  ['missing output digest',f=>{delete f.record.output.renderPlanDigest}],
  ['missing scene receipt',f=>{delete f.record.payload.sceneTruthReceiptRef}],
  ['forged scene receipt',f=>{f.record.payload.sceneTruthReceiptRef='str_not-valid'}],
  ['scene truth digest wrong length',f=>{f.record.payload.sceneTruthDigest='short'}],
  ['provider generation enabled',f=>{f.record.payload.providerGenerationAuthorized=true}],
  ['public release authorized',f=>{f.record.payload.publicReleaseAuthorized=true}],
  ['spatial job incorrectly routed',f=>{f.record.payload.spatialRequired=true}],
  ['consent purpose not render',f=>{f.record.consent.purpose='memory.store'}],
  ['consent policy version missing',f=>{delete f.record.consent.policyVersion}],
  ['consent policy version stale',f=>{f.record.consent.policyVersion='1.0.0'}],
  ['receipt not digest',f=>{f.record.consent.decisionReceiptId='forged'}],
  ['receipt missing',f=>{delete f.record.consent.decisionReceiptId}],
  ['missing mp4 outputs',f=>{f.record.output.outputs=[]}],
  ['wrong artifact type',f=>{f.record.output.outputs[0].kind='srt'}],
  ['wrong video mime',f=>{f.record.output.outputs[0].mimeType='text/plain'}],
  ['missing media GCS ref',f=>{delete f.record.output.outputs[0].ref}],
  ['external URL',f=>{f.record.output.outputs[0].ref='https://attacker.com/video.mp4'}],
  ['foreign tenant output',f=>{f.record.output.outputs[0].ref=videoRef.replace(tenant,'other')}],
  ['foreign project output',f=>{f.record.output.outputs[0].ref=videoRef.replace(project,'other')}],
  ['traversal output',f=>{f.record.output.outputs[0].ref=videoRef.replace('movie.mp4','../other.mp4')}],
  ['empty output prefix',f=>{f.record.output.outputs[0].ref=`gs://render-bucket-01/tenants/${tenant}/life-movies/${project}/`}],
  ['too many output artifacts',f=>{f.record.output.outputs=Array.from({length:25},()=>({kind:'mp4',mimeType:'video/mp4',ref:videoRef}))}],
  ['sanitized public-safe projection',f=>{f.docs['jobs/'+jobId]={jobId,ownerUid:uid,tenantId:tenant,jobType:'studio.render.video',status:'SUCCESS'}}],
  ['legacy idempotency binding instead of job',f=>{f.docs['jobs/'+jobId]={ownerUid:`${tenant}:${uid}`,jobType:'studio.render.video',requestFingerprint:'hash',jobId}}],
  ['legacy scene truth receipt binding instead of job',f=>{f.docs['jobs/'+jobId]={ownerUid:`${tenant}:${uid}`,projectId:project,sceneTruthDigest:'c'.repeat(64),jobId}}],
]
for(const [name,change] of cases)test('R1716 fail closed: '+name,async()=>{
  const f=fixture();change(f)
  assert.equal(await readJob(uid,tenant,jobId,f.reader),null)
  assert.deepEqual(f.calls,['jobs/'+jobId])
})
test('R1716 fail closed on backend errors without leaking private path',async()=>{
  const f=fixture()
  f.reader.doc=()=>({get:async()=>{throw Error('secret-project-uri')}})
  assert.equal(await readJob(uid,tenant,jobId,f.reader),null)
})
test('R1716 fail closed on accessor record without invoking getter',async()=>{
  const f=fixture();let calls=0
  f.docs['jobs/'+jobId]=Object.defineProperties({}, {
    jobId:{enumerable:true,get(){calls++;throw Error('dangerous getter')}},
  })
  assert.equal(await readJob(uid,tenant,jobId,f.reader),null)
  assert.equal(calls,0)
})
test('R1716 fail closed on proxy trap exception',async()=>{
  const f=fixture()
  f.docs['jobs/'+jobId]=new Proxy({}, {getPrototypeOf(){throw Error('trap')}})
  assert.equal(await readJob(uid,tenant,jobId,f.reader),null)
})

/** Strictly synthetic seam: it proves that a job read alone does not establish
 * the selected Memory -> Jobs provenance. The approved binding writer/issuer
 * and Privacy life-movie.render issuer DO NOT EXIST in this draft.
 */
function seamReaders(f, binding=null, afterFirstJob=()=>{}) {
  let reads=0
  return {
    currentVerifiedIdentity:async()=>({uid,tenantId:tenant}),
    readCurrentStudioAuthority:async()=>({ownerUid:uid,tenantId:tenant,
      studioUser:{uid,role:'owner',disabled:false,revoked:false},
      membership:{uid,studioId:tenant,role:'creator',active:true,disabled:false,revoked:false},
      ownerDeletionFenced:false,deletionTombstoneFenced:false}),
    readOwnerMemory:async()=>({id:'memory-01',ownerId:uid,demo:false,deleted:false,
      replayManifest:{id:'manifest-01',version:7}}),
    readProtectedBinding:async()=>binding,
    readCurrentRenderGrant:async()=>({issuer:'urai-privacy',ownerUid:uid,tenantId:tenant,
      purpose:'life-movie.render',policyVersion:'1.1.0',status:'granted',revoked:false,
      decisionReceiptId:receipt}),
    readOwnerDeletionFence:async()=>false,
    readBoundJobsRecord:async(u,t,id)=>{
      const result=await readJob(u,t,id,f.reader)
      if(++reads===1)afterFirstJob()
      return result
    },
  }
}
const selected={memoryId:'memory-01',manifestId:'manifest-01'}
const fakeBinding=()=>({authority:'protected-server-record',sourceSystem:'urai-jobs',
  ownerUid:uid,tenantId:tenant,memoryId:'memory-01',replayManifestId:'manifest-01',
  manifestVersion:7,jobId,jobType:'studio.render.video',renderPlanDigest,decisionReceiptId:receipt,revoked:false})

test('R1716 real Jobs-shaped record alone can NEVER authorize Memory-to-job join',async()=>{
  const f=fixture()
  const out=await resolve(selected,seamReaders(f,null))
  assert.equal(out.status,'unavailable')
  assert.deepEqual(f.calls,[])
})
test('R1716 only synthetic protected-binding fixture reaches candidate-only contract',async()=>{
  const f=fixture()
  const out=await resolve(selected,seamReaders(f,fakeBinding()))
  assert.deepEqual(out,{status:'candidate',tenantId:tenant,jobId})
  assert.deepEqual(f.calls,['jobs/'+jobId,'jobs/'+jobId])
  assert.doesNotMatch(JSON.stringify(out),/url|signed|playback|grant|consent|video/i)
})
test('R1716 status changes between protected Jobs readbacks deny even with fake binding',async()=>{
  const f=fixture()
  const result=await resolve(selected,seamReaders(f,fakeBinding(),()=>{f.record.status='PENDING'}))
  assert.equal(result.status,'unavailable')
})
test('R1716 output deleted between protected Jobs readbacks denies',async()=>{
  const f=fixture()
  const result=await resolve(selected,seamReaders(f,fakeBinding(),()=>{f.record.outputDeletedAt='deleted'}))
  assert.equal(result.status,'unavailable')
})
test('R1716 revoked consent between protected Jobs readbacks denies',async()=>{
  const f=fixture()
  const result=await resolve(selected,seamReaders(f,fakeBinding(),()=>{f.record.consent.purpose='revoked'}))
  assert.equal(result.status,'unavailable')
})
