import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const dispatcher = fs.readFileSync(new URL('../../.github/workflows/dispatch-production-once.yml', import.meta.url), 'utf8')

test('one-shot production dispatcher recovers transient API failures without duplicating accepted runs', () => {
  assert.match(dispatcher, /transientStatuses = new Set\(\[408, 409, 425, 429, 500, 502, 503, 504\]\)/)
  assert.match(dispatcher, /async function withTransientRetry/)
  assert.match(dispatcher, /async function probeAcceptedDispatch/)
  assert.match(dispatcher, /async function createDispatchSafely/)
  assert.match(dispatcher, /probing for an accepted run before any retry/)
  assert.match(dispatcher, /creation will not be repeated/)
  assert.match(dispatcher, /const excludedRunIds = new Set/)
  assert.match(dispatcher, /!excludedRunIds\.has\(candidate\.id\)/)
  assert.match(dispatcher, /Read protected deployment run/)
  assert.match(dispatcher, /List protected deployment jobs/)
  assert.match(dispatcher, /Live fingerprint detection failed after bounded retries/)
  assert.doesNotMatch(dispatcher, /withTransientRetry\('Create protected workflow dispatch'/)
  assert.doesNotMatch(dispatcher, /retries: 0/)
})
