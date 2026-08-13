import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(testDirectory, '../..')
const readRepositoryFile = (file) => readFileSync(path.join(repositoryRoot, file), 'utf8').replace(/\r\n?/g, '\n')

const releaseOperator = readRepositoryFile('scripts/live-release.mjs')
const credentialBoundary = readRepositoryFile('scripts/verify-release-credential-boundary.mjs')
const staticBoundary = readRepositoryFile('scripts/verify-release-credential-boundary-static.mjs')

test('release operator fails closed for every production mutation request', () => {
  assert.match(releaseOperator, /process\.argv\.includes\('--deploy'\)/)
  assert.match(releaseOperator, /process\.argv\.includes\('--deploy-prebuilt'\)/)
  assert.match(releaseOperator, /if \(deployRequested\) \{[\s\S]*throw new Error\(/)
  assert.match(releaseOperator, /URAI Spatial production release is NO-GO/)
  assert.doesNotMatch(releaseOperator, /deployHostingWithTemporaryCredentials/)
})

test('runtime boundary rejects mutation intent while quarantine is active', () => {
  assert.match(credentialBoundary, /mode: 'quarantine-no-go'/)
  assert.match(credentialBoundary, /productionMutationAvailable: false/)
  assert.match(credentialBoundary, /productionCredentialsAvailable: false/)
  assert.match(credentialBoundary, /runtimeMutationIntentDetected: mutationRequested/)
  assert.match(credentialBoundary, /Production mutation is forbidden while the release boundary is quarantined/)
})

test('static boundary requires exact-head read-only verification with no secret references', () => {
  assert.match(staticBoundary, /exactHeadVerificationOnly: true/)
  assert.match(staticBoundary, /repositorySecretsReferenced: false/)
  assert.match(staticBoundary, /providerWifIamProofRequiredBeforeMutation: true/)
  assert.match(staticBoundary, /independentReviewRequiredBeforeMutation: true/)
  assert.match(staticBoundary, /releaseClassification: 'NO-GO'/)
})
