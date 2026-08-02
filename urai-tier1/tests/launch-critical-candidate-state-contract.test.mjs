import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const verifierPath = new URL('../../scripts/verify-launch-critical-assets.mjs', import.meta.url)
const auditorPath = new URL('../../scripts/audit-launch-critical-artifact.mjs', import.meta.url)
const verifier = fs.readFileSync(verifierPath, 'utf8')
const auditor = fs.readFileSync(auditorPath, 'utf8')

test('launch-critical verifier separates manifest promotion from receipt claims', () => {
  assert.match(verifier, /receiptReleaseState/)
  assert.match(verifier, /manifestReleaseState/)
  assert.match(verifier, /receipt cannot be production-ready with candidate compression status/)
  assert.doesNotMatch(verifier, /model candidate receipt must carry candidate compression status/)
  assert.doesNotMatch(verifier, /asset\.releaseState === 'production-ready' && receipt\.compressionStatus\.includes\('candidate'\)/)
})

test('independent launch-critical auditor enforces manifest promotion authority', () => {
  assert.match(auditor, /const receiptReleaseState = String\(receipt\.releaseState \|\| ''\)/)
  assert.match(auditor, /const productionReady = asset\.releaseState === 'production-ready'/)
  assert.match(auditor, /manifestReleaseState: asset\.releaseState/)
  assert.match(auditor, /receiptReleaseState/)
  assert.match(auditor, /candidateOnly: results\.length === manifest\.assets\.length/)
  assert.doesNotMatch(auditor, /const productionReady = receiptReleaseState === 'production-ready'/)
  assert.doesNotMatch(auditor, /model candidate receipt must carry candidate compression status/)
})
