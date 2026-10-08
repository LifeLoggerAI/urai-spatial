#!/usr/bin/env node
import { readFileSync, renameSync, writeFileSync } from 'node:fs'

const path = process.env.URAI_RELEASE_FINGERPRINT_PATH || 'urai-tier1/out/release-fingerprint.json'
const expectedSha = (process.env.URAI_EXPECTED_DEPLOYED_SHA || '').trim()
const expectedRollbackSha = (process.env.URAI_EXPECTED_ROLLBACK_SHA || '').trim()
const expectedAuthoritySha = (process.env.URAI_EXPECTED_AUTHORITY_SHA || '').trim()
const expectedFunctionsTreeSha = (process.env.URAI_EXPECTED_FUNCTIONS_TREE_SHA || '').trim()
const expectedStaticConfigSha256 = (process.env.URAI_EXPECTED_STATIC_CONFIG_SHA256 || '').trim()
const runId = String(process.env.GITHUB_RUN_ID || '').trim()

for (const [label, value] of [
  ['release', expectedSha],
  ['rollback', expectedRollbackSha],
  ['authority', expectedAuthoritySha],
  ['functions tree', expectedFunctionsTreeSha],
]) {
  if (!/^[0-9a-f]{40}$/.test(value)) throw new Error(`Expected ${label} SHA must be a full lowercase SHA`)
}
if (!/^[0-9a-f]{64}$/.test(expectedStaticConfigSha256)) throw new Error('Expected Firebase static config SHA-256 is invalid')
if (!/^[1-9][0-9]*$/.test(runId)) throw new Error('GITHUB_RUN_ID must be numeric')

const fingerprint = JSON.parse(readFileSync(path, 'utf8'))
const required = {
  schemaVersion: 'urai-release-fingerprint-1',
  repository: 'LifeLoggerAI/urai-spatial',
  authoritySha: expectedAuthoritySha,
  releaseSha: expectedSha,
  rollbackSha: expectedRollbackSha,
  firebaseProject: 'urai-4dc1d',
  liveUrl: 'https://urai.app',
  deploymentScope: 'functions-and-hosting',
  functionsTreeSha: expectedFunctionsTreeSha,
  firebaseStaticConfigSha256: expectedStaticConfigSha256,
  certification: 'pending-post-deploy-smoke',
}
for (const [key, value] of Object.entries(required)) {
  if (fingerprint[key] !== value) throw new Error(`Fingerprint ${key} does not match the governed release`)
}
if (String(fingerprint.workflowRunId) !== runId) throw new Error('Fingerprint workflowRunId does not match this governed deployment run')

fingerprint.certification = 'verified-post-deploy-smoke'
fingerprint.certifiedAt = new Date().toISOString()
fingerprint.certificationRunId = runId
fingerprint.certifiedBy = 'scripts/certify-release-fingerprint.mjs'

const temp = `${path}.tmp`
writeFileSync(temp, `${JSON.stringify(fingerprint, null, 2)}\n`, { encoding: 'utf8', mode: 0o644, flag: 'w' })
renameSync(temp, path)
console.log(JSON.stringify({
  path,
  releaseSha: fingerprint.releaseSha,
  rollbackSha: fingerprint.rollbackSha,
  certification: fingerprint.certification,
  certificationRunId: fingerprint.certificationRunId,
}, null, 2))
