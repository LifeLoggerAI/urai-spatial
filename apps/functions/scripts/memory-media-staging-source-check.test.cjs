'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { assertExactStagingCheckout } = require('./memory-media-staging-source-check.cjs')

function withCheckout(callback) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'urai-staging-source-'))
  const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  try {
    git(['init', '-q'])
    writeFileSync(path.join(root, 'fixture.txt'), 'fictional-v1\n')
    git(['add', 'fixture.txt'])
    git(['-c', 'user.name=Fictional Test', '-c', 'user.email=fictional@example.invalid', 'commit', '-qm', 'test fixture'])
    callback(root, git(['rev-parse', 'HEAD']))
  } finally { rmSync(root, { recursive: true, force: true }) }
}

test('verified exact, clean fictional checkout passes offline', () => {
  withCheckout((root, sha) => assert.equal(assertExactStagingCheckout(sha, root), sha))
})
test('operator-supplied but inaccurate source SHA is rejected', () => {
  withCheckout((root) => assert.throws(() => assertExactStagingCheckout('0'.repeat(40), root), /STAGING_SOURCE_CHECKOUT_MISMATCH/))
})
test('tracked local source modification is rejected', () => {
  withCheckout((root, sha) => {
    writeFileSync(path.join(root, 'fixture.txt'), 'changed without commit\n')
    assert.throws(() => assertExactStagingCheckout(sha, root), /STAGING_SOURCE_WORKTREE_DIRTY/)
  })
})
test('non-repository and malformed SHA fail before external access', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'urai-staging-absent-'))
  try {
    assert.throws(() => assertExactStagingCheckout('0'.repeat(40), root), /STAGING_SOURCE_CHECKOUT_UNAVAILABLE/)
    assert.throws(() => assertExactStagingCheckout('not-a-sha', root), /EXACT_SOURCE_COMMIT_REQUIRED/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
