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
  assert.match(script, /queryPreserved/)
  assert.match(script, /contentSha256/)
})

test('live parity can require exact deployed SHA evidence', () => {
  assert.match(script, /URAI_EXPECTED_DEPLOYED_SHA/)
  assert.match(script, /x-urai-commit-sha/)
  assert.match(script, /x-deployed-sha/)
  assert.match(script, /shaMatches/)
  assert.match(workflow, /expected_deployed_sha/)
  assert.match(workflow, /Target SHA is not reachable from origin\/main/)
})

test('live parity is a manual, SHA-bound verification workflow', () => {
  assert.match(workflow, /workflow_dispatch:/)
  assert.doesNotMatch(workflow, /\npush:/)
  assert.match(workflow, /VERIFY LIVE URAI/)
  assert.match(workflow, /persist-credentials: false/)
  assert.match(workflow, /urai-live-content-parity-/)
})
