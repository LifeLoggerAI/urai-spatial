import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(testDirectory, '../..')
const workflow = readFileSync(
  path.join(repositoryRoot, '.github/workflows/capture-legacy-hosting-recovery.yml'),
  'utf8',
).replace(/\r\n?/g, '\n')

test('legacy recovery workflow is manual, exact-head, and verification-only', () => {
  assert.match(workflow, /^name: Legacy Firebase Hosting Recovery Verification$/m)
  assert.match(workflow, /^  workflow_dispatch:$/m)
  assert.match(workflow, /expected_sha:/)
  assert.doesNotMatch(workflow, /^  (?:push|pull_request|schedule):$/m)
  assert.match(workflow, /ref: \$\{\{ inputs\.expected_sha \}\}/)
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_SHA"/)
  assert.match(workflow, /node scripts\/firebase-hosting-recovery\.mjs --self-test/)
  assert.match(workflow, /node scripts\/audit-production-workflow-authority\.mjs/)
  assert.doesNotMatch(workflow, /firebase-hosting-recovery\.mjs (?:discover|restore)/)
  assert.doesNotMatch(workflow, /firebase(?:-tools)?(?:@[^\s]+)?\s+deploy/)
  assert.doesNotMatch(workflow, /live-release\.mjs --deploy/)
})

test('legacy recovery workflow exposes no credential or production authority', () => {
  assert.doesNotMatch(workflow, /environment: production/)
  assert.doesNotMatch(workflow, /FIREBASE_SERVICE_ACCOUNT_JSON/)
  assert.doesNotMatch(workflow, /FIREBASE_PRIVATE_KEY/)
  assert.doesNotMatch(workflow, /FIREBASE_CLIENT_EMAIL/)
  assert.doesNotMatch(workflow, /credentials_json\s*:/)
  assert.doesNotMatch(workflow, /id-token: write|contents: write|actions: write/)
  assert.match(workflow, /^permissions:\n  contents: read$/m)
})

test('legacy recovery receipt remains NO-GO and checks-only', () => {
  assert.match(workflow, /Classification|classification: 'NO-GO'/)
  assert.match(workflow, /checksOnly: true/)
  assert.match(workflow, /productionCredentialsAvailable: false/)
  assert.match(workflow, /recoveryMutationAttempted: false/)
  assert.match(workflow, /providerRecoveryVerified: false/)
  assert.match(workflow, /path: artifacts\/legacy-hosting-recovery\/quarantine\.json/)
  assert.match(workflow, /retention-days: 365/)
  assert.match(workflow, /test -z "\$\(git status --porcelain --untracked-files=all\)"/)
})
