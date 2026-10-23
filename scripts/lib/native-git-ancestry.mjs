// Recover only bounded shallow Git history needed to verify an exact UrAi source.
// Never mutates a user-supplied checkout or grants release/deployment authority.
const SHA = /^[a-f0-9]{40}$/
const BRANCHES = new Set([
  'repair/rfinal-convergence-candidate-20261020',
  'verify/r4-firestore-java21-admission-20261023',
])
const MAX_DEEPENS = 4
const DEEPEN_BY = 256

export async function ensureNativeGitAncestry({ branch, sourceHead, trustedAncestor,
  allowDeepen = false, runGit } = {}) {
  if (!BRANCHES.has(branch) || !SHA.test(sourceHead ?? '') ||
      !SHA.test(trustedAncestor ?? '') || typeof runGit !== 'function') {
    throw new Error('NATIVE_HISTORY_AUTHORITY_INVALID')
  }
  for (let attempt = 0; attempt <= MAX_DEEPENS; attempt++) {
    const proof = await runGit(
      ['merge-base', '--is-ancestor', trustedAncestor, sourceHead],
      'source_history_ancestry_' + attempt,
    )
    if (proof?.exitCode === 0 && proof.timedOut !== true && !proof.spawnError) {
      return Object.freeze({ verified: true, sourceHead, trustedAncestor,
        deepenAttempts: attempt, bounded: true, releaseAuthorized: false })
    }
    // Never fetch/deepen history in an existing checkout supplied by another worker.
    if (!allowDeepen) throw new Error('NATIVE_HISTORY_MISSING_IN_EXISTING_CHECKOUT_NO_FETCH')
    if (attempt === MAX_DEEPENS) {
      throw new Error('NATIVE_HISTORY_UNVERIFIED_AFTER_BOUNDED_FETCH')
    }
    const result = await runGit([
      'fetch', '--no-tags', '--deepen=' + DEEPEN_BY, '--filter=blob:none',
      'origin', 'refs/heads/' + branch,
    ], 'source_history_deepen_' + (attempt + 1))
    if (result?.exitCode !== 0 || result.timedOut === true || result.spawnError) {
      throw new Error('NATIVE_HISTORY_BOUNDED_FETCH_FAILED')
    }
  }
  throw new Error('NATIVE_HISTORY_UNEXPECTED_EXIT')
}
