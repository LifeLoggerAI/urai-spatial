import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const groupedProof = fs.readFileSync(new URL('../../scripts/run-continuous-spatial-proof-v21-grouped.mjs', import.meta.url), 'utf8')

test('continuous visual proof requires unavailable ambience to remain visibly disabled', () => {
  assert.match(groupedProof, /ambienceDisabled && result\.ambienceVisible === 1 && result\.discreetVisible === 2/)
  assert.match(groupedProof, /hiddenUnavailableCount !== 2/)
  assert.match(groupedProof, /Visible disabled ambience acceptance was not materialized/)
  assert.doesNotMatch(groupedProof, /visibleUnavailableReplacement = "result\.ambienceDisabled && result\.ambienceVisible === 0/)
})

test('temporary proof materialization restores both source files', () => {
  assert.match(groupedProof, /writeFile\(sourceUrl, original, 'utf8'\)/)
  assert.match(groupedProof, /writeFile\(stableRunnerUrl, originalStableRunner, 'utf8'\)/)
  assert.match(groupedProof, /Stable visual proof syntax check failed/)
})
