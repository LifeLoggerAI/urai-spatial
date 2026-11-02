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
  // The supplied remote refs are from the draft INTEGRATION branch (#1867),
  // not the adopted RELEASE controller (#1636). Equality against this branch
  // can establish current integration-source identity, never a release-head
  // acceptance that the runner has not independently inspected.
  const currentIntegrationHeadVerified = pinnedCandidateVerified
    && liveHeadAtStart === sourceHead && liveHeadAtFinish === sourceHead
  const currentReleaseHeadVerified = false
  return Object.freeze({
    pinnedCandidateVerified,
    currentIntegrationHeadVerified,
    currentReleaseHeadVerified,
    liveBranchChanged: liveHeadAtFinish !== null && liveHeadAtFinish !== liveHeadAtStart,
    releaseAuthorized: false,
  })
}
