import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { assertCanonicalProtectedRevision } from '../scripts/verify-custom-domain-deployed-sha-authority.mjs'

const liveSmoke = fs.readFileSync(new URL('../scripts/urai-live-smoke.mjs', import.meta.url), 'utf8')
const postDeploySmoke = fs.readFileSync(new URL('../scripts/urai-post-deploy-smoke.mjs', import.meta.url), 'utf8')
const workflow = fs.readFileSync(new URL('../.github/workflows/custom-domain-route-smoke.yml', import.meta.url), 'utf8')

const canonicalSha = '0123456789abcdef0123456789abcdef01234567'
const nonCanonicalSha = 'fedcba9876543210fedcba9876543210fedcba98'

test('accepts a well-formed revision only when it resolves and is contained in canonical main history', () => {
  const accepted = assertCanonicalProtectedRevision(canonicalSha, {
    resolves: (sha) => sha === canonicalSha,
    isAncestorOfMain: (sha) => sha === canonicalSha,
  })
  assert.equal(accepted, canonicalSha)
})

test('rejects a well-formed but non-canonical revision', () => {
  assert.throws(
    () => assertCanonicalProtectedRevision(nonCanonicalSha, {
      resolves: () => true,
      isAncestorOfMain: () => false,
    }),
    /not contained in canonical origin\/main history/,
  )
})

test('rejects a 40-character value that is not hexadecimal before authority lookup', () => {
  let consulted = false
  assert.throws(
    () => assertCanonicalProtectedRevision('z'.repeat(40), {
      resolves: () => { consulted = true; return true },
      isAncestorOfMain: () => { consulted = true; return true },
    }),
    /exactly 40 hexadecimal characters/,
  )
  assert.equal(consulted, false)
})

test('rejects a well-formed SHA that does not resolve to a commit', () => {
  assert.throws(
    () => assertCanonicalProtectedRevision(nonCanonicalSha, {
      resolves: () => false,
      isAncestorOfMain: () => true,
    }),
    /does not resolve to a repository commit/,
  )
})

test('both live verification paths import one authoritative route contract', () => {
  for (const source of [liveSmoke, postDeploySmoke]) {
    assert.match(source, /from ['"]\.\/urai-live-route-contract\.mjs['"]/)
    assert.doesNotMatch(source, /const (?:routes|contracts) = \[/)
  }
})

test('custom-domain workflow requires exact SHA and executes the strict live verifier', () => {
  assert.match(workflow, /expected_deployed_sha:[\s\S]*required:\s*true/)
  assert.match(workflow, /REQUIRE_CUSTOM_DOMAIN:\s*["']true["']/)
  assert.match(workflow, /REQUIRE_LIVE_COMMIT_SHA:\s*["']true["']/)
  assert.match(workflow, /node scripts\/urai-live-smoke\.mjs/)
  assert.match(liveSmoke, /\/release-fingerprint\.json/)
  assert.match(liveSmoke, /\/api\/system\/deploy-proof/)
  assert.match(liveSmoke, /https:\/\/www\.urai\.app/)
})
