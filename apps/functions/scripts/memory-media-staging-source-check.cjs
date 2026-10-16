'use strict'
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const path = require('node:path')

// Check local code identity before any real Firebase Admin initialization.
// An environment string alone is not evidence of the executable source.
function assertExactStagingCheckout(expectedSha, repoRoot = path.resolve(__dirname, '../../..')) {
  assert.match(expectedSha, /^[a-f0-9]{40}$/, 'EXACT_SOURCE_COMMIT_REQUIRED')
  const options = { encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024 }
  let actual, root, dirty
  try {
    actual = execFileSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], options).trim()
    root = execFileSync('git', ['-C', repoRoot, 'rev-parse', '--show-toplevel'], options).trim()
    dirty = execFileSync('git', ['-C', repoRoot, 'status', '--porcelain', '--untracked-files=no'], options).trim()
  } catch {
    throw new Error('STAGING_SOURCE_CHECKOUT_UNAVAILABLE')
  }
  assert.equal(path.resolve(root), path.resolve(repoRoot), 'STAGING_SOURCE_ROOT_MISMATCH')
  assert.equal(actual, expectedSha, 'STAGING_SOURCE_CHECKOUT_MISMATCH')
  assert.equal(dirty, '', 'STAGING_SOURCE_WORKTREE_DIRTY')
  return actual
}
module.exports = { assertExactStagingCheckout }
