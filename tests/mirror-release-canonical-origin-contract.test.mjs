import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const proof = fs.readFileSync(new URL('./mirror-release-proof.mjs', import.meta.url), 'utf8')
const runner = fs.readFileSync(new URL('./mirror-release-proof-runner.mjs', import.meta.url), 'utf8')

test('Mirror transition proof binds canonical routes to the candidate origin', () => {
  assert.match(proof, /const baseOrigin = new URL\(`\$\{baseUrl\}\/`\)\.origin/)
  assert.match(proof, /function isExactCandidateRoute\(value, expectedPath\)/)
  assert.match(proof, /parsed\.origin === baseOrigin/)
  assert.match(proof, /page\.waitForURL\(\(url\) => isExactCandidateRoute\(url, expectedPath\)/)
  assert.match(proof, /assertExactCandidateRoute\(page\.url\(\), expectedPath, `\$\{destination\} transition destination`\)/)
  assert.match(proof, /assertExactCandidateRoute\(page\.url\(\), expectedPath, `\$\{destination\} transition destination after capture`\)/)
})

test('Mirror retained-capture reconciliation rejects cross-origin replay receipts', () => {
  assert.match(runner, /const baseOrigin = new URL\(`\$\{baseUrl\}\/`\)\.origin/)
  assert.match(runner, /function isExactCandidateRoute\(value, expectedPath\)/)
  assert.match(runner, /parsed\.origin === baseOrigin/)
  assert.match(runner, /if \(!isExactCandidateRoute\(String\(failure\?\.finalUrl \|\| ''\), '\/replay'\)\) return false/)
  assert.match(runner, /requireExactCandidateRoute\(replayUrl, '\/replay', 'Original Replay receipt URL'\)/)
  assert.match(runner, /requireExactCandidateRoute\(page\.url\(\), '\/replay', 'Replay destination after navigation'\)/)
  assert.match(runner, /requireExactCandidateRoute\(page\.url\(\), '\/replay', 'Replay destination after capture'\)/)
})
