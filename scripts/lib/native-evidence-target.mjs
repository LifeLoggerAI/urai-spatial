// Source routing for the existing UrAi native verifier. The combined target is
// never an implicit release authority or permission to access production.
export const COMBINED_CANDIDATE_BRANCH = 'verify/r4-firestore-java21-admission-20261023'
export const COMBINED_GROUND_REVIEW_BRANCH = 'verify/r4-ground-glb-drawable-geometry-20261023'
const COMBINED_ALLOWED = new Set([COMBINED_CANDIDATE_BRANCH, COMBINED_GROUND_REVIEW_BRANCH])
const SHA = /^[a-f0-9]{40}$/
export function selectNativeEvidenceTarget({ combined = false, pinnedSha = null, defaultBranch, combinedBranch = null }) {
  if (typeof defaultBranch !== 'string' || defaultBranch !== 'repair/rfinal-convergence-candidate-20261020') {
    throw new Error('NATIVE_DEFAULT_BRANCH_AUTHORITY_CHANGED')
  }
  if (combinedBranch !== null && (!combined || !COMBINED_ALLOWED.has(combinedBranch))) {
    throw new Error('COMBINED_BRANCH_NOT_AUTHORIZED')
  }
  if (combined && (typeof pinnedSha !== 'string' || !SHA.test(pinnedSha))) {
    throw new Error('COMBINED_EXACT_SHA_REQUIRED')
  }
  if (pinnedSha !== null && (typeof pinnedSha !== 'string' || !SHA.test(pinnedSha))) {
    throw new Error('NATIVE_PIN_INVALID')
  }
  return {
    branch: combined ? (combinedBranch ?? COMBINED_CANDIDATE_BRANCH) : defaultBranch,
    sourceMode: combined ? 'COMBINED_DRAFT_PINNED_NONRELEASE' : 'RFINAL_NATIVE',
    pinnedSha,
    releaseAuthorized: false,
  }
}
