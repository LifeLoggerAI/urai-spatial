import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const dispatcher = fs.readFileSync(new URL('../../.github/workflows/dispatch-production-once.yml', import.meta.url), 'utf8')

test('one-shot production dispatcher retries transient GitHub API failures without duplicating accepted runs', () => {
  assert.match(dispatcher, /transientStatuses = new Set\(\[408, 409, 425, 429, 500, 502, 503, 504\]\)/)
  assert.match(dispatcher, /async function withTransientRetry/)
  assert.match(dispatcher, /Create protected workflow dispatch/)
  assert.match(dispatcher, /Read protected deployment run/)
  assert.match(dispatcher, /List protected deployment jobs/)
  assert.match(dispatcher, /const excludedRunIds = new Set/)
  assert.match(dispatcher, /!excludedRunIds\.has\(candidate\.id\)/)
  assert.match(dispatcher, /Live fingerprint detection failed after bounded retries/)
  assert.doesNotMatch(dispatcher, /retries: 0/)
})
