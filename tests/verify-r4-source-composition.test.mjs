import assert from 'node:assert/strict'
import test from 'node:test'
import { inspectR4SourceComposition } from '../scripts/verify-r4-source-composition.mjs'
const h=x=>x.repeat(40)
function fixture(){
 const donors=[[1933,73,'a'],[1934,4,'b'],[1887,3,'c']].map(([pr,count,s])=>({pr,count,sourceHead:h(s)}))
 const claims=donors.flatMap(d=>Array.from({length:d.count},(_,i)=>({path:'src/'+d.pr+'/file'+i+'.js',sourcePR:d.pr,sourceHead:d.sourceHead,blob:h('d'),change:'added'})))
 const entries=new Map(claims.map(c=>[c.path,{mode:'100644',type:'blob',sha:c.blob}]))
 return {entries,manifest:{schema:'urai-r4-source-composition-v1',classification:'NONPRODUCTION_UNVERIFIED_DRAFT_NO_RELEASE',releaseApproved:false,privateMediaAdmitted:false,founderVisualApproved:false,baseline:{head:'65be933692398c01d1f9218c5f917843e52ac3f5'},sourceDonors:donors,sourceClaims:claims}}
}
test('80 donor blobs prove identity but not release',()=>{const f=fixture();const r=inspectR4SourceComposition(f.manifest,f.entries,h('f'),h('f'));assert.equal(r.donorPathsVerified,80);assert.equal(r.releaseApproved,false)})
test('tampered and missing blobs fail closed',()=>{const f=fixture(),p=f.manifest.sourceClaims[0].path;f.entries.set(p,{mode:'100644',type:'blob',sha:h('e')});assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/SOURCE_BLOB_MISMATCH/);f.entries.delete(p);assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/MISSING_REGULAR_BLOB/)})
test('pinned Cloud Build adjustment only',()=>{const f=fixture(),c=f.manifest.sourceClaims[79];f.entries.delete(c.path);c.path='cloudbuild.urai-verify.yaml';f.entries.set(c.path,{mode:'100644',type:'blob',sha:h('e')});f.manifest.sourceOverrides=[{path:c.path,originBlob:h('d'),expectedBlob:h('e'),reason:'Specific review-only Cloud Build branch adjustment'}];assert.equal(inspectR4SourceComposition(f.manifest,f.entries,h('f')).overridesVerified,1);f.manifest.sourceOverrides[0].path='src/1887/file1.js';assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')),/SOURCE_OVERRIDE_INVALID/)})
test('invalid authority or duplicate name denied',()=>{const f=fixture();f.manifest.releaseApproved=true;assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')));f.manifest.releaseApproved=false;f.manifest.sourceClaims[1].path=f.manifest.sourceClaims[0].path;assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f')));assert.throws(()=>inspectR4SourceComposition(f.manifest,f.entries,h('f'),h('a')),/EXPECTED_HEAD_MISMATCH/)})
