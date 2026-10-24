import assert from 'node:assert/strict'
import test from 'node:test'
import { inspectR4SourceComposition } from '../scripts/verify-r4-source-composition.mjs'
const h=x=>x.repeat(40)
function oldFixture(){
 const donors=[[1933,74,'a'],[1934,8,'b'],[1887,3,'c']].map(([pr,count,s])=>({pr,count,sourceHead:h(s)}))
 const claims=donors.flatMap(d=>Array.from({length:d.count},(_,i)=>({path:'src/'+d.pr+'/file'+i+'.js',sourcePR:d.pr,sourceHead:d.sourceHead,blob:h('d'),change:'added'})))
 const entries=new Map(claims.map(c=>[c.path,{mode:'100644',type:'blob',sha:c.blob}]))
 return {entries,manifest:{schema:'urai-r4-source-composition-v1',classification:'NONPRODUCTION_UNVERIFIED_DRAFT_NO_RELEASE',releaseApproved:false,privateMediaAdmitted:false,founderVisualApproved:false,baseline:{head:'65be933692398c01d1f9218c5f917843e52ac3f5'},sourceDonors:donors,sourceClaims:claims}}
}
function fixture(){
  const f=oldFixture()
  f.manifest.candidateSourceClaims=[{
    path:'urai-tier1/src/components/lifemap/useLifeMapEvents.ts', blob:'b54024164039f6ba3bb1fabdac42e1c63c5f01e6',
    reason:'Candidate-owned hidden memory event normalization stays pinned',
  }]
  f.entries.set('urai-tier1/src/components/lifemap/useLifeMapEvents.ts',{mode:'100644',type:'blob',sha:'b54024164039f6ba3bb1fabdac42e1c63c5f01e6'})
  for(const [path,blob] of [
    ['urai-tier1/src/components/lifemap/LifeMapRouteBoundary.tsx','a6fefdd2e75448f9869202cf740726168c11caa3'],
    ['urai-tier1/src/components/lifemap/lifeMapSoftwareRouteIntent.mjs','9947d8086bb4777bd0de2eaf151ed3a36dbb5fd1'],
    ['urai-tier1/src/components/lifemap/lifeMapEventPrivacy.mjs','f4708011daae7f222076d697cfc200272c118f2e']]) {
    f.manifest.candidateSourceClaims.push({path,blob,reason:'Candidate-owned software route boundary is byte pinned'})
    f.entries.set(path,{mode:'100644',type:'blob',sha:blob})
  }
  const claims=[
  {
    "path": "package.json",
    "blob": "2fb031597bb75a8a4ce3bf0e3f8ee63fcebab68a"
  },
  {
    "path": "scripts/lib/firestore-java-runtime.mjs",
    "blob": "4857e72cbef520990bade224a026e708433e7f70"
  },
  {
    "path": "scripts/run-firestore-rules-tests.mjs",
    "blob": "8fdfccce7287dd9ff56a536082be4f348b06b961"
  },
  {
    "path": "tests/firestore-java-runtime.test.mjs",
    "blob": "0e63ffd35e64b1d7871a24b2b15a426d5632012e"
  },
  {
    "path": "tests/firestore-rules-execution-authority.test.mjs",
    "blob": "03ef2bb54b22fd91a760d05fd64b1493762b750f"
  }
]
  f.manifest.additionalAdmittedDonor={
    pr:1932,head:'4b9c519f4ddfba1889280738c9007d2a4d3a653e',
    baseCandidate:'79ca2499ba7315c0b3168426384adfb6052e8633',
    releaseApproved:false,sourceClaims:claims,
  }
  for(const claim of claims)f.entries.set(claim.path,{mode:'100644',type:'blob',sha:claim.blob})
  return f
}

test('85 donor blobs prove identity but not release',()=>{const f=fixture();const r=inspectR4SourceComposition(f.manifest,f.entries,h('f'),h('f'));assert.equal(r.donorPathsVerified,85);assert.equal(r.releaseApproved,false)})
test('tampered and missing blobs fail closed',()=>{const f=fixture(),p=f.manifest.sourceClaims[0].path;f.entries.set(p,{mode:'100644',type:'blob',sha:h('e')});assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/SOURCE_BLOB_MISMATCH/);f.entries.delete(p);assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/MISSING_REGULAR_BLOB/)})
test('pinned Cloud Build adjustment only',()=>{const f=fixture(),c=f.manifest.sourceClaims[84];f.entries.delete(c.path);c.path='cloudbuild.urai-verify.yaml';f.entries.set(c.path,{mode:'100644',type:'blob',sha:h('e')});f.manifest.sourceOverrides=[{path:c.path,originBlob:h('d'),expectedBlob:h('e'),reason:'Specific review-only Cloud Build branch adjustment'}];assert.equal(inspectR4SourceComposition(f.manifest,f.entries,h('f')).overridesVerified,1);f.manifest.sourceOverrides[0].path='src/1887/file1.js';assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/SOURCE_OVERRIDE_INVALID/)})
test('invalid authority or duplicate name denied',()=>{const f=fixture();f.manifest.releaseApproved=true;assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')));f.manifest.releaseApproved=false;f.manifest.sourceClaims[1].path=f.manifest.sourceClaims[0].path;assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')));assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f'),h('a')),/EXPECTED_HEAD_MISMATCH/)})

test('legacy-hidden semantic override is pinned and fail closed',()=>{const f=fixture();const c=f.manifest.sourceClaims[0];f.entries.delete(c.path);c.path='urai-tier1/src/components/lifemap/LifeMapSemanticNavigator.tsx';f.entries.set(c.path,{mode:'100644',type:'blob',sha:h('e')});f.manifest.sourceOverrides=[{path:c.path,originBlob:h('d'),expectedBlob:h('e'),reason:'Unify both hidden privacy aliases in semantic clients'}];assert.equal(inspectR4SourceComposition(f.manifest,f.entries,h('f')).overridesVerified,1);f.manifest.sourceOverrides[0].expectedBlob=h('a');assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/SOURCE_BLOB_MISMATCH/)})

test('five exact Firestore Java21 donor blobs are admitted but cannot claim release', () => {
  const f=fixture()
  const claims=[
    ['package.json','2fb031597bb75a8a4ce3bf0e3f8ee63fcebab68a'],
    ['scripts/lib/firestore-java-runtime.mjs','4857e72cbef520990bade224a026e708433e7f70'],
    ['scripts/run-firestore-rules-tests.mjs','8fdfccce7287dd9ff56a536082be4f348b06b961'],
    ['tests/firestore-java-runtime.test.mjs','0e63ffd35e64b1d7871a24b2b15a426d5632012e'],
    ['tests/firestore-rules-execution-authority.test.mjs','03ef2bb54b22fd91a760d05fd64b1493762b750f'],
  ].map(([path,blob])=>({path,blob}))
  f.manifest.additionalAdmittedDonor={
    pr:1932,head:'4b9c519f4ddfba1889280738c9007d2a4d3a653e',
    baseCandidate:'79ca2499ba7315c0b3168426384adfb6052e8633',
    releaseApproved:false,sourceClaims:claims,
  }
  for (const c of claims) f.entries.set(c.path,{mode:'100644',type:'blob',sha:c.blob})
  const result=inspectR4SourceComposition(f.manifest,f.entries,h('f'))
  assert.equal(result.releaseApproved,false)
  f.entries.set(claims[0].path,{mode:'100644',type:'blob',sha:h('a')})
  assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/FIRESTORE_DONOR_BLOB_MISMATCH/)
  f.entries.set(claims[0].path,{mode:'100644',type:'blob',sha:claims[0].blob})
  f.manifest.additionalAdmittedDonor.releaseApproved=true
  assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/FIRESTORE_DONOR_AUTHORITY_INVALID/)
})

test('deleting the fourth donor is a hard source-admission failure',()=>{
  const f=fixture()
  delete f.manifest.additionalAdmittedDonor
  assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/FIRESTORE_DONOR_MISSING/)
})
test('updated semantic privacy path remains a specifically authorized override',()=>{
  const f=fixture()
  const c=f.manifest.sourceClaims.find(x=>x.sourcePR===1933)
  f.entries.delete(c.path)
  c.path='urai-tier1/src/components/lifemap/LifeMapSemanticNavigator.tsx'
  f.entries.set(c.path,{mode:'100644',type:'blob',sha:h('e')})
  f.manifest.sourceOverrides=[{path:c.path,originBlob:h('d'),expectedBlob:h('e'),reason:'Preserve updated Life Map privacy alias consistency across interfaces'}]
  assert.equal(inspectR4SourceComposition(f.manifest,f.entries,h('f')).totalDonorPathsVerified,90)
  f.manifest.sourceOverrides[0].expectedBlob=h('a')
  assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/SOURCE_BLOB_MISMATCH/)
})

test('candidate-owned privacy source has mandatory independent exact blob authority',()=>{
  const f=fixture()
  assert.equal(inspectR4SourceComposition(f.manifest,f.entries,h('f')).candidateSourcePathsVerified,4)
  const path='urai-tier1/src/components/lifemap/useLifeMapEvents.ts'
  f.entries.set(path,{mode:'100644',type:'blob',sha:h('a')})
  assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/CANDIDATE_SOURCE_BLOB_MISMATCH/)
  f.entries.delete(path)
  assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/CANDIDATE_SOURCE_BLOB_MISMATCH/)
})

test('unclaimed donor overrides cannot substitute for candidate source ownership',()=>{
  const f=fixture()
  delete f.manifest.candidateSourceClaims
  assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/CANDIDATE_SOURCE_CLAIMS_INVALID/)
  f.manifest.candidateSourceClaims=fixture().manifest.candidateSourceClaims.map(claim=>({...claim}))
  f.manifest.candidateSourceClaims[0].blob=h('a')
  assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/CANDIDATE_SOURCE_CLAIM_INVALID/)
  f.manifest.candidateSourceClaims=fixture().manifest.candidateSourceClaims
  f.manifest.sourceOverrides=[{path:'urai-tier1/src/components/lifemap/useLifeMapEvents.ts',originBlob:h('d'),expectedBlob:'a885812f25c32cd4f0dcf72a96e3364531dda96b',reason:'Orphaned privacy donor override'}]
  assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/SOURCE_OVERRIDE_INVALID/)
})

test('Cloud Build shell contract override pins changed source without falsifying donor identity',()=>{
  const f=fixture()
  const old=f.manifest.sourceClaims.find(x=>x.sourcePR===1887)
  f.entries.delete(old.path)
  old.path='tests/cloudbuild-shell-execution.test.mjs'
  f.entries.set(old.path,{mode:'100644',type:'blob',sha:h('e')})
  f.manifest.sourceOverrides=[{path:old.path,originBlob:h('d'),expectedBlob:h('e'),
    reason:'Unified Cloud Build tests must preserve exact committed source'}]
  assert.equal(inspectR4SourceComposition(f.manifest,f.entries,h('f')).overridesVerified,1)
  f.manifest.sourceOverrides[0].expectedBlob=h('a')
  assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/SOURCE_BLOB_MISMATCH/)
})

test('candidate software route helper cannot be silently substituted',()=>{
 const f=fixture()
 const path='urai-tier1/src/components/lifemap/lifeMapSoftwareRouteIntent.mjs'
 f.entries.set(path,{mode:'100644',type:'blob',sha:h('a')})
 assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/CANDIDATE_SOURCE_BLOB_MISMATCH/)
})

test('shared event privacy owner helper is candidate-owned and immutable',()=>{
 const f=fixture()
 const path='urai-tier1/src/components/lifemap/lifeMapEventPrivacy.mjs'
 assert.equal(inspectR4SourceComposition(f.manifest,f.entries,h('f')).candidateSourcePathsVerified,4)
 f.entries.set(path,{mode:'100644',type:'blob',sha:h('a')})
 assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/CANDIDATE_SOURCE_BLOB_MISMATCH/)
})
