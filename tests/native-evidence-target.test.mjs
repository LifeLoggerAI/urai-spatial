import assert from 'node:assert/strict'
import test from 'node:test'
import { selectNativeEvidenceTarget, COMBINED_CANDIDATE_BRANCH } from '../scripts/lib/native-evidence-target.mjs'
const defaultBranch = 'repair/rfinal-convergence-candidate-20261020'
const sha = 'b9905faedef53ce41cac84b8e43f77f8656814e7'
test('existing R-FINAL default branch stays unchanged', () => {
  const x=selectNativeEvidenceTarget({defaultBranch})
  assert.equal(x.branch,defaultBranch)
  assert.equal(x.pinnedSha,null)
  assert.equal(x.releaseAuthorized,false)
})
test('combined exact source uses verified dedicated draft branch', () => {
  const x=selectNativeEvidenceTarget({defaultBranch,combined:true,pinnedSha:sha})
  assert.equal(x.branch,COMBINED_CANDIDATE_BRANCH)
  assert.equal(x.pinnedSha,sha)
  assert.equal(x.sourceMode,'COMBINED_DRAFT_PINNED_NONRELEASE')
  assert.equal(x.releaseAuthorized,false)
})
test('combined without pinned sha fails closed',()=> {
  assert.throws(()=>selectNativeEvidenceTarget({defaultBranch,combined:true}),/COMBINED_EXACT_SHA_REQUIRED/)
  assert.throws(()=>selectNativeEvidenceTarget({defaultBranch,combined:true,pinnedSha:'HEAD'}),/COMBINED_EXACT_SHA_REQUIRED/)
})
test('historical R-FINAL pinned source remains supported',()=> {
  assert.equal(selectNativeEvidenceTarget({defaultBranch,pinnedSha:sha}).branch,defaultBranch)
})
test('invalid default branch or injection is rejected',()=> {
  for(const branch of ['main','refs/heads/main','verify/other',defaultBranch+';echo BAD']) {
    assert.throws(()=>selectNativeEvidenceTarget({defaultBranch:branch,pinnedSha:sha}),/NATIVE_DEFAULT_BRANCH_AUTHORITY_CHANGED/)
  }
})
test('only full lower-case forty-digit sha is valid',()=> {
  for(const invalid of ['abcd','A'.repeat(40),'f'.repeat(41),'f'.repeat(39),'f'.repeat(40)+';echo'])
    assert.throws(()=>selectNativeEvidenceTarget({defaultBranch,combined:false,pinnedSha:invalid}),/NATIVE_PIN_INVALID/)
})
test('combined cannot be mistaken for launch permission',()=> {
  for(const x of [selectNativeEvidenceTarget({defaultBranch}),selectNativeEvidenceTarget({defaultBranch,combined:true,pinnedSha:sha})])
    assert.equal(x.releaseAuthorized,false)
})
