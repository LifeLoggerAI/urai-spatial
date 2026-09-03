import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const mirrorReleaseProof = fs.readFileSync('../tests/mirror-release-proof.mjs', 'utf8')

test('Mirror to Replay proof bounds font readiness and screenshot waits', () => {
  assert.match(mirrorReleaseProof, /document\.fonts\.ready/)
  assert.match(mirrorReleaseProof, /Promise\.race/)
  assert.match(mirrorReleaseProof, /window\.setTimeout\(resolve, maxWaitMs\)/)
  assert.match(mirrorReleaseProof, /destination === 'replay' \? \{ fontReadyTimeoutMs: 5000, timeoutMs: 20000 \} : undefined/)
})
