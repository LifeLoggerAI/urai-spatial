import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const verifierPath = new URL('../../scripts/verify-launch-critical-assets.mjs', import.meta.url)
const verifier = fs.readFileSync(verifierPath, 'utf8')

test('launch-critical verifier separates manifest promotion from candidate receipt state', () => {
  assert.match(verifier, /receiptReleaseState/)
  assert.match(verifier, /manifestReleaseState/)
  assert.match(verifier, /receipt cannot be production-ready with candidate compression status/)
  assert.match(verifier, /model candidate receipt must carry candidate compression status/)
  assert.doesNotMatch(verifier, /asset\.releaseState === 'production-ready' && receipt\.compressionStatus\.includes\('candidate'\)/)
})
