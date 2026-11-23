import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  readCurrentStudioAuthorityEvidence as readEvidence,
  makeReadOnlyStudioAuthorityReader as makeReader,
} from '../src/lib/server/studio-authority-evidence.ts'

const uid = 'owner_01'
const tenantId = 'tenant_01'
const fenceId = createHash('sha256').update('urai-studio-data-rights:' + uid).digest('hex')
const paths = [
  `studioUsers/${uid}`,
  `memberships/${uid}_${tenantId}`,
  `studioDataRightsOwnerFences/${fenceId}`,
  `privacyDeletionTombstones/${uid}`,
]
function fixture() {
  const records = {
    [paths[0]]: {uid,role:'owner',disabled:false,revoked:false},
    [paths[1]]: {uid,studioId:tenantId,role:'creator',active:true,disabled:false,revoked:false},
  }
  const calls = []
  const reader = {
    doc(path) {
      calls.push(path)
      return {
        async get() {return {exists:Object.hasOwn(records,path),data:()=>records[path]}},
      }
    },
  }
  return {records,calls,reader}
}
const denied = async fixture => assert.equal(await readEvidence(uid,tenantId,fixture.reader),null)

test('R1714 canonical four server-owned paths, no raw data or permission returned',async()=>{
  const f=fixture()
  const evidence=await readEvidence(uid,tenantId,f.reader)
  assert.deepEqual(f.calls,paths)
  assert.deepEqual(evidence,{
    ownerUid:uid,tenantId,
    studioUser:{uid,role:'owner',disabled:false,revoked:false},
    membership:{uid,studioId:tenantId,role:'creator',active:true,disabled:false,revoked:false},
    ownerDeletionFenced:false,deletionTombstoneFenced:false,
  })
  assert.doesNotMatch(JSON.stringify(evidence),/url|secret|jobId|private|token|renderPlanDigest|decisionReceipt/i)
})
test('R1714 explicit closed Studio deletion records allow normalized evidence',async()=>{
  const f=fixture()
  f.records[paths[2]]={uid,requestId:'deletion-completed',active:false,permanent:false}
  f.records[paths[3]]={uid,active:false}
  assert.equal((await readEvidence(uid,tenantId,f.reader))?.ownerDeletionFenced,false)
})
test('R1714 canonical authorized admin+owner roles are read-only eligible',async()=>{
  const f=fixture()
  f.records[paths[0]].role='admin'
  f.records[paths[1]].role='owner'
  assert.equal((await readEvidence(uid,tenantId,f.reader))?.membership.role,'owner')
})
test('R1714 rejects invalid identifiers before ANY Firestore reads',async()=>{
  for (const [u,t] of [[null,tenantId],[uid,null],['../other',tenantId],[uid,'tenant/other'],['',tenantId],[uid,''],[' '.repeat(128),tenantId]]){
    const f=fixture()
    assert.equal(await readEvidence(u,t,f.reader),null)
    assert.deepEqual(f.calls,[])
  }
})
for(const [name,path,mutate] of [
  ['missing global user',paths[0],(r,p)=>{delete r[p]}],
  ['global user UID mismatch',paths[0],(r,p)=>{r[p].uid='other'}],
  ['global user viewer',paths[0],(r,p)=>{r[p].role='viewer'}],
  ['global user editor insufficient for longform',paths[0],(r,p)=>{r[p].role='editor'}],
  ['global disabled',paths[0],(r,p)=>{r[p].disabled=true}],
  ['global revoked',paths[0],(r,p)=>{r[p].revoked=true}],
  ['missing tenant membership',paths[1],(r,p)=>{delete r[p]}],
  ['tenant membership UID mismatch',paths[1],(r,p)=>{r[p].uid='other'}],
  ['tenant membership studioId mismatch',paths[1],(r,p)=>{r[p].studioId='other'}],
  ['tenant viewer cannot edit',paths[1],(r,p)=>{r[p].role='viewer'}],
  ['tenant member disabled',paths[1],(r,p)=>{r[p].disabled=true}],
  ['tenant member revoked',paths[1],(r,p)=>{r[p].revoked=true}],
  ['tenant member inactive',paths[1],(r,p)=>{r[p].active=false}],
  ['owner fence active',paths[2],(r,p)=>{r[p]={uid,requestId:'delete-1',active:true,permanent:false}}],
  ['owner fence permanent',paths[2],(r,p)=>{r[p]={uid,requestId:'delete-1',active:false,permanent:true}}],
  ['owner fence unknown state',paths[2],(r,p)=>{r[p]={uid,requestId:'delete-1'}}],
  ['owner fence wrong uid',paths[2],(r,p)=>{r[p]={uid:'other',requestId:'delete-1',active:false,permanent:false}}],
  ['owner fence empty requestId',paths[2],(r,p)=>{r[p]={uid,requestId:'',active:false,permanent:false}}],
  ['tombstone active',paths[3],(r,p)=>{r[p]={uid,active:true}}],
  ['tombstone wrong uid',paths[3],(r,p)=>{r[p]={uid:'other',active:false}}],
  ['tombstone missing closed state',paths[3],(r,p)=>{r[p]={uid}}],
  ['tombstone deletion lease token',paths[3],(r,p)=>{r[p]={uid,active:false,deletionPlanningLeaseToken:'active-lease'}}],
  ['tombstone lease field present but null',paths[3],(r,p)=>{r[p]={uid,active:false,deletionPlanningLeaseUntil:null}}],
  ['tombstone planned operation',paths[3],(r,p)=>{r[p]={uid,active:false,deletionPlanningLeaseOperation:'delete'}}],
  ['tombstone requester pending',paths[3],(r,p)=>{r[p]={uid,active:false,deletionPlanningLeaseBy:'owner'}}],
  ['tombstone request ID pending',paths[3],(r,p)=>{r[p]={uid,active:false,deletionPlanningLeaseRequestId:'pending'}}],
]) test('R1714 fail closed: '+name,async()=>{
  const f=fixture()
  mutate(f.records,path)
  await denied(f)
})
test('R1714 fails closed if backend read errors',async()=>{
  const f=fixture()
  f.reader.doc=()=>({get:async()=>{throw Error('private project details')}})
  await denied(f)
})
test('R1714 refuses an accessor-backed global record without executing getter',async()=>{
  const f=fixture()
  let called=0
  f.records[paths[0]]=Object.defineProperties({}, {
    uid:{enumerable:true,get(){called++;throw Error('unsafe getter')}},
    role:{enumerable:true,value:'owner'},
  })
  await denied(f)
  assert.equal(called,0)
})
test('R1714 refuses Proxy trap failures without throwing to caller',async()=>{
  const f=fixture()
  f.records[paths[1]]=new Proxy({}, {getPrototypeOf(){throw Error('private path')}})
  await denied(f)
})
test('R1714 factory binds only injected reader; no hosted adapter or route',async()=>{
  const f=fixture()
  const bound=makeReader(f.reader)
  assert.equal((await bound(uid,tenantId))?.ownerUid,uid)
  const source=readFileSync(new URL('../src/lib/server/studio-authority-evidence.ts',import.meta.url),'utf8')
  assert.doesNotMatch(source,/\.set\(|\.delete\(|getSignedUrl\(|\.listen\(|onRequest\(|onCall\(/)
  assert.doesNotMatch(source,/GOOGLE_APPLICATION_CREDENTIALS|FIREBASE_PRIVATE_KEY|authorization:|admin\.initializeApp/)
})

// Synthetic seam coverage: no provider is registered, no real render consent
// issuer is approved, and there is no media/Jobs HTTP call in these tests.
import { resolveCurrentOwnerBoundStudioRender } from '../src/spatial/memory/ownerBoundStudioRenderResolver.ts'
function pureResolverReaders(f, afterFirstJob = () => {}) {
  const planDigest = 'a'.repeat(64)
  const receipt = 'b'.repeat(64)
  const jobId = 'render_1234567890'
  let jobsReads = 0
  return {
    currentVerifiedIdentity:async()=>({uid,tenantId}),
    readCurrentStudioAuthority:makeReader(f.reader),
    readOwnerMemory:async()=>({id:'memory-01',ownerId:uid,demo:false,deleted:false,
      replayManifest:{id:'manifest-01',version:7}}),
    readProtectedBinding:async()=>({authority:'protected-server-record',sourceSystem:'urai-jobs',
      ownerUid:uid,tenantId,memoryId:'memory-01',replayManifestId:'manifest-01',
      manifestVersion:7,jobId,jobType:'studio.render.video',renderPlanDigest:planDigest,
      decisionReceiptId:receipt,revoked:false}),
    readCurrentRenderGrant:async()=>({issuer:'urai-privacy',ownerUid:uid,tenantId,
      purpose:'life-movie.render',policyVersion:'1.1.0',decisionReceiptId:receipt,
      status:'granted',revoked:false}),
    readOwnerDeletionFence:async()=>false,
    readBoundJobsRecord:async()=>{
      const job={jobId,ownerUid:uid,tenantId,sourceSystem:'urai-studio',
        jobType:'studio.render.video',status:'SUCCESS',outputDeletedAt:null,
        output:{renderPlanDigest:planDigest},
        consent:{purpose:'life-movie.render',policyVersion:'1.1.0',decisionReceiptId:receipt}}
      if (++jobsReads===1) afterFirstJob()
      return job
    },
  }
}
const selected = {memoryId:'memory-01',manifestId:'manifest-01'}
test('R1714 synthetic seam: Studio canonical normalized read reaches reference-only resolver',async()=>{
  const f=fixture()
  const resolution=await resolveCurrentOwnerBoundStudioRender(selected,pureResolverReaders(f))
  assert.deepEqual(resolution,{status:'candidate',tenantId,jobId:'render_1234567890'})
  assert.equal(f.calls.length,8) // the same four Studio documents twice
  assert.doesNotMatch(JSON.stringify(resolution),/url|video|token|signed/i)
})
test('R1714 seam denies tenant membership revocation between the two protected reads',async()=>{
  const f=fixture()
  const readers=pureResolverReaders(f,()=>{f.records[paths[1]].revoked=true})
  const result=await resolveCurrentOwnerBoundStudioRender(selected,readers)
  assert.equal(result.status,'unavailable')
})
test('R1714 seam denies a Studio owner deletion fence raised during Jobs await',async()=>{
  const f=fixture()
  const readers=pureResolverReaders(f,()=>{
    f.records[paths[2]]={uid,requestId:'deletion-started',active:true,permanent:false}
  })
  assert.equal((await resolveCurrentOwnerBoundStudioRender(selected,readers)).status,'unavailable')
})
test('R1714 seam denies a tombstone planning lease raised between checks',async()=>{
  const f=fixture()
  const readers=pureResolverReaders(f,()=>{
    f.records[paths[3]]={uid,active:false,deletionPlanningLeaseToken:'in-flight'}
  })
  assert.equal((await resolveCurrentOwnerBoundStudioRender(selected,readers)).status,'unavailable')
})
