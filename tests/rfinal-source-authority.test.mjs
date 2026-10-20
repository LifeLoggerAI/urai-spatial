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
