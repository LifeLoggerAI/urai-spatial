import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveCandidate, assessCandidateCompletion } from '../scripts/rfinal-source-authority.mjs'

const shaA = '6c7f4ac67f98d41c0b2c8ccfbee9297be6d0dcf5'
const shaB = 'c8ce2fac0ffae86f2854a1d4a028b882ea4bc109'

test('pinned SHA remains chosen when live integration differs', () => {
  assert.equal(resolveCandidate({ remoteHead: shaB, pinnedSha: shaA }).sourceHead, shaA)
})

test('passing pinned SHA does not imply latest branch acceptance', () => {
  const r = assessCandidateCompletion({ sourceHead: shaA, liveHeadAtStart: shaB, liveHeadAtFinish: shaB, allStagesPass: true, bytesVerified: true })
  assert.equal(r.pinnedCandidateVerified, true)
  assert.equal(r.currentReleaseHeadVerified, false)
  assert.equal(r.releaseAuthorized, false)
})

test('explicit source identity rejects invalid SHA input', async () => {
  const { requireCommitSha } = await import('../scripts/rfinal-source-authority.mjs')
  for (const bad of ['', 'main', null, 'F'.repeat(40), '0'.repeat(39), '0'.repeat(41)]) {
    assert.throws(() => requireCommitSha(bad), /INVALID_COMMIT_SHA/)
  }
})
test('source and live branch keep separate identities', () => {
  const choice = resolveCandidate({remoteHead: shaB, pinnedSha: shaA})
  assert.equal(choice.mode, 'PINNED_CANDIDATE')
  assert.equal(choice.liveHeadAtStart, shaB)
})
test('moving branch cannot be declared current release green', () => {
  const r = assessCandidateCompletion({sourceHead: shaA,liveHeadAtStart: shaA,liveHeadAtFinish: shaB,allStagesPass: true,bytesVerified: true})
  assert.equal(r.pinnedCandidateVerified, true)
  assert.equal(r.currentReleaseHeadVerified, false)
  assert.equal(r.liveBranchChanged, true)
})
test('current head must remain the same through final verification', () => {
  const r = assessCandidateCompletion({sourceHead: shaA,liveHeadAtStart: shaA,liveHeadAtFinish: shaA,allStagesPass: true,bytesVerified: true})
  assert.equal(r.currentIntegrationHeadVerified, true)
  assert.equal(r.currentReleaseHeadVerified, false)
  assert.equal(r.releaseAuthorized, false)
})
test('missing finish ref cannot certify a live release head', () => {
  const r = assessCandidateCompletion({sourceHead: shaA,liveHeadAtStart: shaA,allStagesPass: true,bytesVerified: true})
  assert.equal(r.pinnedCandidateVerified, true)
  assert.equal(r.currentReleaseHeadVerified, false)
})
test('failed stages deny both verification modes', () => {
  const r = assessCandidateCompletion({sourceHead: shaA,liveHeadAtStart: shaA,liveHeadAtFinish: shaA,allStagesPass: false,bytesVerified: true})
  assert.equal(r.pinnedCandidateVerified, false)
  assert.equal(r.currentReleaseHeadVerified, false)
})
test('source bytes must actually be checked', () => {
  const r = assessCandidateCompletion({sourceHead: shaA,liveHeadAtStart: shaA,liveHeadAtFinish: shaA,allStagesPass: true,bytesVerified: false})
  assert.equal(r.pinnedCandidateVerified, false)
  assert.equal(r.currentReleaseHeadVerified, false)
})
test('strings are not accepted as stage PASS', () => {
  const r = assessCandidateCompletion({sourceHead: shaA,liveHeadAtStart: shaA,liveHeadAtFinish: shaA,allStagesPass: 'PASS',bytesVerified: true})
  assert.equal(r.pinnedCandidateVerified, false)
})

test('integration-current does not confer unexamined release-controller identity', () => {
  const r = assessCandidateCompletion({sourceHead: shaA,liveHeadAtStart: shaA,liveHeadAtFinish: shaA,allStagesPass: true,bytesVerified: true})
  assert.equal(r.currentIntegrationHeadVerified, true)
  assert.equal(r.currentReleaseHeadVerified, false)
  assert.equal(r.releaseAuthorized, false)
})
test('final remote failure blocks integration-current while pinned proof remains valid', () => {
  const r = assessCandidateCompletion({sourceHead: shaA,liveHeadAtStart: shaA,liveHeadAtFinish: null,allStagesPass: true,bytesVerified: true})
  assert.equal(r.pinnedCandidateVerified, true)
  assert.equal(r.currentIntegrationHeadVerified, false)
  assert.equal(r.currentReleaseHeadVerified, false)
})
test('new integration commit cannot inherit old pinned validation', () => {
  const r = assessCandidateCompletion({sourceHead: shaA,liveHeadAtStart: shaB,liveHeadAtFinish: shaB,allStagesPass: true,bytesVerified: true})
  assert.equal(r.pinnedCandidateVerified, true)
  assert.equal(r.currentIntegrationHeadVerified, false)
  assert.equal(r.currentReleaseHeadVerified, false)
})
