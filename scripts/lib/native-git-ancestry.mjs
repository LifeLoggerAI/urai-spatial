// Recover only bounded shallow Git history needed to verify an exact UrAi source.
// Never mutates a user-supplied checkout or grants release/deployment authority.
const SHA = /^[a-f0-9]{40}$/
const BRANCHES = new Set([
  'repair/rfinal-convergence-candidate-20261020',
  'verify/r4-firestore-java21-admission-20261023',
])
const MAX_DEEPENS = 4
const DEEPEN_BY = 256

const passed = result => result?.exitCode === 0 && result.timedOut !== true && !result.spawnError

function knownMissingCommit(result, sha) {
  // `cat-file -e` returns 128, not 1, when a commit is absent from a real
  // shallow clone. Only this exact error permits recovery; Git corruption,
  // permissions, timeouts and other 128 failures must stop without fetching.
  return result?.exitCode === 128 && result.timedOut !== true && !result.spawnError &&
    String(result.output ?? '').trim().toLowerCase() ===
      ('fatal: Not a valid object name ' + sha + '^{commit}').toLowerCase()
}

export async function ensureNativeGitAncestry({ branch, sourceHead, trustedAncestor,
  allowDeepen = false, runGit } = {}) {
  if (!BRANCHES.has(branch) || !SHA.test(sourceHead ?? '') ||
      !SHA.test(trustedAncestor ?? '') || typeof runGit !== 'function') {
    throw new Error('NATIVE_HISTORY_AUTHORITY_INVALID')
  }
  // Verify that the checkout is genuinely shallow independently of the
  // ancestry exit code. A broken full repository never qualifies for fetch.
  const state = await runGit(['rev-parse', '--is-shallow-repository'], 'source_history_repository_mode_0')
  if (!passed(state) || !/^(true|false)$/.test(String(state.output ?? '').trim())) {
    throw new Error('NATIVE_HISTORY_SHALLOW_STATE_UNVERIFIED')
  }
  let shallow = state.output.trim() === 'true'
  const sourceObject = await runGit(['cat-file', '-e', sourceHead + '^{commit}'], 'source_history_head_object')
  if (!passed(sourceObject)) throw new Error('NATIVE_HISTORY_SOURCE_HEAD_UNREADABLE')

  for (let attempt = 0; attempt <= MAX_DEEPENS; attempt++) {
    const ancestorObject = await runGit(['cat-file', '-e', trustedAncestor + '^{commit}'],
      'source_history_ancestor_object_' + attempt)
    if (passed(ancestorObject)) {
      const proof = await runGit(
        ['merge-base', '--is-ancestor', trustedAncestor, sourceHead],
        'source_history_ancestry_' + attempt,
      )
      if (passed(proof)) {
        return Object.freeze({ verified: true, sourceHead, trustedAncestor,
          deepenAttempts: attempt, bounded: true, releaseAuthorized: false })
      }
      if (proof?.exitCode !== 1 || proof.timedOut === true || proof.spawnError) {
        throw new Error('NATIVE_HISTORY_ANCESTRY_COMMAND_FAILED')
      }
      if (!shallow) throw new Error('NATIVE_HISTORY_NOT_AN_ANCESTOR')
    } else if (!(shallow && knownMissingCommit(ancestorObject, trustedAncestor))) {
      throw new Error('NATIVE_HISTORY_TRUSTED_ANCESTOR_UNREADABLE')
    }
    // Never fetch/deepen in an existing checkout supplied by another worker.
    if (!allowDeepen) throw new Error('NATIVE_HISTORY_MISSING_IN_EXISTING_CHECKOUT_NO_FETCH')
    if (attempt === MAX_DEEPENS) throw new Error('NATIVE_HISTORY_UNVERIFIED_AFTER_BOUNDED_FETCH')
    const result = await runGit([
      'fetch', '--no-tags', '--deepen=' + DEEPEN_BY, '--filter=blob:none',
      'origin', 'refs/heads/' + branch,
    ], 'source_history_deepen_' + (attempt + 1))
    if (!passed(result)) throw new Error('NATIVE_HISTORY_BOUNDED_FETCH_FAILED')
    const nextState = await runGit(['rev-parse', '--is-shallow-repository'],
      'source_history_repository_mode_' + (attempt + 1))
    if (!passed(nextState) || !/^(true|false)$/.test(String(nextState.output ?? '').trim())) {
      throw new Error('NATIVE_HISTORY_SHALLOW_STATE_UNVERIFIED')
    }
    shallow = nextState.output.trim() === 'true'
  }
  throw new Error('NATIVE_HISTORY_UNEXPECTED_EXIT')
}
