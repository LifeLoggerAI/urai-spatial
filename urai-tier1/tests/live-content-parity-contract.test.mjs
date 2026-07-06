import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const script = await readFile(new URL('../scripts/verify-live-content-parity.mjs', import.meta.url), 'utf8')
const workflow = await readFile(new URL('../../.github/workflows/live-content-parity.yml', import.meta.url), 'utf8')

test('live parity verifies route-specific content instead of HTTP status alone', () => {
  for (const marker of [
    'Your private floor is open.',
    'Your memory constellation is online.',
    'Selected memory chamber',
    'Cinematic memory film',
    'See the pattern clearly.',
    'Your life stays yours.',
    'Choose what the world can hold.',
    'Production certification pending.',
  ]) {
    assert.match(script, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(script, /forbiddenMarkers: \['Home threshold'\]/)
  assert.match(script, /contentSha256/)
  assert.match(script, /missingMarkers/)
  assert.match(script, /forbiddenMarkers/)
})

test('live parity requires exact deployed SHA evidence', () => {
  assert.match(script, /URAI_EXPECTED_DEPLOYED_SHA/)
  assert.match(script, /must be a full lowercase 40-character SHA/)
  assert.match(script, /x-urai-commit-sha/)
  assert.match(script, /x-deployed-sha/)
  assert.match(script, /shaMatches = deployedSha === expectedSha/)
  assert.match(script, /exactShaRequired: true/)
  assert.match(workflow, /expected_deployed_sha:/)
  assert.match(workflow, /required: true/)
  assert.match(workflow, /Expected deployed SHA must equal the reviewed target SHA/)
})

test('live parity is restricted to canonical urai.app content and redirects', () => {
  assert.match(script, /const canonicalBaseUrl = 'https:\/\/urai\.app'/)
  assert.match(script, /Live certification is restricted to/)
  assert.match(script, /sameOrigin/)
  assert.match(script, /pathPreserved/)
  assert.match(script, /queryPreserved/)
  assert.match(script, /htmlResponse/)
  assert.match(script, /AbortSignal\.timeout\(15_000\)/)
  assert.match(workflow, /URAI_CANONICAL_LIVE_URL: https:\/\/urai\.app/)
  assert.doesNotMatch(workflow, /base_url:/)
})

test('live parity is a manual, immutable SHA-bound workflow', () => {
  assert.match(workflow, /workflow_dispatch:/)
  assert.doesNotMatch(workflow, /\npush:/)
  assert.match(workflow, /VERIFY LIVE URAI/)
  assert.match(workflow, /persist-credentials: false/)
  assert.match(workflow, /Target SHA is not reachable from origin\/main/)
  assert.match(workflow, /cancel-in-progress: false/)
  assert.match(workflow, /urai-live-content-parity-/)
})
