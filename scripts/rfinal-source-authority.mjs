// Source authority facts shared by pinned and live UrAi verification.
// A pinned commit is byte-stable even when the integration branch advances.
// It is NOT automatically the current release head or a launch approval.
export function requireCommitSha(value, label = 'commit') {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/.test(value)) {
    throw new Error('INVALID_' + label.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_SHA')
  }
  return value
}

export function resolveCandidate({ remoteHead, pinnedSha = null }) {
  const live = requireCommitSha(remoteHead, 'remote_head')
  const pin = pinnedSha === null ? null : requireCommitSha(pinnedSha, 'pinned')
  return Object.freeze({ sourceHead: pin ?? live, liveHeadAtStart: live, mode: pin === null ? 'LIVE_BRANCH' : 'PINNED_CANDIDATE' })
}

export function assessCandidateCompletion({
  sourceHead, liveHeadAtStart, liveHeadAtFinish = null,
  allStagesPass, bytesVerified,
}) {
  requireCommitSha(sourceHead, 'source')
  requireCommitSha(liveHeadAtStart, 'live_start')
  if (liveHeadAtFinish !== null) requireCommitSha(liveHeadAtFinish, 'live_finish')
  const pinnedCandidateVerified = allStagesPass === true && bytesVerified === true
  const currentReleaseHeadVerified = pinnedCandidateVerified
    && liveHeadAtStart === sourceHead && liveHeadAtFinish === sourceHead
  return Object.freeze({
    pinnedCandidateVerified,
    currentReleaseHeadVerified,
    liveBranchChanged: liveHeadAtFinish !== null && liveHeadAtFinish !== liveHeadAtStart,
    releaseAuthorized: false,
  })
}
